from pydantic import BaseModel


class CheckListCreate(BaseModel):
    nombre: str
    descripcion: str | None = None


class CheckListUpdate(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None


class RespuestaCreate(BaseModel):
    respuesta: str


class PreguntaCreate(BaseModel):
    pregunta: str
    respuestas: list[RespuestaCreate] = []


class CheckListResponse(BaseModel):
    checklistid: int
    nombre: str
    descripcion: str | None = None

    class Config:
        from_attributes = True


class RespuestaResponse(BaseModel):
    respuestaid: int
    respuesta: str

    class Config:
        from_attributes = True


class PreguntaResponse(BaseModel):
    preguntaid: int
    checklistid: int | None = None
    pregunta: str | None = None
    respuestas_validas: list[RespuestaResponse] = []

    class Config:
        from_attributes = True


class RespuestaIngresadaCreate(BaseModel):
    preguntaid: int
    respuestaid: int
    observacion: str | None = None


class EjecucionCreate(BaseModel):
    checklistid: int
    usuario: str | None = None
    tkid: int
    respuestas: list[RespuestaIngresadaCreate]


class RespuestaIngresadaResponse(BaseModel):
    preguntaid: int
    respuestaid: int | None = None
    observacion: str | None = None
    pregunta_texto: str | None = None
    respuesta_texto: str | None = None

    class Config:
        from_attributes = True


class EjecucionResponse(BaseModel):
    ejecucionid: int
    checklistid: int | None = None
    checklist_nombre: str | None = None
    usuario: str | None = None
    usuario_nombre: str | None = None
    tkid: int | None = None
    fechacreacion: str | None = None
    respuestas: list[RespuestaIngresadaResponse] = []

    class Config:
        from_attributes = True
