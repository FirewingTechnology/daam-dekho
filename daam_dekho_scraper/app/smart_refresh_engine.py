from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("smart_refresh_engine")

class SmartRefreshEngine:
    """Smart Refresh Prioritization Engine — Never refreshes everything equally."""

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def determine_refresh_interval(self, price_volatility: str = "NORMAL", lifecycle_state: str = "ACTIVE") -> int:
        if lifecycle_state == "DISCONTINUED" or lifecycle_state == "ARCHIVED":
            return 10080  # 7 days (1 week)
        elif price_volatility == "HIGH":
            return 30     # 30 minutes
        elif lifecycle_state == "ACTIVE":
            return 60     # 1 hour
        else:
            return 360    # 6 hours

    def schedule_product_refresh(self, product_id: int, volatility: str = "NORMAL") -> dict:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT state FROM product_lifecycle WHERE product_id = ?", (product_id,))
        row = cursor.fetchone()
        state = row[0] if row else "ACTIVE"

        interval = self.determine_refresh_interval(volatility, state)

        cursor.execute('''
            INSERT INTO refresh_schedule (product_id, interval_minutes, last_refreshed_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(product_id) DO UPDATE SET
                interval_minutes = excluded.interval_minutes,
                last_refreshed_at = CURRENT_TIMESTAMP
        ''', (product_id, interval))
        conn.commit()
        conn.close()

        return {"product_id": product_id, "interval_minutes": interval, "status": "SCHEDULED"}

smart_refresh_engine = SmartRefreshEngine()
