from pydantic import BaseModel
from datetime import datetime


class FotoResponse(BaseModel):
    fotoid: int
    tkid: int
    ruta: str
    nombre: str | None = None
    fechasubida: datetime | None = None

    class Config:
        from_attributes = True


class ErrorSubida(BaseModel):
    nombre: str | None = None
    motivo: str


class SubidaResultado(BaseModel):
    subidas: list[FotoResponse]
    errores: list[ErrorSubida]


class SesionSubidaResponse(BaseModel):
    token: str
    expira_en: datetime
    tkid: int


class SesionInfoResponse(BaseModel):
    tkid: int
    codigoseguimiento: str | None = None
    dispositivo_marca: str | None = None
    dispositivo_modelo: str | None = None
    fotos_actuales: int
