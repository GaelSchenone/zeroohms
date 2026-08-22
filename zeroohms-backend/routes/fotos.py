import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user, get_sesion_subida, SesionSubida
from models.foto import Foto
from models.ticket import Ticket
from schemas.foto import (
    ErrorSubida,
    FotoResponse,
    SesionInfoResponse,
    SesionSubidaResponse,
    SubidaResultado,
)
from services.auth_service import create_upload_token
from services.imagen_service import ImagenInvalidaError, normalizar_imagen
from services.storage_service import borrar_objeto, subir_objeto, thumb_key, traer_objeto

router = APIRouter(prefix="/api/fotos", tags=["fotos"])

MAX_ARCHIVOS_POR_REQUEST = 10
MAX_BYTES_POR_ARCHIVO = 15 * 1024 * 1024
MAX_FOTOS_POR_TICKET = 40


def _key_ticket(tkid: int) -> str:
    return f"tickets/{tkid}/{uuid.uuid4().hex}.jpg"


async def _leer_limitado(file: UploadFile, max_bytes: int) -> bytes:
    chunks = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise ValueError(f"Supera el límite de {max_bytes // (1024 * 1024)}MB")
        chunks.append(chunk)
    return b"".join(chunks)


async def _procesar_subida(db: Session, tkid: int, files: list[UploadFile]) -> SubidaResultado:
    if len(files) > MAX_ARCHIVOS_POR_REQUEST:
        raise HTTPException(status_code=400, detail=f"Máximo {MAX_ARCHIVOS_POR_REQUEST} archivos por subida")

    ticket = db.query(Ticket).filter(Ticket.tkid == tkid).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    actuales = db.query(Foto).filter(Foto.tkid == tkid).count()
    subidas: list[FotoResponse] = []
    errores: list[ErrorSubida] = []

    for file in files:
        if actuales + len(subidas) >= MAX_FOTOS_POR_TICKET:
            errores.append(ErrorSubida(nombre=file.filename, motivo="Se alcanzó el máximo de fotos para este ticket"))
            continue

        try:
            datos = await _leer_limitado(file, MAX_BYTES_POR_ARCHIVO)
        except ValueError as exc:
            errores.append(ErrorSubida(nombre=file.filename, motivo=str(exc)))
            continue

        try:
            full, thumb = normalizar_imagen(datos)
        except ImagenInvalidaError:
            errores.append(ErrorSubida(nombre=file.filename, motivo="El archivo no es una imagen válida"))
            continue

        key = _key_ticket(tkid)
        try:
            subir_objeto(key, full, "image/jpeg")
            subir_objeto(thumb_key(key), thumb, "image/jpeg")
        except Exception:
            errores.append(ErrorSubida(nombre=file.filename, motivo="Error al subir al almacenamiento"))
            continue

        foto = Foto(tkid=tkid, ruta=key, nombre=file.filename)
        db.add(foto)
        try:
            db.commit()
            db.refresh(foto)
        except Exception:
            db.rollback()
            borrar_objeto(key)
            borrar_objeto(thumb_key(key))
            errores.append(ErrorSubida(nombre=file.filename, motivo="Error al guardar en la base de datos"))
            continue

        subidas.append(FotoResponse.model_validate(foto))

    return SubidaResultado(subidas=subidas, errores=errores)


@router.post("/ticket/{tkid}", response_model=SubidaResultado)
async def subir_fotos_ticket(
    tkid: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    return await _procesar_subida(db, tkid, files)


@router.get("/ticket/{tkid}", response_model=list[FotoResponse])
def listar_fotos_ticket(
    tkid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    return db.query(Foto).filter(Foto.tkid == tkid).order_by(Foto.fechasubida.desc()).all()


@router.get("/{fotoid}/archivo")
def obtener_archivo_foto(
    fotoid: int,
    size: str = Query("full", pattern="^(full|thumb)$"),
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    foto = db.query(Foto).filter(Foto.fotoid == fotoid).first()
    if not foto:
        raise HTTPException(status_code=404, detail="Foto no encontrada")

    key = foto.ruta if size == "full" else thumb_key(foto.ruta)
    try:
        datos, content_type = traer_objeto(key)
    except Exception:
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el almacenamiento")

    return Response(content=datos, media_type=content_type)


@router.delete("/{fotoid}")
def borrar_foto(
    fotoid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    foto = db.query(Foto).filter(Foto.fotoid == fotoid).first()
    if not foto:
        raise HTTPException(status_code=404, detail="Foto no encontrada")

    ruta = foto.ruta
    db.delete(foto)
    db.commit()
    borrar_objeto(ruta)
    borrar_objeto(thumb_key(ruta))
    return {"message": f"Foto {fotoid} eliminada"}


@router.post("/ticket/{tkid}/sesion", response_model=SesionSubidaResponse)
def crear_sesion_subida(
    tkid: int,
    db: Session = Depends(get_db),
    usuario: str = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.tkid == tkid).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    token, expira = create_upload_token(tkid=tkid, usuario=usuario)
    return SesionSubidaResponse(token=token, expira_en=expira, tkid=tkid)


@router.get("/sesion", response_model=SesionInfoResponse)
def info_sesion_subida(
    sesion: SesionSubida = Depends(get_sesion_subida),
    db: Session = Depends(get_db),
):
    ticket = db.query(Ticket).filter(Ticket.tkid == sesion.tkid).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    disp = ticket.dispositivo
    return SesionInfoResponse(
        tkid=sesion.tkid,
        codigoseguimiento=ticket.codigoseguimiento,
        dispositivo_marca=disp.marca if disp else None,
        dispositivo_modelo=disp.modelo if disp else None,
        fotos_actuales=db.query(Foto).filter(Foto.tkid == sesion.tkid).count(),
    )


@router.post("/sesion/archivos", response_model=SubidaResultado)
async def subir_fotos_sesion(
    files: list[UploadFile] = File(...),
    sesion: SesionSubida = Depends(get_sesion_subida),
    db: Session = Depends(get_db),
):
    return await _procesar_subida(db, sesion.tkid, files)
