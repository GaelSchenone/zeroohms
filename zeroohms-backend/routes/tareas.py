from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user
from models.tarea import Tarea
from models.estados import EstadoTarea, PosEstadoTarea
from schemas.tarea import TareaCreate, TareaUpdate, TareaResponse
from schemas.estados import CambioEstado
from services.webhook_service import send_webhook
from services.google_tasks_service import reconciliar_tarea_google, borrar_tarea_google_directo

router = APIRouter(prefix="/api/tareas", tags=["tareas"])


def _get_estado_actual_tarea(db: Session, tareaid: int) -> str | None:
    last = (
        db.query(EstadoTarea, PosEstadoTarea)
        .join(PosEstadoTarea, EstadoTarea.posestadotid == PosEstadoTarea.posestadotid)
        .filter(EstadoTarea.tareaid == tareaid)
        .order_by(EstadoTarea.fechacambio.desc())
        .first()
    )
    return last[1].posestado if last else None


@router.get("", response_model=list[TareaResponse])
def list_tareas(
    tkid: int | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    q = db.query(Tarea)
    if tkid:
        q = q.filter(Tarea.tkid == tkid)
    tareas = q.order_by(Tarea.fechaasignacion.desc()).offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for t in tareas:
        result.append(
            TareaResponse(
                tareaid=t.tareaid,
                tkid=t.tkid,
                usuario=t.usuario,
                descripcion=t.descripcion,
                prioridad=t.prioridad,
                fechaasignacion=t.fechaasignacion,
                estado_actual=_get_estado_actual_tarea(db, t.tareaid),
            )
        )
    return result


@router.get("/estados", response_model=list[dict])
def get_estados_tarea(db: Session = Depends(get_db), _usuario: str = Depends(get_current_user)):
    """Devuelve todos los estados posibles para tareas (catálogo PosEstadosTareas)."""
    estados = db.query(PosEstadoTarea).order_by(PosEstadoTarea.posestadotid).all()
    return [{"id": e.posestadotid, "nombre": e.posestado} for e in estados]


@router.post("", response_model=TareaResponse, status_code=201)
def create_tarea(
    body: TareaCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    tarea = Tarea(
        tkid=body.tkid,
        usuario=body.usuario,
        descripcion=body.descripcion,
        prioridad=body.prioridad,
        fechalimite=body.fechalimite,
    )
    db.add(tarea)
    db.flush()

    pos_estado = db.query(PosEstadoTarea).filter(PosEstadoTarea.posestado == "pendiente").first()
    if pos_estado:
        estado = EstadoTarea(
            posestadotid=pos_estado.posestadotid,
            tareaid=tarea.tareaid,
            fechacambio=datetime.utcnow(),
        )
        db.add(estado)

    db.commit()
    db.refresh(tarea)

    background_tasks.add_task(
        send_webhook,
        "tarea-creada",
        {
            "tareaid": tarea.tareaid,
            "tkid": tarea.tkid,
            "usuario": tarea.usuario,
            "descripcion": tarea.descripcion,
            "prioridad": tarea.prioridad,
            "fechaasignacion": tarea.fechaasignacion.isoformat() if tarea.fechaasignacion else None,
            "fechalimite": tarea.fechalimite.isoformat() if tarea.fechalimite else None,
            "codigo_seguimiento": tarea.ticket.codigoseguimiento if tarea.ticket else None,
        },
    )
    background_tasks.add_task(reconciliar_tarea_google, tarea.tareaid)

    return TareaResponse(
        tareaid=tarea.tareaid,
        tkid=tarea.tkid,
        usuario=tarea.usuario,
        descripcion=tarea.descripcion,
        prioridad=tarea.prioridad,
        fechaasignacion=tarea.fechaasignacion,
        fechalimite=tarea.fechalimite,
        estado_actual="pendiente",
    )


@router.put("/{tareaid}", response_model=TareaResponse)
def update_tarea(
    tareaid: int,
    body: TareaUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    tarea = db.query(Tarea).filter(Tarea.tareaid == tareaid).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(tarea, field, value)

    db.commit()
    db.refresh(tarea)
    background_tasks.add_task(reconciliar_tarea_google, tarea.tareaid)

    return TareaResponse(
        tareaid=tarea.tareaid,
        tkid=tarea.tkid,
        usuario=tarea.usuario,
        descripcion=tarea.descripcion,
        prioridad=tarea.prioridad,
        fechaasignacion=tarea.fechaasignacion,
        fechalimite=tarea.fechalimite,
        estado_actual=_get_estado_actual_tarea(db, tareaid),
    )


@router.delete("/{tareaid}")
def delete_tarea(
    tareaid: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    tarea = db.query(Tarea).filter(Tarea.tareaid == tareaid).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    usuario_previo = tarea.usuario
    google_task_id_previo = tarea.google_task_id

    db.query(EstadoTarea).filter(EstadoTarea.tareaid == tareaid).delete()
    db.delete(tarea)
    db.commit()

    if usuario_previo and google_task_id_previo:
        background_tasks.add_task(borrar_tarea_google_directo, usuario_previo, google_task_id_previo)

    return {"message": f"Tarea {tareaid} eliminada"}


@router.post("/{tareaid}/estado", response_model=TareaResponse)
def cambiar_estado_tarea(
    tareaid: int,
    body: CambioEstado,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    tarea = db.query(Tarea).filter(Tarea.tareaid == tareaid).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    pos_estado = db.query(PosEstadoTarea).filter(PosEstadoTarea.posestadotid == body.posestado_id).first()
    if not pos_estado:
        raise HTTPException(status_code=400, detail="Estado inválido")

    nuevo = EstadoTarea(
        posestadotid=body.posestado_id,
        tareaid=tareaid,
        fechacambio=datetime.utcnow(),
    )
    db.add(nuevo)
    db.commit()
    background_tasks.add_task(reconciliar_tarea_google, tareaid)

    return TareaResponse(
        tareaid=tarea.tareaid,
        tkid=tarea.tkid,
        usuario=tarea.usuario,
        descripcion=tarea.descripcion,
        prioridad=tarea.prioridad,
        fechaasignacion=tarea.fechaasignacion,
        fechalimite=tarea.fechalimite,
        estado_actual=pos_estado.posestado,
    )
