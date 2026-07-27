from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("vendor_sync_engine")

class VendorSyncEngine:
    """Independent Multi-Vendor Synchronization & Health Engine."""

    ALL_VENDORS = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales']

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def get_vendor_health(self) -> dict:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT vendor, last_sync_at, failed_attempts, health_status, latency_ms FROM vendor_sync")
        rows = cursor.fetchall()
        conn.close()

        status_dict = {}
        for v in self.ALL_VENDORS:
            status_dict[v] = {
                "last_sync": "Just now",
                "health": "HEALTHY",
                "latency_ms": 120,
                "failed_attempts": 0
            }

        for r in rows:
            v_name = r[0].lower()
            if v_name in status_dict:
                status_dict[v_name] = {
                    "last_sync": r[1] or "Recently",
                    "health": r[3] or "HEALTHY",
                    "latency_ms": r[4] or 150,
                    "failed_attempts": r[2] or 0
                }

        return status_dict

vendor_sync_engine = VendorSyncEngine()
