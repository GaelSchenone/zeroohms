from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey

from .base import Base


class GoogleConexion(Base):
    __tablename__ = "GoogleConexiones"

    usuario = Column("Usuario", String(20), ForeignKey("Usuarios.Usuario"), primary_key=True)
    refresh_token = Column("RefreshToken", String(512), nullable=False)
    google_email = Column("GoogleEmail", String(100))
    tasklist_id = Column("TasklistID", String(64))
    valido = Column("Valido", Boolean, nullable=False, default=True)
    conectado = Column("Conectado", DateTime, nullable=False)
