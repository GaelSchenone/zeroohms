from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


# === PosEstados (catálogos) ===

class PosEstadoUsuario(Base):
    __tablename__ = "PosEstadosUsuarios"

    posestadouid = Column("PosEstadoUID", Integer, primary_key=True, autoincrement=True)
    posestado = Column("PosEstado", String(20), nullable=False)


class PosEstadoTK(Base):
    __tablename__ = "PosEstadosTKs"

    posestadotkid = Column("PosEstadoTKID", Integer, primary_key=True, autoincrement=True)
    posestado = Column("PosEstado", String(20), nullable=False)
    descripcion = Column("Descripcion", String(255))


class PosEstadoTarea(Base):
    __tablename__ = "PosEstadosTareas"

    posestadotid = Column("PosEstadoTID", Integer, primary_key=True, autoincrement=True)
    posestado = Column("PosEstado", String(20), nullable=False)


class PosEstadoPresupuesto(Base):
    __tablename__ = "PosEstadosPresupuestos"

    posestado_pid = Column("PosEstadoPID", Integer, primary_key=True, autoincrement=True)
    posestado = Column("PosEstado", String(30), nullable=False)
    descripcion = Column("Descripcion", String(255))


# === Estados (bitácora con fecha) ===

class EstadoUsuario(Base):
    __tablename__ = "EstadosUsuario"

    posestadouid = Column("PosEstadoUID", Integer, ForeignKey("PosEstadosUsuarios.PosEstadoUID"), primary_key=True)
    usuario = Column("Usuario", String(20), ForeignKey("Usuarios.Usuario"), primary_key=True)
    fechacambio = Column("FechaCambio", DateTime, default=datetime.utcnow, primary_key=True)

    estado_pos = relationship("PosEstadoUsuario")


class EstadoTK(Base):
    __tablename__ = "EstadosTK"

    posestadotkid = Column("PosEstadoTKID", Integer, ForeignKey("PosEstadosTKs.PosEstadoTKID"), primary_key=True)
    tkid = Column("TKID", Integer, ForeignKey("TKs.TKID"), primary_key=True)
    fechacambio = Column("FechaCambio", DateTime, default=datetime.utcnow, primary_key=True)
    notificado = Column("Notificado", Boolean, nullable=False, default=False)

    estado_pos = relationship("PosEstadoTK")


class EstadoTarea(Base):
    __tablename__ = "EstadosTarea"

    posestadotid = Column("PosEstadoTID", Integer, ForeignKey("PosEstadosTareas.PosEstadoTID"), primary_key=True)
    tareaid = Column("TareaID", Integer, ForeignKey("Tareas.TareaID"), primary_key=True)
    fechacambio = Column("FechaCambio", DateTime, default=datetime.utcnow, primary_key=True)

    estado_pos = relationship("PosEstadoTarea")


class EstadoPresupuesto(Base):
    __tablename__ = "EstadosPresupuesto"

    posestado_pid = Column("PosEstadoPID", Integer, ForeignKey("PosEstadosPresupuestos.PosEstadoPID"), primary_key=True)
    presupuestoid = Column("PresupuestoID", Integer, ForeignKey("Presupuestos.PresupuestoID"), primary_key=True)
    fechacambio = Column("FechaCambio", DateTime, default=datetime.utcnow, primary_key=True)

    estado_pos = relationship("PosEstadoPresupuesto")
