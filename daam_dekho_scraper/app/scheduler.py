import threading
import time
import os
import sqlite3
import shutil
import urllib.request
from datetime import datetime
from pathlib import Path
from app.logger import get_logger
from app.config import DB_PATH

logger = get_logger("production_scheduler")

class ProductionScheduler:
    def __init__(self):
        self.preset = "manual"  # hourly, 6_hours, daily, weekly, manual
        self.vendors = ["amazon", "flipkart", "croma", "jiomart", "vijaysales"]
        self.categories = ["mobiles", "laptops"]
        self.concurrency = 2
        self.retry_policy = {"max_retries": 3, "backoff_seconds": 5}
        self.is_running = False
        self.last_run_time = None
        self.next_run_time = None
        self.run_history = []
        self._thread = None
        self._stop_event = threading.Event()

    def get_status(self):
        return {
            "preset": self.preset,
            "is_running": self.is_running,
            "vendors": self.vendors,
            "categories": self.categories,
            "concurrency": self.concurrency,
            "retry_policy": self.retry_policy,
            "last_run_time": self.last_run_time,
            "next_run_time": self.next_run_time,
            "history_count": len(self.run_history)
        }

    def update_config(self, preset=None, vendors=None, categories=None, concurrency=None, retry_policy=None):
        if preset: self.preset = preset
        if vendors: self.vendors = vendors
        if categories: self.categories = categories
        if concurrency: self.concurrency = int(concurrency)
        if retry_policy: self.retry_policy = retry_policy
        logger.info(f"Scheduler config updated: preset={self.preset}, vendors={self.vendors}")
        return self.get_status()

    def run_preflight_checks(self):
        """Module 12: Production Readiness Auto-Check before starting scheduled jobs."""
        logger.info("Executing Pre-Flight Production Readiness Checks...")
        checks = {}

        # 1. Database Integrity Check
        try:
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute("PRAGMA foreign_key_check;")
            fk_errs = len(cur.fetchall())
            conn.close()
            checks["db_integrity"] = {"status": "PASS" if fk_errs == 0 else "FAIL", "fk_errors": fk_errs}
        except Exception as e:
            checks["db_integrity"] = {"status": "FAIL", "error": str(e)}

        # 2. Connectivity Check
        try:
            req = urllib.request.Request("https://www.google.com", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                checks["connectivity"] = {"status": "PASS" if resp.getcode() == 200 else "FAIL"}
        except Exception as e:
            checks["connectivity"] = {"status": "FAIL", "error": str(e)}

        # 3. Disk Space Check
        try:
            total, used, free = shutil.disk_usage(Path(DB_PATH).parent)
            free_gb = round(free / (1024 ** 3), 2)
            checks["disk_space"] = {"status": "PASS" if free_gb >= 1.0 else "WARN", "free_gb": free_gb}
        except Exception as e:
            checks["disk_space"] = {"status": "WARN", "error": str(e)}

        all_pass = all(v["status"] == "PASS" for v in checks.values())
        logger.info(f"Pre-Flight Checks Complete — Result: {'PASS' if all_pass else 'ABORT SAFE'}")
        return all_pass, checks

    def start(self):
        if self.is_running:
            return False, "Scheduler already running"
        self._stop_event.clear()
        self.is_running = True
        self._thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self._thread.start()
        logger.info(f"Production Scheduler started with preset: {self.preset}")
        return True, "Scheduler started"

    def stop(self):
        if not self.is_running:
            return False, "Scheduler is not running"
        self._stop_event.set()
        self.is_running = False
        logger.info("Production Scheduler stopped")
        return True, "Scheduler stopped"

    def _scheduler_loop(self):
        interval_seconds = {
            "hourly": 3600,
            "6_hours": 21600,
            "daily": 86400,
            "weekly": 604800,
            "manual": 3600
        }.get(self.preset, 3600)

        while not self._stop_event.is_set():
            self.last_run_time = datetime.now().isoformat()
            ok, preflight = self.run_preflight_checks()
            if ok:
                logger.info(f"Starting scheduled scrape job for vendors: {self.vendors}")
                from app.pipeline import ScraperPipeline
                pipeline = ScraperPipeline(vendors_to_use=self.vendors)
                try:
                    pipeline.run_search(query="iPhone 15", category="mobiles")
                    self.run_history.append({"timestamp": self.last_run_time, "status": "SUCCESS"})
                except Exception as e:
                    logger.error(f"Scheduled job error: {e}")
                    self.run_history.append({"timestamp": self.last_run_time, "status": f"FAILED: {e}"})
            else:
                logger.warning(f"Aborting scheduled job due to failed preflight checks: {preflight}")
                self.run_history.append({"timestamp": self.last_run_time, "status": "ABORTED_PREFLIGHT"})

            self._stop_event.wait(interval_seconds)

scheduler = ProductionScheduler()
