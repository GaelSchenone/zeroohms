from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from models.ticket import Ticket
from models.dispositivo import Dispositivo
from models.estados import EstadoTK, PosEstadoTK
from models.foto import Foto
from schemas.estados import EstadoResponse
from schemas.foto import FotoResponse
from schemas.ticket import TicketDetalle

router = APIRouter(prefix="/api/tracking", tags=["tracking"])


def _get_estado_actual(db: Session, tkid: int) -> str | None:
    last = (
        db.query(EstadoTK, PosEstadoTK)
        .join(PosEstadoTK, EstadoTK.posestadotkid == PosEstadoTK.posestadotkid)
        .filter(EstadoTK.tkid == tkid)
        .order_by(EstadoTK.fechacambio.desc())
        .first()
    )
    return last[1].posestado if last else None


@router.get("/{codigo}", response_model=TicketDetalle)
def track_ticket(codigo: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.codigoseguimiento == codigo).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    estado_actual = _get_estado_actual(db, ticket.tkid)

    prop_dni = prop_nombre = prop_apellido = prop_email = prop_tel = None
    disp_marca = disp_modelo = disp_serie = None

    if ticket.dispositivo:
        d = ticket.dispositivo
        disp_marca = d.marca
        disp_modelo = d.modelo
        disp_serie = d.numeroserie
        if d.propietario:
            p = d.propietario
            prop_dni = p.dni
            prop_nombre = p.nombre
            prop_apellido = p.apellido
            prop_email = p.email
            prop_tel = p.telefono

    historial = []
    # historial ASC desde API — Timeline espera ASC
    estados = (
        db.query(EstadoTK, PosEstadoTK)
        .join(PosEstadoTK, EstadoTK.posestadotkid == PosEstadoTK.posestadotkid)
        .filter(EstadoTK.tkid == ticket.tkid)
        .order_by(EstadoTK.fechacambio.asc())
        .all()
    )
    for e, pos in estados:
        historial.append(
            EstadoResponse(
                posestado_id=pos.posestadotkid,
                posestado_nombre=pos.posestado,
                fechacambio=e.fechacambio,
            )
        )

    fotos = [
        FotoResponse(
            fotoid=f.fotoid,
            tkid=f.tkid,
            ruta=f.ruta,
            nombre=f.nombre,
            fechasubida=f.fechasubida,
        )
        for f in ticket.fotos
    ]

    return TicketDetalle(
        tkid=ticket.tkid,
        codigoseguimiento=ticket.codigoseguimiento,
        usuario=ticket.usuario,
        dispositivoid=ticket.dispositivoid,
        descripcionproblema=ticket.descripcionproblema,
        fechacreacion=ticket.fechacreacion,
        estado_actual=estado_actual,
        propietario_dni=prop_dni,
        propietario_nombre=prop_nombre,
        propietario_apellido=prop_apellido,
        propietario_email=prop_email,
        propietario_telefono=prop_tel,
        dispositivo_marca=disp_marca,
        dispositivo_modelo=disp_modelo,
        dispositivo_numeroserie=disp_serie,
        tareas=[],
        presupuestos=[],
        fotos=fotos,
        historial_estados=historial,
    )
