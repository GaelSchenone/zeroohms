"""Migración idempotente: tabla LoginOtps para el 2FA por mail del login.

Uso (desde zeroohms-backend/):  python3 scripts/migrate_login_otp.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from config.database import SessionLocal

DDL = """
CREATE TABLE LoginOtps (
    Usuario VARCHAR(20) NOT NULL PRIMARY KEY,
    CodigoHash VARCHAR(64) NOT NULL,
    Expira DATETIME NOT NULL,
    Intentos INT NOT NULL DEFAULT 0,
    Creado DATETIME NOT NULL,
    CONSTRAINT FK_LoginOtps_Usuario FOREIGN KEY (Usuario) REFERENCES Usuarios (Usuario)
)
"""


def main() -> int:
    db = SessionLocal()
    try:
        existe = db.execute(
            text(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'LoginOtps'"
            )
        ).scalar()
        if existe:
            print("OK: tabla LoginOtps ya existe. No-op.")
            return 0
        db.execute(text(DDL))
        db.commit()
        print("DDL: creada tabla LoginOtps.")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
