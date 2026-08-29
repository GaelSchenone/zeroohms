from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user, require_admin
from models.usuario import Usuario
from schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from services.auth_service import hash_password

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


@router.get("", response_model=list[UsuarioResponse])
def list_usuarios(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    return db.query(Usuario).order_by(Usuario.usuario).offset((page - 1) * per_page).limit(per_page).all()


@router.post("", response_model=UsuarioResponse, status_code=201)
def create_usuario(
    body: UsuarioCreate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(require_admin),
):
    existing = db.query(Usuario).filter(Usuario.usuario == body.usuario).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese nombre")
    
    if body.mail:
        existing_mail = db.query(Usuario).filter(Usuario.mail == body.mail).first()
        if existing_mail:
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")

    user = Usuario(
        usuario=body.usuario,
        mail=body.mail,
        clave=hash_password(body.clave),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{usuario}", response_model=UsuarioResponse)
def get_usuario(
    usuario: str,
    db: Session = Depends(get_db),
    _usuario: str = Depends(require_admin),
):
    user = db.query(Usuario).filter(Usuario.usuario == usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.put("/{usuario}", response_model=UsuarioResponse)
def update_usuario(
    usuario: str,
    body: UsuarioUpdate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(require_admin),
):
    user = db.query(Usuario).filter(Usuario.usuario == usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if body.mail is not None and body.mail != user.mail:
        existing = db.query(Usuario).filter(Usuario.mail == body.mail).first()
        if existing:
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")
        user.mail = body.mail

    if body.clave is not None and body.clave.strip():
        user.clave = hash_password(body.clave)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{usuario}")
def delete_usuario(
    usuario: str,
    db: Session = Depends(get_db),
    _usuario: str = Depends(require_admin),
):
    user = db.query(Usuario).filter(Usuario.usuario == usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Prevent deleting yourself
    if user.usuario == _usuario:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")

    db.delete(user)
    db.commit()
    return {"detail": "Usuario eliminado"}