import sys
import os

root_dir = os.path.dirname(os.path.abspath(__file__))
scraper_dir = os.path.join(root_dir, "daam_dekho_scraper")

# Remove root_dir from sys.path so root app/ directory does not shadow daam_dekho_scraper/app
sys.path = [p for p in sys.path if p not in (root_dir, '', os.getcwd())]
sys.path.insert(0, scraper_dir)

import app
app.__path__ = [os.path.join(scraper_dir, "app")]

import argparse
import time

from app.logger import get_logger
from app.pipeline import ScraperPipeline
from app.etl.v10_pipeline_orchestrator import v10_pipeline_orchestrator
from app.etl.v10_coverage_analyzer import v10_coverage_analyzer_engine
from app.database.manager import db_manager

logger = get_logger("run_v10_local_etl_test")

def main():
    parser = argparse.ArgumentParser(description="DaamDekho v10.0 Decoupled Data Lake ETL Pipeline CLI Test")
    parser.add_argument("--query", type=str, default="Samsung Galaxy A35 5G", help="Target product query")
    parser.add_argument("--category", type=str, default="Mobiles", help="Product category")
    parser.add_argument("--brand", type=str, default="Samsung", help="Brand name")
    parser.add_argument("--vendors", type=str, default="amazon,flipkart,croma,jiomart,vijaysales", help="Target vendors")
    args = parser.parse_args()

    target_query = args.query
    category = args.category
    brand = args.brand
    target_vendors = [v.strip().lower() for v in args.vendors.split(",") if v.strip()]

    print("\n================================================================================")
    print(f"🚀 DAAMDEKHO v10.0 DECOUPLED DATA LAKE ETL PIPELINE CLI TEST")
    print(f"Target Query   : '{target_query}'")
    print(f"Category       : '{category}' | Brand: '{brand}'")
    print(f"Target Vendors : {target_vendors}")
    print("================================================================================\n")

    # Step 1: Initialize Scraper Factory (Acquisition Engine Only - No Inline Matching)
    pipeline = ScraperPipeline(vendors_to_use=target_vendors)
    scrapers = pipeline.scrapers

    print("--------------------------------------------------------------------------------")
    print("🌐 STEP 1: INITIALIZED DATA ACQUISITION SCRAPERS (NO INLINE MATCHING)")
    print("--------------------------------------------------------------------------------")
    print(f"Active Scrapers: {list(scrapers.keys())}\n")

    # Step 2: Execute 10-Phase Pipeline Orchestration
    start_time = time.time()
    res = v10_pipeline_orchestrator.run_pipeline(
        target_query=target_query,
        category=category,
        brand=brand,
        scrapers=scrapers,
        target_vendors=target_vendors,
        max_pages=2
    )
    elapsed = round(time.time() - start_time, 2)

    # Step 3: Inspect Database Records
    conn = db_manager.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT pm.id, pm.title, pm.canonical_title, pm.brand, pm.category
        FROM products_master pm
        ORDER BY pm.id DESC LIMIT 1
    """)
    last_master = cursor.fetchone()

    master_id = last_master[0] if last_master else None
    published_offers = []

    if master_id:
        cursor.execute("""
            SELECT vp.id, v.name, vp.price, vp.mrp, vp.url, vp.stock_status
            FROM vendor_products vp
            JOIN vendors v ON vp.vendor_id = v.id
            JOIN product_variants pv ON vp.variant_id = pv.id
            WHERE pv.product_id = ?
        """, (master_id,))
        published_offers = cursor.fetchall()
    conn.close()

    cov_report = v10_coverage_analyzer_engine.analyze_coverage(
        master_id=master_id or 1,
        expected_vendors=target_vendors
    )

    print("\n================================================================================")
    print("📊 DAAMDEKHO v10.0 STAGE-BY-STAGE ETL RECONCILIATION SUMMARY REPORT")
    print("================================================================================")
    print(f"Pipeline Status            : {res.get('status')}")
    print(f"Total Execution Duration   : {elapsed} seconds")
    print(f"Phase 1 & 2 (Raw Data Lake): {res.get('raw_collected', 0)} Raw Products Persisted")
    print(f"Phase 4 (Normalized)       : {res.get('normalized_count', 0)} Attributes Cleaned")
    print(f"Phase 6 (Master Products)  : {res.get('master_products_built', 0)} Master Products Built")
    print(f"Phase 9 (Attached Offers)  : {res.get('attached_offers', 0)} Vendor Offers Attached")
    print(f"Phase 10 (Catalog Published): {res.get('published_products', 0)} Published Master Products")
    print(f"Phase 10 (Published Offers) : {res.get('published_offers', 0)} Published Offers")
    print("--------------------------------------------------------------------------------")
    print("🛒 PUBLISHED VENDOR OFFERS IN PRODUCTION WEBSITE CATALOG:")
    print("--------------------------------------------------------------------------------")
    if published_offers:
        for offer in published_offers:
            print(f"  • Offer #{offer[0]} | Vendor: {offer[1]:<12} | Price: ₹{offer[2]:<8} | Stock: {offer[5]} | URL: {offer[4]}")
    else:
        print("  ⚠️ No published vendor offers attached for this product.")

    print("\n--------------------------------------------------------------------------------")
    print("📋 VENDOR COVERAGE SCORECARD:")
    print("--------------------------------------------------------------------------------")
    print(f"Coverage Score : {cov_report['coverage_pct']}% ({len(cov_report['found_vendors'])}/{len(cov_report['expected_vendors'])} Target Vendors)")
    print(f"Found Vendors  : {cov_report['found_vendors']}")
    print(f"Missing Vendors: {cov_report['missing_vendors']}")
    for v_name, v_info in cov_report['vendor_matrix'].items():
        print(f"  [{v_name.upper():<12}] Status: {v_info['status']:<10} | Rationale: {v_info['reason']}")
    print("================================================================================\n")

if __name__ == '__main__':
    main()
