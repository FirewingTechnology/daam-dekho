import argparse
import sys
import os
import multiprocessing
from app.logger import get_logger
from app.pipeline import pipeline
from app.config import VENDORS

logger = get_logger("main")

def main():
    parser = argparse.ArgumentParser(description="DaamDekho - Production Grade Scraper Pipeline")
    
    # Modes
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--query", type=str, help="Search query (e.g. 'iphone 15')")
    group.add_argument("--all", action="store_true", help="Full refresh mode")
    group.add_argument("--price-update", action="store_true", help="Update prices for existing products only")
    
    # Filters & Info
    parser.add_argument("--category", type=str, choices=['mobiles', 'laptops', 'accessories'], help="Target category")
    parser.add_argument("--vendor", type=str, nargs='+', help="Limit to specific vendors (amazon, flipkart, etc.)")
    
    args = parser.parse_args()

    # Pre-setup ChromeDriver
    from app.utils import ensure_chromedriver
    try:
        logger.info("Setting up ChromeDriver...")
        ensure_chromedriver()
    except Exception as e:
        logger.error(f"ChromeDriver setup failed: {e}")

    if args.query:
        logger.info(f"Starting search mode for query: {args.query} (Category: {args.category or 'Auto'}, Vendors: {args.vendor or 'All'})")
        pipeline.run_search(args.query, category=args.category, vendors=args.vendor) 
    
    elif args.category:
        logger.info(f"Starting category mode for: {args.category}")
        # In a real app, you'd have a list of keywords for each category
        queries = {
            'mobiles': [
                'iphone 15', 'iphone 14', 'iphone 13',
                'samsung s24', 'samsung s23', 'samsung z fold 5', 'samsung a54',
                'oneplus 12', 'oneplus 11r', 'oneplus nord 3',
                'google pixel 8', 'google pixel 7a',
                'redmi note 13 pro', 'realme 12 pro', 'nothing phone 2'
            ],
            'laptops': ['macbook air m3', 'dell xps 13', 'hp spectre x360', 'lenovo legion 5'],
            'accessories': ['airpods pro', 'samsung buds 2', 'sony wh-1000xm5']
        }
        for q in queries.get(args.category, []):
            pipeline.run_search(q, category=args.category)
            
    elif args.price_update:
        logger.info("Starting price update mode...")
        # Logic to fetch existing product URLs from DB and re-scrape
        pass
        
    elif args.all:
        logger.info("Starting full refresh mode...")
        for cat in ['mobiles', 'laptops']:
            # Run pre-defined category scrapes
            pass
    
    else:
        # Default behavior: Interactive CLI
        print("=" * 50)
        print("   DaamDekho - Admin Product Ingestion Tool")
        print("=" * 50)
        query = input("Enter search query: ").strip()
        if query:
            pipeline.run_search(query)
        else:
            print("No query provided. Exiting.")

if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
