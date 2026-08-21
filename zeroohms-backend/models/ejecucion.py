from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class Ejecucion(Base):
    __tablename__ = "Ejecuciones"

    ejecucionid = Column("EjecucionID", Integer, primary_key=True, autoincrement=True)
    checklistid = Column("CheckListID", Integer, ForeignKey("CheckLists.CheckListID"))
    usuario = Column("Usuario", String(20), ForeignKey("Usuarios.Usuario"))
    tkid = Column("TKID", Integer, ForeignKey("TKs.TKID"))
    fechacreacion = Column("FechaCreacion", DateTime, default=datetime.utcnow)

    checklist = relationship("CheckList", backref="ejecuciones")
    tecnico = relationship("Usuario", backref="ejecuciones")
    respuestas = relationship("RespuestaIngresada", backref="ejecucion")


class RespuestaIngresada(Base):
    __tablename__ = "RespuestasIngresadas"

    ejecucionid = Column("EjecucionID", Integer, ForeignKey("Ejecuciones.EjecucionID"), primary_key=True)
    preguntaid = Column("PreguntaID", Integer, ForeignKey("Preguntas.PreguntaID"), primary_key=True)
    respuestaid = Column("RespuestaID", Integer, ForeignKey("Respuestas.RespuestaID"))
    observacion = Column("Observacion", String(255))

    pregunta = relationship("Pregunta")
    respuesta = relationship("Respuesta")
