from pydantic import BaseModel
from datetime import datetime


class PresupuestoCreate(BaseModel):
    tkid: int
    monto: float
    fechavalidez: datetime | None = None


class PresupuestoResponse(BaseModel):
    presupuestoid: int
    tkid: int
    monto: float
    fechacreacion: datetime | None = None
    fechavalidez: datetime | None = None
    estado_actual: str | None = None

    class Config:
        from_attributes = True


class CambioEstadoPresupuesto(BaseModel):
    posestado_pid: int
