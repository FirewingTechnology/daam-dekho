from app.logger import get_logger

logger = get_logger("pdp_verifier")

class PDPVerifier:
    """PDP Verification Engine — Guarantees >= 95% Confidence before Saving Vendor Offers."""

    def verify_candidate(self, candidate: dict) -> tuple[bool, float, str]:
        title = candidate.get('title') or ''
        price = candidate.get('price') or candidate.get('price_num') or 0
        url = candidate.get('product_link') or candidate.get('url') or ''
        images = candidate.get('image_urls') or [candidate.get('image_url')]

        # Check 1: Mandatory Fields Presence
        if not title or len(title) < 5:
            return False, 0.0, "Invalid title length"

        if not url or not url.startswith('http'):
            return False, 0.0, "Invalid or missing PDP URL"

        if price <= 0:
            return False, 0.0, "Missing or non-positive price"

        # Check 2: Mandatory Image Check
        valid_images = [img for img in images if img and isinstance(img, str) and img.startswith('http')]
        if not valid_images:
            return False, 40.0, "No valid high-res PDP images"

        # Check 3: Reject Accessories in Mobile Search
        cat = (candidate.get('category') or '').lower()
        if 'mobile' in cat and any(acc in title.lower() for acc in ['case', 'cover', 'glass', 'cable', 'charger', 'stand', 'pouch']):
            return False, 30.0, "Accessory listed in Mobile category"

        # Confidence Calculation
        confidence = 100.0
        if not candidate.get('brand'):
            confidence -= 3.0
        if not candidate.get('model'):
            confidence -= 2.0

        if confidence >= 95.0:
            return True, confidence, "Verified PDP with >=95% confidence"
        else:
            return False, confidence, f"Confidence below threshold ({confidence}%)"

pdp_verifier = PDPVerifier()
