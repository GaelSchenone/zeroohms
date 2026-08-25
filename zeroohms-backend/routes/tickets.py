import random
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from config.database import get_db
from middleware.auth import get_current_user
from models.ticket import Ticket
from models.tarea import Tarea
from models.presupuesto import Presupuesto, ItemPresupuesto
from models.foto import Foto
from models.dispositivo import Dispositivo, Accesorio
from models.propietario import Propietario
from models.estados import EstadoTK, PosEstadoTK, EstadoTarea, EstadoPresupuesto
from models.ejecucion import Ejecucion, RespuestaIngresada
from models.checklist import CheckList, Pregunta, Respuesta
from schemas.ticket import TicketCreate, TicketUpdate, TicketResponse, TicketDetalle
from schemas.tarea import TareaResponse
from schemas.foto import FotoResponse
from schemas.accesorio import AccesorioResponse
from schemas.estados import EstadoResponse, CambioEstado
from schemas.checklist import EjecucionResponse, RespuestaIngresadaResponse
from routes.presupuestos import _armar_response as _armar_response_presupuesto
from services.webhook_service import generate_tracking_code, enviar_webhook_estado, send_webhook
from services.pdf_service import generar_recibo_ingreso, generar_informe_tecnico
from services.storage_service import borrar_objeto, thumb_key

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


def _get_estado_actual_tk(db: Session, tkid: int) -> str | None:
    info = _get_estado_actual_info_tk(db, tkid)
    return info[0] if info else None


def _get_estado_actual_info_tk(db: Session, tkid: int) -> tuple[str, datetime] | None:
    last = (
        db.query(EstadoTK, PosEstadoTK)
        .join(PosEstadoTK, EstadoTK.posestadotkid == PosEstadoTK.posestadotkid)
        .filter(EstadoTK.tkid == tkid)
        .order_by(EstadoTK.fechacambio.desc())
        .first()
    )
    return (last[1].posestado, last[0].fechacambio) if last else None


