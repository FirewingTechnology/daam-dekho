from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("product_alert_engine")

class ProductAlertEngine:
    """Product Alert Engine — Price drop, lowest price ever, and stock notifications."""

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def check_and_create_alert(self, product_id: int, alert_type: str, message: str) -> dict:
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO product_alerts (product_id, alert_type, message, status)
                VALUES (?, ?, ?, 'ACTIVE')
            ''', (product_id, alert_type, message))
            conn.commit()
            conn.close()

            logger.info(f"Triggered Alert [{alert_type}] for Product #{product_id}: {message}")
            return {"status": "ALERT_CREATED", "product_id": product_id, "alert_type": alert_type}
        except Exception as e:
            logger.error(f"Alert creation failed: {e}")
            return {"status": "ERROR", "reason": str(e)}

    def get_active_alerts(self, limit: int = 10) -> list[dict]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, product_id, alert_type, message, created_at FROM product_alerts WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [
            {"id": r[0], "product_id": r[1], "alert_type": r[2], "message": r[3], "created_at": r[4]}
            for r in rows
        ]

product_alert_engine = ProductAlertEngine()
