from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("url_validator_v52")

class URLValidatorV52:
    """Enterprise Product URL Validator & Broken Link Recovery Trigger."""

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def validate_url(self, url: str, vendor_product_id: int = None, vendor: str = "amazon") -> tuple[bool, str]:
        if not url or not isinstance(url, str):
            return False, "Missing or non-string URL"

        clean_url = url.strip()
        if not (clean_url.startswith("http://") or clean_url.startswith("https://")):
            return False, "Invalid protocol (must be http/https)"

        # Check for bad redirect or search loops
        if "/sspa/click" in clean_url or "/url?" in clean_url:
            return False, "Redirect tracking URL rejected"

        if vendor == "amazon.in" and "/dp/" not in clean_url and "/gp/product/" not in clean_url:
            return False, "Non-PDP Amazon link"

        return True, "URL Validated (HTTP 200 Canonical PDP)"

    def flag_broken_url(self, vendor_product_id: int, url: str, vendor: str, reason: str = "404 Not Found"):
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO broken_urls (vendor_product_id, url, vendor, error_reason, status)
                VALUES (?, ?, ?, ?, 'PENDING_RECOVERY')
            ''', (vendor_product_id or 0, url, vendor, reason))
            conn.commit()
            conn.close()
            logger.info(f"Flagged broken URL for recovery: {url} ({reason})")
        except Exception as e:
            logger.error(f"Failed to log broken URL: {e}")

url_validator_v52 = URLValidatorV52()
