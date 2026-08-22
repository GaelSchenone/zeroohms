"""Migración idempotente: crea la tabla ItemsPresupuesto.

Permite desglosar un presupuesto en ítems (repuestos, mano de obra, otros)
en vez de un único monto global. El monto del presupuesto se recalcula
en la aplicación a partir de la suma de sus ítems.

Uso (desde zeroohms-backend/):  python3 scripts/migrate_items_presupuesto.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from config.database import SessionLocal


def _tabla_existe(db, tabla: str) -> bool:
    total = db.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla"
        ),
        {"tabla": tabla},
    ).scalar()
    return total > 0


def main():
    db = SessionLocal()
    try:
        if _tabla_existe(db, "ItemsPresupuesto"):
            print("La tabla ItemsPresupuesto ya existe, no se hace nada.")
            return

        db.execute(
            text(
                """
                CREATE TABLE ItemsPresupuesto (
                    ItemPresupuestoID INT AUTO_INCREMENT PRIMARY KEY,
                    PresupuestoID INT NOT NULL,
                    Tipo ENUM('repuesto', 'mano_obra', 'otro') NOT NULL DEFAULT 'repuesto',
                    Descripcion VARCHAR(150) NOT NULL,
                    Cantidad DECIMAL(10, 2) NOT NULL DEFAULT 1,
                    PrecioUnitario DECIMAL(10, 2) NOT NULL,
                    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_itemspresupuesto_presupuesto
                        FOREIGN KEY (PresupuestoID) REFERENCES Presupuestos(PresupuestoID)
                )
                """
            )
        )
        db.commit()
        print("Tabla ItemsPresupuesto creada correctamente.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
