from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("event_detection_engine")

class EventDetectionEngine:
    """Detects catalog changes and records immutable audit events."""

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def record_event(self, product_id: int, event_type: str, old_val: str, new_val: str, vendor: str = "all") -> dict:
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO product_events (product_id, event_type, old_value, new_value, vendor, created_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (product_id, event_type, str(old_val), str(new_val), vendor))
            conn.commit()
            conn.close()

            logger.info(f"Recorded Immutable Event [{event_type}] for Product #{product_id}: '{old_val}' -> '{new_val}'")
            return {"status": "RECORDED", "event_type": event_type, "product_id": product_id}
        except Exception as e:
            logger.error(f"Event recording failed: {e}")
            return {"status": "ERROR", "reason": str(e)}

    def get_events(self, product_id: int) -> list[dict]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, event_type, old_value, new_value, vendor, created_at FROM product_events WHERE product_id = ? ORDER BY id DESC", (product_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            {"id": r[0], "event_type": r[1], "old_value": r[2], "new_value": r[3], "vendor": r[4], "created_at": r[5]}
            for r in rows
        ]

event_detection_engine = EventDetectionEngine()
