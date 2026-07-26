from app.database.manager import db_manager
from app.duplicate_detector import duplicate_detector
from app.health_engine import product_health_engine
from app.hardware_fingerprint import hardware_fingerprint_engine
from app.identity_hierarchy import identity_hierarchy_engine
from app.logger import get_logger

logger = get_logger("background_repair")

class BackgroundRepairEngine:
    """Enterprise Background Repair Engine for Scheduled Automated Self-Healing."""

    def run_full_repair(self):
        logger.info("Executing Enterprise Background Self-Healing Repair Pipeline...")
        
        # 1. Duplicate Repair
        dup_report = duplicate_detector.auto_repair()

        # 2. Hardware Fingerprint & Health Score Audit
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id, title, brand, category, base_image FROM products_master")
        masters = cursor.fetchall()
        
        repaired_health_count = 0
        for pid, title, brand, category, base_img in masters:
            cursor.execute("SELECT id, price, url, rating, reviews FROM vendor_products WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)", (pid,))
            v_offers = [dict(zip(["id", "price", "url", "rating", "reviews"], row)) for row in cursor.fetchall()]
            
            cursor.execute("SELECT spec_key, spec_value FROM product_specifications WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)", (pid,))
            specs_data = dict(cursor.fetchall())

            p_data = {"id": pid, "title": title, "brand": brand, "category": category, "base_image": base_img}
            health_res = product_health_engine.calculate_health(p_data, vendor_offers=v_offers, specs_data=specs_data)

            # Store / Update health in DB
            cursor.execute("""
                INSERT INTO product_health (product_id, overall_health_score, identity_completeness, specs_completeness, image_completeness, vendor_coverage, price_integrity, url_health, reviews_ratings, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(product_id) DO UPDATE SET 
                    overall_health_score=excluded.overall_health_score,
                    status=excluded.status
            """, (pid, health_res['overall_health_score'], health_res['breakdown']['identity_completeness'],
                  health_res['breakdown']['specifications_completeness'], health_res['breakdown']['images_completeness'],
                  health_res['breakdown']['vendor_coverage'], health_res['breakdown']['price_integrity'],
                  health_res['breakdown']['url_health'], health_res['breakdown']['reviews_and_ratings'], health_res['status']))
            repaired_health_count += 1

        conn.commit()
        conn.close()

        logger.info(f"Background repair finished. Repaired {repaired_health_count} product health records.")
        return {
            "duplicate_repair": dup_report,
            "repaired_health_count": repaired_health_count,
            "status": "SUCCESS"
        }

background_repair_engine = BackgroundRepairEngine()
