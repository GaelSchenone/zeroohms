from pydantic import BaseModel


class AccesorioCreate(BaseModel):
    dispositivoid: int
    nombre: str | None = None
    referencia: str | None = None
    foto: str | None = None


class AccesorioResponse(BaseModel):
    accesorioid: int
    dispositivoid: int | None = None
    nombre: str | None = None
    referencia: str | None = None
    foto: str | None = None

    class Config:
        from_attributes = True