@router.get("", response_model=list[TicketResponse])
def list_tickets(
    estado: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    q = db.query(Ticket).options(joinedload(Ticket.dispositivo).joinedload(Dispositivo.propietario))

    if search:
        like = f"%{search}%"
        q = q.outerjoin(Dispositivo, Ticket.dispositivoid == Dispositivo.dispositivoid)
        q = q.outerjoin(Propietario, Dispositivo.dni == Propietario.dni)
        q = q.filter(
            or_(
                Ticket.codigoseguimiento.ilike(like),
                Ticket.descripcionproblema.ilike(like),
                Propietario.nombre.ilike(like),
                Propietario.apellido.ilike(like),
                Propietario.dni.ilike(like),
                Dispositivo.marca.ilike(like),
                Dispositivo.modelo.ilike(like),
                Dispositivo.numeroserie.ilike(like),
            )
        )

    tickets = q.order_by(Ticket.fechacreacion.desc()).offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for t in tickets:
        info = _get_estado_actual_info_tk(db, t.tkid)
        propietario = t.dispositivo.propietario if t.dispositivo else None
        result.append(
            TicketResponse(
                tkid=t.tkid,
                codigoseguimiento=t.codigoseguimiento,
                usuario=t.usuario,
                dispositivoid=t.dispositivoid,
                descripcionproblema=t.descripcionproblema,
                fechacreacion=t.fechacreacion,
                estado_actual=info[0] if info else None,
                fecha_ultimo_cambio=info[1] if info else None,
                propietario_nombre=propietario.nombre if propietario else None,
                propietario_apellido=propietario.apellido if propietario else None,
                propietario_dni=propietario.dni if propietario else None,
                dispositivo_marca=t.dispositivo.marca if t.dispositivo else None,
                dispositivo_modelo=t.dispositivo.modelo if t.dispositivo else None,
            )
        )
    return result


@router.post("", response_model=TicketResponse, status_code=201)
def create_ticket(
    body: TicketCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    code = generate_tracking_code()
    while db.query(Ticket).filter(Ticket.codigoseguimiento == code).first():
        code = generate_tracking_code()

    ticket = Ticket(
        codigoseguimiento=code,
        usuario=body.usuario or _usuario,
        dispositivoid=body.dispositivoid,
        descripcionproblema=body.descripcion_problema,
    )
    db.add(ticket)
    db.flush()

    fecha_estado = datetime.utcnow()
    pos_estado_nuevo = db.query(PosEstadoTK).filter(PosEstadoTK.posestado == "ticket_creado").first()
    if pos_estado_nuevo:
        estado = EstadoTK(
            posestadotkid=pos_estado_nuevo.posestadotkid,
            tkid=ticket.tkid,
            fechacambio=fecha_estado,
        )
        db.add(estado)

    db.commit()
    db.refresh(ticket)

    dispositivo = ticket.dispositivo
    propietario = dispositivo.propietario if dispositivo else None
    equipo = " ".join(filter(None, [dispositivo.marca if dispositivo else None, dispositivo.modelo if dispositivo else None])) or None

    background_tasks.add_task(
        send_webhook,
        "ticket-creado",
        {
            "tkid": ticket.tkid,
            "codigo_seguimiento": ticket.codigoseguimiento,
            "cliente_nombre": propietario.nombre if propietario else None,
            "cliente_apellido": propietario.apellido if propietario else None,
            "cliente_email": propietario.email if propietario else None,
            "cliente_telefono": propietario.telefono if propietario else None,
            "equipo": equipo,
            "tracking_url": f"https://zeroohms.com.ar/tracking?c={ticket.codigoseguimiento}",
        },
    )

    return TicketResponse(
        tkid=ticket.tkid,
        codigoseguimiento=ticket.codigoseguimiento,
        usuario=ticket.usuario,
        dispositivoid=ticket.dispositivoid,
        descripcionproblema=ticket.descripcionproblema,
        fechacreacion=ticket.fechacreacion,
        estado_actual="ticket_creado",
        fecha_ultimo_cambio=fecha_estado if pos_estado_nuevo else None,
    )


@router.get("/estados", response_model=list[dict])
def get_estados_ticket(db: Session = Depends(get_db)):
    """Devuelve todos los estados posibles para tickets, ordenados por flujo."""
    estados = db.query(PosEstadoTK).order_by(PosEstadoTK.posestadotkid).all()
    return [
        {"id": e.posestadotkid, "nombre": e.posestado, "descripcion": e.descripcion}
        for e in estados
    ]


@router.get("/{tkid}", response_model=TicketDetalle)
def get_ticket(tkid: int, db: Session = Depends(get_db), _usuario: str = Depends(get_current_user)):
    ticket = db.query(Ticket).filter(Ticket.tkid == tkid).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    info_estado = _get_estado_actual_info_tk(db, tkid)
    estado_actual = info_estado[0] if info_estado else None
    fecha_ultimo_cambio = info_estado[1] if info_estado else None

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

    tareas = [
        TareaResponse(
            tareaid=t.tareaid,
            tkid=t.tkid,
            usuario=t.usuario,
            descripcion=t.descripcion,
            prioridad=t.prioridad,
            fechaasignacion=t.fechaasignacion,
        )
        for t in ticket.tareas
    ]

    presupuestos = [
        _armar_response_presupuesto(db, p)
        for p in sorted(ticket.presupuestos, key=lambda p: p.fechacreacion or datetime.min)
    ]

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

    accesorios = [
        AccesorioResponse(
            accesorioid=a.accesorioid,
            tkid=a.tkid,
            dispositivoid=a.dispositivoid,
            nombre=a.nombre,
            referencia=a.referencia,
        )
        for a in db.query(Accesorio).filter(Accesorio.tkid == tkid).all()
    ]

    ejecuciones_db = (
        db.query(Ejecucion)
        .filter(Ejecucion.tkid == tkid)
        .order_by(Ejecucion.fechacreacion.desc())
        .all()
    )
    ejecuciones = []
    for ej in ejecuciones_db:
        ri_db = (
            db.query(RespuestaIngresada)
            .filter(RespuestaIngresada.ejecucionid == ej.ejecucionid)
            .all()
        )
        respuestas = []
        for ri in ri_db:
            preg = db.query(Pregunta).filter(Pregunta.preguntaid == ri.preguntaid).first()
            res = db.query(Respuesta).filter(Respuesta.respuestaid == ri.respuestaid).first() if ri.respuestaid else None
            respuestas.append(
                RespuestaIngresadaResponse(
                    preguntaid=ri.preguntaid,
                    respuestaid=ri.respuestaid,
                    observacion=ri.observacion,
                    pregunta_texto=preg.pregunta if preg else None,
                    respuesta_texto=res.respuesta if res else None,
                )
            )
        cl = db.query(CheckList).filter(CheckList.checklistid == ej.checklistid).first()
        ejecuciones.append(
            EjecucionResponse(
                ejecucionid=ej.ejecucionid,
                checklistid=ej.checklistid,
                checklist_nombre=cl.nombre if cl else None,
                usuario=ej.usuario,
                tkid=ej.tkid,
                fechacreacion=str(ej.fechacreacion),
                respuestas=respuestas,
            )
        )

    historial = []
    # historial ASC desde API — Timeline espera ASC
    estados = (
        db.query(EstadoTK, PosEstadoTK)
        .join(PosEstadoTK, EstadoTK.posestadotkid == PosEstadoTK.posestadotkid)
        .filter(EstadoTK.tkid == tkid)
        .order_by(EstadoTK.fechacambio.asc())
        .all()
    )
    for e, pos in estados:
        historial.append(
            EstadoResponse(
                posestado_id=pos.posestadotkid,
                posestado_nombre=pos.posestado,
                fechacambio=e.fechacambio,
                notificado=e.notificado,
            )
        )

    return TicketDetalle(
        tkid=ticket.tkid,
        codigoseguimiento=ticket.codigoseguimiento,
        usuario=ticket.usuario,
        dispositivoid=ticket.dispositivoid,
        descripcionproblema=ticket.descripcionproblema,
        fechacreacion=ticket.fechacreacion,
        estado_actual=estado_actual,
        fecha_ultimo_cambio=fecha_ultimo_cambio,
        propietario_dni=prop_dni,
        propietario_nombre=prop_nombre,
        propietario_apellido=prop_apellido,
        propietario_email=prop_email,
        propietario_telefono=prop_tel,
        dispositivo_marca=disp_marca,
        dispositivo_modelo=disp_modelo,
        dispositivo_numeroserie=disp_serie,
        tareas=tareas,
        presupuestos=presupuestos,
        fotos=fotos,
        accesorios=accesorios,
        ejecuciones=ejecuciones,
        historial_estados=historial,
    )


@router.get("/{tkid}/recibo")
def recibo_ticket(tkid: int, db: Session = Depends(get_db), _usuario: str = Depends(get_current_user)):
    ticket = db.query(Ticket).filter(Ticket.tkid == tkid).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    dispositivo = ticket.dispositivo
    propietario = dispositivo.propietario if dispositivo else None

    accesorios_nombres = [
        a.nombre for a in db.query(Accesorio).filter(Accesorio.tkid == tkid).all() if a.nombre
    ]
    presupuestos_dump = [
        _armar_response_presupuesto(db, p).model_dump()
        for p in sorted(ticket.presupuestos, key=lambda p: p.fechacreacion or datetime.min)
    ]

    pdf = generar_recibo_ingreso(
        {
            "tkid": ticket.tkid,
            "codigoseguimiento": ticket.codigoseguimiento,
            "fechacreacion": ticket.fechacreacion,
            "descripcionproblema": ticket.descripcionproblema,
        },
        {
            "nombre": propietario.nombre if propietario else None,
            "apellido": propietario.apellido if propietario else None,
            "dni": propietario.dni if propietario else None,
            "telefono": propietario.telefono if propietario else None,
        },
        {
            "marca": dispositivo.marca if dispositivo else None,
            "modelo": dispositivo.modelo if dispositivo else None,
            "numeroserie": dispositivo.numeroserie if dispositivo else None,
        },
        accesorios_nombres,
        presupuestos_dump,
    )
    nombre_archivo = f"recibo-{ticket.codigoseguimiento or ticket.tkid}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{nombre_archivo}"'},
    )


@router.get("/{tkid}/informe")
def informe_tecnico_ticket(tkid: int, db: Session = Depends(get_db), usuario: str = Depends(get_current_user)):
    detalle = get_ticket(tkid, db, usuario)

    pdf = generar_informe_tecnico(
        {
            "tkid": detalle.tkid,
            "codigoseguimiento": detalle.codigoseguimiento,
            "fechacreacion": detalle.fechacreacion,
            "descripcionproblema": detalle.descripcionproblema,
        },
        {
            "nombre": detalle.propietario_nombre,
            "apellido": detalle.propietario_apellido,
            "dni": detalle.propietario_dni,
            "telefono": detalle.propietario_telefono,
        },
        {
            "marca": detalle.dispositivo_marca,
            "modelo": detalle.dispositivo_modelo,
            "numeroserie": detalle.dispositivo_numeroserie,
        },
        [e.model_dump() for e in detalle.ejecuciones],
        [p.model_dump() for p in detalle.presupuestos],
    )
    nombre_archivo = f"informe-{detalle.codigoseguimiento or detalle.tkid}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{nombre_archivo}"'},
    )


