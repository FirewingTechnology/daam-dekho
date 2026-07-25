import threading
import queue
import json
from datetime import datetime
from app.logger import get_logger
from app.database.manager import db_manager
from app.matchers.product_matcher import matcher
from app.cleaners.data_cleaner import cleaner

logger = get_logger("scraper_pipeline")

class ScraperPipeline:
    def __init__(self, vendors_to_use=None):
        self.vendors = vendors_to_use or ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales']
        self.scrapers = self._init_scrapers()

    def _init_scrapers(self):
        scrapers = {}
        # Dynamic import to avoid circular dependencies
        from app.scrapers.amazon import AmazonScraper
        from app.scrapers.flipkart import FlipkartScraper
        from app.scrapers.croma import CromaScraper
        from app.scrapers.jiomart import JioMartScraper
        from app.scrapers.vijaysales import VijaySalesScraper

        factory = {
            'amazon': AmazonScraper,
            'flipkart': FlipkartScraper,
            'croma': CromaScraper,
            'jiomart': JioMartScraper,
            'vijaysales': VijaySalesScraper
        }


        for v in self.vendors:
            if v in factory:
                scrapers[v] = factory[v]()
        return scrapers

    def run_search(self, query, category="mobiles", vendors=None):
        """Runs search across all selected vendors in strict sequence: Amazon -> Flipkart -> Croma -> JioMart -> VijaySales."""
        if not category:
            category = "mobiles"
            
        ordered_vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales']
        if vendors:
            selected_vendors = [v for v in ordered_vendors if v in vendors]
        else:
            selected_vendors = ordered_vendors

        all_products = []
        vendor_summaries = {}

        for v_name in selected_vendors:
            if v_name in self.scrapers:
                scraper = self.scrapers[v_name]
                try:
                    logger.info(f"Starting scrape for {v_name} with query: {query}")
                    products = scraper.scrape(query, category=category) or []
                    all_products.extend(products)
                    vendor_summaries[v_name] = {"count": len(products), "status": "Success"}
                    logger.info(f"✅ {v_name.capitalize()} Scan Complete — Found {len(products)} live offers")
                except Exception as e:
                    logger.error(f"Scraper error for {v_name}: {e}")
                    vendor_summaries[v_name] = {"count": 0, "status": f"Failed: {e}"}

        logger.info(f"Multi-Vendor Scraping Complete across {len(selected_vendors)} vendors. Total raw products gathered: {len(all_products)}")
        self.process_and_save(all_products, category)
        return all_products

    def process_and_save(self, products, category):
        """Clean, match, and save products to database after all vendors have completed."""
        logger.info(f"Beginning normalization and matching for {len(products)} raw products...")
        for p in products:
            detected_cat = cleaner.detect_actual_category(p)
            p['category'] = detected_cat

            target_cat_norm = cleaner.normalize_category(category)
            detected_cat_norm = cleaner.normalize_category(detected_cat)
            if target_cat_norm in ['Mobiles', 'Laptops'] and 'Accessories' in detected_cat_norm:
                logger.debug(f"Skipping accessory product '{p.get('title')}' during target {category} search.")
                continue

            is_valid, reason = cleaner.validate_product(p, detected_cat)
            if not is_valid:
                logger.debug(f"Skipping invalid product: {p.get('title')} - {reason}")
                continue

            p['discounted_price'] = cleaner.clean_price(p.get('discounted_price'))
            p['price'] = cleaner.clean_price(p.get('price'))
            p['brand'] = cleaner.normalize_brand(p.get('brand'))
            p['category'] = cleaner.normalize_category(p.get('category'))

            self._save_to_production_db(p, p['category'])

    def _save_to_production_db(self, p, category):
        """Saves a product using the normalized schema with retries for locks."""
        import time
        max_retries = 5
        for attempt in range(max_retries):
            try:
                conn = db_manager.get_connection()
                cursor = conn.cursor()

                clean_title = matcher.normalize_title(p.get('title'))
                brand = p.get('brand')
                category = p.get('category')

                cursor.execute("SELECT id, title, brand, category FROM products_master WHERE brand = ?", (brand,))
                candidates = [{"id": row[0], "title": row[1], "brand": row[2], "category": row[3]} for row in cursor.fetchall()]
                
                best_match, score, reject_reason = matcher.find_best_match(p, candidates, threshold=75) 
                
                if best_match:
                    product_id = best_match['id']
                    logger.info(f"Matched '{p.get('title')}' with existing master '{best_match['title']}' (Score: {score})")
                else:
                    logger.info(f"No match for '{p.get('title')}'. Rejection rationale: {reject_reason} (Score: {score})")
                    image_url = p.get('image_urls')[0] if p.get('image_urls') and len(p.get('image_urls')) > 0 else None
                    cursor.execute("""
                        INSERT INTO products_master (title, clean_title, brand, category, base_image)
                        VALUES (?, ?, ?, ?, ?)
                    """, (p.get('title'), clean_title, brand, category, image_url))
                    product_id = cursor.lastrowid
                    logger.info(f"Created new master for '{p.get('title')}'")

                # 2. Handle Variant
                specs = p.get('specifications', {})
                ram = matcher.extract_entities(p.get('title'), specs).get('ram', 'N/A')
                storage = matcher.extract_entities(p.get('title'), specs).get('storage', 'N/A')
                variant_slug = f"{product_id}_{ram}_{storage}".replace(" ", "").lower()

                
                cursor.execute("SELECT id FROM product_variants WHERE slug = ?", (variant_slug,))
                variant_row = cursor.fetchone()
                
                if variant_row:
                    variant_id = variant_row[0]
                else:
                    cursor.execute("""
                        INSERT INTO product_variants (product_id, ram, storage, slug)
                        VALUES (?, ?, ?, ?)
                    """, (product_id, ram, storage, variant_slug))
                    variant_id = cursor.lastrowid

                # 3. Save Specifications (Update if changed or new)
                if specs:
                    for key, value in specs.items():
                        if value and value != 'N/A':
                            # Check if spec already exists for this variant
                            cursor.execute("SELECT id FROM product_specifications WHERE variant_id = ? AND spec_key = ?", (variant_id, key))
                            spec_row = cursor.fetchone()
                            if spec_row:
                                # Update existing spec
                                cursor.execute("""
                                    UPDATE product_specifications 
                                    SET spec_value = ? 
                                    WHERE id = ?
                                """, (str(value), spec_row[0]))
                            else:
                                # Insert new spec
                                cursor.execute("""
                                    INSERT INTO product_specifications (variant_id, spec_key, spec_value)
                                    VALUES (?, ?, ?)
                                """, (variant_id, key, str(value)))

                # 4. Get Vendor ID
                cursor.execute("SELECT id, name FROM vendors")
                vendor_id = 3 # Default to Croma if not found? No, better 1.
                target_vendor = p.get('vendor', '').lower().replace(" ", "")
                for vid, vname in cursor.fetchall():
                    if vname.lower().replace(" ", "") in target_vendor or target_vendor in vname.lower().replace(" ", ""):
                        vendor_id = vid
                        break

                # 4. Save/Update Vendor Product (Incremental Delta Check)
                offers_list = p.get('offers', [])
                if isinstance(offers_list, str): offers_list = [offers_list]
                offers_json = json.dumps(offers_list)
                product_url = p.get('product_link') or p.get('url')
                discounted_price = p.get('discounted_price')

                # Check if vendor product already exists to record price history delta
                cursor.execute("SELECT id, price FROM vendor_products WHERE url = ?", (product_url,))
                existing_vp = cursor.fetchone()

                if existing_vp:
                    vp_id, old_price = existing_vp[0], existing_vp[1]
                    # Record price shift into price_history if price changed
                    if old_price is not None and abs(old_price - discounted_price) > 0.01:
                        cursor.execute("""
                            INSERT INTO price_history (vendor_product_id, price, recorded_at)
                            VALUES (?, ?, ?)
                        """, (vp_id, discounted_price, datetime.now()))
                        logger.info(f"Price Change Detected for VP #{vp_id}: ₹{old_price} -> ₹{discounted_price}")
                
                cursor.execute("""
                    INSERT INTO vendor_products (variant_id, vendor_id, title, url, price, mrp, rating, reviews, offers, last_scraped_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(url) DO UPDATE SET
                        title = excluded.title,
                        price = excluded.price,
                        mrp = excluded.mrp,
                        rating = excluded.rating,
                        reviews = excluded.reviews,
                        offers = excluded.offers,
                        last_scraped_at = excluded.last_scraped_at
                """, (variant_id, vendor_id, p.get('title'), product_url, discounted_price, 
                      p.get('price'), p.get('rating'), p.get('reviews'), offers_json, datetime.now()))
                
                if not existing_vp:
                    vp_id = cursor.lastrowid or cursor.execute("SELECT id FROM vendor_products WHERE url=?", (product_url,)).fetchone()[0]
                    cursor.execute("INSERT INTO price_history (vendor_product_id, price, recorded_at) VALUES (?, ?, ?)", (vp_id, discounted_price, datetime.now()))

                conn.commit()
                conn.close()
                return # Success
            except Exception as e:
                if "locked" in str(e).lower() and attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                logger.error(f"Pipeline DB Error: {e}")
                if 'conn' in locals(): conn.close()
                break


pipeline = ScraperPipeline()
