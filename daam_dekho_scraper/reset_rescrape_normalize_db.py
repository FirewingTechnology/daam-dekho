import sys
import os
import sqlite3

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.logger import get_logger
from app.brand_alias import brand_alias_engine
from app.canonical_identity import canonical_identity_engine
from app.duplicate_detector import duplicate_detector

logger = get_logger("catalog_normalizer")

def run_catalog_normalization():
    logger.info("==========================================================================")
    logger.info("  DaamDekho Catalog Normalization & Duplicate Prevention Pipeline")
    logger.info("==========================================================================")

    db_path = os.path.join(current_dir, "daamdekho.db")
    if not os.path.exists(db_path):
        db_path = os.path.join(os.path.dirname(current_dir), "daamdekho.db")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. Normalize Brands across all master products
    cur.execute("SELECT id, title, brand FROM products_master")
    rows = cur.fetchall()
    updated_brands = 0

    for pid, title, brand in rows:
        norm_brand = brand_alias_engine.normalize_brand(brand, title)
        if norm_brand != brand:
            cur.execute("UPDATE products_master SET brand = ? WHERE id = ?", (norm_brand, pid))
            updated_brands += 1

    conn.commit()
    logger.info(f"✅ Brand Normalization complete. Standardized {updated_brands} product brands.")

    # 2. Run Duplicate Detection & Auto Repair
    logger.info("Running Duplicate Detection & Auto-Repair...")
    repair_res = duplicate_detector.auto_repair()
    logger.info(f"✅ Duplicate Repair Complete: Merged {repair_res.get('merged_masters', 0)} master products.")

    conn.close()
    logger.info("==========================================================================")
    logger.info("✅ Catalog Normalization Complete!")
    logger.info("==========================================================================")

if __name__ == "__main__":
    run_catalog_normalization()
