from app.logger import get_logger

logger = get_logger("intelligent_stop_engine")

class IntelligentStopEngine:
    """Intelligent Crawl Termination Evaluator."""

    def should_stop(self, current_page: int, max_pages: int, items_found: int, duplicate_count: int, consecutive_empty: int = 0, admin_stopped: bool = False) -> tuple[bool, str]:
        if admin_stopped:
            return True, "Stopped by Admin request"

        if current_page >= max_pages:
            return True, f"Maximum pages limit reached ({max_pages} pages)"

        if consecutive_empty >= 2:
            return True, f"No new products found for {consecutive_empty} consecutive pages"

        if items_found > 10 and (duplicate_count / items_found) > 0.85:
            return True, "High duplicate ratio (>85%) detected — catalog exhausted"

        return False, "Continue"

intelligent_stop_engine = IntelligentStopEngine()
