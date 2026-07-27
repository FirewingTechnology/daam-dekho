from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("catalog_completeness")

class CatalogCompletenessEngine:
    """Catalog Completeness Engine & Vendor Heatmap Matrix Generator."""

    EXPECTED_CATALOG_ESTIMATES = {
        "samsung": {"mobiles": 85, "laptops": 25},
        "apple": {"mobiles": 35, "laptops": 40},
        "realme": {"mobiles": 60, "laptops": 10},
        "vivo": {"mobiles": 65, "laptops": 5},
        "oneplus": {"mobiles": 40, "laptops": 10},
        "default": {"mobiles": 50, "laptops": 30}
    }

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def get_completeness_report(self, brand: str = "Samsung", category: str = "Mobiles") -> dict:
        brand_key = (brand or "Samsung").lower().strip()
        cat_key = (category or "Mobiles").lower().strip()

        est_dict = self.EXPECTED_CATALOG_ESTIMATES.get(brand_key, self.EXPECTED_CATALOG_ESTIMATES["default"])
        expected = est_dict.get(cat_key, 50)

        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        # Get count of master products for brand/category
        cursor.execute('''
            SELECT COUNT(*) FROM products_master
            WHERE LOWER(brand) = ? OR LOWER(title) LIKE ?
        ''', (brand_key, f"%{brand_key}%"))
        collected = cursor.fetchone()[0]

        # Get per-vendor breakdown
        cursor.execute('''
            SELECT v.name, COUNT(vp.id)
            FROM vendors v
            LEFT JOIN vendor_products vp ON v.id = vp.vendor_id
            GROUP BY v.name
        ''')
        vendor_rows = cursor.fetchall()
        conn.close()

        vendor_counts = {r[0].lower(): r[1] for r in vendor_rows}
        vendor_coverage = {}
        heatmap_matrix = {}

        for v in ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales']:
            v_cnt = vendor_counts.get(v, 0)
            cov_pct = min(100, round((v_cnt / max(1, expected)) * 100))
            vendor_coverage[v] = cov_pct

            if cov_pct >= 80:
                color = "GREEN"
            elif cov_pct >= 45:
                color = "YELLOW"
            else:
                color = "RED"

            heatmap_matrix[v] = {
                "coverage_pct": cov_pct,
                "collected_count": v_cnt,
                "color_code": color
            }

        overall_cov = min(100, round((collected / max(1, expected)) * 100))

        return {
            "brand": brand,
            "category": category,
            "expected_products": expected,
            "collected_products": collected,
            "overall_coverage_pct": overall_cov,
            "missing_pct": 100 - overall_cov,
            "vendor_coverage": vendor_coverage,
            "heatmap_matrix": heatmap_matrix
        }

catalog_completeness_engine = CatalogCompletenessEngine()
