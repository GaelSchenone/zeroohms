"""Migración idempotente: 9 estados canónicos en PosEstadosTKs.

Estrategia (sin TRUNCATE ni DELETE — preserva FK EstadosTK.posestadotkid):
1. Ensancha PosEstado a VARCHAR(50) si hace falta ('diagnostico_realizado' = 21 chars).
2. Renombra in-place los 7 estados legacy a los nombres canónicos de su mismo slot
   posicional (el orden del flujo se mantiene: ids 1..7 ya están alineados al flujo).
3. Inserta los faltantes (ids 8 y 9) con INSERT IGNORE.

Uso (desde zeroohms-backend/):  python3 scripts/migrate_estados.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from config.database import SessionLocal

# Estados canónicos objetivo, en orden exacto posestadotkid 1..9.
CANONICAL = [
    (1, "ticket_creado", "El ticket fue creado y registramos el ingreso del equipo"),
    (2, "equipo_recibido", "El equipo fue recibido y revisado físicamente en el taller"),
    (3, "diagnostico_realizado", "Se completó el diagnóstico técnico del equipo"),
    (4, "esperando_aprobacion", "Presupuesto enviado, esperando aprobación del cliente"),
    (5, "en_reparacion", "El equipo se encuentra en proceso de reparación"),
    (6, "reparacion_finalizada", "La reparación finalizó y el equipo fue probado"),
    (7, "listo_para_retirar", "El equipo está listo para ser retirado por el cliente"),
    (8, "entregado", "El equipo fue entregado al cliente"),
    (9, "cancelado", "La reparación fue cancelada"),
]

# Mapeo legacy -> canónico por nombre actual (renombrado in-place, mismo id/slot).
LEGACY_RENAME = {
    "pendiente": "ticket_creado",
    "diagnosticado": "equipo_recibido",
    "presupuestado": "diagnostico_realizado",
    "en_reparacion": "esperando_aprobacion",
    "esperando_piezas": "en_reparacion",
    "listo_para_entregar": "reparacion_finalizada",
    "entregado": "listo_para_retirar",
}


def main() -> int:
    db = SessionLocal()
    try:
        # Idempotencia: si el catálogo ya es exactamente el canónico, no-op.
        actuales = db.execute(
            text("SELECT PosEstadoTKID, PosEstado FROM PosEstadosTKs ORDER BY PosEstadoTKID")
        ).all()
        if [(i, n) for i, n in actuales] == [(i, n) for i, n, _ in CANONICAL]:
            print("OK: catálogo ya contiene los 9 estados canónicos. No-op.")
            return 0

        # 1. Ensanchar columna (hereda charset/collation utf8mb4 de la tabla).
        ddl = db.execute(text("SHOW CREATE TABLE PosEstadosTKs")).fetchone()[1]
        if "varchar(20)" in ddl.lower():
            db.execute(text("ALTER TABLE PosEstadosTKs MODIFY PosEstado VARCHAR(50) NOT NULL"))
            print("DDL: PosEstado ensanchado a VARCHAR(50).")

        # 2. Renombrado in-place por nombre (mismo id => historial FK intacto).
        for viejo, nuevo in LEGACY_RENAME.items():
            row = db.execute(
                text("SELECT PosEstadoTKID FROM PosEstadosTKs WHERE PosEstado = :n"),
                {"n": viejo},
            ).fetchone()
            if row:
                db.execute(
                    text("UPDATE PosEstadosTKs SET PosEstado = :nuevo WHERE PosEstadoTKID = :id"),
                    {"nuevo": nuevo, "id": row[0]},
                )
                print(f"Renombrado id={row[0]}: '{viejo}' -> '{nuevo}'")

        # 3. Descripciones canónicas + inserción de faltantes (sin borrar nada).
        for pid, nombre, desc in CANONICAL:
            row = db.execute(
                text("SELECT PosEstadoTKID FROM PosEstadosTKs WHERE PosEstadoTKID = :id"),
                {"id": pid},
            ).fetchone()
            if row:
                db.execute(
                    text("UPDATE PosEstadosTKs SET PosEstado = :n, Descripcion = :d WHERE PosEstadoTKID = :id"),
                    {"n": nombre, "d": desc, "id": pid},
                )
            else:
                db.execute(
                    text("INSERT IGNORE INTO PosEstadosTKs (PosEstadoTKID, PosEstado, Descripcion) VALUES (:id, :n, :d)"),
                    {"id": pid, "n": nombre, "d": desc},
                )
                print(f"Insertado id={pid}: '{nombre}'")

        db.commit()

        # Verificación final.
        final = db.execute(
            text("SELECT PosEstadoTKID, PosEstado FROM PosEstadosTKs ORDER BY PosEstadoTKID")
        ).all()
        esperado = [(i, n) for i, n, _ in CANONICAL]
        if list(final) != esperado:
            print(f"ERROR: catálogo final inesperado: {final}")
            return 1
        print("OK: migración completa. Catálogo final:")
        for i, n in final:
            print(f"  {i}. {n}")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
