from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class Ticket(Base):
    __tablename__ = "TKs"

    tkid = Column("TKID", Integer, primary_key=True, autoincrement=True)
    codigoseguimiento = Column("CodigoSeguimiento", String(12), unique=True)
    usuario = Column("Usuario", String(20), ForeignKey("Usuarios.Usuario"))
    dispositivoid = Column("DispositivoID", Integer, ForeignKey("Dispositivos.DispositivoID"))
    descripcionproblema = Column("DescripcionProblema", Text)
    fechacreacion = Column("FechaCreacion", DateTime, default=datetime.utcnow)

    asignado_a = relationship("Usuario", backref="tickets")
    dispositivo = relationship("Dispositivo", backref="tickets")
    tareas = relationship("Tarea", backref="ticket")
    presupuestos = relationship("Presupuesto", backref="ticket")
    fotos = relationship("Foto", backref="ticket")
    ejecuciones = relationship("Ejecucion", backref="ticket")
