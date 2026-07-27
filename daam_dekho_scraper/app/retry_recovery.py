import time
from app.logger import get_logger

logger = get_logger("retry_recovery")

class RetryRecoveryEngine:
    """Automatic Network Timeout, Slow Mode, and Proxy Rotation Recovery Engine."""

    def execute_with_retry(self, func, *args, max_retries=3, initial_delay=2.0, **kwargs):
        delay = initial_delay
        for attempt in range(1, max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.warning(f"Execution failed (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s...")
                time.sleep(delay)
                delay *= 2.0  # Exponential backoff
        
        logger.error(f"Execution permanently failed after {max_retries} attempts.")
        raise RuntimeError(f"Operation failed after {max_retries} retries.")

retry_recovery_engine = RetryRecoveryEngine()
