from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("live_price_validator")

class LivePriceValidator:
    """Live Price & Price History Timeline Validator."""

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def validate_and_record_price(self, vendor_product_id: int, new_price: float, mrp: float = 0, vendor: str = "amazon") -> dict:
        if new_price <= 0:
            return {"status": "INVALID", "reason": "Non-positive price"}

        discount_pct = 0.0
        if mrp > new_price:
            discount_pct = round(((mrp - new_price) / mrp) * 100, 2)

        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            # Append to price_history (never overwrite)
            cursor.execute('''
                INSERT INTO price_history (vendor_product_id, price, recorded_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            ''', (vendor_product_id, new_price))
            conn.commit()
            conn.close()

            return {
                "status": "VALIDATED",
                "price": new_price,
                "mrp": mrp,
                "discount_percent": discount_pct,
                "recorded": True
            }
        except Exception as e:
            logger.error(f"Price validation recording failed: {e}")
            return {"status": "ERROR", "reason": str(e)}

live_price_validator = LivePriceValidator()
