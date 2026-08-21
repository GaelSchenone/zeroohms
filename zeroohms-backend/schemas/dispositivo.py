from pydantic import BaseModel


class DispositivoCreate(BaseModel):
    dni: str | None = None
    marca: str | None = None
    modelo: str | None = None
    numeroserie: str | None = None
    foto: str | None = None


class DispositivoUpdate(BaseModel):
    marca: str | None = None
    modelo: str | None = None
    numeroserie: str | None = None
    foto: str | None = None


class DispositivoResponse(BaseModel):
    dispositivoid: int
    dni: str | None = None
    marca: str | None = None
    modelo: str | None = None
    numeroserie: str | None = None
    foto: str | None = None

    class Config:
        from_attributes = True
