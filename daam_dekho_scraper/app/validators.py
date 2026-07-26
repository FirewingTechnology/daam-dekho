import re
from urllib.parse import urlparse

class ImageValidator:
    """Validates product images according to enterprise quality rules."""

    REJECT_EXTENSIONS = ['.svg', '.gif', '.ico']
    REJECT_KEYWORDS = [
        'logo', 'banner', 'placeholder', 'no-image', 'default',
        'icon', 'sprite', 'avatar', 'badge', 'button', 'loading', 'spinner'
    ]

    @classmethod
    def validate_image_url(cls, image_url, min_dim=100):
        """Returns True if image URL passes quality check, else False."""
        if not image_url or not isinstance(image_url, str):
            return False, "Empty or invalid URL type"

        url_lower = image_url.lower()

        # Reject disallowed extensions
        if any(url_lower.endswith(ext) for ext in cls.REJECT_EXTENSIONS):
            return False, "Disallowed file format (SVG/GIF/ICO)"

        # Reject logo/banner/placeholder keywords
        if any(kw in url_lower for kw in cls.REJECT_KEYWORDS):
            return False, "Contains placeholder or logo keyword"

        # Check dimension indicators in URL if present (e.g., 50x50, _SL50_)
        dim_match = re.search(r'[\._](\d{2,4})[x_](\d{2,4})[\._]', url_lower)
        if dim_match:
            w, h = int(dim_match.group(1)), int(dim_match.group(2))
            if w < min_dim or h < min_dim:
                return False, f"Image dimensions too small ({w}x{h})"

        return True, "Valid High-Resolution Image"


class UrlValidator:
    """Validates product URLs to ensure canonical PDPs."""

    NON_PDP_PATTERNS = [
        r'^https?://[^/]+/?$',                 # Homepage
        r'/search',                             # Search page
        r'/s\?',                                # Amazon search query
        r'/category',                           # Category page
        r'/browse',                             # Browse page
        r'/cart',                               # Cart page
        r'/checkout',                           # Checkout page
        r'/account',                            # Account page
        r'/login'                               # Login page
    ]

    @classmethod
    def validate_pdp_url(cls, url, vendor_name=""):
        """Returns True if URL is a valid product detail page (PDP), else False."""
        if not url or not isinstance(url, str):
            return False, "Empty or invalid URL"

        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False, "Malformed URL format"

        url_lower = url.lower()

        for pattern in cls.NON_PDP_PATTERNS:
            if re.search(pattern, url_lower):
                return False, f"Rejected non-PDP URL pattern: {pattern}"

        # Vendor specific PDP checks
        if "amazon" in url_lower and "/dp/" not in url_lower and "/gp/product/" not in url_lower:
            return False, "Invalid Amazon PDP URL (missing /dp/ or /gp/product/)"

        if "flipkart" in url_lower and "/p/" not in url_lower:
            return False, "Invalid Flipkart PDP URL (missing /p/)"

        if "croma" in url_lower and "/p/" not in url_lower and "/products/" not in url_lower:
            return False, "Invalid Croma PDP URL"

        return True, "Valid Canonical PDP URL"

image_validator = ImageValidator()
url_validator = UrlValidator()
