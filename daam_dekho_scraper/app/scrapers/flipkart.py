from bs4 import BeautifulSoup
import time
from .base import BaseScraper
from app.utils import clean_price, clean_rating, clean_reviews
from ..formatter import format_product

class FlipkartScraper(BaseScraper):
    def __init__(self):
        super().__init__("flipkart")

    def scrape(self, query: str, category: str = "mobiles", max_pages: int = 1, max_results: int = 2) -> list:
        products = []
        try:
            self.setup_driver()
            
            for page in range(1, max_pages + 1):
                search_url = f"https://www.flipkart.com/search?q={query.replace(' ', '+')}&page={page}"
                self.logger.info(f"Navigating to {search_url} (Page {page})")
                self.safe_get(search_url)
                
                time.sleep(2)
                soup = BeautifulSoup(self.driver.page_source, 'lxml')
                
                # Modern Flipkart container selectors
                items = soup.select("a[href*='/p/'], a.k7wcnx, div._1AtVbE, div._13oc-S, div[data-id]")
                self.logger.info(f"Flipkart Page {page}: found {len(items)} raw items.")

                for item in items:
                    if max_results and len(products) >= max_results:
                        break

                    try:
                        # 1. Title Selector
                        title_elem = item.select_one("div.RG5Slk, div.KzDlHZ, div._4rR01T, a.wjcE2, a.s1Q9rs")
                        title = ""
                        if title_elem:
                            title = title_elem.get_text(strip=True)
                        else:
                            img_el = item.select_one("img")
                            if img_el and img_el.get('alt'):
                                title = img_el.get('alt')
                                
                        if not title:
                            continue
                        
                        # 2. Link Selector
                        product_link = ""
                        if item.name == 'a' and item.get('href'):
                            product_link = "https://www.flipkart.com" + item['href'].split('?')[0]
                        else:
                            link_elem = item.select_one("a[href*='/p/'], a._1fQ64c, a.s1Q9rs, a.V_P9_E")
                            if link_elem and link_elem.get('href'):
                                product_link = "https://www.flipkart.com" + link_elem['href'].split('?')[0]

                        # 3. Discounted Price
                        price_elem = item.select_one("div.QiMO5r, div.hZ3P6w, div.oFEPlD, div._30jeq3, div.Nx9be9, div.Nx9376")
                        discounted_price = clean_price(price_elem.text) if price_elem else 0.0
                        
                        # 4. MRP (Strike-through original price)
                        mrp_elem = item.select_one("div.yRaY8j, div._3I9_wc, div.yR5qU_")
                        mrp = clean_price(mrp_elem.text) if mrp_elem else discounted_price
                        if mrp < discounted_price:
                            mrp = discounted_price

                        # 5. Rating
                        rating_elem = item.select_one("div.XU9vFk, div._3LWZlK, span.YAVh1")
                        rating = clean_rating(rating_elem.text) if rating_elem else 0.0

                        # 6. Reviews Count
                        reviews_elem = item.select_one("span.WP7lh+ span, span._2_R_28, span.rP1aw5")
                        reviews = clean_reviews(reviews_elem.text) if reviews_elem else 0

                        # 7. Image Selector
                        image_elem = item.select_one("img.UCc1lI, img._396csP, img.DByoH4, img")
                        image_url = ""
                        if image_elem:
                            image_url = image_elem.get('src') or image_elem.get('data-src') or ""

                        if not product_link or discounted_price == 0:
                            continue

                        brand = title.split()[0].capitalize()
                        
                        from app.utils import extract_specs_from_title
                        title_specs = extract_specs_from_title(title)
                        
                        specs_list = item.select("ul.G4BRas li, ul._1xgFaf li, div.fMghEO ul li")
                        if specs_list:
                            for li in specs_list:
                                text = li.get_text(strip=True).lower()
                                orig_text = li.get_text(strip=True)
                                if 'ram' in text and 'rom' in text:
                                    parts = orig_text.split('|')
                                    for p in parts:
                                        if 'RAM' in p.upper(): title_specs['ram'] = p.strip().upper()
                                        if 'ROM' in p.upper(): title_specs['rom'] = p.strip().upper()
                                elif 'display' in text or 'inch' in text or 'cm' in text:
                                    title_specs['display'] = orig_text
                                elif 'camera' in text or 'mp' in text:
                                    title_specs['camera'] = orig_text
                                elif 'battery' in text or 'mah' in text:
                                    title_specs['battery'] = orig_text
                                elif 'processor' in text or 'core' in text or 'gen' in text or 'bionic' in text:
                                    title_specs['processor'] = orig_text
                        
                        formatted = format_product(
                            title=title,
                            brand=brand,
                            category=category or ("Smartphones" if any(kw in title.lower() for kw in ["phone", "iphone", "mobile", "smartphone", "ultra"]) else "Electronics"),
                            seller_name="Flipkart",
                            product_link=product_link,
                            vendor="flipkart",
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
                        self.logger.warning(f"Flipkart parsing item error: {e}")
                        continue
                
                if max_results and len(products) >= max_results:
                    break

        except Exception as e:
            self.logger.error(f"Flipkart scraping failed: {e}")
        finally:
            self.close_driver()
            
        return products

