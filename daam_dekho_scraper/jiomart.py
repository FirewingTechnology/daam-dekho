import time
import json
import re
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from urllib.parse import quote_plus, urljoin
from data_formatter import DataFormatter
from data_cleanup import DataCleanup


class JioMartScraper:
    def __init__(self, headless=True, delay=2):
        self.delay = delay
        self.driver = self.create_driver(headless)
        self.wait = WebDriverWait(self.driver, 40)  # Increased from 20 to 40 seconds

    def create_driver(self, headless=True):
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        ]
        
        options = webdriver.ChromeOptions()
        if headless:
            options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--start-maximized")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument(f"user-agent={random.choice(user_agents)}")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-popup-blocking")
        options.add_argument("--disable-gpu")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        driver = webdriver.Chrome(options=options)
        
        # Inject JavaScript to mask webdriver detection
        driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
            'source': '''
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
            '''
        })
        
        return driver
    
    def close_popups(self):
        """Close any modal popups (location services, etc)"""
        try:
            # Try to close location services popup
            close_btn = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'close') or @aria-label='Close']")
            for btn in close_btn:
                try:
                    btn.click()
                    time.sleep(0.5)
                except:
                    pass
            
            # Try clicking "Select Location Manually" button to dismiss popup
            location_btn = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Select Location')]")
            if location_btn:
                location_btn[0].click()
                time.sleep(1)
        except:
            pass

    def extract_offers_as_key_value(self, offer_section):
        """Extract offers from product page"""
        offers = {}
        if not offer_section:
            return {"Info": "No offers available"}
        
        try:
            # Extract text from various possible structures
            if isinstance(offer_section, list):
                sections = offer_section
            else:
                sections = [offer_section]
            
            for section in sections:
                # Look for list items
                items = section.find_all("li")
                if not items:
                    # Try divs
                    items = section.find_all("div", recursive=True)
                
                for idx, item in enumerate(items[:15]):  # Limit to 15 offers
                    text = item.get_text(strip=True)
                    if text and len(text) > 3 and "offer" not in text.lower():  # Skip generic headers
                        # Clean up text
                        text = text.replace("\n", " ").replace("\t", " ")
                        while "  " in text:
                            text = text.replace("  ", " ")
                        
                        if text not in offers.values():
                            offers[f"offer_{len(offers)+1}"] = text
            
            return offers if offers else {"Info": "No offers available"}
        except Exception as e:
            return {"Info": "Offers section found but parsing failed"}

    def extract_specifications(self, psoup):
        """Extract specifications from product page"""
        specs = {}
        try:
            # First, try the key-features section (quick specs)
            features_section = psoup.find("section", class_="product-key-features")
            if features_section:
                features_list = features_section.find("ul", class_="product-key-features-list")
                if features_list:
                    items = features_list.find_all("li")
                    for idx, item in enumerate(items[:15]):  # Limit to 15 features
                        text = item.get_text(strip=True)
                        if text:
                            # Try to split by colon if it exists
                            if ":" in text:
                                parts = text.split(":", 1)
                                specs[parts[0].strip()] = parts[1].strip()
                            else:
                                specs[f"feature_{idx+1}"] = text
            
            # Then, get detailed specifications from tables
            spec_section = psoup.find("section", class_="product-specifications")
            if spec_section:
                # Find all specification tables
                tables = spec_section.find_all("table", class_="product-specifications-table")
                
                for table in tables[:20]:  # Limit to 20 tables
                    # Get the category header
                    header = table.find("thead")
                    category = ""
                    if header:
                        header_th = header.find("th")
                        if header_th:
                            category = header_th.get_text(strip=True)
                    
                    # Extract rows from tbody
                    tbody = table.find("tbody")
                    if tbody:
                        rows = tbody.find_all("tr", class_="product-specifications-table-item")
                        for row in rows:
                            key_th = row.find("th", class_="product-specifications-table-item-header")
                            val_td = row.find("td", class_="product-specifications-table-item-data")
                            
                            if key_th and val_td:
                                key = key_th.get_text(strip=True)
                                value = val_td.get_text(strip=True)
                                # Add both with and without category prefix
                                if key and value:
                                    # Use key as is (more readable)
                                    specs[key] = value
            
            # If still no specs found, try alternative formats
            if not specs:
                # Try list format
                spec_lists = psoup.find_all("ul", class_=lambda x: x and ("spec" in x.lower() or "feature" in x.lower()) if x else False)
                for spec_list in spec_lists[:2]:  # Check first 2 lists
                    items = spec_list.find_all("li")
                    for idx, item in enumerate(items[:10]):  # Limit to 10 items
                        text = item.get_text(strip=True)
                        if text and text not in specs.values():
                            if ":" in text:
                                parts = text.split(":", 1)
                                specs[parts[0].strip()] = parts[1].strip()
                            else:
                                specs[f"detail_{len(specs)+1}"] = text
            
            return specs if specs else {"Info": "No specifications found"}
        except Exception as e:
            return {"Error": str(e)}
    
    def extract_brand_from_page(self, psoup, title_text=""):
        """Extract brand from product page"""
        try:
            # Common phone brands to look for
            known_brands = ['realme', 'redmi', 'vivo', 'oppo', 'iphone', 'samsung', 'oneplus', 'moto', 
                          'poco', 'nokia', 'honor', 'infinix', 'asus', 'nothing', 'micromax', 'lava']
            
            # Try to find brand in dedicated brand section
            brand_elem = psoup.find("div", class_=lambda x: x and "brand" in x.lower() if x else False)
            if brand_elem:
                brand = brand_elem.get_text(strip=True)
                if brand:
                    return brand
            
            # Try to find in product title or heading
            h1 = psoup.find("h1")
            if h1:
                title = h1.get_text(strip=True)
                # Check for known brands in title
                for brand in known_brands:
                    if brand.lower() in title.lower():
                        return brand.capitalize()
                # Otherwise extract first word as brand
                first_word = title.split()[0] if title else ""
                if first_word and len(first_word) > 1:
                    return first_word
            
            # Try to extract from title parameter
            if title_text:
                # Check for known brands
                for brand in known_brands:
                    if brand.lower() in title_text.lower():
                        return brand.capitalize()
                # Extract first word
                first_word = title_text.split()[0]
                if first_word and len(first_word) > 1:
                    return first_word
            
            return "Unknown"
        except:
            return "Unknown"
    
    def extract_rating_from_page(self, psoup):
        """Extract rating from product page"""
        try:
            # Look for rating in common Jiomart structures
            # Try to find in review/rating section
            rating_elem = psoup.find("span", class_=lambda x: x and "rating" in x.lower() if x else False)
            if not rating_elem:
                rating_elem = psoup.find("div", class_=lambda x: x and "rating" in x.lower() if x else False)
            
            if rating_elem:
                rating_text = rating_elem.get_text(strip=True)
                # Extract number from text like "4.5 stars" or "4.5"
                numbers = re.findall(r'(\d+\.?\d*)', rating_text)
                if numbers:
                    return float(numbers[0])
            
            # Try aria-label approach
            star_elem = psoup.find(["span", "div"], attrs={"aria-label": re.compile(r"\d+\.?\d?\s*star")})
            if star_elem:
                text = star_elem.get("aria-label", "")
                numbers = re.findall(r'(\d+\.?\d*)', text)
                if numbers:
                    return float(numbers[0])
            
            return 0.0
        except:
            return 0.0
    
    def extract_reviews_count(self, psoup):
        """Extract review count from product page"""
        try:
            # Look for review count
            review_elem = psoup.find("span", class_=lambda x: x and "review" in x.lower() if x else False)
            if review_elem:
                text = review_elem.get_text(strip=True)
                numbers = re.findall(r'(\d+)', text)
                if numbers:
                    return int(numbers[0])
            
            return 0
        except:
            return 0
    
    def extract_images_from_page(self, psoup):
        """Extract product images from page using Selenium and BeautifulSoup"""
        images = []
        try:
            # Strategy 1: Use Selenium to find images (more reliable for dynamic content)
            img_selectors = [
                ".pdp-image-gallery img",
                ".image-container img",
                ".main-image img",
                ".gallery-images img",
                "div[class*='carousel'] img",
                "img[src*='jiomart.com/images/product']"
            ]
            
            # Brief wait for images
            time.sleep(1)
            
            for selector in img_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        for img in elements[:8]:
                            src = img.get_attribute("src") or img.get_attribute("data-src")
                            if src and ("jiomart" in src or "cdn" in src or "product" in src.lower()):
                                if not any(skip in src.lower() for skip in ['logo', 'icon', 'placeholder', 'spinner', 'badge']):
                                    if src not in images:
                                        images.append(src)
                        if len(images) >= 5:
                            break
                except:
                    continue
            
            # Strategy 2: Fallback to BeautifulSoup if Selenium missed something
            if not images:
                # Look for product images in gallery/carousel
                img_containers = psoup.find_all("div", class_=lambda x: x and ("image" in x.lower() or "gallery" in x.lower()) if x else False)
                
                if not img_containers:
                    img_containers = psoup.find_all("div", class_=lambda x: x and "carousel" in x.lower() if x else False)
                
                if img_containers:
                    for container in img_containers[:3]:
                        imgs = container.find_all("img")
                        for img in imgs[:5]:
                            src = img.get("src") or img.get("data-src")
                            if src and ("jiomart" in src or "cdn" in src):
                                if src not in images:
                                    images.append(src)
                        if len(images) >= 5:
                            break
            
            # Strategy 3: Find all product images
            if not images:
                all_imgs = psoup.find_all("img")
                for img in all_imgs:
                    src = img.get("src") or img.get("data-src")
                    alt = img.get("alt", "").lower()
                    if src and any(x in src.lower() for x in ["jiomart", "cdn", "product"]):
                        if "product" in alt or "image" in alt:
                            if src not in images:
                                images.append(src)
                        if len(images) >= 5:
                            break
            
            return images if images else []
        except:
            return []

    def scrape_products(self, search_query: str, max_scrolls: int = 30):
        products = []

        try:
            # Format search URL
            encoded_query = search_query.replace(" ", "+")
            search_url = f"https://www.jiomart.com/products?q={encoded_query}"
            
            print(f"  [*] Loading JioMart.com search: {search_url}")
            self.driver.get(search_url)
            time.sleep(6)  # Initial wait
            
            # Scroll to load lazy images and products
            for scroll_count in range(max_scrolls):
                self.driver.execute_script("window.scrollBy(0, 1000);")
                time.sleep(1)
            
            soup = BeautifulSoup(self.driver.page_source, "html.parser")
            
            # The modern UI embeds rich data inside productCard__productCard components
            product_items = soup.find_all('div', class_='productCard__productCard')
            
            if not product_items:
                product_items = soup.select(".plp-card-container, .ais-InfiniteHits-item")

            print(f" Found {len(product_items)} products on page(s).")
 
            for idx, item in enumerate(product_items, start=1):
                title, price, actual_price, product_url = "", 0.0, 0.0, ""
                
                # Modern Extraction using GTM Data Layer Attributes
                gtm = item.find('div', class_='gtmEvents')
                if gtm:
                    title = gtm.get('data-name', '').strip()
                    price_str = gtm.get('data-price', '')
                    slug = gtm.get('data-slug', '')
                    
                    try:
                        clean_pr = "".join(c for c in price_str if c.isdigit() or c == '.')
                        price = float(clean_pr) if clean_pr else 0.0
                        actual_price = price
                    except:
                        pass
                        
                    # Build URL
                    if slug:
                        product_url = f"https://www.jiomart.com/p/electronics/{slug}"
                else:
                    # Legacy fallback
                    title_tag = item.select_one(".plp-card-title-hook") or item.find("div", class_="plp-card-details-name")
                    title = title_tag.get_text(strip=True) if title_tag else "N/A"
                    
                    price_tag = item.select_one(".plp-card-price-container .jm-heading-xxs") or item.select_one(".jm-heading-xxs")
                    if price_tag:
                        price_text = price_tag.text.strip().replace("₹", "").replace(",", "")
                        try:
                            price = float(price_text)
                            actual_price = price
                        except:
                            pass
                            
                    a_tag = item.select_one("a.plp-card-title-hook") or item.find("a", href=True)
                    if a_tag and a_tag.get('href'):
                        href = a_tag['href']
                        product_url = href if href.startswith('http') else "https://www.jiomart.com" + href

                # Skip empty titles or missing URLs
                if not title or title == "N/A" or not product_url:
                    continue
                
                # Filtering: Check for phone-specific keywords
                phone_keywords = ['gb', 'ghz', 'processor', 'display', 'inch', '5g', '4g', 'camera', 'battery', 'rom', 'smartphone', 'mobile', 'phone', 'iphone']
                is_likely_phone = any(keyword in title.lower() for keyword in phone_keywords)
                
                # Skip if it's clearly an accessory or protective item
                accessory_keywords = ['case', 'cover', 'cable', 'charger', 'screen protector', 'glass guard', 'tempered glass', 'back cover', 'flip cover', 'adapter']
                is_accessory = any(keyword in title.lower() for keyword in accessory_keywords)
                
                if is_accessory:
                    continue
                
                if not is_likely_phone and price <= 10000:
                    continue
                
                # Initialize variables
                brand = search_query.split()[0].capitalize()
                rating = 0.0
                reviews = 0
                specifications = {}
                images = []
                offers = {}

                if product_url:
                    try:
                        self.driver.get(product_url)
                        time.sleep(self.delay)
                        
                        self.close_popups()
                        
                        psoup = BeautifulSoup(self.driver.page_source, "html.parser")

                        # Extract all product information
                        brand_extracted = self.extract_brand_from_page(psoup, title)
                        if brand_extracted and brand_extracted != "Unknown":
                            brand = brand_extracted
                            
                        rating = self.extract_rating_from_page(psoup)
                        reviews = self.extract_reviews_count(psoup)
                        specifications = self.extract_specifications(psoup)
                        images = self.extract_images_from_page(psoup)
                        
                        # Extract offers
                        offer_sections = psoup.find_all("div", class_=lambda x: x and "offer" in x.lower() if x else False)
                        if not offer_sections:
                            offer_sections = psoup.find_all("section", class_=lambda x: x and "offer" in x.lower() if x else False)
                        if offer_sections:
                            offers = self.extract_offers_as_key_value(offer_sections)
                        else:
                            offers = {"Info": "No offers available"}

                    except Exception as e:
                        print(f" Warning: Could not extract full details from {product_url}: {str(e)[:50]}")

                # Detect category from title
                detected_category = 'Laptop' if 'laptop' in title.lower() else 'Mobile'
                
                raw_product = {
                    'title': title,
                    'brand': brand,
                    'category': detected_category,
                    'price': price,
                    'discounted_price': actual_price,
                    'rating': rating,
                    'reviews': reviews,
                    'seller_name': 'JioMart',
                    'availability': 'In Stock',
                    'specifications': specifications,
                    'image_urls': images,
                    'product_link': product_url,
                    'offers': [{'type': 'promotion', 'description': str(v), 'code': k} for k, v in offers.items()] if offers else []
                }

                products.append(raw_product)
                print(f"  [{idx}] {title[:40]} | ₹{price} | Brand: {brand}")

        except Exception as e:
            print(f"\n[ERROR] {str(e)[:150]}")
            import traceback
            traceback.print_exc()

        print(f"\n[✓] Total JioMart products: {len(products)}")
        return products

    def save_to_json(self, jiomart_data, filename="../database/mobilescrapdata.json"):
        try:
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(jiomart_data, f, indent=4, ensure_ascii=False)
            print(f"✅ Data saved to '{filename}'")
        except Exception as e:
            print(f"❌ Failed to save JSON: {e}")

    def close(self):
        self.driver.quit()


# Usage
if __name__ == "__main__":
    scraper = JioMartScraper(headless=False, delay=2)
    try:
        # Use more specific phone searches that return actual devices, not accessories
        results = scraper.scrape_products("iphone", max_scrolls=5)
        scraper.save_to_json(results, "jiomart_iphone_first_page.json")
    finally:
        scraper.close()
