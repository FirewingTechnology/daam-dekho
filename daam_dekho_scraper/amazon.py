from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
import pandas as pd
import time
import random
import re
import json
import sys
import os
sys.path.append(os.getcwd())
from app.formatter import format_product as app_format_product
from app.utils import clean_price
from image_validator import ProductImageValidator

# Dummy classes to prevent import errors if they are used elsewhere
class DataFormatter:
    @staticmethod
    def format_product(data, vendor):
        # Map keys from the scraper to what our app formatter expects
        return app_format_product(
            title=data.get('title'),
            brand=data.get('brand'),
            category=data.get('category'),
            seller_name=data.get('seller_name', 'Amazon'),
            product_link=data.get('product_link'),
            vendor=vendor,
            price=data.get('price', 0),
            discounted_price=data.get('discounted_price', 0),
            rating=data.get('rating', 0),
            reviews=data.get('reviews', 0),
            image_url=data.get('image_urls', [None])[0],
            specifications=data.get('specifications', {}),
            offers=data.get('offers', [])
        )

class DataCleanup:
    @staticmethod
    def clean_product_list(products):
        from app.cleaner import clean_product_list
        return clean_product_list(products)



class AmazonMobileScraper:
    def __init__(self, delay=3):
        self.delay = delay
        self.user_agents = [
            
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.112 Safari/537.36",
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.57 Safari/537.36"

            
        ]
        
        options = Options()
        
        options.add_argument(f"user-agent={random.choice(self.user_agents)}")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)

        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 10)

    def extract_brand(self, title):
        """Extract brand name from product title"""
        if not title or title == "N/A":
            return "Unknown"
        # Get first word which is usually the brand
        brand = title.split()[0].strip()
        return brand if brand else "Unknown"
    
    def scrape_all_offers(self, psoup):
        """Scrape all available offers including EMI options"""
        all_offers = []
        
        # Try to find offers section
        offer_section = psoup.find("div", class_="a-cardui vsx__offers-holder")
        
        if offer_section:
            # Get all offer items
            offer_items = offer_section.find_all("div", class_="a-box-group a-spacing-base")
            
            for item in offer_items:
                title_elem = item.find("h6", class_="a-size-base a-spacing-micro offers-items-title")
                desc_elem = item.find("span", class_="a-truncate-full a-offscreen")
                
                if title_elem and desc_elem:
                    offer_type = title_elem.get_text(strip=True).replace(":", "").lower()
                    description = desc_elem.get_text(strip=True)
                    
                    # Categorize offer type
                    if "emi" in offer_type.lower():
                        offer_category = "emi"
                    elif "cashback" in offer_type.lower():
                        offer_category = "cashback"
                    elif "discount" in offer_type.lower() or "bank" in offer_type.lower():
                        offer_category = "bank_offer"
                    else:
                        offer_category = "promotion"
                    
                    all_offers.append({
                        "type": offer_category,
                        "description": description,
                        "code": offer_type.replace(" ", "_").upper()
                    })
        
        # If no structured offers found, try alternate method
        if not all_offers:
            # Try finding offers in text form
            offer_text_divs = psoup.find_all("div", class_="a-section")
            for div in offer_text_divs:
                text = div.get_text(strip=True)
                if "EMI" in text or "cashback" in text.lower() or "discount" in text.lower():
                    if len(text) > 20 and len(text) < 300:  # Reasonable length
                        # Try to extract offer type and description
                        if ":" in text:
                            parts = text.split(":", 1)
                            all_offers.append({
                                "type": "promotion",
                                "description": parts[1].strip(),
                                "code": parts[0].strip().replace(" ", "_").upper()
                            })
        
        # Return unique offers or default
        seen = set()
        unique_offers = []
        for offer in all_offers:
            key = (offer["type"], offer["description"])
            if key not in seen:
                seen.add(key)
                unique_offers.append(offer)
        
        return unique_offers if unique_offers else [{"type": "info", "description": "No offers available", "code": "NO_OFFERS"}]

    def scrape_product_images(self, psoup):
        """Scrape product images from product detail page using multiple selectors"""
        images = []
        
        try:
            # Method 1: Extraction from data-a-dynamic-image attribute (Amazon's highest quality source)
            main_img_elem = psoup.find("img", id="landingImage") or psoup.find("img", id="imgBlkFront")
            if main_img_elem:
                if main_img_elem.get("data-a-dynamic-image"):
                    try:
                        dyn_images = json.loads(main_img_elem.get("data-a-dynamic-image"))
                        # Map contains URL to resolution mapping, pick the highest resolution one
                        sorted_urls = sorted(dyn_images.items(), key=lambda x: x[1][0] * x[1][1], reverse=True)
                        if sorted_urls:
                            images.append(sorted_urls[0][0])
                    except: pass
                
                if not images:
                    src = main_img_elem.get("src") or main_img_elem.get("data-src")
                    if src and not src.startswith('data:image'):
                        images.append(src)

            # Method 2: Extraction from carousel image elements
            if len(images) < 3:
                alt_images = psoup.find_all("img", class_="a-dynamic-image")
                for img in alt_images:
                    src = img.get("src") or img.get("data-src")
                    if src and src.startswith('http') and 'placeholder' not in src.lower():
                        if src not in images:
                            images.append(src)
            
            # Method 3: Extraction from thumbnail list
            if len(images) < 3:
                thumbs = psoup.select("#altImages ul li img")
                for img in thumbs:
                    src = img.get("src") or img.get("data-src")
                    if src and src.startswith('http') and 'placeholder' not in src.lower():
                        # Amazon thumbnails: safely swap sizing modifier to high resolution
                        high_res = re.sub(r'\._AC_[^.]*_\.|\._SL\d+_|\._SX\d+_|\._SY\d+_', '._SL1000_.', src)
                        if high_res not in images:
                            images.append(high_res)

        except Exception as e:
            print(f"Error scraping images: {e}")
        
        # LOGGING: Print images found
        if images:
            print(f" Found {len(images)} images for product. First URL: {images[0]}")
        else:
            # Use a professional default if all else fails
            images = ["https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80"]
            print(f" No images found, using fallback: {images[0]}")
            
        return images[:5]

    def close(self):
        self.driver.quit()

    def scrape_mobiles(self, search_term="Lava mobile phone", max_pages=1):
        all_data = []
        max_retries = 3
        
        for page in range(1, max_pages + 1):
            query = quote_plus(search_term)
            url = f"https://www.amazon.in/s?k={query}&page={page}"
            
            # Retry logic for connection errors
            for retry in range(max_retries):
                try:
                    self.driver.get(url)
                    time.sleep(self.delay)  # Wait for page to load
                    break
                except Exception as e:
                    if retry < max_retries - 1:
                        print(f" Connection error, retrying in 5 seconds...")
                        time.sleep(5)
                    else:
                        print(f" Failed after {max_retries} retries on page {page}. Returning collected data.")
                        return all_data
            
            try:
                self.wait.until(EC.presence_of_all_elements_located((By.XPATH, "//div[@data-component-type='s-search-result']")))
            except:
                print(f"  No results loaded on page {page}")
                continue
            
            soup = BeautifulSoup(self.driver.page_source, "html.parser")
            cards = soup.find_all("div", {"data-component-type": "s-search-result"})

            for card in cards:
                try:
                    link_tag = card.find("a",  href=True)
                    if not link_tag:
                        continue
                    
                    raw_href = link_tag["href"]
                    match = re.search(r"(/dp/[A-Z0-9]{10})", raw_href)
                    if not match:
                        continue  # Skip if no valid product URL found
                    product_url = f"https://www.amazon.in{match.group(1)}"
                    print(f"Scraping product URL: {product_url}")
                    
                    # Retry for product page load
                    for retry in range(max_retries):
                        try:
                            self.driver.get(product_url)
                            self.wait.until(EC.presence_of_element_located((By.ID, "productTitle")))
                            break
                        except Exception as e:
                            if retry < max_retries - 1:
                                time.sleep(3)
                            else:
                                print(f" Failed to load product page after retries")
                                continue
                    
                    psoup = BeautifulSoup(self.driver.page_source, "html.parser")

                    # Title
                    title_elem = psoup.find("span", id="productTitle")
                    product_name = title_elem.get_text(strip=True) if title_elem else "N/A"
                    
                    actual_price_tag = psoup.find("span", class_="a-price a-text-price")
                    raw_price = actual_price_tag.find("span", class_="a-offscreen").text.strip() if actual_price_tag else "0"
                    actual_price = clean_price(raw_price)

                    
                    # Extract actual product brand from title
                    product_brand = self.extract_brand(product_name)
                    
                    # Extract rating and reviews
                    rating = 4.0  # Default
                    reviews = 0   # Default
                    
                    try:
                        rating_elem = psoup.find("span", class_="a-icon-star-small")
                        if rating_elem:
                            rating_text = rating_elem.get_text(strip=True)
                            rating = float(rating_text.split()[0]) if rating_text else 4.0
                    except:
                        pass
                    
                    try:
                        reviews_elem = psoup.find("span", id="acrCustomerReviewText")
                        if reviews_elem:
                            reviews_text = reviews_elem.get_text(strip=True)
                            reviews = int(''.join(filter(str.isdigit, reviews_text.split()[0]))) if reviews_text else 0
                    except:
                        pass
                    
                    # Scrape all offers
                    all_offers = self.scrape_all_offers(psoup)
                    
                    # Scrape product images
                    # FIRST: Try to get image from the card (search result) to ensure uniqueness
                    card_image = None
                    try:
                        # Amazon search result images typically have class 's-image'
                        img_tag = card.find("img", {"class": "s-image"})
                        if img_tag:
                            card_image = img_tag.get('src')
                            if card_image:
                                print(f" Found card image: {product_name[:30]}... -> {card_image}")
                    except Exception as img_e:
                        print(f" Card image extraction failed: {img_e}")

                    # SECOND: Try to get images from product detail page
                    product_images = self.scrape_product_images(psoup)
                    
                    # If detail page image is fallback but we have a card image, use card image
                    if card_image and (not product_images or "unsplash.com" in product_images[0]):
                        product_images = [card_image] + (product_images if product_images else [])
                    elif card_image and card_image not in product_images:
                        # Prepend card image as it's definitely related to this specific result
                        product_images.insert(0, card_image)

                    

                   

                  
                    specs = {}
                    # Try technical details tables (multiple possible selectors)
                    tables = psoup.select("table.prodDetTable, table.a-keyvalue, table.a-spacing-micro")
                    for table in tables:
                        rows = table.find_all("tr")
                        for row in rows:
                            th = row.find(["th", "td"], class_=re.compile("label|key|prodDetSectionEntry"))
                            td = row.find(["td"], class_=re.compile("value|prodDetAttrValue"))
                            if not (th and td):
                                # Fallback for simple tr/td structure
                                cols = row.find_all(["th", "td"])
                                if len(cols) == 2:
                                    th, td = cols[0], cols[1]
                            
                            if th and td:
                                key = th.get_text(strip=True).lower()
                                val = td.get_text(strip=True)
                                
                                # Precise label matching for Amazon Smartphones
                                key_clean = key.replace(" ", "")
                                
                                if "rammemoryinstalledsize" in key_clean or (key_clean == "ram" and "storage" not in key_clean):
                                    specs["ram"] = val
                                elif "memorystoragecapacity" in key_clean or (key_clean == "storage" and "ram" not in key_clean) or (key_clean == "rom"):
                                    specs["rom"] = val
                                elif "rearfacingcameraphotosensorresolution" in key_clean or "photosensorresolution" in key_clean:
                                    specs["camera"] = val
                                elif "screensizeunitofmeasure" in key_clean or (key_clean == "screensize"):
                                    specs["display"] = val
                                elif "batterycapacity" in key_clean or "battery" in key_clean:
                                    specs["battery"] = val
                                
                                # Fallback for generic labels if still empty
                                if not specs.get("ram") and "ram" in key and "storage" not in key: specs["ram"] = val
                                if not specs.get("rom") and ("storage" in key or "rom" in key) and "ram" not in key: specs["rom"] = val


                    # Fallback to feature bullets
                    bullets = psoup.select("#feature-bullets li span, .a-list-item")
                    for b in bullets:
                        txt = b.get_text(strip=True)
                        txt_upper = txt.upper()
                        if not specs.get("ram") and "RAM" in txt_upper:
                            match = re.search(r'(\d+\s*GB)', txt_upper)
                            if match: specs["ram"] = match.group(1)
                        if not specs.get("rom") and any(kw in txt_upper for kw in ["ROM", "STORAGE", "GB", "TB"]):
                            match = re.search(r'(\d+\s*(?:GB|TB))', txt_upper)
                            if match: specs["rom"] = match.group(1)
                        if not specs.get("camera") and "CAMERA" in txt_upper:
                            specs["camera"] = txt
                        if not specs.get("display") and any(kw in txt_upper for kw in ["DISPLAY", "SCREEN", "INCH"]):
                            specs["display"] = txt



                    # Format data to match DB schema
                    # Detect category from title
                    detected_category = 'Laptop' if 'laptop' in product_name.lower() else 'Mobile'
                    
                    formatted_product = DataFormatter.format_product({
                        'title': product_name,
                        'brand': product_brand,  # Use extracted brand, not seller name
                        'category': detected_category,
                        'price': actual_price if actual_price != "N/A" else "0",
                        'discounted_price': actual_price if actual_price != "N/A" else "0",
                        'rating': rating,  # Use scraped rating
                        'reviews': reviews,  # Use scraped review count
                        'seller_name': 'Amazon',
                        'availability': 'In Stock',
                        'specifications': specs,
                        'image_urls': product_images,  # Use scraped images
                        'product_link': product_url,
                        'offers': all_offers
                    }, 'amazon')
                    
                    all_data.append(formatted_product)
                    print(f"OK Scraped: {product_name}")

                    time.sleep(self.delay)

                except Exception as e:
                    # Clean error message of non-ascii characters for console
                    err_msg = str(e).encode('ascii', 'ignore').decode('ascii')
                    print(f"Error skipping a product: {err_msg}")


                    continue
        
        return all_data

    def save_to_json(self,amazon_data, filename="../database/mobilescrapdata.json"):
        try:
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(amazon_data, f, indent=4, ensure_ascii=False)
            print(f" Data saved to {filename}")
        except Exception as e:
            print(f" Failed to save JSON: {e}")
    def close(self):
        self.driver.quit()


if __name__ == "__main__":
    scraper = AmazonMobileScraper()
    try:
        results = scraper.scrape_mobiles("samsung galaxy s24", max_pages=1)

        df = pd.DataFrame(results)
        
        df.to_json("amazon_mobiles.json", orient="records", indent=2 , force_ascii=False)
        print(df.head())
    finally:
        scraper.close()
 