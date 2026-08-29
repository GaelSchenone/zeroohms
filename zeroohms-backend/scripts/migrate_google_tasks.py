"""Migración idempotente: tabla GoogleConexiones + columna GoogleTaskID en Tareas.

Uso (desde zeroohms-backend/):  python3 scripts/migrate_google_tasks.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from config.database import SessionLocal

DDL_TABLA = """
CREATE TABLE GoogleConexiones (
    Usuario VARCHAR(20) NOT NULL PRIMARY KEY,
    RefreshToken VARCHAR(512) NOT NULL,
    GoogleEmail VARCHAR(100) NULL,
    TasklistID VARCHAR(64) NULL,
    Valido BOOLEAN NOT NULL DEFAULT TRUE,
    Conectado DATETIME NOT NULL,
    CONSTRAINT FK_GoogleConexiones_Usuario FOREIGN KEY (Usuario) REFERENCES Usuarios (Usuario)
)
"""

COLUMNAS_TAREAS = [
    ("GoogleTaskID", "VARCHAR(64) NULL DEFAULT NULL"),
]


def main() -> int:
    db = SessionLocal()
    try:
        existe_tabla = db.execute(
            text(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'GoogleConexiones'"
            )
        ).scalar()
        if existe_tabla:
            print("OK: tabla GoogleConexiones ya existe.")
        else:
            db.execute(text(DDL_TABLA))
            print("DDL: creada tabla GoogleConexiones.")

        existentes = {
            r[0]
            for r in db.execute(
                text(
                    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Tareas'"
                )
            ).all()
        }
        for nombre, definicion in COLUMNAS_TAREAS:
            if nombre in existentes:
                print(f"OK: columna {nombre} ya existe.")
                continue
            db.execute(text(f"ALTER TABLE Tareas ADD COLUMN {nombre} {definicion}"))
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
