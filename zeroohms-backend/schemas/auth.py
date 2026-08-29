from pydantic import BaseModel


class LoginRequest(BaseModel):
    usuario: str
    clave: str


class CambiarClaveRequest(BaseModel):
    clave_actual: str
    clave_nueva: str


class VerifyOtpRequest(BaseModel):
    usuario: str
    codigo: str
    recordar: bool = False


class RequiereOtpResponse(BaseModel):
    requiere_otp: bool = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioResponse(BaseModel):
    usuario: str
    mail: str | None = None

    class Config:
        from_attributes = True
