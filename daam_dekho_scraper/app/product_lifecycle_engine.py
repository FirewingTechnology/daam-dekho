from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("product_lifecycle_engine")

class ProductLifecycleEngine:
    """Enterprise Product Lifecycle State Machine — Never deletes products."""

    VALID_STATES = ['NEW', 'DISCOVERED', 'VERIFIED', 'ACTIVE', 'LIMITED_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED', 'ARCHIVED']

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def transition_state(self, product_id: int, new_state: str, reason: str = "") -> dict:
        if new_state not in self.VALID_STATES:
            return {"status": "INVALID_STATE", "reason": f"State must be one of {self.VALID_STATES}"}

        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO product_lifecycle (product_id, state, reason, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(product_id) DO UPDATE SET
                    state = excluded.state,
                    reason = excluded.reason,
                    updated_at = CURRENT_TIMESTAMP
            ''', (product_id, new_state, reason))
            conn.commit()
            conn.close()

            logger.info(f"Product #{product_id} transitioned to state '{new_state}' ({reason})")
            return {"status": "SUCCESS", "product_id": product_id, "state": new_state, "reason": reason}
        except Exception as e:
            logger.error(f"Lifecycle transition failed: {e}")
            return {"status": "ERROR", "reason": str(e)}

    def get_state(self, product_id: int) -> str:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT state FROM product_lifecycle WHERE product_id = ?", (product_id,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else "NEW"

product_lifecycle_engine = ProductLifecycleEngine()
