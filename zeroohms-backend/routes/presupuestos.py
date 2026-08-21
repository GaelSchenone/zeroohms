from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user
from models.presupuesto import Presupuesto
from models.estados import EstadoPresupuesto, PosEstadoPresupuesto
from schemas.presupuesto import PresupuestoCreate, PresupuestoResponse
from schemas.estados import CambioEstado

router = APIRouter(prefix="/api/presupuestos", tags=["presupuestos"])


def _get_estado_actual_pres(db: Session, presupuestoid: int) -> str | None:
    last = (
        db.query(EstadoPresupuesto, PosEstadoPresupuesto)
        .join(PosEstadoPresupuesto, EstadoPresupuesto.posestado_pid == PosEstadoPresupuesto.posestado_pid)
        .filter(EstadoPresupuesto.presupuestoid == presupuestoid)
        .order_by(EstadoPresupuesto.fechacambio.desc())
        .first()
    )
    return last[1].posestado if last else None


@router.get("", response_model=list[PresupuestoResponse])
def list_presupuestos(
    tkid: int | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    q = db.query(Presupuesto)
    if tkid:
        q = q.filter(Presupuesto.tkid == tkid)
    pres = q.order_by(Presupuesto.fechacreacion.desc()).offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for p in pres:
        result.append(
            PresupuestoResponse(
                presupuestoid=p.presupuestoid,
                tkid=p.tkid,
                monto=float(p.monto),
                fechacreacion=p.fechacreacion,
                fechavalidez=p.fechavalidez,
                estado_actual=_get_estado_actual_pres(db, p.presupuestoid),
            )
        )
    return result


@router.post("", response_model=PresupuestoResponse, status_code=201)
def create_presupuesto(
    body: PresupuestoCreate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    pres = Presupuesto(
        tkid=body.tkid,
        monto=body.monto,
        fechavalidez=body.fechavalidez,
    )
    db.add(pres)
    db.flush()

    pos_estado = db.query(PosEstadoPresupuesto).filter(PosEstadoPresupuesto.posestado == "borrador").first()
    if pos_estado:
        estado = EstadoPresupuesto(
            posestado_pid=pos_estado.posestado_pid,
            presupuestoid=pres.presupuestoid,
            fechacambio=datetime.utcnow(),
        )
        db.add(estado)

    db.commit()
    db.refresh(pres)

    return PresupuestoResponse(
        presupuestoid=pres.presupuestoid,
        tkid=pres.tkid,
        monto=float(pres.monto),
        fechacreacion=pres.fechacreacion,
        fechavalidez=pres.fechavalidez,
        estado_actual="borrador",
    )


@router.delete("/{presupuestoid}")
def delete_presupuesto(
    presupuestoid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    pres = db.query(Presupuesto).filter(Presupuesto.presupuestoid == presupuestoid).first()
    if not pres:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    db.delete(pres)
    db.commit()
    return {"message": f"Presupuesto {presupuestoid} eliminado"}


@router.post("/{presupuestoid}/estado", response_model=PresupuestoResponse)
def cambiar_estado_presupuesto(
    presupuestoid: int,
    body: CambioEstado,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    pres = db.query(Presupuesto).filter(Presupuesto.presupuestoid == presupuestoid).first()
    if not pres:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")

    pos_estado = db.query(PosEstadoPresupuesto).filter(PosEstadoPresupuesto.posestado_pid == body.posestado_id).first()
    if not pos_estado:
        raise HTTPException(status_code=400, detail="Estado inválido")

    nuevo = EstadoPresupuesto(
        posestado_pid=body.posestado_id,
        presupuestoid=presupuestoid,
        fechacambio=datetime.utcnow(),
    )
    db.add(nuevo)
    db.commit()

    return PresupuestoResponse(
        presupuestoid=pres.presupuestoid,
        tkid=pres.tkid,
        monto=float(pres.monto),
        fechacreacion=pres.fechacreacion,
        fechavalidez=pres.fechavalidez,
        estado_actual=pos_estado.posestado,
    )
