from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class CheckList(Base):
    __tablename__ = "CheckLists"

    checklistid = Column("CheckListID", Integer, primary_key=True, autoincrement=True)
    nombre = Column("Nombre", String(50), nullable=False)
    descripcion = Column("Descripcion", String(255))

    preguntas = relationship("Pregunta", backref="checklist")


class Pregunta(Base):
    __tablename__ = "Preguntas"

    preguntaid = Column("PreguntaID", Integer, primary_key=True, autoincrement=True)
    checklistid = Column("CheckListID", Integer, ForeignKey("CheckLists.CheckListID"))
    pregunta = Column("Pregunta", String(255))

    respuestas_validas = relationship("Respuesta", secondary="PreguntasRespuestas", backref="preguntas")


class Respuesta(Base):
    __tablename__ = "Respuestas"

    respuestaid = Column("RespuestaID", Integer, primary_key=True, autoincrement=True)
    respuesta = Column("Respuesta", String(50), unique=True, nullable=False)


class PreguntaRespuesta(Base):
    __tablename__ = "PreguntasRespuestas"

    preguntaid = Column("PreguntaID", Integer, ForeignKey("Preguntas.PreguntaID"), primary_key=True)
    respuestaid = Column("RespuestaID", Integer, ForeignKey("Respuestas.RespuestaID"), primary_key=True)
