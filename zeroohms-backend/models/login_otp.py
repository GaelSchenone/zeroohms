from sqlalchemy import Column, String, Integer, DateTime, ForeignKey

from .base import Base


class LoginOtp(Base):
    __tablename__ = "LoginOtps"

    usuario = Column("Usuario", String(20), ForeignKey("Usuarios.Usuario"), primary_key=True)
    codigo_hash = Column("CodigoHash", String(64), nullable=False)
    expira = Column("Expira", DateTime, nullable=False)
    intentos = Column("Intentos", Integer, nullable=False, default=0)
    creado = Column("Creado", DateTime, nullable=False)