@router.put("/{tkid}", response_model=TicketResponse)
def update_ticket(
    tkid: int,
    body: TicketUpdate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.tkid == tkid).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    if body.usuario is not None:
        ticket.usuario = body.usuario
    if body.dispositivoid is not None:
        ticket.dispositivoid = body.dispositivoid
    if body.descripcion_problema is not None:
        ticket.descripcionproblema = body.descripcion_problema

    db.commit()
    db.refresh(ticket)

    info = _get_estado_actual_info_tk(db, tkid)
    return TicketResponse(
        tkid=ticket.tkid,
        codigoseguimiento=ticket.codigoseguimiento,
        usuario=ticket.usuario,
        dispositivoid=ticket.dispositivoid,
        descripcionproblema=ticket.descripcionproblema,
        fechacreacion=ticket.fechacreacion,
        estado_actual=info[0] if info else None,
        fecha_ultimo_cambio=info[1] if info else None,
    )


@router.delete("/{tkid}")
def delete_ticket(tkid: int, db: Session = Depends(get_db), _usuario: str = Depends(get_current_user)):
    ticket = db.query(Ticket).filter(Ticket.tkid == tkid).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    tarea_ids = [t.tareaid for t in db.query(Tarea).filter(Tarea.tkid == tkid).all()]
    if tarea_ids:
        db.query(EstadoTarea).filter(EstadoTarea.tareaid.in_(tarea_ids)).delete(synchronize_session=False)
    db.query(Tarea).filter(Tarea.tkid == tkid).delete()

    presupuesto_ids = [p.presupuestoid for p in db.query(Presupuesto).filter(Presupuesto.tkid == tkid).all()]
    if presupuesto_ids:
        db.query(EstadoPresupuesto).filter(EstadoPresupuesto.presupuestoid.in_(presupuesto_ids)).delete(synchronize_session=False)
        db.query(ItemPresupuesto).filter(ItemPresupuesto.presupuestoid.in_(presupuesto_ids)).delete(synchronize_session=False)
    db.query(Presupuesto).filter(Presupuesto.tkid == tkid).delete()

    ejecucion_ids = [e.ejecucionid for e in db.query(Ejecucion).filter(Ejecucion.tkid == tkid).all()]
    if ejecucion_ids:
        db.query(RespuestaIngresada).filter(RespuestaIngresada.ejecucionid.in_(ejecucion_ids)).delete(synchronize_session=False)
    db.query(Ejecucion).filter(Ejecucion.tkid == tkid).delete()

    db.query(Accesorio).filter(Accesorio.tkid == tkid).delete()

    fotos = db.query(Foto).filter(Foto.tkid == tkid).all()
    for foto in fotos:
        borrar_objeto(foto.ruta)
        borrar_objeto(thumb_key(foto.ruta))
    db.query(Foto).filter(Foto.tkid == tkid).delete()
    db.query(EstadoTK).filter(EstadoTK.tkid == tkid).delete()

    db.delete(ticket)
    db.commit()
    return {"message": f"Ticket {tkid} eliminado"}


