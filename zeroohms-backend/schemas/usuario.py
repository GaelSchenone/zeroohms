from pydantic import BaseModel, EmailStr
from datetime import datetime


class UsuarioBase(BaseModel):
    mail: EmailStr | None = None


class UsuarioCreate(UsuarioBase):
    usuario: str
    clave: str


class UsuarioUpdate(UsuarioBase):
    clave: str | None = None


class UsuarioResponse(UsuarioBase):
    usuario: str
    fechacreacion: datetime | None = None

    class Config:
        from_attributes = True