from sqlalchemy import Column, Integer, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class Presupuesto(Base):
    __tablename__ = "Presupuestos"

    presupuestoid = Column("PresupuestoID", Integer, primary_key=True, autoincrement=True)
    tkid = Column("TKID", Integer, ForeignKey("TKs.TKID"), nullable=False)
    monto = Column("Monto", Numeric(10, 2), nullable=False)
    fechacreacion = Column("FechaCreacion", DateTime, default=datetime.utcnow)
    fechavalidez = Column("FechaValidez", DateTime)
