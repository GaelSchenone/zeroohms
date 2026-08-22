from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user
from models.presupuesto import Presupuesto, ItemPresupuesto
from models.estados import EstadoPresupuesto, PosEstadoPresupuesto
from schemas.presupuesto import PresupuestoCreate, PresupuestoUpdate, PresupuestoResponse
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


def _recalcular_monto(db: Session, presupuestoid: int) -> None:
    items = db.query(ItemPresupuesto).filter(ItemPresupuesto.presupuestoid == presupuestoid).all()
    total = sum((Decimal(str(i.cantidad)) * Decimal(str(i.preciounitario)) for i in items), Decimal("0"))
    db.query(Presupuesto).filter(Presupuesto.presupuestoid == presupuestoid).update({"monto": total})


def _armar_response(db: Session, pres: Presupuesto, estado_actual: str | None = None) -> PresupuestoResponse:
    from schemas.presupuesto import ItemPresupuestoResponse

    items = (
        db.query(ItemPresupuesto)
        .filter(ItemPresupuesto.presupuestoid == pres.presupuestoid)
        .order_by(ItemPresupuesto.fechacreacion.asc())
        .all()
    )
    return PresupuestoResponse(
        presupuestoid=pres.presupuestoid,
        tkid=pres.tkid,
        monto=float(pres.monto),
        fechacreacion=pres.fechacreacion,
        fechavalidez=pres.fechavalidez,
        estado_actual=estado_actual if estado_actual is not None else _get_estado_actual_pres(db, pres.presupuestoid),
        items=[
            ItemPresupuestoResponse(
                itempresupuestoid=i.itempresupuestoid,
                presupuestoid=i.presupuestoid,
                tipo=i.tipo,
                descripcion=i.descripcion,
                cantidad=float(i.cantidad),
                preciounitario=float(i.preciounitario),
                fechacreacion=i.fechacreacion,
            )
            for i in items
        ],
    )


@router.get("/estados", response_model=list[dict])
def get_estados_presupuesto(db: Session = Depends(get_db), _usuario: str = Depends(get_current_user)):
    """Devuelve todos los estados posibles para presupuestos (catálogo PosEstadosPresupuestos)."""
    estados = db.query(PosEstadoPresupuesto).order_by(PosEstadoPresupuesto.posestado_pid).all()
    return [{"id": e.posestado_pid, "nombre": e.posestado} for e in estados]


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
    return [_armar_response(db, p) for p in pres]


@router.post("", response_model=PresupuestoResponse, status_code=201)
def create_presupuesto(
    body: PresupuestoCreate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    pres = Presupuesto(
        tkid=body.tkid,
        monto=0,
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

    return _armar_response(db, pres, estado_actual="borrador")


@router.put("/{presupuestoid}", response_model=PresupuestoResponse)
def update_presupuesto(
    presupuestoid: int,
    body: PresupuestoUpdate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    pres = db.query(Presupuesto).filter(Presupuesto.presupuestoid == presupuestoid).first()
    if not pres:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(pres, field, value)

    db.commit()
    db.refresh(pres)
    return _armar_response(db, pres)


@router.delete("/{presupuestoid}")
def delete_presupuesto(
    presupuestoid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    pres = db.query(Presupuesto).filter(Presupuesto.presupuestoid == presupuestoid).first()
    if not pres:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    db.query(EstadoPresupuesto).filter(EstadoPresupuesto.presupuestoid == presupuestoid).delete()
    db.query(ItemPresupuesto).filter(ItemPresupuesto.presupuestoid == presupuestoid).delete()
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

    return _armar_response(db, pres, estado_actual=pos_estado.posestado)
