import time
from selenium import webdriver

options = webdriver.ChromeOptions()
options.add_argument("--headless=new")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--window-size=1920,1080")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

driver = webdriver.Chrome(options=options)
try:
    print("Loading JioMart...")
    driver.get("https://www.jiomart.com/catalogsearch/result?q=iphone+15")
    time.sleep(10)
    
    print("Taking screenshot...")
    driver.save_screenshot("jiomart_debug.png")
    print("Screenshot saved to jiomart_debug.png")
finally:
    driver.quit()
