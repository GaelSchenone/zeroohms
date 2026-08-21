from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user
from models.dispositivo import Dispositivo
from models.estados import EstadoTK, PosEstadoTK
from models.propietario import Propietario
from models.ticket import Ticket
from schemas.propietario import PropietarioCreate, PropietarioUpdate, PropietarioResponse
from schemas.ticket import TicketResponse

router = APIRouter(prefix="/api/clientes", tags=["clientes"])


def _get_estado_actual_tk(db: Session, tkid: int) -> str | None:
    last = (
        db.query(EstadoTK, PosEstadoTK)
        .join(PosEstadoTK, EstadoTK.posestadotkid == PosEstadoTK.posestadotkid)
        .filter(EstadoTK.tkid == tkid)
        .order_by(EstadoTK.fechacambio.desc())
        .first()
    )
    return last[1].posestado if last else None


@router.get("", response_model=list[PropietarioResponse])
def list_clientes(
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    q = db.query(Propietario)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Propietario.nombre.ilike(like)
            | Propietario.apellido.ilike(like)
            | Propietario.dni.ilike(like)
            | Propietario.telefono.ilike(like)
            | Propietario.email.ilike(like)
        )
    return q.offset((page - 1) * per_page).limit(per_page).all()


@router.post("", response_model=PropietarioResponse, status_code=201)
def create_cliente(
    body: PropietarioCreate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    existing = db.query(Propietario).filter(Propietario.dni == body.dni).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un cliente con ese DNI")

    prop = Propietario(
        dni=body.dni,
        nombre=body.nombre,
        apellido=body.apellido,
        contacto=body.contacto,
        email=body.email,
        telefono=body.telefono,
        direccion=body.direccion,
        observaciones=body.observaciones,
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


@router.get("/{dni}", response_model=PropietarioResponse)
def get_cliente(dni: str, db: Session = Depends(get_db), _usuario: str = Depends(get_current_user)):
    prop = db.query(Propietario).filter(Propietario.dni == dni).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return prop


@router.put("/{dni}", response_model=PropietarioResponse)
def update_cliente(
    dni: str,
    body: PropietarioUpdate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    prop = db.query(Propietario).filter(Propietario.dni == dni).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(prop, field, value)

    db.commit()
    db.refresh(prop)
    return prop


@router.delete("/{dni}")
def delete_cliente(dni: str, db: Session = Depends(get_db), _usuario: str = Depends(get_current_user)):
    prop = db.query(Propietario).filter(Propietario.dni == dni).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    ticket_count = (
        db.query(Ticket)
        .join(Dispositivo, Ticket.dispositivoid == Dispositivo.dispositivoid)
        .filter(Dispositivo.dni == dni)
        .count()
    )
    if ticket_count > 0:
        raise HTTPException(status_code=409, detail=f"El cliente tiene {ticket_count} ticket(s) asociado(s). Eliminá los tickets primero.")

    db.delete(prop)
    db.commit()
    return {"detail": "Cliente eliminado"}


@router.get("/{dni}/tickets", response_model=list[TicketResponse])
def list_tickets_cliente(
    dni: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    prop = db.query(Propietario).filter(Propietario.dni == dni).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    tickets = (
        db.query(Ticket)
        .join(Dispositivo, Ticket.dispositivoid == Dispositivo.dispositivoid)
        .filter(Dispositivo.dni == dni)
        .order_by(Ticket.fechacreacion.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return [
        TicketResponse(
            tkid=t.tkid,
            codigoseguimiento=t.codigoseguimiento,
            usuario=t.usuario,
            dispositivoid=t.dispositivoid,
            descripcionproblema=t.descripcionproblema,
            fechacreacion=t.fechacreacion,
            estado_actual=_get_estado_actual_tk(db, t.tkid),
        )
        for t in tickets
    ]
