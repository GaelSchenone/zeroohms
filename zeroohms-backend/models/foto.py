from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class Foto(Base):
    __tablename__ = "Fotos"

    fotoid = Column("FotoID", Integer, primary_key=True, autoincrement=True)
    tkid = Column("TKID", Integer, ForeignKey("TKs.TKID"), nullable=False)
    ruta = Column("Ruta", String(500), nullable=False)
    nombre = Column("Nombre", String(100))
    fechasubida = Column("FechaSubida", DateTime, default=datetime.utcnow)
