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
        
        cursor.execute("SELECT title, brand, category, canonical_title FROM products_master WHERE id = ?", (product_id,))
        pm = cursor.fetchone()
        
        if not pm:
            conn.close()
            return {"completeness_score": 0, "trust_score": 0, "vendor_trust_scores": self.DEFAULT_VENDOR_TRUST, "status": "NOT_FOUND"}


        # Calculate score weights
        score = 0
        if pm[0]: score += 15  # Title
        if pm[1]: score += 15  # Brand
        if pm[2]: score += 15  # Category
        if pm[3]: score += 15  # Canonical Title

        cursor.execute("SELECT COUNT(*) FROM vendor_products vp JOIN product_variants pv ON vp.variant_id = pv.id WHERE pv.product_id = ?", (product_id,))
        vp_count = cursor.fetchone()[0]
        conn.close()

        if vp_count >= 3: score += 40
        elif vp_count >= 1: score += 20

        return {
            "product_id": product_id,
            "completeness_score": min(100, score),
            "vendor_offers_count": vp_count,
            "vendor_trust_scores": self.DEFAULT_VENDOR_TRUST
        }

completeness_trust_score_engine = CompletenessAndTrustScoreEngine()
