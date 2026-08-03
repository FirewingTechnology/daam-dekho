import threading
import queue
import json
import time
from datetime import datetime
from app.logger import get_logger
from app.database.manager import db_manager
from app.etl.v10_pipeline_orchestrator import v10_pipeline_orchestrator

logger = get_logger("scraper_pipeline")

class ScraperPipeline:
    """DaamDekho v10.0 Scraper Pipeline Interface.
    Delegates all crawl sessions and multi-vendor product intelligence runs directly to the
    v10.0 Decoupled Data Lake ETL Pipeline Orchestrator.
    Zero inline scraper-time matching or early rejection.
    """

    def __init__(self, vendors_to_use=None):
        self.vendors = vendors_to_use or ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales']
        self.scrapers = self._init_scrapers()

    def _init_scrapers(self):
        scrapers = {}
        from app.scrapers.amazon import AmazonScraper
        from app.scrapers.flipkart import FlipkartScraper
        from app.scrapers.croma import CromaScraper
        from app.scrapers.jiomart import JioMartScraper
        from app.scrapers.vijaysales import VijaySalesScraper

        factory = {
            'amazon': AmazonScraper,
            'flipkart': FlipkartScraper,
            'croma': CromaScraper,
            'jiomart': JioMartScraper,
            'vijaysales': VijaySalesScraper
        }

        for v in self.vendors:
            if v in factory:
                scrapers[v] = factory[v]()
        return scrapers

    def run_search(self, query: str, category: str = "Mobiles", brand: str = None, vendors: list = None, scrape_mode: str = "EXACT_PRODUCT", max_pages: int = 2, max_products: int = 50):
        """Runs multi-vendor crawling and delegates execution to v10.0 Decoupled Data Lake ETL Pipeline Orchestrator."""
        if not category:
            category = "Mobiles"
            
        ordered_vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales']
        if vendors:
            selected_vendors = [v.lower().strip() for v in vendors if v.lower().strip() in ordered_vendors]
        else:
            selected_vendors = ordered_vendors

        if not brand:
            brand = query.split()[0].capitalize() if query else "Generic"

        logger.info(f"🚀 delegating search '{query}' to v10.0 Decoupled Data Lake ETL Pipeline Orchestrator")
        
        etl_result = v10_pipeline_orchestrator.run_pipeline(
            target_query=query,
            category=category,
            brand=brand,
            scrapers=self.scrapers,
            target_vendors=selected_vendors,
            max_pages=max_pages
        )

        return etl_result

pipeline = ScraperPipeline()
