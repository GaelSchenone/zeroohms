from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from config.settings import settings
from middleware.auth import get_current_user
from models.usuario import Usuario
from models.login_otp import LoginOtp
from schemas.auth import LoginRequest, VerifyOtpRequest, RequiereOtpResponse, TokenResponse, UsuarioResponse, CambiarClaveRequest
from services.auth_service import verify_password, create_token, hash_password
from services.otp_service import generar_codigo, hash_codigo
from services.email_service import enviar_email, codigo_login_html

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=RequiereOtpResponse)
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.usuario == body.usuario).first()
    if not user or not user.clave:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not verify_password(body.clave, user.clave):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.mail:
        raise HTTPException(status_code=400, detail="El usuario no tiene un mail configurado para recibir el código")

    codigo = generar_codigo()
    otp = db.query(LoginOtp).filter(LoginOtp.usuario == user.usuario).first()
    if not otp:
        otp = LoginOtp(usuario=user.usuario)
        db.add(otp)
    otp.codigo_hash = hash_codigo(codigo)
    otp.expira = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRATION_MINUTES)
    otp.intentos = 0
    otp.creado = datetime.utcnow()
    db.commit()

    enviado = await enviar_email(
        user.mail,
        "Tu código de acceso — Zero Ohms",
        codigo_login_html(codigo, settings.OTP_EXPIRATION_MINUTES),
    )
    if not enviado:
        raise HTTPException(status_code=502, detail="No se pudo enviar el código. Probá de nuevo en un momento.")

    return RequiereOtpResponse()


@router.post("/login/verify", response_model=TokenResponse)
def verify_login(body: VerifyOtpRequest, db: Session = Depends(get_db)):
    otp = db.query(LoginOtp).filter(LoginOtp.usuario == body.usuario).first()
    if not otp or otp.expira < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Código inválido o vencido")
    if otp.intentos >= 5:
        raise HTTPException(status_code=401, detail="Demasiados intentos. Pedí un código nuevo.")
    if hash_codigo(body.codigo) != otp.codigo_hash:
        otp.intentos += 1
        db.commit()
        raise HTTPException(status_code=401, detail="Código inválido o vencido")

    db.delete(otp)
    db.commit()

    minutos = settings.JWT_REMEMBER_EXPIRATION_MINUTES if body.recordar else None
    return TokenResponse(access_token=create_token(body.usuario, expiration_minutes=minutos))


@router.get("/me", response_model=UsuarioResponse)
def me(usuario: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.usuario == usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.put("/me/password")
def cambiar_password(
    body: CambiarClaveRequest,
    usuario: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(Usuario).filter(Usuario.usuario == usuario).first()
    if not user or not verify_password(body.clave_actual, user.clave):
        raise HTTPException(status_code=401, detail="La contraseña actual es incorrecta")
    if len(body.clave_nueva) < 6:
        raise HTTPException(status_code=400, detail="La contraseña nueva debe tener al menos 6 caracteres")

    user.clave = hash_password(body.clave_nueva)
    db.commit()
    return {"message": "Contraseña actualizada"}
