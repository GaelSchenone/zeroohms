from sqlalchemy import Column, String, Text

from .base import Base


class Propietario(Base):
    __tablename__ = "Propietarios"

    dni = Column("DNI", String(20), primary_key=True)
    nombre = Column("Nombre", String(50))
    apellido = Column("Apellido", String(50))
    contacto = Column("Contacto", String(100))
    email = Column("Email", String(100))
    telefono = Column("Telefono", String(30))
    direccion = Column("Direccion", String(200))
    observaciones = Column("Observaciones", Text)
