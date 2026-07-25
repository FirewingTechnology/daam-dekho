import os
import sys

# Ensure the app module can be found
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.scrapers.jiomart import JioMartScraper

print("Initializing JioMartScraper with HEADLESS=False...")
scraper = JioMartScraper()
try:
    print("Scraping 'iphone 15'...")
    results = scraper.scrape("iphone 15", category="mobiles")
    print(f"Scraped {len(results)} items.")
    for i, item in enumerate(results[:3]):
        print(f"{i+1}. {item['title']} - {item['price']} - {item.get('product_link', item.get('url', 'N/A'))}")
finally:
    scraper.close_driver()
