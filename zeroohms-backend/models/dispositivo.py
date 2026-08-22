from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class Dispositivo(Base):
    __tablename__ = "Dispositivos"

    dispositivoid = Column("DispositivoID", Integer, primary_key=True, autoincrement=True)
    dni = Column("DNI", String(20), ForeignKey("Propietarios.DNI"))
    marca = Column("Marca", String(50))
    modelo = Column("Modelo", String(50))
    numeroserie = Column("NumeroSerie", String(100))
    foto = Column("Foto", String(100))

    propietario = relationship("Propietario", backref="dispositivos")
    accesorios = relationship("Accesorio", backref="dispositivo")


class Accesorio(Base):
    __tablename__ = "Accesorios"

    accesorioid = Column("AccesorioID", Integer, primary_key=True, autoincrement=True)
    dispositivoid = Column("DispositivoID", Integer, ForeignKey("Dispositivos.DispositivoID"))
    tkid = Column("TKID", Integer, ForeignKey("TKs.TKID"), nullable=True)
    nombre = Column("Nombre", String(50))
    referencia = Column("Referencia", String(50))
    foto = Column("Foto", String(255))
