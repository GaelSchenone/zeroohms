from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user
from models.dispositivo import Accesorio
from models.ticket import Ticket
from schemas.accesorio import AccesorioCreate, AccesorioResponse

router = APIRouter(prefix="/api/accesorios", tags=["accesorios"])


@router.get("", response_model=list[AccesorioResponse])
def list_accesorios(
    tkid: int = Query(...),
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    return db.query(Accesorio).filter(Accesorio.tkid == tkid).all()


@router.post("", response_model=AccesorioResponse, status_code=201)
def create_accesorio(
    body: AccesorioCreate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.tkid == body.tkid).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    accesorio = Accesorio(
        tkid=body.tkid,
        dispositivoid=body.dispositivoid if body.dispositivoid is not None else ticket.dispositivoid,
        nombre=body.nombre,
        referencia=body.referencia,
    )
    db.add(accesorio)
    db.commit()
    db.refresh(accesorio)
    return accesorio


@router.delete("/{accesorioid}")
def delete_accesorio(
    accesorioid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    accesorio = db.query(Accesorio).filter(Accesorio.accesorioid == accesorioid).first()
    if not accesorio:
        raise HTTPException(status_code=404, detail="Accesorio no encontrado")
    db.delete(accesorio)
    db.commit()
    return {"message": f"Accesorio {accesorioid} eliminado"}
