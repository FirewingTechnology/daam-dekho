import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup

options = webdriver.ChromeOptions()
options.add_argument("--headless=new")
options.add_argument("--window-size=1920,1080")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

driver = webdriver.Chrome(options=options)
try:
    url = "https://www.jiomart.com/products?q=iphone+15"
    print(f"Loading {url}...")
    driver.get(url)
    time.sleep(10)
    
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    cards = soup.find_all('div', class_='productCard__productCard')
    print(f"Found {len(cards)} items headlessly.")
    
    for i, card in enumerate(cards[:3]):
        gtm = card.find('div', class_='gtmEvents')
        if gtm:
            title = gtm.get('data-name')
            price = gtm.get('data-price')
            slug = gtm.get('data-slug')
            # JioMart typically structures URLs as: /p/category/slug
            url = f"https://www.jiomart.com/p/electronics/{slug}"
            print(f"{i+1}. {title} - {price} - {url}")
finally:
    driver.quit()
