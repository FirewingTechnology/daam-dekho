from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import random
import re
from bs4 import BeautifulSoup
import json
from urllib.parse import urljoin, urlparse, parse_qs
from data_formatter import DataFormatter
from data_cleanup import DataCleanup


class FlipkartSeleniumScraper:
    def __init__(self, delay=2):
        self.delay = delay
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/16.0 Mobile/15A372 Safari/604.1"
        ]
        options = Options()
        # options.add_argument("--headless")  
        options.add_argument(f"--user-agent={random.choice(self.user_agents)}")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")

        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 20)  # Increased wait time

    def close(self):
        self.driver.quit()

    def scrape_page(self, product_title, page=1):
        # Updated URL format matching Flipkart's current structure
        url = f"https://www.flipkart.com/search?q={product_title.replace(' ', '+')}&sid=tyy%2C4io&as=on&as-show=on&otracker=AS_QueryStore_OrganicAutoSuggest_1_9_na_na_na&page={page}"
        print(f"Accessing URL: {url}")
        self.driver.get(url)
        time.sleep(random.uniform(10, 15))  # Increased wait time for page load
        
        soup = BeautifulSoup(self.driver.page_source, "html.parser")
        
        # Try multiple selectors for product containers
        selectors_to_try = [
            "div.nZIRY7",           # Primary selector
            "div._75nlfW",          # Alternative
            "div.slBElJ",           # List wrapper
            "a.RveJvd",             # Product link container
            "div[class*='nZIRY']",  # Partial class match
        ]
        
        records = []
        for selector in selectors_to_try:
            try:
                records = soup.select(selector)
                if records:
                    print(f"  Found {len(records)} product(s) using selector: {selector}")
                    break
            except:
                pass
        
        if not records:
            print("  Debug: Product container not found after trying all selectors")
        
        return records

    def extract_product_offers_and_specs(self, url):
        self.driver.get(url)
        time.sleep(random.uniform(2, 4))
        soup = BeautifulSoup(self.driver.page_source, "html.parser")

        offer_div = soup.find("div", class_="UkUFwK")
        other_offer_div = soup.find("div", class_="I+EQVr")

        offer = offer_div.text.strip() if offer_div else "N/A"
        additional_offers = "\n".join(
            li.text.strip().replace("T&C", "").strip()
            for li in (other_offer_div.find_all("li", class_="kF1Ml8 col") if other_offer_div else [])
        ) or "N/A"

        specs_ul = soup.find("div", class_="xFVion")
        specifications = "\n".join(
            li.text.strip() for li in specs_ul.find_all("li")
        ) if specs_ul else "N/A"

        return {
            "Offers": f"{offer}\n{additional_offers}" if offer != "N/A" else additional_offers,
            "Specifications": specifications
        }

    def extract_data(self, records):
        data = []
        
        if not records:
            print("  No records to extract")
            return data
            
        for idx, record in enumerate(records):
            try:
                # Extract title - div.RG5Slk contains the product name
                product_name = "N/A"
                title_tag = record.find("div", class_="RG5Slk")
                if title_tag:
                    product_name = title_tag.text.strip()
                
                # Extract price - div.hZ3P6w contains the selling price
                price_value = 0.0
                price_tag = record.find("div", class_="hZ3P6w")
                if price_tag:
                    price_text = price_tag.text.strip()
                    # Extract number from price string (remove ₹ and commas)
                    price_text = price_text.replace("₹", "").replace(",", "").strip()
                    try:
                        price_value = float(price_text)
                    except ValueError:
                        price_value = 0.0
                
                # Extract product URL - a.k7wcnx contains the link
                product_url = "N/A"
                link_tag = record.find("a", class_="k7wcnx")
                
                if link_tag and link_tag.get('href'):
                    raw_url = link_tag['href']
                    if raw_url.startswith('/'):
                        clean_path = raw_url.split('?')[0]
                        product_url = urljoin("https://www.flipkart.com", clean_path)
                    elif raw_url.startswith('http'):
                        clean_path = raw_url.split('?')[0]
                        product_url = clean_path
                
                # Extract image - prioritizing high-res via srcset and specific classes
                image_urls = []
                # User requested class '_396cs4' for Flipkart images
                img_tag = record.find("img", {"class": "_396cs4"}) or \
                          record.find("img", class_="UCc1lI") or \
                          record.find("img", {"alt": True})
                
                if img_tag:
                    # DEBUG: Print product and image as requested
                    img_src = img_tag.get('src') or img_tag.get('data-src') or img_tag.get('srcset')
                    print(f"DEBUG: Found image for '{product_name[:30]}...': {img_src}")

                    # Try srcset for higher resolution
                    srcset = img_tag.get('srcset')
                    if srcset:
                        # Format: "url1 resolution1, url2 resolution2"
                        try:
                            pairs = [s.strip().split(' ') for s in srcset.split(',')]
                            # Sort by resolution (if present) and pick largest
                            best_img = sorted(pairs, key=lambda x: int(re.sub(r'[^0-9]', '', x[1])) if len(x) > 1 else 0, reverse=True)[0][0]
                            if best_img.startswith('http') or best_img.startswith('//'):
                                image_urls = [urljoin("https:", best_img) if best_img.startswith('//') else best_img]
                        except: pass
                    
                    if not image_urls:
                        img_src = img_tag.get('src') or img_tag.get('data-src')
                        if img_src and not img_src.startswith('data:image'):
                            image_urls = [urljoin("https:", img_src) if img_src.startswith('//') else img_src]

                # FALLBACK: If no image found, use a professional default
                if not image_urls:
                    image_urls = ["https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80"]
                    print(f"  ⚠ [{idx+1}] No image found for {product_name[:30]}, using fallback")
                else:
                    print(f"  📸 [{idx+1}] Final unique image URL: {image_urls[0]}")
                
                # Extract rating
                rating = 0.0
                rating_tag = record.find("div", class_="MKiFS6")
                if rating_tag:
                    rating_text = rating_tag.text.strip().split()[0]
                    try:
                        rating = float(rating_text)
                    except ValueError:
                        rating = 0.0
                
                # Extract specifications from list items
                specs_list = []
                specs_ul = record.find("ul", class_="HwRTzP")
                if specs_ul:
                    spec_items = specs_ul.find_all("li", class_="DTBslk")
                    specs_list = [li.text.strip() for li in spec_items]
                
                # Get offers and specs with error handling (skip for faster scraping)
                offers_specs = {"Offers": "N/A", "Specifications": "\n".join(specs_list) if specs_list else "N/A"}
                
                # Skip products with no title or price
                if product_name == "N/A" or price_value <= 0:
                    continue
                
                # Extract brand from product name
                brand = "Unknown"
                name_parts = product_name.split()
                if name_parts:
                    brand = name_parts[0]
                
                # Format data
                # Detect category from title
                detected_category = 'Laptop' if 'laptop' in product_name.lower() else 'Mobile'
                
                formatted_product = DataFormatter.format_product({
                    'title': product_name,
                    'brand': brand,
                    'category': detected_category,
                    'price': str(price_value),
                    'discounted_price': str(price_value),
                    'rating': rating,
                    'reviews': 0,
                    'seller_name': 'Flipkart',
                    'availability': 'In Stock',
                    'specifications': offers_specs["Specifications"],
                    'image_urls': image_urls,
                    'product_link': product_url,
                    'offers': offers_specs["Offers"].split('\n') if offers_specs["Offers"] != "N/A" else []
                }, 'flipkart')
                
                data.append(formatted_product)
                print(f"  ✓ [{idx+1}] {product_name[:50]} - ₹{price_value}")
                
            except Exception as e:
                print(f"  ✗ [{idx+1}] Error: {str(e)[:80]}")
                continue
            
            time.sleep(random.uniform(0.1, 0.3))
        
        return data

    def scrape(self, product_title, pages=2):
        all_data = []
        print(f"\n[*] Starting Flipkart scrape for: {product_title}")
        for page in range(1, pages + 1):
            print(f"\n[{page}/{pages}] Scraping page {page}...")
            try:
                records = self.scrape_page(product_title, page)
                print(f"  Records found: {len(records) if records else 0}")
                if not records:
                    print(f"  No records found on page {page}.")
                    continue
                page_data = self.extract_data(records)
                print(f"  Extracted: {len(page_data)} products")
                all_data.extend(page_data)
            except Exception as e:
                print(f"  ERROR on page {page}: {str(e)[:100]}")
                continue
        print(f"\n[✓] Total Flipkart products: {len(all_data)}")
        return all_data
    def save_to_json(flipkart_data, filename="../database/mobilescrapdata.json"):
            
            try:
                with open(filename, "w", encoding="utf-8") as f:
                    json.dump(flipkart_data, f, indent=4, ensure_ascii=False)
                print(f" Data saved to {filename}")
            except Exception as e:
                print(f" Failed to save JSON: {e}")
    def close(self):
        self.driver.quit()    

if __name__ == "__main__":
    title = "iphone"  
    flipkart_scraper = FlipkartSeleniumScraper()
    try:
        flipkart_data = flipkart_scraper.scrape(product_title=title, pages=1)
        print("Flipkart Data:\n", flipkart_data)

       
        with open("flipkart products.json", "w", encoding="utf-8") as f:
         json.dump(flipkart_data, f, indent=4, ensure_ascii=False)


    finally:
        flipkart_scraper.close()