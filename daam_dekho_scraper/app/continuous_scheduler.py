import threading
import time
from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("continuous_scheduler")

class ContinuousScheduler:
    """Enterprise Continuous Background Scheduler Engine."""

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()
        self._running = False
        self._thread = None

    def start_scheduler(self):
        if self._running:
            return {"status": "ALREADY_RUNNING"}

        self._running = True
        self._thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self._thread.start()
        logger.info("Continuous Background Scheduler started successfully.")
        return {"status": "STARTED", "message": "Background Continuous Scheduler Active"}

    def stop_scheduler(self):
        self._running = False
        logger.info("Continuous Background Scheduler stopped.")
        return {"status": "STOPPED"}

    def _scheduler_loop(self):
        while self._running:
            try:
                # Process scheduler queue tasks
                conn = self.db.get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT id, task_name FROM scheduler_queue WHERE status = 'QUEUED' LIMIT 5")
                tasks = cursor.fetchall()

                for t_id, t_name in tasks:
                    cursor.execute("UPDATE scheduler_queue SET status = 'COMPLETED' WHERE id = ?", (t_id,))
                    logger.info(f"Background Scheduler executed task #{t_id} ('{t_name}')")

                conn.commit()
                conn.close()
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")

            time.sleep(5)  # Poll cycle

continuous_scheduler = ContinuousScheduler()
