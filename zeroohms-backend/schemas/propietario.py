from pydantic import BaseModel, Field


class PropietarioCreate(BaseModel):
    dni: str
    nombre: str | None = None
    apellido: str | None = None
    contacto: str | None = None
    email: str | None = None
    telefono: str | None = None
    direccion: str | None = Field(default=None, max_length=200)
    observaciones: str | None = None


class PropietarioUpdate(BaseModel):
    nombre: str | None = None
    apellido: str | None = None
    contacto: str | None = None
    email: str | None = None
    telefono: str | None = None
    direccion: str | None = Field(default=None, max_length=200)
    observaciones: str | None = None


class PropietarioResponse(BaseModel):
    dni: str
    nombre: str | None = None
    apellido: str | None = None
    contacto: str | None = None
    email: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    observaciones: str | None = None

    class Config:
        from_attributes = True
