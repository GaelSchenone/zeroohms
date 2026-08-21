from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user
from models.usuario import Usuario
from schemas.auth import LoginRequest, TokenResponse, UsuarioResponse
from services.auth_service import verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.usuario == body.usuario).first()
    if not user or not user.clave:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not verify_password(body.clave, user.clave):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return TokenResponse(access_token=create_token(user.usuario))


@router.get("/me", response_model=UsuarioResponse)
def me(usuario: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.usuario == usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user
