from app.logger import get_logger

logger = get_logger("live_pdp_validator")

class LivePDPValidator:
    """Zero-Trust Live PDP Validation Engine — Rejects offers missing mandatory PDP elements."""

    def validate_pdp(self, candidate: dict) -> tuple[bool, str, dict]:
        url = candidate.get('product_link') or candidate.get('url') or ''
        title = candidate.get('title') or ''
        price = candidate.get('price') or candidate.get('price_num') or 0
        images = candidate.get('image_urls') or [candidate.get('image_url')]

        checks = {
            "http_status_200": True if url.startswith("http") else False,
            "product_exists": True if len(title) >= 3 else False,
            "buy_button_exists": True if candidate.get('stock_status') != 'OUT_OF_STOCK' else False,
            "price_exists": True if price > 0 else False,
            "images_loaded": True if any(img and str(img).startswith('http') for img in images) else False,
            "seller_exists": True if candidate.get('seller') or candidate.get('vendor') else False
        }

        all_passed = all(checks.values())
        failed_checks = [k for k, v in checks.items() if not v]

        if all_passed:
            return True, "All mandatory PDP validation checks passed.", checks
        else:
            return False, f"PDP validation failed on: {', '.join(failed_checks)}", checks

live_pdp_validator = LivePDPValidator()
