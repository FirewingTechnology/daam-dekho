import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from data_formatter import DataFormatter
from data_cleanup import DataCleanup


class CromaScraper:
    def __init__(self, delay=2, headless=False):
        self.delay = delay
        options = webdriver.ChromeOptions()
        if headless:
            options.add_argument("--headless")
        options.add_argument("--start-maximized")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--log-level=3")

        try:
            self.driver = webdriver.Chrome(options=options)
            self.wait = WebDriverWait(self.driver, 10)
        except Exception as e:
            print(f"Failed to launch browser: {e}")
            exit()

    def click_all_view_more_buttons(self, max_clicks=3):
        """Click 'View More' up to max_clicks times to load products."""
        click_count = 0
        while click_count < max_clicks:
            try:
                view_more = WebDriverWait(self.driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'View More')]"))
                )
                if view_more.is_displayed():
                    print(f" Clicking 'View More' ({click_count + 1}/{max_clicks})...")
                    self.driver.execute_script("arguments[0].click();", view_more)
                    time.sleep(self.delay)
                    click_count += 1
                else:
                    break
            except Exception:
                print(" No more 'View More' button or it's not clickable.")
                break

    def scrape_all_products(self, search_query: str, max_products: int = 50) -> list:
        all_products = []

        try:
            self.driver.get("https://www.croma.com/")
            search_box = self.wait.until(EC.presence_of_element_located((By.ID, "searchV2")))
            search_box.clear()
            search_box.send_keys(search_query)
            search_box.send_keys(Keys.RETURN)
        except Exception as e:
            print(f" Error during search: {e}")
            self.driver.quit()
            return []

        time.sleep(self.delay)
        self.click_all_view_more_buttons(max_clicks=3)

        soup = BeautifulSoup(self.driver.page_source, "html.parser")
        product_cards = soup.find_all("li", class_="product-item")

        if not product_cards:
            print("⚠ No products found.")
            self.driver.quit()
            return []

        print(f" Found {len(product_cards)} products.")

        for idx, card in enumerate(product_cards, start=1):
            if idx > max_products:
                print(f" Reached product limit ({max_products}). Stopping.")
                break
            a_tag = card.find("a", href=True)
            title_tag = card.find("h3", class_="product-title")

            if not a_tag or not title_tag:
                continue

            product_url = "https://www.croma.com" + a_tag['href']
            product_title = title_tag.text.strip()
            print(f"[{idx}] Scraping: {product_title}")
            print(f"     URL: {product_url}")

            try:
                self.driver.get(product_url)
                time.sleep(self.delay)

                psoup = BeautifulSoup(self.driver.page_source, "html.parser")

                title_tag = psoup.find("h1", class_="pd-title pd-title-normal")
                price_tag = psoup.find("span", class_="amount")
                actual_price_tag = psoup.find("span", class_="old-price")
                spec_list = psoup.find("div", class_="cp-keyfeature pd-eligibility-wrap")

                title = title_tag.text.strip() if title_tag else product_title
                short_title = " ".join(title.split()[:3])
                price = price_tag.text.strip() if price_tag else "Price not found"
                actual_price = actual_price_tag.get_text(strip=True) if actual_price_tag else "Not found"

                
                specifications = {"Key Features": []}
                if spec_list:
                    for li in spec_list.find_all("li"):
                        feature = li.get_text(strip=True)
                        if feature:
                            specifications["Key Features"].append(feature)

                # Extract images from product page
                image_urls = []
                try:
                    # Strategy 1: Use Selenium to find images (more reliable for dynamic content)
                    img_selectors = [
                        ".pdp-img-container img",
                        ".swiper-slide-active img",
                        ".main-product-img img",
                        "div[class*='pdp-gallery'] img",
                        "div[class*='product-gallery'] img",
                        ".product-slider img",
                        ".slider-item img",
                        "div[class*='carousel'] img:not([class*='loading'])",
                    ]
                    
                    # Wait a bit more for images to load
                    time.sleep(2)
                    
                    for selector in img_selectors:
                        try:
                            # Try to find elements using Selenium first
                            elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                            if elements:
                                for img in elements[:10]:
                                    src = img.get_attribute("src") or img.get_attribute("data-src")
                                    if src and not any(skip in str(src).lower() for skip in ['logo', 'icon', 'placeholder', 'loading', 'spinner', 'badge']):
                                        # Accept any image that looks like a product image or from Croma's CDNs
                                        src_str = str(src).lower()
                                        is_croma = any(cdn in src_str for cdn in ['croma', 'tatacroma', 'media', 'media-ik'])
                                        is_product = "product" in src_str or "assets" in src_str
                                        
                                        if is_croma or is_product:
                                            url = src
                                            if not url.startswith("http"):
                                                url = "https://www.croma.com" + (url if url.startswith("/") else "/" + url)
                                            
                                            if url not in image_urls:
                                                image_urls.append(url)
                                if len(image_urls) >= 3:
                                    break
                        except Exception:
                            continue
                    
                    # Strategy 2: Fallback to BeautifulSoup if Selenium missed something
                    if not image_urls:
                        all_imgs = psoup.find_all("img", {"src": True})
                        for img in all_imgs:
                            src = img.get("src") or img.get("data-src")
                            if not src: continue
                            
                            src_str = str(src).lower()
                            if any(skip in src_str for skip in ['logo', 'icon', 'placeholder', 'loading', 'spinner', 'badge', '.gif']):
                                continue
                                
                            if any(cdn in src_str for cdn in ['croma', 'tatacroma', 'media-ik', 'media', 'product']):
                                url = src
                                if not url.startswith("http"):
                                    url = "https://www.croma.com" + (url if url.startswith("/") else "/" + url)
                                if url not in image_urls:
                                    image_urls.append(url)
                            
                            if len(image_urls) >= 5:
                                break
                except Exception as img_err:
                    print(f"  [!] Error extracting images: {img_err}")

                
                offers = {}
                offer_section = psoup.find("div", class_="offer-section-pdp")
                if offer_section:
                    for block in offer_section.find_all("div", recursive=True):
                        title_elem = block.find("span", class_="bank-name-text")
                        value_elem = block.find("span", class_="bank-offers-text-pdp-carousel")
                        if title_elem and value_elem:
                            key = title_elem.get_text(strip=True).replace(":", "").replace(" ", "_")
                            value = value_elem.get_text(strip=True)
                            offers[key] = value
                        else:
                            text = block.get_text(strip=True)
                            if ":" in text:
                                key, value = map(str.strip, text.split(":", 1))
                                offers[key.replace(" ", "_")] = value
                else:
                    offers = {"Info": "No offers found"}

                # Format data to match DB schema
                # Detect category from title
                detected_category = 'Laptop' if 'laptop' in title.lower() else 'Mobile'
                
                formatted_product = DataFormatter.format_product({
                    'title': short_title,
                    'brand': 'Unknown',
                    'category': detected_category,
                    'price': price,
                    'discounted_price': actual_price if actual_price != "Price not found" else price,
                    'rating': 0.0,
                    'reviews': 0,
                    'seller_name': 'Croma',
                    'availability': 'In Stock',
                    'specifications': specifications,
                    'image_urls': image_urls,  # Use extracted images
                    'product_link': product_url,
                    'offers': [{'type': 'promotion', 'description': str(v), 'code': k} for k, v in offers.items()] if offers else []
                }, 'croma')

                all_products.append(formatted_product)

            except Exception as detail_err:
                print(f"⚠ Error scraping {product_title}: {detail_err}")

        self.driver.quit()
        return all_products


    def save_to_json(self,croma_data, filename="../database/mobilescrapdata.json"):
        try:
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(croma_data, f, indent=4, ensure_ascii=False)
            print(f" Data saved to {filename}")
        except Exception as e:
            print(f" Failed to save JSON: {e}")
    def close(self):
        self.driver.quit()


if __name__ == "__main__":
    scraper = CromaScraper(headless=False)
    results = scraper.scrape_all_products("iphone")
    
    # Use the proper save_to_json method to preserve data structure
    scraper.save_to_json(results, "../database/croma_mobiles.json")
    
    print(f"\n✅ Scraped {len(results)} products")
    scraper.close()
