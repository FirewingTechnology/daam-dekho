import hashlib
import re
from urllib.parse import urlparse, parse_qs

class VendorIdentityEngine:
    """Generates deterministic vendor offer identities and SHA-256 hashes."""

    @classmethod
    def extract_vendor_product_id(cls, vendor_name, url, title=""):
        """Extracts ASIN, ItemID, ProductID, or canonical SKU identifier from URL."""
        if not url:
            return "unknown"

        v_lower = (vendor_name or "").lower().strip()
        url_clean = url.strip()

        # 1. Amazon (ASIN: B0...)
        if 'amazon' in v_lower or 'amazon' in url_clean.lower():
            asin_match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})', url_clean)
            if asin_match:
                return f"ASIN:{asin_match.group(1)}"
            
            # Query param fallback
            parsed = urlparse(url_clean)
            qs = parse_qs(parsed.query)
            if 'asin' in qs:
                return f"ASIN:{qs['asin'][0]}"

        # 2. Flipkart (ItemID: itm...)
        if 'flipkart' in v_lower or 'flipkart' in url_clean.lower():
            pid_match = re.search(r'pid=([A-Z0-9]{16})', url_clean, re.IGNORECASE)
            if pid_match:
                return f"ITEMID:{pid_match.group(1)}"
            
            itm_match = re.search(r'/p/(itm[a-z0-9]+)', url_clean, re.IGNORECASE)
            if itm_match:
                return f"ITEMID:{itm_match.group(1)}"

        # 3. JioMart (ProductID: mm...)
        if 'jiomart' in v_lower or 'jiomart' in url_clean.lower():
            jm_match = re.search(r'-([a-z0-9]+-\d+)$', url_clean.split('?')[0])
            if jm_match:
                return f"PRODID:{jm_match.group(1)}"
            
            digit_match = re.search(r'(\d{8,12})', url_clean)
            if digit_match:
                return f"PRODID:{digit_match.group(1)}"

        # 4. Croma / Vijay Sales / Reliance Digital
        croma_match = re.search(r'/p/(\d+)', url_clean)
        if croma_match:
            return f"PRODID:{croma_match.group(1)}"

        # Fallback to normalized path hash
        parsed = urlparse(url_clean)
        path_clean = parsed.path.strip('/').lower()
        return f"PATH:{path_clean}"

    @classmethod
    def generate_vendor_identity_hash(cls, vendor_name, url, title=""):
        """Generates SHA-256 vendor_identity_hash."""
        v_name = (vendor_name or "unknown").strip().lower()
        v_pid = cls.extract_vendor_product_id(vendor_name, url, title)
        
        identity_str = f"{v_name}|{v_pid}".lower()
        identity_hash = hashlib.sha256(identity_str.encode('utf-8')).hexdigest()

        return {
            "vendor_name": v_name,
            "vendor_product_id": v_pid,
            "identity_string": identity_str,
            "vendor_identity_hash": identity_hash
        }

vendor_identity_engine = VendorIdentityEngine()
