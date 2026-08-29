from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class Tarea(Base):
    __tablename__ = "Tareas"

    tareaid = Column("TareaID", Integer, primary_key=True, autoincrement=True)
    tkid = Column("TKID", Integer, ForeignKey("TKs.TKID"))
    usuario = Column("Usuario", String(20), ForeignKey("Usuarios.Usuario"))
    descripcion = Column("Descripcion", String(255))
    prioridad = Column("Prioridad", Enum("baja", "media", "alta"))
    fechaasignacion = Column("FechaAsignacion", DateTime, default=datetime.utcnow)
    fechalimite = Column("FechaLimite", Date, nullable=True)
    google_task_id = Column("GoogleTaskID", String(64), nullable=True)

    asignado_a = relationship("Usuario", backref="tareas")
