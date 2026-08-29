import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from jose import jwt

from config.settings import settings

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
REVOKE_URL = "https://oauth2.googleapis.com/revoke"
USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
TASKLISTS_URL = "https://tasks.googleapis.com/tasks/v1/users/@me/lists"
TASKS_URL = "https://tasks.googleapis.com/tasks/v1/lists"

SCOPES = "https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/userinfo.email"
TASKLIST_TITULO = "Zero Ohms"


def build_auth_url(state: str) -> str:
    params = {
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def firmar_state(usuario: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    return jwt.encode(
        {"sub": usuario, "typ": "google-state", "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def verificar_state(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except Exception:
        return None
    if payload.get("typ") != "google-state":
        return None
    return payload.get("sub")


async def intercambiar_code(code: str) -> dict | None:
    data = {
        "code": code,
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(TOKEN_URL, data=data)
            if resp.status_code >= 400:
                logging.error("Error intercambiando code de Google: %s", resp.text)
                return None
            return resp.json()
    except Exception:
        logging.exception("Error de red intercambiando code de Google")
        return None


async def refrescar_access_token(refresh_token: str) -> str | None:
    data = {
        "refresh_token": refresh_token,
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
        "grant_type": "refresh_token",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(TOKEN_URL, data=data)
            if resp.status_code >= 400:
                logging.warning("No se pudo refrescar el access_token de Google: %s", resp.text)
                return None
            return resp.json().get("access_token")
    except Exception:
        logging.exception("Error de red refrescando access_token de Google")
        return None


async def obtener_email(access_token: str) -> str | None:
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(USERINFO_URL, headers=headers)
            if resp.status_code >= 400:
                return None
            return resp.json().get("email")
    except Exception:
        logging.exception("Error obteniendo el email de Google")
        return None


async def obtener_o_crear_tasklist(access_token: str) -> str | None:
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(TASKLISTS_URL, headers=headers)
            if resp.status_code < 400:
                for lista in resp.json().get("items", []):
                    if lista.get("title") == TASKLIST_TITULO:
                        return lista["id"]

            resp = await client.post(TASKLISTS_URL, headers=headers, json={"title": TASKLIST_TITULO})
            if resp.status_code >= 400:
                logging.error("No se pudo crear la tasklist de Google: %s", resp.text)
                return None
            return resp.json().get("id")
    except Exception:
        logging.exception("Error obteniendo/creando la tasklist de Google")
        return None


async def revocar_token(refresh_token: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(REVOKE_URL, params={"token": refresh_token})
    except Exception:
        logging.exception("No se pudo revocar el token de Google (no bloqueante)")


def _due_iso(fecha) -> str:
    return f"{fecha.isoformat()}T00:00:00.000Z"


def _notas_tarea(tarea) -> str:
    codigo = tarea.ticket.codigoseguimiento if tarea.ticket else None
    partes = []
    if codigo:
        partes.append(f"Ticket {codigo}")
    if tarea.prioridad:
        partes.append(f"prioridad {tarea.prioridad}")
    linea = " · ".join(partes)
    link = f"{settings.ADMIN_FRONTEND_URL}/tickets/{tarea.tkid}" if settings.ADMIN_FRONTEND_URL and tarea.tkid else None
    return "\n".join(filter(None, [linea, link]))


async def crear_tarea_google(access_token: str, tasklist_id: str, tarea) -> str | None:
    headers = {"Authorization": f"Bearer {access_token}"}
    body = {
        "title": tarea.descripcion or "Tarea Zero Ohms",
        "notes": _notas_tarea(tarea),
        "due": _due_iso(tarea.fechalimite),
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{TASKS_URL}/{tasklist_id}/tasks", headers=headers, json=body)
            if resp.status_code >= 400:
                logging.error("No se pudo crear el Google Task: %s", resp.text)
                return None
            return resp.json().get("id")
    except Exception:
        logging.exception("Error creando Google Task")
        return None


async def actualizar_tarea_google(access_token: str, tasklist_id: str, task_id: str, tarea) -> bool:
    headers = {"Authorization": f"Bearer {access_token}"}
    body = {
        "title": tarea.descripcion or "Tarea Zero Ohms",
        "notes": _notas_tarea(tarea),
        "due": _due_iso(tarea.fechalimite),
    }
    return await _patch_task(headers, tasklist_id, task_id, body)


async def completar_tarea_google(access_token: str, tasklist_id: str, task_id: str) -> bool:
    headers = {"Authorization": f"Bearer {access_token}"}
    return await _patch_task(headers, tasklist_id, task_id, {"status": "completed"})


async def reabrir_tarea_google(access_token: str, tasklist_id: str, task_id: str) -> bool:
    headers = {"Authorization": f"Bearer {access_token}"}
    return await _patch_task(headers, tasklist_id, task_id, {"status": "needsAction"})


async def _patch_task(headers: dict, tasklist_id: str, task_id: str, body: dict) -> bool:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.patch(f"{TASKS_URL}/{tasklist_id}/tasks/{task_id}", headers=headers, json=body)
            return resp.status_code < 400
    except Exception:
        logging.exception("Error actualizando Google Task")
        return False


async def borrar_tarea_google(access_token: str, tasklist_id: str, task_id: str) -> bool:
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.delete(f"{TASKS_URL}/{tasklist_id}/tasks/{task_id}", headers=headers)
            return resp.status_code < 400 or resp.status_code == 404
    except Exception:
        logging.exception("Error borrando Google Task")
        return False


async def borrar_tarea_google_directo(usuario: str, google_task_id: str) -> None:
    """Usado desde delete_tarea, cuando la fila de Tarea ya no existe para leerla."""
    from config.database import SessionLocal
    from models.google_conexion import GoogleConexion

    db = SessionLocal()
    try:
        conexion = db.query(GoogleConexion).filter(GoogleConexion.usuario == usuario).first()
        if not conexion or not conexion.valido:
            return
        access_token = await refrescar_access_token(conexion.refresh_token)
        if not access_token:
            conexion.valido = False
            db.commit()
            return
        if conexion.tasklist_id:
            await borrar_tarea_google(access_token, conexion.tasklist_id, google_task_id)
    except Exception:
        logging.exception("Error en borrar_tarea_google_directo para usuario %s", usuario)
    finally:
        db.close()


async def reconciliar_tarea_google(tareaid: int) -> None:
    """Crea, actualiza, completa o borra el Google Task asociado a esta tarea según su estado actual."""
    from config.database import SessionLocal
    from models.tarea import Tarea
    from models.google_conexion import GoogleConexion
    from models.estados import EstadoTarea, PosEstadoTarea

    db = SessionLocal()
    try:
        tarea = db.query(Tarea).filter(Tarea.tareaid == tareaid).first()
        if not tarea:
            return

        conexion = None
        if tarea.usuario:
            conexion = db.query(GoogleConexion).filter(
                GoogleConexion.usuario == tarea.usuario, GoogleConexion.valido.is_(True)
            ).first()

        ultimo = (
            db.query(EstadoTarea, PosEstadoTarea)
            .join(PosEstadoTarea, EstadoTarea.posestadotid == PosEstadoTarea.posestadotid)
            .filter(EstadoTarea.tareaid == tareaid)
            .order_by(EstadoTarea.fechacambio.desc())
            .first()
        )
        estado_actual = ultimo[1].posestado if ultimo else None

        deberia_existir = (
            conexion is not None
            and tarea.fechalimite is not None
            and estado_actual not in ("completada", "cancelada")
        )

        access_token = None
        if conexion:
            access_token = await refrescar_access_token(conexion.refresh_token)
            if not access_token:
                conexion.valido = False
                db.commit()
                return

        if deberia_existir:
            if not conexion.tasklist_id:
                conexion.tasklist_id = await obtener_o_crear_tasklist(access_token)
                db.commit()
            if not conexion.tasklist_id:
                return
            if tarea.google_task_id:
                await actualizar_tarea_google(access_token, conexion.tasklist_id, tarea.google_task_id, tarea)
            else:
                nuevo_id = await crear_tarea_google(access_token, conexion.tasklist_id, tarea)
                if nuevo_id:
                    tarea.google_task_id = nuevo_id
                    db.commit()
        elif tarea.google_task_id and conexion and conexion.tasklist_id:
            if estado_actual == "completada":
                await completar_tarea_google(access_token, conexion.tasklist_id, tarea.google_task_id)
            else:
                await borrar_tarea_google(access_token, conexion.tasklist_id, tarea.google_task_id)
                tarea.google_task_id = None
                db.commit()
    except Exception:
        logging.exception("Error sincronizando tarea %s con Google Tasks", tareaid)
    finally:
        db.close()
