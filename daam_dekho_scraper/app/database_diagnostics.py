import os
import sqlite3
from app.database.manager import db_manager

class DatabaseDiagnosticsEngine:
    """Phase 7: Database Diagnostics Engine."""

    def diagnose_database(self):
        db_path = str(db_manager.db_path)
        file_exists = os.path.exists(db_path)
        write_permitted = os.access(os.path.dirname(db_path) or ".", os.W_OK)

        conn_ok = False
        foreign_keys_ok = False
        wal_mode_ok = False
        tables_count = 0
        tables_list = []

        try:
            conn = db_manager.get_connection()
            cursor = conn.cursor()
            conn_ok = True

            cursor.execute("PRAGMA foreign_keys")
            foreign_keys_ok = bool(cursor.fetchone()[0])

            cursor.execute("PRAGMA journal_mode")
            journal_mode = cursor.fetchone()[0]
            wal_mode_ok = (journal_mode.lower() == 'wal')

            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables_list = [r[0] for r in cursor.fetchall()]
            tables_count = len(tables_list)

            conn.close()
        except Exception as e:
            conn_ok = False

        status = "HEALTHY" if (file_exists and conn_ok and write_permitted) else "DEGRADED"

        return {
            "status": status,
            "file_exists": file_exists,
            "write_permission": write_permitted,
            "connection_opened": conn_ok,
            "foreign_keys_enabled": foreign_keys_ok,
            "wal_mode_enabled": wal_mode_ok,
            "total_tables": tables_count,
            "tables": tables_list,
            "db_path": db_path
        }

database_diagnostics = DatabaseDiagnosticsEngine()
