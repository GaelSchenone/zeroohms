from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from services.auth_service import verify_token

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    # Los tokens emitidos antes de este cambio no tienen "typ" — se aceptan
    # por compatibilidad. Un token "upload" jamás debe pasar como sesión admin.
    if payload.get("typ") not in (None, "login"):
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    usuario = payload.get("sub")
    if not usuario:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return usuario


@dataclass
class SesionSubida:
    tkid: int
    usuario: str
    jti: str


def get_sesion_subida(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> SesionSubida:
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    if payload.get("typ") != "upload":
        raise HTTPException(status_code=403, detail="Este token no habilita la subida de fotos")
    tkid = payload.get("tkid")
    usuario = payload.get("sub")
    jti = payload.get("jti")
    if tkid is None or not usuario or not jti:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return SesionSubida(tkid=tkid, usuario=usuario, jti=jti)
