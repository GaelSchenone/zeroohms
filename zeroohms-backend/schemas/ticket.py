from pydantic import BaseModel
from datetime import datetime


class TicketCreate(BaseModel):
    usuario: str | None = None
    dispositivoid: int
    descripcion_problema: str | None = None


class TicketUpdate(BaseModel):
    usuario: str | None = None
    dispositivoid: int | None = None
    descripcion_problema: str | None = None


class TicketResponse(BaseModel):
    tkid: int
    codigoseguimiento: str | None = None
    usuario: str | None = None
    dispositivoid: int | None = None
    descripcionproblema: str | None = None
    fechacreacion: datetime | None = None
    estado_actual: str | None = None

    class Config:
        from_attributes = True


class TicketDetalle(TicketResponse):
    propietario_dni: str | None = None
    propietario_nombre: str | None = None
    propietario_apellido: str | None = None
    propietario_email: str | None = None
    propietario_telefono: str | None = None
    dispositivo_marca: str | None = None
    dispositivo_modelo: str | None = None
    dispositivo_numeroserie: str | None = None
    tareas: list = []
    presupuestos: list = []
    fotos: list = []
    ejecuciones: list = []
    historial_estados: list = []
