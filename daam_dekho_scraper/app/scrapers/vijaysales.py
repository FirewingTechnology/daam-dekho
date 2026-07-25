"""
Vijay Sales Product Scraper
Scrapes product listings from Vijay Sales for a given search query.
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


class VijaySalesScraper(BaseScraper):
    def __init__(self):
        super().__init__("vijaysales")

    def scrape(self, query: str, category: str = "mobiles") -> list:
        products = []
        try:
            self.setup_driver()
            # Correct search URL pattern for Vijay Sales
            search_url = f"https://www.vijaysales.com/search-listing?q={query.replace(' ', '%20')}"
            self.logger.info(f"Navigating to: {search_url}")
            self.safe_get(search_url)

            # Wait for product grid to populate (let SPA dynamic load complete)
            time.sleep(5)
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".discountedPrice, .product-name, a.product-card__link:not(.skeleton)"))
                )
            except Exception:
                self.logger.warning("Vijay Sales: real product container wait timed out.")

            soup = BeautifulSoup(self.driver.page_source, "lxml")
            # Items: any link to a product page that represents a card container
            items = soup.select(".product-card")
            if not items:
                items = soup.select("a.product-card__link")
            if not items:
                items = [a for a in soup.find_all("a", href=True) if "/p/" in a['href'] and len(a.get_text(strip=True)) > 20]
            if not items:
                items = soup.select("[class*='product-card'], [class*='p-product-tile'], [class*='item-wrapper']")
            
            self.logger.info(f"Vijay Sales: found {len(items)} raw items.")

            for item in items:
                if 'skeleton' in item.get('class', []):
                    continue
                if len(products) >= MAX_PRODUCTS_PER_VENDOR:
                    break
                    
                try:
                    # Link
                    link_elem = item.select_one("a.product-card__link") if item.name != "a" else item
                    raw_link = link_elem.get("href", "") if link_elem else ""
                    if not raw_link and item.name == "a":
                        raw_link = item.get("href", "")
                    
                    if not raw_link:
                        continue
                    product_link = raw_link if raw_link.startswith("http") else "https://www.vijaysales.com" + (raw_link if raw_link.startswith("/") else "/" + raw_link)

                    # Title
                    title_elem = (
                        item.select_one(".product-name")
                        or item.select_one(".product-fullname")
                        or item.select_one(".p-title")
                        or item.select_one(".product-card__title") 
                        or item.select_one(".product-description")
                        or item.select_one("span[class*='title']")
                        or item.select_one("div[class*='title']")
                    )
                    
                    if title_elem:
                        title = title_elem.get_text(" ", strip=True)
                    else:
                        # Fallback: if 'item' is the <a> and text is long, use it
                        title = item.get_text(" ", strip=True)

                    if not title or len(title) < 5:
                        continue
                    
                    # Clean title duplicates (sometimes Vijay Sales doubles the title in text)
                    if len(title) > 30:
                        half = len(title) // 2
                        if title[:half].strip() == title[half:].strip():
                            title = title[:half].strip()

                    # Price
                    price_val_elem = item.select_one(".discountedPrice") or item.select_one(".p-price") or item.select_one(".price-value")
                    discounted_price = 0.0
                    if price_val_elem:
                        if price_val_elem.get("data-price"):
                            discounted_price = clean_price(price_val_elem.get("data-price"))
                        else:
                            discounted_price = clean_price(price_val_elem.get_text(" ", strip=True))

                    mrp_val_elem = item.select_one(".originalPrice") or item.select_one(".p-mrp") or item.select_one(".mrp-value") or item.select_one(".price-mrp")
                    price = clean_price(mrp_val_elem.get_text(" ", strip=True)) if mrp_val_elem else discounted_price

                    # Rating
                    rating_elem = item.select_one(".product__title--reviews-star") or item.select_one(".stars") or item.select_one(".product-rating") or item.select_one(".rating")
                    rating = clean_rating(rating_elem.get_text(strip=True)) if rating_elem else 0.0

                    # Image - Enhanced extraction
                    image_url = ""
                    img_elem = item.select_one(".product-card__img img") or item.select_one("img")
                    if img_elem:
                        # Priority list of attributes
                        attrs = ["src", "data-src", "data-lazy-src", "data-original", "content"]
                        for attr in attrs:
                            val = img_elem.get(attr)
                            if val and not any(skip in val.lower() for skip in ['placeholder', 'loading', 'spinner', 'logo', 'icon', 'pixel.gif']):
                                if not val.startswith("http"):
                                    image_url = "https://www.vijaysales.com" + (val if val.startswith("/") else "/" + val)
                                else:
                                    image_url = val
                                break
                    
                    if not image_url:
                        for img in item.find_all("img"):
                            src = img.get("src") or img.get("data-src")
                            if src and ('product' in src.lower() or 'vj' in src.lower()) and 'logo' not in src.lower():
                                image_url = src if src.startswith("http") else "https://www.vijaysales.com" + src
                                break

                    brand = title.split()[0].capitalize() if title else query.split()[0].capitalize()

                    # Aggressive Offer Search - Enhanced
                    offers = []
                    # Check Vijay Sales specific offer badges
                    offer_badges = item.select(".product-badge, .discount-badge, [class*='offer']")
                    for badge in offer_badges:
                        txt = badge.get_text(strip=True)
                        if txt and len(txt) > 2:
                            offers.append(txt)

                    # Text-based fallback search
                    all_text_pieces = item.get_text("|", strip=True).split("|")
                    offer_keywords = ["OFF", "DEAL", "BANK", "EMI", "SAVE", "DISCOUNT", "CASHBACK", "COUPON", "FREE", "EXCHANGE", "%"]
                    
                    for txt in all_text_pieces:
                        t = txt.strip()
                        if len(t) > 2 and any(k in t.upper() for k in offer_keywords):
                            if t not in offers and len(t) < 150:
                                offers.append(t)
                    
                    # Last resort fallback if price difference exists
                    try:
                        p_val = float(price)
                        d_val = float(discounted_price)
                        if d_val < p_val and not offers:
                            offers.append(f"Save ₹{int(p_val - d_val)} on list price")
                    except:
                        pass

                    product = format_product(
                        title=title,
                        brand=brand,
                        category="Smartphones" if "phone" in query.lower() or "iphone" in query.lower() else "Electronics",
                        seller_name="Vijay Sales",
                        product_link=product_link,
                        vendor="vijaysales",
                        price=price if price >= discounted_price else discounted_price,
                        discounted_price=discounted_price,
                        rating=rating,
                        reviews=0,
                        image_url=image_url,
                        specifications={},
                        offers=offers
                    )
                    products.append(product)
                except Exception as parse_err:
                    self.logger.warning(f"Vijay Sales parsing error: {parse_err}")

        except Exception as e:
            self.logger.error(f"Vijay Sales scraping failed: {e}")
        finally:
            self.close_driver()

        self.logger.info(f"Vijay Sales: returning {len(products)} products.")
        return products
