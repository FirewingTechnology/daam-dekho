import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "app" / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
FINAL_DATA_DIR = DATA_DIR / "final"
DB_PATH = BASE_DIR.parent / "daamdekho.db"

# Create directories if they don't exist
for path in [RAW_DATA_DIR, FINAL_DATA_DIR]:
    path.mkdir(parents=True, exist_ok=True)

# Selenium Configuration
HEADLESS = False  # Set to False to bypass bot detection on JioMart
BROWSER_TIMEOUT = 20
PAGE_LOAD_WAIT = 5

# Scraping Limits
MAX_PRODUCTS_PER_VENDOR = 20

# Vendor Constants
VENDORS = {
    "amazon": "Amazon",
    "flipkart": "Flipkart",
    "croma": "Croma",
    "jiomart": "JioMart",
    "vijaysales": "Vijay Sales"
}

# Logging Configuration
LOG_DIR = BASE_DIR / "logs"
LOG_FILE = BASE_DIR / "scraper.log"
LOG_DIR.mkdir(parents=True, exist_ok=True)
