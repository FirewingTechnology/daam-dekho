import queue
import threading
from app.logger import get_logger

logger = get_logger("crawl_queue_manager")

class CrawlQueueManager:
    """Observable 7-Stage Multi-Threaded Crawl Queue Manager."""

    def __init__(self):
        self.queues = {
            "search": queue.Queue(),
            "candidate": queue.Queue(),
            "pdp": queue.Queue(),
            "verification": queue.Queue(),
            "identity": queue.Queue(),
            "merge": queue.Queue(),
            "save": queue.Queue()
        }
        self.completed_count = 0
        self._lock = threading.Lock()

    def push(self, stage_name: str, item: dict):
        if stage_name in self.queues:
            self.queues[stage_name].put(item)

    def pop(self, stage_name: str, timeout: float = 1.0):
        if stage_name in self.queues:
            try:
                return self.queues[stage_name].get(timeout=timeout)
            except queue.Empty:
                return None
        return None

    def mark_completed(self):
        with self._lock:
            self.completed_count += 1

    def get_snapshot(self) -> dict:
        return {
            "search_queue": self.queues["search"].qsize(),
            "candidate_queue": self.queues["candidate"].qsize(),
            "pdp_queue": self.queues["pdp"].qsize(),
            "verification_queue": self.queues["verification"].qsize(),
            "identity_queue": self.queues["identity"].qsize(),
            "merge_queue": self.queues["merge"].qsize(),
            "save_queue": self.queues["save"].qsize(),
            "completed_count": self.completed_count
        }

crawl_queue_manager = CrawlQueueManager()
