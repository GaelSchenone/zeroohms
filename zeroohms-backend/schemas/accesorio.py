from pydantic import BaseModel


class AccesorioCreate(BaseModel):
    tkid: int
    dispositivoid: int | None = None
    nombre: str
    referencia: str | None = None


class AccesorioResponse(BaseModel):
    accesorioid: int
    tkid: int | None = None
    dispositivoid: int | None = None
    nombre: str | None = None
    referencia: str | None = None

    class Config:
        from_attributes = True
