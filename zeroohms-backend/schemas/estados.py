from pydantic import BaseModel
from datetime import datetime


class CambioEstado(BaseModel):
    posestado_id: int


class EstadoResponse(BaseModel):
    posestado_id: int
    posestado_nombre: str | None = None
    fechacambio: datetime | None = None
    notificado: bool = False

    class Config:
        from_attributes = True


class TrackingResponse(BaseModel):
    tkid: int
    codigoseguimiento: str | None = None
    descripcionproblema: str | None = None
    fechacreacion: datetime | None = None
    estado_actual: str | None = None
    dispositivo_marca: str | None = None
    dispositivo_modelo: str | None = None
    historial_estados: list[EstadoResponse] = []
