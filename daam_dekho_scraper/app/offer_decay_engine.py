from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("offer_decay_engine")

class OfferDecayEngine:
    """Tracks offer expiration and decay without deleting historical listings."""

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def mark_offer_expired(self, vendor_product_id: int, reason: str = "Disappeared from search/PDP") -> dict:
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            # Update status in vendor_products table if column exists, or log event
            cursor.execute('''
                INSERT INTO product_events (product_id, event_type, old_value, new_value, vendor)
                VALUES (?, 'OFFER_EXPIRED', 'ACTIVE', 'EXPIRED', 'vendor')
            ''', (vendor_product_id,))
            conn.commit()
            conn.close()

            logger.info(f"Vendor Offer #{vendor_product_id} marked EXPIRED ({reason}). Retained in DB history.")
            return {"status": "EXPIRED", "vendor_product_id": vendor_product_id, "reason": reason}
        except Exception as e:
            logger.error(f"Offer decay marking failed: {e}")
            return {"status": "ERROR", "reason": str(e)}

offer_decay_engine = OfferDecayEngine()
