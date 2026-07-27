import threading
import time
from app.logger import get_logger

logger = get_logger("telemetry_manager")

class TelemetryManager:
    """Enterprise Unified Telemetry Manager — Single Source of Truth for Scraper & Pipeline State."""

    def __init__(self):
        self._lock = threading.Lock()
        self._state = self.create_initial_state()

    def create_initial_state(self) -> dict:
        return {
            "session_id": "SESS-STANDBY",
            "status": "Idle",
            "stage": "System Operational",
            "job_type": "Standby",
            "pid": None,
            "exit_code": None,
            "exit_status": "Ready",
            "error_message": None,
            "failed_vendor": None,
            "failed_product": None,
            "current_vendor": "--",
            "current_category": "--",
            "current_product": "--",
            "started_at": "--:--:--",
            "completed_at": "--:--:--",
            "pages_crawled": 0,
            "raw_listings": 0,
            "accepted_listings": 0,
            "rejected_products": 0,
            "duplicate_products": 0,
            "hardware_models": 0,
            "master_products": 0,
            "vendor_offers": 0,
            "imported_products": 0,
            "products_updated": 0,
            "products_found": 0,
            "image_downloaded": 0,
            "runtime_sec": 0,
            "runtime_formatted": "0s",
            "memory_mb": 0.0,
            "cpu_percent": 0.0,
            "progress": 0,
            "vendor_counts": {"amazon": 0, "flipkart": 0, "croma": 0, "jiomart": 0, "vijaysales": 0}
        }

    def reset(self, job_type: str = "Standby"):
        with self._lock:
            self._state = self.create_initial_state()
            self._state["job_type"] = job_type
            self._state["started_at"] = time.strftime("%H:%M:%S")

    def update_metrics(self, updates: dict):
        with self._lock:
            for k, v in updates.items():
                if k in self._state:
                    self._state[k] = v

    def get_telemetry(self) -> dict:

        with self._lock:
            # Sync alias properties so both Top Cards and Summary Card consume identical data
            st = dict(self._state)
            st["pages_scraped"] = st["pages_crawled"]
            st["raw_listings"] = st["products_found"] or st["raw_listings"]
            st["master_products"] = st["imported_products"] or st["master_products"]
            st["vendor_offers"] = st["products_updated"] or st["vendor_offers"]
            st["unique_hardware_models"] = st["hardware_models"] or st["imported_products"]
            return st

telemetry_manager = TelemetryManager()
