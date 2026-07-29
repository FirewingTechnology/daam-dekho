from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("completeness_trust_score")

class CompletenessAndTrustScoreEngine:
    """Computes Product Completeness Score (0-100) & Vendor Trust Breakdown."""

    DEFAULT_VENDOR_TRUST = {
        "amazon": 99,
        "flipkart": 98,
        "croma": 97,
        "vijaysales": 96,
        "jiomart": 95
    }

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def calculate_completeness_score(self, product_id: int) -> dict:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT title, brand, category, canonical_title, base_image FROM products_master WHERE id = ?", (product_id,))
        pm = cursor.fetchone()
        
        if not pm:
            conn.close()
            return {
                "overall_score": 0,
                "vendor_coverage_score": 0,
                "specification_score": 0,
                "image_score": 0,
                "offer_score": 0,
                "validation_score": 0,
                "trust_score": 0,
                "completeness_score": 0,
                "status": "NOT_FOUND"
            }

        title, brand, category, canonical_title, base_image = pm[0], pm[1], pm[2], pm[3], pm[4]

        # 1. Image Score
        cursor.execute("SELECT COUNT(*) FROM product_images WHERE product_id = ?", (product_id,))
        img_count = cursor.fetchone()[0]
        image_score = 100 if img_count >= 3 else (75 if img_count >= 1 else (50 if base_image else 20))

        # 2. Spec Score
        cursor.execute("""
            SELECT COUNT(*) FROM product_specifications ps 
            JOIN product_variants pv ON ps.variant_id = pv.id 
            WHERE pv.product_id = ?
        """, (product_id,))
        spec_count = cursor.fetchone()[0]
        spec_score = 100 if spec_count >= 8 else (75 if spec_count >= 4 else (40 if spec_count >= 1 else 10))

        # 3. Vendor Coverage Score & Offer Score
        cursor.execute("""
            SELECT DISTINCT v.name, vp.price, vp.offers 
            FROM vendor_products vp 
            JOIN product_variants pv ON vp.variant_id = pv.id 
            JOIN vendors v ON vp.vendor_id = v.id 
            WHERE pv.product_id = ?
        """, (product_id,))
        vp_rows = cursor.fetchall()
        vendor_count = len(vp_rows)
        vendor_coverage_score = min(100, int((vendor_count / 5.0) * 100))

        has_offers = any(row[2] and row[2] not in ['[]', '{}', '', 'None'] for row in vp_rows)
        offer_score = 95 if has_offers else (75 if vendor_count > 0 else 0)

        # 4. Identity & Validation Score
        has_canonical = bool(canonical_title and len(canonical_title) > 5)
        has_valid_brand = bool(brand and brand.lower() not in ['generic', 'n/a', 'unknown'])
        validation_score = 100 if (has_canonical and has_valid_brand) else (60 if has_canonical else 30)

        # 5. Trust Score
        trust_score = int((validation_score * 0.4) + (vendor_coverage_score * 0.3) + (spec_score * 0.3))

        # Overall Completeness Score
        overall_score = int(
            (validation_score * 0.25) + 
            (vendor_coverage_score * 0.20) + 
            (spec_score * 0.20) + 
            (image_score * 0.15) + 
            (offer_score * 0.10) + 
            (trust_score * 0.10)
        )

        conn.close()

        return {
            "product_id": product_id,
            "overall_score": overall_score,
            "vendor_coverage_score": vendor_coverage_score,
            "specification_score": spec_score,
            "image_score": image_score,
            "offer_score": offer_score,
            "validation_score": validation_score,
            "trust_score": trust_score,
            "completeness_score": overall_score,
            "vendors_found_count": vendor_count,
            "vendor_trust_scores": self.DEFAULT_VENDOR_TRUST
        }

completeness_trust_score_engine = CompletenessAndTrustScoreEngine()

