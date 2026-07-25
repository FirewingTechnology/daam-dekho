from bs4 import BeautifulSoup
import time
import re
from .base import BaseScraper
from app.utils import clean_price, clean_rating, clean_reviews
from ..formatter import format_product

class AmazonScraper(BaseScraper):
    def __init__(self):
        super().__init__("amazon")

    def scrape(self, query: str, category: str = "mobiles", max_pages: int = 1, max_results: int = 2) -> list:
        products = []
        try:
            self.setup_driver()
            
            for page in range(1, max_pages + 1):
                search_url = f"https://www.amazon.in/s?k={query.replace(' ', '+')}&page={page}"
                self.logger.info(f"Navigating to {search_url} (Page {page})")
                self.safe_get(search_url)
                
                # Wait for results to appear
                time.sleep(2)
                
                soup = BeautifulSoup(self.driver.page_source, 'lxml')
                
                # Check for CAPTCHA
                if "To discuss automated access" in soup.text:
                    self.logger.error("Amazon: Bot detection triggered.")
                    break

                items = soup.select("div[data-component-type='s-search-result']")
                self.logger.info(f"Amazon Page {page}: found {len(items)} raw items.")

                for item in items:
                    if max_results and len(products) >= max_results:
                        break

                    try:
                        # 1. Title & Link
                        title_elem = item.select_one("a.a-text-normal, h2 a.a-link-normal")
                        title = title_elem.get_text(" ", strip=True) if title_elem else ""
                        
                        link_elem = title_elem or item.select_one("a.a-link-normal")
                        product_link = ""
                        if link_elem and link_elem.get('href'):
                            raw_href = link_elem['href']
                            import urllib.parse
                            unquoted = urllib.parse.unquote(raw_href)
                            match = re.search(r'(/[^?]+/dp/[A-Z0-9]{10}|/dp/[A-Z0-9]{10})', unquoted)
                            if match:
                                product_link = "https://www.amazon.in" + match.group(1)
                            elif raw_href.startswith("http"):
                                product_link = raw_href.split('?')[0]
                            else:
                                product_link = "https://www.amazon.in" + raw_href.split('?')[0]

                            # Reject generic redirect links if dp wasn't found
                            if "/sspa/click" in product_link:
                                product_link = ""

                        
                        # 2. Discounted Price
                        price_elem = item.select_one("span.a-price-whole")
                        discounted_price = clean_price(price_elem.text) if price_elem else 0.0
                        
                        # 3. MRP (Strike-through original price)
                        mrp_elem = item.select_one("span.a-price.a-text-price span.a-offscreen, span.a-text-price span.a-offscreen")
                        mrp = clean_price(mrp_elem.text) if mrp_elem else discounted_price
                        if mrp < discounted_price:
                            mrp = discounted_price

                        # 4. Rating
                        rating_elem = item.select_one("i.a-icon-star-small span.a-icon-alt, i.a-icon-star span.a-icon-alt, i[class*='a-star'] span")
                        rating = clean_rating(rating_elem.text) if rating_elem else 0.0

                        # 5. Reviews Count
                        reviews_elem = item.select_one("span.a-size-base.s-underline-text, span[aria-label*='rating'], span.a-size-base")
                        reviews = clean_reviews(reviews_elem.text) if reviews_elem else 0

                        # 6. Image URL
                        image_elem = item.select_one("img.s-image")
                        image_url = image_elem['src'] if image_elem else ""

                        if not title or not product_link or discounted_price == 0:
                            continue

                        brand = title.split()[0].capitalize() if title else "Generic"

                        # Extract specs from title
                        from app.utils import extract_specs_from_title
                        title_specs = extract_specs_from_title(title)
                        
                        formatted = format_product(
                            title=title,
                            brand=brand,
                            category=category or ("Smartphones" if any(kw in title.lower() for kw in ["phone", "iphone", "mobile", "smartphone", "ultra"]) else "Electronics"),
                            seller_name="Amazon",
                            product_link=product_link,
                            vendor="amazon",
                            price=mrp,
                            discounted_price=discounted_price,
                            rating=rating,
                            reviews=reviews,
                            image_url=image_url,
                            specifications=title_specs,
                            offers=[]
                        )
                        products.append(formatted)
                    except Exception as e:
                        self.logger.warning(f"Amazon parsing item error: {e}")
                        continue

                if max_results and len(products) >= max_results:
                    break
                    
        except Exception as e:
            self.logger.error(f"Amazon scraping failed: {e}")
        finally:
            self.close_driver()
            
        return products

