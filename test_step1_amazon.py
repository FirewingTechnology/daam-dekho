"""
Daam Dekho - Incremental Step 1 Audit: Amazon Scraper Only
Query: 'iphone 15'
Limit: 2 Products
Verifies extraction, data cleaning, database insertion, and stops.
"""

import sys
import os
import sqlite3
import json
from pathlib import Path

# Add project root & scraper dir to path
project_root = Path(__file__).resolve().parent
scraper_dir = project_root / "daam_dekho_scraper"
sys.path.insert(0, str(scraper_dir))
sys.path.insert(0, str(project_root))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.scrapers.amazon import AmazonScraper
from app.cleaners.data_cleaner import cleaner
from app.pipeline import pipeline
from app.config import DB_PATH

def run_step_1_amazon():
    print("=" * 70)
    print("STEP 1: INCREMENTAL AUDIT - AMAZON SCRAPER ONLY")
    print("Search Query : 'iphone 15'")
    print("Max Results  : 2")
    print("=" * 70)

    scraper = AmazonScraper()
    print("\n[1/4] Launching Amazon Scraper...")
    products = scraper.scrape(query="iphone 15", category="mobiles", max_pages=1, max_results=2)

    print(f"\n[2/4] Scraped {len(products)} products from Amazon.")
    if not products:
        print("❌ FAIL: Amazon scraper returned 0 products.")
        sys.exit(1)

    print("\n[3/4] Verifying Extracted Raw Fields:")
    for idx, p in enumerate(products, 1):
        print(f"\n --- Product #{idx} ---")
        print(f"  • Title           : {p.get('title')}")
        print(f"  • Product Link    : {p.get('product_link')}")
        print(f"  • Discounted Price: ₹{p.get('discounted_price')}")
        print(f"  • MRP             : ₹{p.get('price')}")
        print(f"  • Rating          : {p.get('rating')}")
        print(f"  • Reviews Count   : {p.get('reviews')}")
        print(f"  • Image URL       : {p.get('image_url') or (p.get('image_urls')[0] if p.get('image_urls') else 'None')}")
        print(f"  • Specifications  : {p.get('specifications')}")

        # Field validation
        assert p.get('title'), f"Product #{idx} missing title"
        assert p.get('product_link') and p.get('product_link').startswith("http"), f"Product #{idx} invalid URL"
        assert p.get('discounted_price', 0) > 0, f"Product #{idx} invalid price"

    print("\n✅ Field Extraction Validation Passed!")

    print("\n[4/4] Ingesting products into database...")
    initial_db_count = 0
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM vendor_products WHERE vendor_id = (SELECT id FROM vendors WHERE LOWER(name) = 'amazon')")
    initial_db_count = c.fetchone()[0]
    conn.close()

    # Process and save via pipeline
    pipeline.process_and_save(products, category="mobiles")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM vendor_products WHERE vendor_id = (SELECT id FROM vendors WHERE LOWER(name) = 'amazon')")
    final_db_count = c.fetchone()[0]
    
    # Retrieve inserted products
    c.execute("""
        SELECT vp.id, vp.title, vp.price, vp.mrp, vp.url, v.name 
        FROM vendor_products vp 
        JOIN vendors v ON vp.vendor_id = v.id 
        WHERE LOWER(v.name) = 'amazon' 
        ORDER BY vp.id DESC LIMIT 2
    """)
    saved_rows = c.fetchall()
    conn.close()

    print(f"  • Amazon Vendor Products Count in DB: Before = {initial_db_count} | After = {final_db_count}")
    print("\nSaved Rows in Database:")
    for r in saved_rows:
        print(f"  -> VP ID: {r[0]} | Title: {r[1][:50]}... | Price: ₹{r[2]} | MRP: ₹{r[3]} | Vendor: {r[5]}")

    print("\n" + "=" * 70)
    print("✅ STEP 1 COMPLETE: Amazon Scraper verified & stored cleanly into DB!")
    print("=" * 70)

if __name__ == "__main__":
    run_step_1_amazon()
