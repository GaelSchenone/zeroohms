from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user
from models.tarea import Tarea
from models.estados import EstadoTarea, PosEstadoTarea
from schemas.tarea import TareaCreate, TareaUpdate, TareaResponse
from schemas.estados import CambioEstado

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


@router.post("", response_model=TareaResponse, status_code=201)
def create_tarea(
    body: TareaCreate,
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
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    tarea = db.query(Tarea).filter(Tarea.tareaid == tareaid).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    db.delete(tarea)
    db.commit()
    return {"message": f"Tarea {tareaid} eliminada"}


@router.post("/{tareaid}/estado", response_model=TareaResponse)
def cambiar_estado_tarea(
    tareaid: int,
    body: CambioEstado,
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
