from pydantic import BaseModel
from datetime import datetime


class PresupuestoCreate(BaseModel):
    tkid: int
    fechavalidez: datetime | None = None


class PresupuestoUpdate(BaseModel):
    fechavalidez: datetime | None = None


class ItemPresupuestoCreate(BaseModel):
    presupuestoid: int
    tipo: str = "repuesto"
    descripcion: str
    cantidad: float = 1
    preciounitario: float


class ItemPresupuestoUpdate(BaseModel):
    tipo: str | None = None
    descripcion: str | None = None
    cantidad: float | None = None
    preciounitario: float | None = None


class ItemPresupuestoResponse(BaseModel):
    itempresupuestoid: int
    presupuestoid: int
    tipo: str
    descripcion: str
    cantidad: float
    preciounitario: float
    fechacreacion: datetime | None = None

    class Config:
        from_attributes = True


class PresupuestoResponse(BaseModel):
    presupuestoid: int
    tkid: int
    monto: float
    fechacreacion: datetime | None = None
    fechavalidez: datetime | None = None
    estado_actual: str | None = None
    items: list[ItemPresupuestoResponse] = []

    class Config:
        from_attributes = True
