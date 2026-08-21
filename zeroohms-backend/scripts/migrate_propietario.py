"""Migración idempotente: columnas Direccion y Observaciones en Propietarios.

Uso (desde zeroohms-backend/):  python3 scripts/migrate_propietario.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from config.database import SessionLocal

COLUMNAS = [
    ("Direccion", "VARCHAR(200) NULL DEFAULT NULL"),
    ("Observaciones", "TEXT NULL"),
]


def main() -> int:
    db = SessionLocal()
    try:
        existentes = {
            r[0]
            for r in db.execute(
                text(
                    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Propietarios'"
                )
            ).all()
        }
        cambios = False
        for nombre, definicion in COLUMNAS:
            if nombre in existentes:
                print(f"OK: columna {nombre} ya existe.")
                continue
            db.execute(text(f"ALTER TABLE Propietarios ADD COLUMN {nombre} {definicion}"))
            print(f"DDL: agregada columna {nombre}.")
            cambios = True
        db.commit()
        if not cambios:
            print("OK: nada por migrar. No-op.")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
