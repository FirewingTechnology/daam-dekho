from bs4 import BeautifulSoup
import time
import json
from .base import BaseScraper
from app.utils import clean_price, clean_rating, clean_reviews
from ..formatter import format_product

class CromaScraper(BaseScraper):
    def __init__(self):
        super().__init__("croma")

    def scrape(self, query: str, category: str = "mobiles") -> list:
        products = []
        try:
            self.setup_driver()
            search_url = f"https://www.croma.com/searchB?q={query.replace(' ', '%20')}%3Arelevance"
            self.logger.info(f"Navigating to Croma search URL: {search_url}")
            self.safe_get(search_url)
            time.sleep(3)


            soup = BeautifulSoup(self.driver.page_source, 'lxml')
            items = soup.select("li.product-item")
            self.logger.info(f"Croma: found {len(items)} raw items.")

            for item in items[:15]: # Limit for speed
                try:
                    title_elem = item.select_one("h3.product-title a")
                    title = title_elem.text.strip() if title_elem else ""
                    product_link = "https://www.croma.com" + title_elem['href'] if title_elem else ""
                    
                    price_elem = item.select_one("span.amount")
                    discounted_price = clean_price(price_elem.text) if price_elem else 0.0
                    
                    image_elem = item.select_one("div.product-img img")
                    image_url = image_elem['src'] if image_elem else ""

                    if not title or not product_link:
                        continue

                    # For bulk, we skip the deep PDP visit unless it's a high-priority match
                    # But we can extract some specs from title
                    brand = title.split()[0].capitalize()
                    
                    from app.utils import extract_specs_from_title
                    title_specs = extract_specs_from_title(title)
                    
                    formatted = format_product(
                        title=title,
                        brand=brand,
                        category=category,
                        seller_name="Croma",
                        product_link=product_link,
                        vendor="croma",
                        price=discounted_price,
                        discounted_price=discounted_price,
                        rating=0.0,
                        reviews=0,
                        image_url=image_url,
                        specifications=title_specs
                    )
                    products.append(formatted)
                except Exception:
                    continue

        except Exception as e:
            self.logger.error(f"Croma scraping failed: {e}")
        finally:
            self.close_driver()
            
        return products
