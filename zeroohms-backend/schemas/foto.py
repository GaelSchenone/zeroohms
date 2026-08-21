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