ESTADOS_TERMINALES = {8, 9}  # entregado, cancelado


@router.post("/{tkid}/estado", response_model=TicketResponse)
def cambiar_estado(
    tkid: int,
    body: CambioEstado,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.tkid == tkid).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    pos_estado = db.query(PosEstadoTK).filter(PosEstadoTK.posestadotkid == body.posestado_id).first()
    if not pos_estado:
        raise HTTPException(status_code=400, detail="Estado inválido")

    ultimo = (
        db.query(EstadoTK.posestadotkid)
        .filter(EstadoTK.tkid == tkid)
        .order_by(EstadoTK.fechacambio.desc())
        .first()
    )
    actual_id = ultimo[0] if ultimo else None
    estado_anterior = _get_estado_actual_tk(db, tkid)

    if actual_id is not None:
        if actual_id in ESTADOS_TERMINALES:
            raise HTTPException(status_code=400, detail="Transición no permitida")
        if body.posestado_id == actual_id:
            raise HTTPException(status_code=400, detail="El ticket ya está en ese estado")
        if body.posestado_id != 9 and body.posestado_id < actual_id:
            raise HTTPException(status_code=400, detail="Retroceso no permitido")

    fecha_estado = datetime.utcnow()
    nuevo_estado = EstadoTK(
        posestadotkid=body.posestado_id,
        tkid=tkid,
        fechacambio=fecha_estado,
    )
    db.add(nuevo_estado)
    db.commit()

    dispositivo = ticket.dispositivo
    propietario = dispositivo.propietario if dispositivo else None
    equipo = " ".join(filter(None, [dispositivo.marca if dispositivo else None, dispositivo.modelo if dispositivo else None])) or None

    presupuesto_monto = None
    presupuesto_items = []
    if pos_estado.posestado == "esperando_aprobacion":
        ultimo_presupuesto = (
            db.query(Presupuesto)
            .filter(Presupuesto.tkid == tkid)
            .order_by(Presupuesto.fechacreacion.desc())
            .first()
        )
        if ultimo_presupuesto:
            presupuesto_monto = float(ultimo_presupuesto.monto)
            presupuesto_items = [
                {
                    "tipo": it.tipo.value if hasattr(it.tipo, "value") else it.tipo,
                    "descripcion": it.descripcion,
                    "cantidad": float(it.cantidad),
                    "preciounitario": float(it.preciounitario),
                }
                for it in ultimo_presupuesto.items
            ]

    background_tasks.add_task(
        enviar_webhook_estado,
        tkid,
        body.posestado_id,
        "estado-cambiado",
        {
            "tkid": tkid,
            "codigo_seguimiento": ticket.codigoseguimiento,
            "estado_anterior": estado_anterior,
            "estado_nuevo": pos_estado.posestado,
            "estado_nuevo_descripcion": pos_estado.descripcion,
            "cliente_nombre": propietario.nombre if propietario else None,
            "cliente_apellido": propietario.apellido if propietario else None,
            "cliente_email": propietario.email if propietario else None,
            "cliente_telefono": propietario.telefono if propietario else None,
            "equipo": equipo,
            "presupuesto_monto": presupuesto_monto,
            "presupuesto_items": presupuesto_items,
            "tracking_url": f"https://zeroohms.com.ar/tracking?c={ticket.codigoseguimiento}",
        },
    )

    return TicketResponse(
        tkid=ticket.tkid,
        codigoseguimiento=ticket.codigoseguimiento,
        usuario=ticket.usuario,
        dispositivoid=ticket.dispositivoid,
        descripcionproblema=ticket.descripcionproblema,
        fechacreacion=ticket.fechacreacion,
        estado_actual=pos_estado.posestado,
        fecha_ultimo_cambio=fecha_estado,
    )
