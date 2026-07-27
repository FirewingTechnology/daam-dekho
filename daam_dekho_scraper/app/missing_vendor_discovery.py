from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("missing_vendor_discovery")

class MissingVendorDiscoveryEngine:
    """Calculates 5-Vendor Coverage & Triggers Missing Vendor Discovery Jobs."""

    ALL_VENDORS = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales']

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def audit_product_coverage(self, product_id: int) -> dict:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT v.name
            FROM vendor_products vp
            JOIN vendors v ON vp.vendor_id = v.id
            JOIN product_variants pv ON vp.variant_id = pv.id
            WHERE pv.product_id = ?
        ''', (product_id,))
        rows = cursor.fetchall()
        conn.close()

        found_vendors = set([r[0].lower() for r in rows])
        missing_vendors = [v for v in self.ALL_VENDORS if v not in found_vendors]
        coverage_pct = round((len(found_vendors) / len(self.ALL_VENDORS)) * 100, 2)

        return {
            "product_id": product_id,
            "total_expected": len(self.ALL_VENDORS),
            "found_count": len(found_vendors),
            "found_vendors": list(found_vendors),
            "missing_vendors": missing_vendors,
            "coverage_pct": coverage_pct,
            "needs_discovery": len(missing_vendors) > 0
        }

    def trigger_discovery_for_missing(self, product_id: int, canonical_title: str) -> dict:
        audit = self.audit_product_coverage(product_id)
        if not audit["needs_discovery"]:
            return {"status": "SUCCESS", "message": "Product already has 100% vendor coverage (5/5)."}

        logger.info(f"Triggering missing vendor discovery for Product #{product_id} ('{canonical_title}'). Missing: {audit['missing_vendors']}")

        # Enqueue discovery job in recovery_jobs table
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO recovery_jobs (job_type, target_id, status, result_message)
            VALUES ('MISSING_VENDOR_DISCOVERY', ?, 'PENDING', ?)
        ''', (product_id, f"Searching missing vendors: {', '.join(audit['missing_vendors'])}"))
        conn.commit()
        conn.close()

        return {
            "status": "QUEUED",
            "missing_vendors": audit["missing_vendors"],
            "coverage_pct": audit["coverage_pct"]
        }

missing_vendor_discovery_engine = MissingVendorDiscoveryEngine()
