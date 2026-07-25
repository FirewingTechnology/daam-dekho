import main
from app.query_parser import parse_query
from app.utils import ensure_chromedriver
import os

def rescrape_missing():
    # Pre-install ChromeDriver once to avoid race conditions in parallel workers
    try:
        print("[INFO] Setting up ChromeDriver...")
        driver_path = ensure_chromedriver()
        os.environ["CHROME_DRIVER_PATH"] = driver_path
    except Exception as e:
        print(f"[ERROR] Failed to setup ChromeDriver: {e}")

    queries = ["samsung galaxy s24 5g", "iphone 16"]
    for q_raw in queries:
        print(f"\n--- Rescraping: {q_raw} ---")
        query = parse_query(q_raw)
        main.run_ingestion(query)

if __name__ == "__main__":
    rescrape_missing()
