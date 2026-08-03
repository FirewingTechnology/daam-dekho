import json
from datetime import datetime
from typing import Dict, Any, List
from app.logger import get_logger
from app.database.manager import db_manager

logger = get_logger("v10_coverage_analyzer")

class EnterpriseV10CoverageAnalyzerEngine:
    """DaamDekho v10.0 Vendor Coverage & Observability Report Engine.
    Computes per-product vendor coverage metrics and detailed status per expected vendor.
    """

    DEFAULT_EXPECTED = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales']

    def analyze_coverage(self, master_id: int, expected_vendors: List[str] = None) -> Dict[str, Any]:
        expected = [v.lower().replace(" ", "") for v in (expected_vendors or self.DEFAULT_EXPECTED)]

        conn = db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT DISTINCT LOWER(REPLACE(v.name, ' ', ''))
            FROM vendor_products vp
            JOIN vendors v ON vp.vendor_id = v.id
            JOIN product_variants pv ON vp.variant_id = pv.id
            WHERE pv.product_id = ?
        """, (master_id,))
        found = [row[0] for row in cursor.fetchall()]

        # Fallback check on vendor_offers_v10
        if not found:
            cursor.execute("""
                SELECT DISTINCT LOWER(REPLACE(vendor_name, ' ', ''))
                FROM vendor_offers_v10
                WHERE variant_id IN (SELECT id FROM product_variants_v10 WHERE master_product_id = ?)
            """, (master_id,))
            found = [row[0] for row in cursor.fetchall()]

        missing = [v for v in expected if v not in found]
        coverage_pct = round((len(found) / len(expected)) * 100.0, 1) if expected else 0.0

        vendor_matrix = {}
        for v in expected:
            if v in found:
                vendor_matrix[v] = {"status": "FOUND", "reason": "Verified Offer Persisted"}
            else:
                vendor_matrix[v] = {"status": "NOT_FOUND", "reason": "NO_SEARCH_RESULTS_OR_PDP_SPEC_MISMATCH"}

        conn.close()

        logger.info(f"📊 [v10 COVERAGE REPORT] Master Product #{master_id}: {coverage_pct}% ({len(found)}/{len(expected)} Vendors) | Found: {found} | Missing: {missing}")

        return {
            "master_id": master_id,
            "coverage_pct": coverage_pct,
            "expected_vendors": expected,
            "found_vendors": found,
            "missing_vendors": missing,
            "vendor_matrix": vendor_matrix
        }

v10_coverage_analyzer_engine = EnterpriseV10CoverageAnalyzerEngine()
