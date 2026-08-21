from pydantic import BaseModel
from datetime import datetime, date


class TareaCreate(BaseModel):
    tkid: int
    usuario: str | None = None
    descripcion: str | None = None
    prioridad: str | None = None
    fechalimite: date | None = None


class TareaUpdate(BaseModel):
    usuario: str | None = None
    descripcion: str | None = None
    prioridad: str | None = None
    fechalimite: date | None = None


class TareaResponse(BaseModel):
    tareaid: int
    tkid: int | None = None
    usuario: str | None = None
    descripcion: str | None = None
    prioridad: str | None = None
    fechaasignacion: datetime | None = None
    fechalimite: date | None = None
    estado_actual: str | None = None

    class Config:
        from_attributes = True
