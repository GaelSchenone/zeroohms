import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from sqlalchemy import text
from config.database import SessionLocal

COLUMNAS = [
    ("Nombre", "VARCHAR(50) NULL DEFAULT NULL"),
    ("Apellido", "VARCHAR(50) NULL DEFAULT NULL"),
]


def main() -> int:
    db = SessionLocal()
    try:
        existentes = {r[0] for r in db.execute(text(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuarios'")).all()}
        for nombre, definicion in COLUMNAS:
            if nombre in existentes:
                print(f"OK: columna {nombre} ya existe.")
                continue
            db.execute(text(f"ALTER TABLE Usuarios ADD COLUMN {nombre} {definicion}"))
            print(f"DDL: agregada columna {nombre}.")
        db.commit()
        return 0
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
