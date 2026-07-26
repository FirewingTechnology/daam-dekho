import argparse
import sys
import os
import multiprocessing
from app.logger import get_logger
from app.pipeline import pipeline
from app.config import VENDORS

logger = get_logger("main")

def main():
    parser = argparse.ArgumentParser(description="DaamDekho v2.0 - Enterprise Intelligent Multi-Vendor Scraping Architecture")
    
    # Modes & Queries
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--query", type=str, help="Target search query (e.g. 'Samsung Galaxy S24 Ultra')")
    group.add_argument("--all", action="store_true", help="Full refresh mode")
    group.add_argument("--price-update", action="store_true", help="Update prices for existing products only")
    
    # Category & Filters
    parser.add_argument("--category", type=str, help="Target category (Mobile, Laptop, Mobile Accessories, Laptop Accessories)")
    parser.add_argument("--vendor", type=str, nargs='+', help="Limit to specific vendors (amazon, flipkart, croma, jiomart, vijaysales)")
    
    # Enterprise v2.0 Ingestion Control Options
    parser.add_argument("--mode", type=str, default="Auto Detect", choices=["Exact Product", "Product Family", "Auto Detect"], help="Scrape mode")
    parser.add_argument("--deep-scan", action="store_true", help="Enable deep PDP scanning for full spec extraction")
    parser.add_argument("--validate-images", action="store_true", help="Enforce high-res image validation rules")
    parser.add_argument("--validate-urls", action="store_true", help="Enforce canonical PDP URL validation rules")
    parser.add_argument("--merge-vendors", action="store_true", default=True, help="Enable multi-vendor canonical merging")
    parser.add_argument("--rebuild-existing", action="store_true", help="Rebuild existing catalog items")
    
    args = parser.parse_args()

    # Pre-setup ChromeDriver
    from app.utils import ensure_chromedriver
    try:
        logger.info("Setting up ChromeDriver...")
        ensure_chromedriver()
    except Exception as e:
        logger.error(f"ChromeDriver setup failed: {e}")

    if args.query:
        logger.info(f"Starting v2.0 Ingestion for query: '{args.query}' (Category: {args.category or 'Auto'}, Mode: {args.mode}, Vendors: {args.vendor or 'All'})")
        pipeline.run_search(args.query, category=args.category, vendors=args.vendor, scrape_mode=args.mode)
    
    elif args.category:
        logger.info(f"Starting category mode for: {args.category}")
        queries = {
            'Mobile': ['Samsung Galaxy S24 Ultra', 'iPhone 15 Pro Max', 'OnePlus 12'],
            'Laptop': ['MacBook Air M3', 'Dell XPS 13', 'Lenovo Legion 5'],
            'Mobile Accessories': ['AirPods Pro 2', 'Samsung Galaxy Buds 2 Pro'],
            'Laptop Accessories': ['Logitech MX Master 3S', 'Anker USB-C Hub']
        }
        cat_key = args.category.strip()
        for q in queries.get(cat_key, ['Samsung Galaxy S24 Ultra']):
            pipeline.run_search(q, category=args.category, scrape_mode=args.mode)
            
    else:
        print("=" * 60)
        print("   DaamDekho v2.0 - Enterprise Multi-Vendor Ingestion Tool")
        print("=" * 50)
        query = input("Enter search query: ").strip()
        if query:
            pipeline.run_search(query, scrape_mode=args.mode)
        else:
            print("No query provided. Exiting.")

if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
