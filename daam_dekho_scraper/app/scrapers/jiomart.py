"""
JioMart Product Scraper
Scrapes product listings from JioMart Electronics for a given search query.
"""

import time
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from app.scrapers.base import BaseScraper
from app.formatter import format_product
from app.utils import clean_price, clean_rating, clean_reviews
from app.config import MAX_PRODUCTS_PER_VENDOR


class JioMartScraper(BaseScraper):
    def __init__(self):
        super().__init__("jiomart")

    def scrape(self, query: str, category: str = "mobiles") -> list:
        products = []
        try:
            self.setup_driver()
            
            # JioMart relies heavily on dynamic rendering; encode the query
            encoded_query = query.replace(" ", "+")
            search_url = f"https://www.jiomart.com/products?q={encoded_query}"
            
            self.logger.info(f"Fetching JioMart products from: {search_url}")
            self.safe_get(search_url)

            time.sleep(6)
            # Scroll to load lazy images
            for _ in range(4):
                self.driver.execute_script("window.scrollBy(0, 1000);")
                time.sleep(1)

            soup = BeautifulSoup(self.driver.page_source, "html.parser")
            
            # The modern UI embeds rich data inside productCard__productCard components
            cards = soup.find_all('div', class_='productCard__productCard')
            
            if not cards:
                self.logger.warning("No cards found with class 'productCard__productCard'. Fallback checking legacy classes...")
                cards = soup.select(".plp-card-container, .ais-InfiniteHits-item")

            self.logger.info(f"JioMart: found {len(cards)} raw items.")

            for item in cards:
                if len(products) >= MAX_PRODUCTS_PER_VENDOR:
                    break
                try:
                    title, price, discounted_price, image_url, product_link = "", 0.0, 0.0, "", ""
                    
                    # Modern Extraction using GTM Data Layer Attributes
                    gtm = item.find('div', class_='gtmEvents')
                    if gtm:
                        title = gtm.get('data-name', '').strip()
                        price_str = gtm.get('data-price', '')
                        slug = gtm.get('data-slug', '')
                        img_str = gtm.get('data-image', '')
                        
                        try:
                            clean_pr = "".join(c for c in price_str if c.isdigit() or c == '.')
                            discounted_price = float(clean_pr) if clean_pr else 0.0
                            price = discounted_price  # GTM usually only exposes current price
                        except:
                            pass
                            
                        # Extract Image
                        if img_str and img_str.startswith("http"):
                            image_url = img_str
                            
                        # Build URL
                        if slug:
                            # Usually /p/{category}/{slug} but /p/electronics works globally
                            product_link = f"https://www.jiomart.com/p/electronics/{slug}"
                            
                    else:
                        # Legacy Extraction
                        title_elem = item.select_one(".plp-card-title-hook") or item.find("div", class_="plp-card-details-name")
                        if title_elem:
                            title = title_elem.get_text(strip=True)

                        a_tag = item.select_one("a.plp-card-title-hook") or item.find("a", href=True)
                        if a_tag and a_tag.get('href'):
                            href = a_tag['href']
                            product_link = href if href.startswith('http') else "https://www.jiomart.com" + href

                        price_tag = item.select_one(".plp-card-price-container .jm-heading-xxs") or item.select_one(".jm-heading-xxs")
                        discounted_price = clean_price(price_tag.text) if price_tag else 0.0

                        actual_price_tag = item.select_one(".plp-card-price-container .jm-body-xxs") or item.select_one(".jm-body-xxs")
                        price = clean_price(actual_price_tag.text) if actual_price_tag else discounted_price

                        img_elem = item.select_one("img.plp-card-image") or item.find("img")
                        if img_elem:
                            image_url = img_elem.get("src") or img_elem.get("data-src") or ""
                            if image_url and not image_url.startswith("http"):
                                image_url = "https://www.jiomart.com" + image_url
                                
                    if not title or not product_link:
                        continue

                    # Skip accessories for device queries to ensure we get actual devices
                    is_device_query = any(kw in query.lower() for kw in ["phone", "iphone", "samsung", "mobile", "oneplus", "pixel", "redmi", "realme", "vivo", "oppo", "laptop", "macbook"])
                    is_accessory = any(kw in title.lower() for kw in ["case", "cover", "cable", "charger", "screen guard", "tempered glass", "adapter", "glass", "pouch", "strap"])
                    if is_device_query and is_accessory:
                        self.logger.debug(f"JioMart scraper: skipping accessory item '{title}'")
                        continue

                    brand = title.split()[0].capitalize() if title else query.split()[0].capitalize()

                    # Generic offers since GTM doesn't explicitly encode text offers
                    offers = []
                    if price > discounted_price:
                        offers.append(f"Save ₹{int(price - discounted_price)} with special price")
                    
                    # Also scrape any visible tags
                    offer_tags = item.select(".jm-badge, .discount, [class*='offer'], .offer-text")
                    for tag in offer_tags:
                        txt = tag.get_text(strip=True)
                        if txt and len(txt) > 2 and txt not in offers:
                            offers.append(txt)

                    product = format_product(
                        title=title,
                        brand=brand,
                        category="Smartphones" if "phone" in query.lower() or "iphone" in query.lower() else "Electronics",
                        seller_name="JioMart",
                        product_link=product_link,
                        vendor="jiomart",
                        price=price if price >= discounted_price else discounted_price,
                        discounted_price=discounted_price,
                        rating=0.0,
                        reviews=0,
                        image_url=image_url,
                        specifications={},
                        offers=offers
                    )
                    products.append(product)
                except Exception as parse_err:
                    self.logger.warning(f"JioMart: error parsing item — {parse_err}")

        except Exception as e:
            self.logger.error(f"JioMart scraping failed: {e}")
        finally:
            self.close_driver()

        self.logger.info(f"JioMart: returning {len(products)} products.")
        return products
