from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user
from models.presupuesto import ItemPresupuesto, Presupuesto
from schemas.presupuesto import ItemPresupuestoCreate, ItemPresupuestoUpdate, ItemPresupuestoResponse
from routes.presupuestos import _recalcular_monto

router = APIRouter(prefix="/api/items-presupuesto", tags=["presupuestos"])

TIPOS_VALIDOS = {"repuesto", "mano_obra", "otro"}


@router.get("", response_model=list[ItemPresupuestoResponse])
def list_items(
    presupuestoid: int = Query(...),
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    return (
        db.query(ItemPresupuesto)
        .filter(ItemPresupuesto.presupuestoid == presupuestoid)
        .order_by(ItemPresupuesto.fechacreacion.asc())
        .all()
    )


@router.post("", response_model=ItemPresupuestoResponse, status_code=201)
def create_item(
    body: ItemPresupuestoCreate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    pres = db.query(Presupuesto).filter(Presupuesto.presupuestoid == body.presupuestoid).first()
    if not pres:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    if body.tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Tipo de ítem inválido")

    item = ItemPresupuesto(
        presupuestoid=body.presupuestoid,
        tipo=body.tipo,
        descripcion=body.descripcion,
        cantidad=body.cantidad,
        preciounitario=body.preciounitario,
    )
    db.add(item)
    db.flush()
    _recalcular_monto(db, body.presupuestoid)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{itemid}", response_model=ItemPresupuestoResponse)
def update_item(
    itemid: int,
    body: ItemPresupuestoUpdate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    item = db.query(ItemPresupuesto).filter(ItemPresupuesto.itempresupuestoid == itemid).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")

    datos = body.model_dump(exclude_unset=True)
    if "tipo" in datos and datos["tipo"] not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Tipo de ítem inválido")

    for field, value in datos.items():
        setattr(item, field, value)

    _recalcular_monto(db, item.presupuestoid)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{itemid}")
def delete_item(
    itemid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    item = db.query(ItemPresupuesto).filter(ItemPresupuesto.itempresupuestoid == itemid).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    presupuestoid = item.presupuestoid
    db.delete(item)
    db.flush()
    _recalcular_monto(db, presupuestoid)
    db.commit()
    return {"message": f"Ítem {itemid} eliminado"}
