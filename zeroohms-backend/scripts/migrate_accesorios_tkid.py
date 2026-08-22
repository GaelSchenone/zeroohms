"""Migración idempotente: agrega Accesorios.TKID (nullable, FK a TKs).

Permite registrar con qué accesorios (cargador, cables, funda, etc.)
ingresó el equipo en un ticket puntual, sin perder la columna existente
DispositivoID (un mismo dispositivo puede reingresar en tickets distintos
con accesorios distintos).

Uso (desde zeroohms-backend/):  python3 scripts/migrate_accesorios_tkid.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from config.database import SessionLocal


def _columna_existe(db, tabla: str, columna: str) -> bool:
    total = db.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND COLUMN_NAME = :columna"
        ),
        {"tabla": tabla, "columna": columna},
    ).scalar()
    return total > 0


def main():
    db = SessionLocal()
    try:
        if _columna_existe(db, "Accesorios", "TKID"):
            print("La columna Accesorios.TKID ya existe, no se hace nada.")
            return

        db.execute(text("ALTER TABLE Accesorios ADD COLUMN TKID INT NULL"))
        db.execute(
            text(
                "ALTER TABLE Accesorios ADD CONSTRAINT fk_accesorios_tk "
                "FOREIGN KEY (TKID) REFERENCES TKs(TKID)"
            )
        )
        db.commit()
        print("Columna Accesorios.TKID agregada correctamente.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
