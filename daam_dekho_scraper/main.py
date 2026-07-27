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
    parser.add_argument("--category", type=str, help="Target category (Mobiles, Laptops, Mobile Accessories, Laptop Accessories)")
    parser.add_argument("--brand", type=str, help="Target brand (Samsung, Apple, Realme, Vivo, OnePlus, etc.)")
    parser.add_argument("--vendor", type=str, nargs='+', help="Limit to specific vendors (amazon, flipkart, croma, jiomart, vijaysales)")

    # Enterprise v4.2 Catalog Discovery Control Options
    parser.add_argument("--mode", type=str, default="EXACT_PRODUCT", help="Scrape mode (EXACT_PRODUCT, BRAND_CATALOG, CATEGORY_CATALOG, BRAND_CATEGORY, ADVANCED_DISCOVERY)")
    parser.add_argument("--max-pages", type=int, default=3, help="Maximum search result pages to crawl per vendor")
    parser.add_argument("--max-products", type=int, default=50, help="Target product count limit")

    parser.add_argument("--ram", type=str, help="RAM filter (8GB, 12GB, etc.)")
    parser.add_argument("--storage", type=str, help="Storage filter (128GB, 256GB, etc.)")
    parser.add_argument("--cpu", type=str, help="CPU filter")
    parser.add_argument("--gpu", type=str, help="GPU filter")
    parser.add_argument("--is-5g", action="store_true", help="Require 5G capability")

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

    if args.query or args.brand or args.category:
        effective_query = args.query or args.brand or args.category or "Samsung"
        logger.info(f"Starting Ingestion for Mode: '{args.mode}' | Brand: '{args.brand or 'All'}' | Category: '{args.category or 'Mobiles'}' | Max Pages: {args.max_pages} | Query: '{effective_query}'")

        pipeline.run_search(
            effective_query,
            category=args.category,
            brand=args.brand,
            vendors=args.vendor,
            scrape_mode=args.mode,
            max_pages=args.max_pages,
            max_products=args.max_products
        )
    else:
        print("=" * 60)
        print("   DaamDekho v5.0 - Enterprise Multi-Vendor Ingestion Tool")
        print("=" * 60)
        query = input("Enter search query: ").strip()
        if query:
            pipeline.run_search(query, scrape_mode=args.mode)
        else:
            print("No query provided. Exiting.")


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
