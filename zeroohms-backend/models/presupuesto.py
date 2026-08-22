from sqlalchemy import Column, Integer, DateTime, ForeignKey, Numeric, String, Enum
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

    items = relationship("ItemPresupuesto", backref="presupuesto", cascade="all, delete-orphan")


class ItemPresupuesto(Base):
    __tablename__ = "ItemsPresupuesto"

    itempresupuestoid = Column("ItemPresupuestoID", Integer, primary_key=True, autoincrement=True)
    presupuestoid = Column("PresupuestoID", Integer, ForeignKey("Presupuestos.PresupuestoID"), nullable=False)
    tipo = Column("Tipo", Enum("repuesto", "mano_obra", "otro"), default="repuesto", nullable=False)
    descripcion = Column("Descripcion", String(150), nullable=False)
    cantidad = Column("Cantidad", Numeric(10, 2), default=1, nullable=False)
    preciounitario = Column("PrecioUnitario", Numeric(10, 2), nullable=False)
    fechacreacion = Column("FechaCreacion", DateTime, default=datetime.utcnow)
