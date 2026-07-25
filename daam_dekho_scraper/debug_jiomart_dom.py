import time
from selenium import webdriver
import random

options = webdriver.ChromeOptions()
options.add_argument("--headless=new")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--start-maximized")
user_agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]
options.add_argument(f"user-agent={user_agents[0]}")

driver = webdriver.Chrome(options=options)

print("Navigating to JioMart...")
driver.get("https://www.jiomart.com/catalogsearch/result?q=iphone+15")
time.sleep(10)

print("Saving page source...")
with open("debug_jiomart.html", "w", encoding="utf-8") as f:
    f.write(driver.page_source)

print("Done. Saved to debug_jiomart.html")
driver.quit()
