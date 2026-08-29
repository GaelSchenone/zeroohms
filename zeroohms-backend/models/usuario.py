from sqlalchemy import Column, String, DateTime
from datetime import datetime

from .base import Base


class Usuario(Base):
    __tablename__ = "Usuarios"

    usuario = Column("Usuario", String(20), primary_key=True)
    mail = Column("Mail", String(50))
    clave = Column("Clave", String(255))
    nombre = Column("Nombre", String(50))
    apellido = Column("Apellido", String(50))
    fechacreacion = Column("FechaCreacion", DateTime, default=datetime.utcnow)
