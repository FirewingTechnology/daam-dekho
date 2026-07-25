import sys
from abc import ABC, abstractmethod
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from pathlib import Path
from app.config import HEADLESS, PAGE_LOAD_WAIT
from app.logger import get_logger
from app.utils import get_random_user_agent
import time

class BaseScraper(ABC):
    def __init__(self, vendor_name: str):
        self.vendor_name = vendor_name
        self.logger = get_logger(f"{vendor_name}_scraper")
        self.driver = None

    def setup_driver(self):
        options = Options()
        if HEADLESS:
            options.add_argument("--headless=new")
        options.add_argument(f"user-agent={get_random_user_agent()}")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--log-level=3")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)


        import os
        chromedriver_path = os.environ.get("CHROME_DRIVER_PATH")

        if not chromedriver_path:
            from app.utils import ensure_chromedriver
            chromedriver_path = ensure_chromedriver()

        self.logger.info(f"Using ChromeDriver: {chromedriver_path}")
        service = Service(chromedriver_path)
        self.driver = webdriver.Chrome(service=service, options=options)
        self.driver.set_page_load_timeout(45)
        self.driver.implicitly_wait(10)
        
        # Anti-detection: execute CDP commands
        self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                })
            """
        })

    def random_sleep(self, min_s=2, max_s=5):
        import random
        time.sleep(random.uniform(min_s, max_s))

    def scroll_page(self):
        """Scrolls the page to trigger lazy-loading."""
        self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
        time.sleep(1)
        self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1)


    def close_driver(self):
        if self.driver:
            self.driver.quit()
            self.logger.info("Browser closed.")

    @abstractmethod
    def scrape(self, query: str, category: str = "mobiles") -> list:
        pass
        
    def safe_get(self, url: str):
        self.safe_get_with_retry(url, max_retries=3)

    def safe_get_with_retry(self, url: str, max_retries=3):
        """Self-healing page loader with rate limit detection (HTTP 429/439) and exponential backoff."""
        for attempt in range(1, max_retries + 1):
            try:
                self.logger.info(f"Navigating to {url} (Attempt {attempt}/{max_retries})")
                self.driver.get(url)
                time.sleep(PAGE_LOAD_WAIT)
                
                page_src = self.driver.page_source.lower()
                if "429 too many requests" in page_src or "rate limit exceeded" in page_src:
                    wait_time = attempt * 5
                    self.logger.warning(f"HTTP 429 Rate Limit detected. Exponential backoff wait for {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                elif "access denied" in page_src or "403 forbidden" in page_src:
                    self.logger.warning(f"HTTP 403 Forbidden detected on {url}. Retrying with fresh session...")
                    time.sleep(3)
                    continue
                    
                return True
            except Exception as e:
                self.logger.warning(f"Failed to load {url} (Attempt {attempt}/{max_retries}): {e}")
                if attempt == max_retries:
                    self.logger.error(f"Exhausted retries for {url}: {e}")
                    return False
                time.sleep(attempt * 2)
        return False
