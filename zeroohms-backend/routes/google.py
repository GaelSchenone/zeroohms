from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from config.database import get_db
from config.settings import settings
from middleware.auth import get_current_user
from models.google_conexion import GoogleConexion
from services.google_tasks_service import (
    build_auth_url,
    firmar_state,
    verificar_state,
    intercambiar_code,
    obtener_email,
    obtener_o_crear_tasklist,
    revocar_token,
)

router = APIRouter(prefix="/api/auth/google", tags=["google"])


@router.get("/connect")
def connect(usuario: str = Depends(get_current_user)):
    return {"url": build_auth_url(firmar_state(usuario))}


@router.get("/callback")
async def callback(code: str | None = None, state: str | None = None, db: Session = Depends(get_db)):
    destino = settings.ADMIN_FRONTEND_URL or ""
    usuario = verificar_state(state) if state else None
    if not code or not usuario:
        return RedirectResponse(f"{destino}/ajustes?google=error")

    tokens = await intercambiar_code(code)
    refresh_token = tokens.get("refresh_token") if tokens else None
    access_token = tokens.get("access_token") if tokens else None
    if not refresh_token or not access_token:
        return RedirectResponse(f"{destino}/ajustes?google=error")

    google_email = await obtener_email(access_token)
    tasklist_id = await obtener_o_crear_tasklist(access_token)

    conexion = db.query(GoogleConexion).filter(GoogleConexion.usuario == usuario).first()
    if not conexion:
        conexion = GoogleConexion(usuario=usuario)
        db.add(conexion)
    conexion.refresh_token = refresh_token
    conexion.google_email = google_email
    conexion.tasklist_id = tasklist_id
    conexion.valido = True
    conexion.conectado = datetime.utcnow()
    db.commit()

    return RedirectResponse(f"{destino}/ajustes?google=ok")


@router.get("/status")
def status(usuario: str = Depends(get_current_user), db: Session = Depends(get_db)):
    conexion = db.query(GoogleConexion).filter(GoogleConexion.usuario == usuario).first()
    if not conexion:
        return {"conectado": False, "google_email": None, "valido": False}
    return {"conectado": True, "google_email": conexion.google_email, "valido": conexion.valido}


@router.post("/disconnect")
async def disconnect(usuario: str = Depends(get_current_user), db: Session = Depends(get_db)):
    conexion = db.query(GoogleConexion).filter(GoogleConexion.usuario == usuario).first()
    if not conexion:
        raise HTTPException(status_code=404, detail="No hay una conexión de Google para desconectar")
    await revocar_token(conexion.refresh_token)
    db.delete(conexion)
    db.commit()
    return {"message": "Cuenta de Google desconectada"}
