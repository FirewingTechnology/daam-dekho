import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

options = webdriver.ChromeOptions()
options.add_argument("--window-size=1920,1080")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

driver = webdriver.Chrome(options=options)
try:
    print("Loading homepage...")
    driver.get("https://www.jiomart.com/")
    time.sleep(5)
    
    print("Finding search box...")
    search_box = driver.find_element(By.CLASS_NAME, "SearchInput__searchInput")
    search_box.send_keys("iphone 15")
    time.sleep(2)
    search_box.send_keys(Keys.RETURN)
    
    print("Waiting for results...")
    time.sleep(8)
    
    print("Current URL:", driver.current_url)
    
    # Dump classes of any cards found
    cards = driver.find_elements(By.CSS_SELECTOR, "div[class*='card'], div[class*='Card']")
    print(f"Found {len(cards)} elements with 'card' in class.")
    if cards:
        print("First card classes:", cards[0].get_attribute('class'))
    with open("jiomart_results.html", "w", encoding="utf-8") as f:
        f.write(driver.page_source)
        
    print("Saved rendered DOM to jiomart_results.html")
    driver.save_screenshot("jiomart_results.png")
    print("Screenshot saved.")
except Exception as e:
    print(f"Error: {e}")
finally:
    driver.quit()
