import sys
import os
import time
from datetime import datetime

# Ensure project root is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.logger import get_logger
from app.pipeline import pipeline
from app.utils import ensure_chromedriver

logger = get_logger("catalog_rebuilder")

HUGE_DATA_SEED_SUITE = {
    "Mobiles": [
        "Samsung Galaxy S24 Ultra",
        "Samsung Galaxy S24",
        "Samsung Galaxy A55 5G",
        "iPhone 16 Pro Max",
        "iPhone 15 Pro",
        "iPhone 14",
        "OnePlus 12 5G",
        "OnePlus Nord 4",
        "Xiaomi 14 Ultra",
        "Redmi Note 13 Pro Plus",
        "Realme GT 6",
        "Google Pixel 9 Pro",
        "Google Pixel 8a",
        "Vivo X100",
        "iQOO 12 5G"
    ],
    "Laptops": [
        "MacBook Air M3",
        "MacBook Pro M3",
        "Asus ROG Strix G16",
        "Asus TUF Gaming F15",
        "HP Victus 16",
        "HP Omen 16",
        "Lenovo Legion Slim 5",
        "Lenovo IdeaPad Slim 3",
        "Dell XPS 13",
        "Dell G15 Gaming",
        "Acer Predator Helios 16",
        "Acer Nitro 5"
    ],
    "Mobile Accessories": [
        "AirPods Pro 2",
        "Galaxy Buds2 Pro",
        "OnePlus Buds Pro 2",
        "Sony WF 1000XM5",
        "Anker 65W GaN Charger",
        "Samsung 45W Power Adapter"
    ],
    "Laptop Accessories": [
        "Logitech MX Master 3S",
        "Logitech G502 X",
        "Anker USB C Hub 7 in 1",
        "Dell UltraSharp 27 Monitor"
    ]
}

def rebuild_catalog_massive_ingestion():
    logger.info("==========================================================================")
    logger.info("  DaamDekho Massive Catalog Rebuild & Enterprise Ingestion Pipeline")
    logger.info("==========================================================================")
    
    start_time = time.time()
    
    # Pre-flight setup
    try:
        ensure_chromedriver()
    except Exception as e:
        logger.error(f"ChromeDriver setup failed: {e}")

    total_queries = sum(len(queries) for queries in HUGE_DATA_SEED_SUITE.values())
    processed = 0

    for category, query_list in HUGE_DATA_SEED_SUITE.items():
        logger.info(f"\n--- Initiating Massive Ingestion for Category: {category} ({len(query_list)} queries) ---")
        for query in query_list:
            processed += 1
            logger.info(f"[{processed}/{total_queries}] Ingesting '{query}' across 5 Vendors...")
            try:
                pipeline.run_search(query, category=category, scrape_mode="Product Family")
            except Exception as e:
                logger.error(f"Failed to ingest query '{query}': {e}")
            time.sleep(1) # Rate throttling between queries

    elapsed = round(time.time() - start_time, 2)
    logger.info("==========================================================================")
    logger.info(f"✅ Massive Catalog Rebuild Complete! Executed {processed} queries in {elapsed}s.")
    logger.info("==========================================================================")

if __name__ == "__main__":
    rebuild_catalog_massive_ingestion()
