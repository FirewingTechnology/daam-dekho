import sqlite3
from app.database.manager import db_manager
from app.logger import get_logger

logger = get_logger("vendor_coverage")

class VendorCoverageEngine:
    """Calculates product vendor coverage and generates selective retry queues."""

    ALL_VENDORS = ['Amazon', 'Flipkart', 'Croma', 'JioMart', 'Vijay Sales']

    def __init__(self, db_mgr=None):
        self.db_manager = db_mgr or db_manager

    def calculate_product_coverage(self, product_id):
        """Calculates expected vs found vendors for a specific master product."""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT title, brand FROM products_master WHERE id = ?", (product_id,))
        prod = cursor.fetchone()
        if not prod:
            conn.close()
            return None

        title, brand = prod[0], prod[1]

        cursor.execute("""
            SELECT DISTINCT v.name
            FROM vendor_products vp
            JOIN product_variants var ON vp.variant_id = var.id
            JOIN vendors v ON vp.vendor_id = v.id
            WHERE var.product_id = ?
        """, (product_id,))

        found_vendors = [row[0] for row in cursor.fetchall()]
        missing_vendors = [v for v in self.ALL_VENDORS if v not in found_vendors]

        coverage_pct = round((len(found_vendors) / len(self.ALL_VENDORS)) * 100, 1)

        conn.close()

        return {
            "product_id": product_id,
            "title": title,
            "brand": brand,
            "expected_vendors": self.ALL_VENDORS,
            "found_vendors": found_vendors,
            "missing_vendors": missing_vendors,
            "coverage_percent": coverage_pct
        }

    def generate_retry_queue(self):
        """Finds all master products with missing vendors and generates target retry payloads."""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id, title FROM products_master")
        all_products = cursor.fetchall()
        conn.close()

        retry_queue = []
        for pid, ptitle in all_products:
            cov = self.calculate_product_coverage(pid)
            if cov and cov['missing_vendors']:
                retry_queue.append({
                    "product_id": pid,
                    "title": ptitle,
                    "missing_vendors": [v.lower().replace(" ", "") for v in cov['missing_vendors']],
                    "coverage_percent": cov['coverage_percent']
                })

        logger.info(f"Vendor Coverage Engine: Identified {len(retry_queue)} products requiring selective vendor retries.")
        return retry_queue

vendor_coverage_engine = VendorCoverageEngine()
