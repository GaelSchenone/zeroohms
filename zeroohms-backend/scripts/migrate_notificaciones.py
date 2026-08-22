"""Migración idempotente: agrega EstadosTK.Notificado (bit, default 0).

Guarda si el webhook de "estado-cambiado" se pudo enviar para cada fila
de la bitácora de estados de un ticket.

Uso (desde zeroohms-backend/):  python3 scripts/migrate_notificaciones.py
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
        if _columna_existe(db, "EstadosTK", "Notificado"):
            print("La columna EstadosTK.Notificado ya existe, no se hace nada.")
            return

        db.execute(text("ALTER TABLE EstadosTK ADD COLUMN Notificado TINYINT(1) NOT NULL DEFAULT 0"))
        db.commit()
        print("Columna EstadosTK.Notificado agregada correctamente.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
