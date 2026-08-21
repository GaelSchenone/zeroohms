from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user
from models.dispositivo import Dispositivo
from schemas.dispositivo import DispositivoCreate, DispositivoUpdate, DispositivoResponse

router = APIRouter(prefix="/api/dispositivos", tags=["dispositivos"])


@router.get("", response_model=list[DispositivoResponse])
def list_dispositivos(
    dni: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    q = db.query(Dispositivo)
    if dni:
        q = q.filter(Dispositivo.dni == dni)
    return q.offset((page - 1) * per_page).limit(per_page).all()


@router.post("", response_model=DispositivoResponse, status_code=201)
def create_dispositivo(
    body: DispositivoCreate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    disp = Dispositivo(
        dni=body.dni,
        marca=body.marca,
        modelo=body.modelo,
        numeroserie=body.numeroserie,
        foto=body.foto,
    )
    db.add(disp)
    db.commit()
    db.refresh(disp)
    return disp


@router.get("/{dispositivoid}", response_model=DispositivoResponse)
def get_dispositivo(
    dispositivoid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    disp = db.query(Dispositivo).filter(Dispositivo.dispositivoid == dispositivoid).first()
    if not disp:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    return disp


@router.put("/{dispositivoid}", response_model=DispositivoResponse)
def update_dispositivo(
    dispositivoid: int,
    body: DispositivoUpdate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    disp = db.query(Dispositivo).filter(Dispositivo.dispositivoid == dispositivoid).first()
    if not disp:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(disp, field, value)

    db.commit()
    db.refresh(disp)
    return disp
