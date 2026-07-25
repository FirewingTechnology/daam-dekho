from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
import time
import json
import re
from data_formatter import DataFormatter
from data_cleanup import DataCleanup


class VijaySalesScraper:
    def __init__(self):
        self.driver = webdriver.Chrome()
        self.wait = WebDriverWait(self.driver, 15)

    def get_product_links(self, query):
        url = f"https://www.vijaysales.com/search-listing?q={quote_plus(query)}&Page=1"
        self.driver.get(url)
        try:
            self.wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "a.product-card__link")))
            time.sleep(2)
            soup = BeautifulSoup(self.driver.page_source, "html.parser")
            links = []

            for card in soup.find_all("a", class_="product-card__link"):
                href = card.get("href")
                if href:
                    if not href.startswith("http"):
                        href = "https://www.vijaysales.com" + href
                    links.append(href)
            return links
        except Exception as e:
            print(f"Error getting product links: {e}")
            return []

    def extract_product_details(self, product_url):
        result = {
            'title': "N/A",
            'brand': 'Unknown',
            'category': 'Mobile',
            'price': 0,
            'discounted_price': 0,
            'rating': 0.0,
            'reviews': 0,
            'seller_name': 'Vijay Sales',
            'availability': 'In Stock',
            'specifications': {},
            'image_urls': [],
            'product_link': product_url,
            'offers': []
        }

        try:
            self.driver.get(product_url)
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".productFullDetail__root")))
            time.sleep(2)

            psoup = BeautifulSoup(self.driver.page_source, "html.parser")

            
            title_el = psoup.find("h1", class_="productFullDetail__productName")
            price_el = psoup.find("p", class_="product__price--price offer")
            price_wrapper = psoup.find("p", class_="product__price--mrp offer")
            price_span = price_wrapper.find("span") if price_wrapper else None
            price = price_span.get_text(strip=True) if price_span else "0"

            result['title'] = title_el.get_text(strip=True) if title_el else "N/A"
            result['price'] = price
            result['discounted_price'] = price_el.get_text(strip=True) if price_el else price

            
            offers_section = psoup.find_all("div", class_="product__price--deals-card")
            offers_by_bank = {}
            for section in offers_section:
                for p in section.find_all(["p", "span", "div"]):
                    text = p.get_text(strip=True)
                    if text and "view details" not in text.lower():
                        matched = re.search(r"(HDFC|YES|IDFC|AU|AXIS|ICICI|KOTAK|SBI|BOB|RBL|Federal|IndusInd|Bank of India|PNB|Canara|Union Bank)", text, re.IGNORECASE)
                        if matched:
                            bank = matched.group(1).upper()
                            offers_by_bank.setdefault(bank, []).append(text)

            result['offers'] = [{'type': 'bank_offer', 'description': str(v), 'code': k} for k, v in offers_by_bank.items()] if offers_by_bank else []

            
            key_features = []
            feature_section = psoup.find("div", class_="product__keyfeatures")
            if feature_section:
                for li in feature_section.find_all("li"):
                    text = li.get_text(strip=True)
                    if text:
                        key_features.append(text)
            result['specifications'] = {"Key Features": key_features} if key_features else {}

            # Extract product images using Selenium (more reliable for dynamic content)
            image_urls = []
            try:
                img_selectors = [
                    "img.productFullDetail__productImage",
                    ".pdp-img-container img",
                    ".product-images img",
                    ".product-image img",
                    "img[alt*='product']",
                    "img[src*='vijaysales']",
                ]
                
                # Wait for images
                time.sleep(1)
                
                for selector in img_selectors:
                    try:
                        elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        if elements:
                            for img in elements[:8]:
                                src = img.get_attribute("src") or img.get_attribute("data-src")
                                if src and 'placeholder' not in str(src).lower() and 'logo' not in str(src).lower() and 'spinner' not in str(src).lower():
                                    url = src
                                    if not url.startswith("http"):
                                        url = "https://www.vijaysales.com" + (url if url.startswith("/") else "/" + url)
                                    if url not in image_urls:
                                        image_urls.append(url)
                            if image_urls:
                                break
                    except:
                        continue
            except:
                pass
            
            # Fallback to BeautifulSoup if Selenium missed something
            if not image_urls:
                try:
                    for img in psoup.find_all("img"):
                        src = img.get("src") or img.get("data-src")
                        if src and any(k in str(src).lower() for k in ['product', 'vj', 'vijay']) and not any(k in str(src).lower() for k in ['logo', 'icon', 'placeholder']):
                            url = src
                            if not url.startswith("http"):
                                url = "https://www.vijaysales.com" + (url if url.startswith("/") else "/" + url)
                            if url not in image_urls:
                                image_urls.append(url)
                except:
                    pass
            
            result['image_urls'] = image_urls

            print(f"Scraped: {result['title']}")
            
            # Format data to match DB schema
            # Detect category from title
            detected_category = 'Laptop' if 'laptop' in result['title'].lower() else 'Mobile'
            result['category'] = detected_category
            formatted_product = DataFormatter.format_product(result, 'vijaysales')
            return formatted_product

        except Exception as e:
            print(f"Error scraping product: {product_url} | {e}")
            # Return a formatted empty product on error
            return DataFormatter.format_product(result, 'vijaysales')

    def scrape_all_products_on_first_page(self, query):
        print(f" Searching for: {query}")
        product_links = self.get_product_links(query)
        print(f"Found {len(product_links)} products")

        all_results = []
        for i, link in enumerate(product_links, 1):
            print(f"[{i}/{len(product_links)}] Scraping: {link}")
            details = self.extract_product_details(link)
            all_results.append(details)

        return all_results

    def save_to_json(self, vijay_data, filename="../database/mobilescrapdata.json"):
        try:
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(vijay_data, f, indent=4, ensure_ascii=False)
            print(f" Saved {len(vijay_data)} products to {filename}")
        except Exception as e:
            print(f"Failed to save JSON: {e}")

    def close(self):
        self.driver.quit()



if __name__ == "__main__":
    scraper = VijaySalesScraper()
    try:
        results = scraper.scrape_all_products_on_first_page("iphone")
        scraper.save_to_json(results, "vijaysales_iphone_first_page.json")
    finally:
        scraper.close()
