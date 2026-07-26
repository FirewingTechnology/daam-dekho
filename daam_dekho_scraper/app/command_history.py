import uuid
import json
import sqlite3
from app.database.manager import db_manager

class CommandHistoryEngine:
    """Module 11: Scraper Command History Engine (v3.0)."""

    def record_command(self, query, preview_metadata, execution_result=None, operator="Administrator"):
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        cmd_uuid = f"CMD-{uuid.uuid4().hex[:12].upper()}"
        intent = preview_metadata.get('detected_intent', 'UNKNOWN')
        category = preview_metadata.get('detected_category', 'Mobiles')
        brand = preview_metadata.get('detected_brand', 'Generic')
        expansions = json.dumps(preview_metadata.get('expanded_queries', []))

        total_found = execution_result.get('total_found', 25) if execution_result else 25
        total_saved = execution_result.get('accepted_count', total_found) if execution_result else total_found
        runtime = execution_result.get('runtime_seconds', 1.5) if execution_result else 1.5

        cursor.execute("""
            INSERT INTO scraper_command_history 
            (command_uuid, original_query, detected_intent, detected_category, detected_brand, expanded_queries_json, total_found, total_saved, runtime_seconds, operator)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (cmd_uuid, query, intent, category, brand, expansions, total_found, total_saved, runtime, operator))

        conn.commit()
        conn.close()

        return cmd_uuid

    def get_history(self, limit=20):
        conn = db_manager.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM scraper_command_history ORDER BY executed_at DESC LIMIT ?", (limit,))
        history = [dict(r) for r in cursor.fetchall()]
        conn.close()

        return history

command_history = CommandHistoryEngine()
