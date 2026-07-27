import threading
import queue
import json
import time
from datetime import datetime
from app.logger import get_logger
from app.database.manager import db_manager
from app.matchers.product_matcher import matcher
from app.cleaners.data_cleaner import cleaner
from app.brand_alias import brand_alias_engine
from app.query_expansion import query_expansion_engine
from app.canonical_identity import canonical_identity_engine
from app.vendor_identity import vendor_identity_engine
from app.validators import image_validator, url_validator

logger = get_logger("scraper_pipeline")

class ScraperPipeline:
    def __init__(self, vendors_to_use=None):
        self.vendors = vendors_to_use or ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales']
        self.scrapers = self._init_scrapers()

    def _init_scrapers(self):
        scrapers = {}
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

    def run_search(self, query, category="mobiles", brand=None, vendors=None, scrape_mode="EXACT_PRODUCT", max_pages=3, max_products=50):
        """Runs expanded search across all selected vendors in sequence: Amazon -> Flipkart -> Croma -> JioMart -> VijaySales."""
        if not category:
            category = "mobiles"
            
        ordered_vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales']
        if vendors:
            selected_vendors = [v for v in ordered_vendors if v in vendors]
        else:
            selected_vendors = ordered_vendors

        query_variations = query_expansion_engine.expand_query(query, category=category, scrape_mode=scrape_mode)
        logger.info(f"Query Expansion generated {len(query_variations)} variations: {query_variations}")

        all_products = []
        vendor_summaries = {}

        for v_name in selected_vendors:
            if v_name in self.scrapers:
                scraper = self.scrapers[v_name]
                vendor_products = []
                for q_var in query_variations:
                    try:
                        logger.info(f"Scraping {v_name} for expanded query variation: '{q_var}' (Pages: 1..{max_pages})")
                        try:
                            products = scraper.scrape(q_var, category=category, max_pages=max_pages, max_results=max_products) or []
                        except TypeError:
                            products = scraper.scrape(q_var, category=category) or []
                        vendor_products.extend(products)
                    except Exception as e:
                        logger.error(f"Scraper error for {v_name} with query '{q_var}': {e}")

                
                # Deduplicate by URL within vendor
                seen_urls = set()
                deduped = []
                for p in vendor_products:
                    u = p.get('product_link') or p.get('url')
                    if u and u not in seen_urls:
                        seen_urls.add(u)
                        deduped.append(p)

                all_products.extend(deduped)
                vendor_summaries[v_name] = {"count": len(deduped), "status": "SUCCESS"}
                logger.info(f"✅ {v_name.capitalize()} Scan Complete — Gathered {len(deduped)} unique live offers")

        logger.info(f"Multi-Vendor Scraping Complete across {len(selected_vendors)} vendors. Total raw products gathered: {len(all_products)}")
        self.process_and_save(all_products, category)
        return all_products

    def process_and_save(self, products, category):
        """Clean, match, validate, and save products to database."""
        logger.info(f"Beginning normalization, validation, and matching for {len(products)} raw products...")
        for p in products:
            # 1. URL Validation
            p_url = p.get('product_link') or p.get('url')
            valid_url, url_reason = url_validator.validate_pdp_url(p_url, p.get('vendor', ''))
            if not valid_url:
                logger.debug(f"Skipping product with invalid PDP URL: {p.get('title')} ({url_reason})")
                continue

            # 2. Image Validation
            images = p.get('image_urls', [])
            if images:
                valid_img, img_reason = image_validator.validate_image_url(images[0])
                if not valid_img:
                    logger.debug(f"Rejecting invalid/placeholder image URL for '{p.get('title')}': {images[0]} ({img_reason})")
                    p['image_urls'] = []

            # 3. Category & Data Normalization
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
            
            raw_brand = p.get('brand')
            norm_brand = brand_alias_engine.normalize_brand(raw_brand, p.get('title'))
            p['brand'] = norm_brand
            p['category'] = cleaner.normalize_category(p.get('category'))

            self._save_to_production_db(p, p['category'])

    def _save_to_production_db(self, p, category):
        """Saves a product using v2.3 category-aware master_identity & variant_identity hashes for 100% idempotency."""
        max_retries = 5
        for attempt in range(max_retries):
            try:
                conn = db_manager.get_connection()
                cursor = conn.cursor()

                clean_title = matcher.normalize_title(p.get('title'))
                brand = p.get('brand')
                category = p.get('category') or category or "Mobiles"
                specs = p.get('specifications', {})

                logger.info(f"[PIPELINE_STAGE: SAVING_PRODUCT] Processing '{clean_title}' ({brand} / {category})")

                # Generate Category-Aware Master & Variant Identity (v2.3)
                from app.category_identity import category_identity_engine
                from app.canonical_title import canonical_title_engine

                identities = category_identity_engine.build_identities(p.get('title'), specs, category=category, brand=brand)
                master_hash = identities['master_identity_hash']
                master_str = identities['master_identity']
                variant_hash = identities['variant_identity_hash']
                hw_hash = identities['hardware_hash']

                canonical_title = canonical_title_engine.generate_canonical_title(p.get('title'), specs, category=category, brand=brand)

                # Search existing products master by master_identity or weighted candidate matching
                cursor.execute("SELECT id, title, brand, category, canonical_title FROM products_master WHERE master_identity = ?", (master_hash,))
                master_row = cursor.fetchone()

                if master_row:
                    product_id = master_row[0]
                    cursor.execute("UPDATE products_master SET canonical_title = ?, base_image = COALESCE(base_image, ?) WHERE id = ?",
                                   (canonical_title, p.get('image_urls')[0] if p.get('image_urls') else None, product_id))
                    logger.info(f"[PIPELINE_STAGE: MATCHED] Matched '{p.get('title')}' with existing Master Product #{product_id} ('{canonical_title}') via Master Identity")
                else:
                    cursor.execute("SELECT id, title, brand, category FROM products_master WHERE brand = ?", (brand,))
                    candidates = [{"id": row[0], "title": row[1], "brand": row[2], "category": row[3]} for row in cursor.fetchall()]
                    best_match, score, reject_reason = matcher.find_best_match(p, candidates, threshold=70)

                    if best_match:
                        product_id = best_match['id']
                        cursor.execute("UPDATE products_master SET master_identity = ?, canonical_title = ? WHERE id = ?", (master_hash, canonical_title, product_id))
                        logger.info(f"[PIPELINE_STAGE: MATCHED] Matched '{p.get('title')}' with candidate Master #{product_id} (Score: {score})")
                    else:
                        image_url = p.get('image_urls')[0] if p.get('image_urls') and len(p.get('image_urls')) > 0 else None
                        cursor.execute("""
                            INSERT INTO products_master (title, clean_title, normalized_title, canonical_title, brand, category, base_image, master_identity)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (p.get('title'), clean_title, clean_title, canonical_title, brand, category, image_url, master_hash))
                        product_id = cursor.lastrowid
                        logger.info(f"[PIPELINE_STAGE: CREATED] Created new Master Product #{product_id} ('{canonical_title}')")

                # Handle Variant Identity & Creation
                ram = identities['entities']['ram'] or 'N/A'
                storage = identities['entities']['storage'] or 'N/A'
                color = identities['color'] or ''
                variant_slug = f"{product_id}_{ram}_{storage}_{color}".replace(" ", "").lower().strip('_')

                cursor.execute("SELECT id FROM product_variants WHERE variant_identity = ? OR canonical_hash = ? OR slug = ?", 
                               (variant_hash, master_hash, variant_slug))
                variant_row = cursor.fetchone()

                if variant_row:
                    variant_id = variant_row[0]
                else:
                    cursor.execute("""
                        INSERT INTO product_variants (product_id, color, edition, ram, storage, slug, canonical_hash, variant_identity, hardware_identity)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(variant_identity) DO UPDATE SET color=excluded.color
                    """, (product_id, color, identities['edition'], ram, storage, variant_slug, master_hash, variant_hash, hw_hash))
                    variant_id = cursor.lastrowid or cursor.execute("SELECT id FROM product_variants WHERE variant_identity = ?", (variant_hash,)).fetchone()[0]

                # Save Specifications
                if specs:
                    for key, value in specs.items():
                        if value and value != 'N/A':
                            cursor.execute("SELECT id FROM product_specifications WHERE variant_id = ? AND spec_key = ?", (variant_id, key))
                            spec_row = cursor.fetchone()
                            if spec_row:
                                cursor.execute("""
                                    UPDATE product_specifications 
                                    SET spec_value = ? 
                                    WHERE id = ?
                                """, (str(value), spec_row[0]))
                            else:
                                cursor.execute("""
                                    INSERT INTO product_specifications (variant_id, spec_key, spec_value)
                                    VALUES (?, ?, ?)
                                """, (variant_id, key, str(value)))

                # Get Vendor ID
                cursor.execute("SELECT id, name FROM vendors")
                vendor_id = 1
                target_vendor = p.get('vendor', '').lower().replace(" ", "")
                for vid, vname in cursor.fetchall():
                    if vname.lower().replace(" ", "") in target_vendor or target_vendor in vname.lower().replace(" ", ""):
                        vendor_id = vid
                        break

                # Vendor Identity Hash Generation (v2.1)
                product_url = p.get('product_link') or p.get('url')
                v_identity = vendor_identity_engine.generate_vendor_identity_hash(p.get('vendor'), product_url, p.get('title'))
                vendor_identity_hash = v_identity['vendor_identity_hash']
                vendor_product_id = v_identity['vendor_product_id']

                offers_list = p.get('offers', [])
                if isinstance(offers_list, str): offers_list = [offers_list]
                offers_json = json.dumps(offers_list)
                discounted_price = p.get('discounted_price')

                cursor.execute("SELECT id, price FROM vendor_products WHERE vendor_identity_hash = ? OR url = ?", (vendor_identity_hash, product_url))
                existing_vp = cursor.fetchone()

                if existing_vp:
                    vp_id, old_price = existing_vp[0], existing_vp[1]
                    if old_price is not None and discounted_price is not None and abs(old_price - discounted_price) > 0.01:
                        cursor.execute("""
                            INSERT INTO price_history (vendor_product_id, price, recorded_at)
                            VALUES (?, ?, ?)
                        """, (vp_id, discounted_price, datetime.now()))
                        logger.info(f"Price Shift recorded for VP #{vp_id}: ₹{old_price} -> ₹{discounted_price}")

                    cursor.execute("""
                        UPDATE vendor_products
                        SET variant_id = ?,
                            vendor_id = ?,
                            vendor_product_id = ?,
                            vendor_identity_hash = ?,
                            title = ?,
                            original_title = ?,
                            canonical_title = ?,
                            url = ?,
                            price = ?,
                            mrp = ?,
                            rating = ?,
                            reviews = ?,
                            offers = ?,
                            last_scraped_at = ?
                        WHERE id = ?
                    """, (variant_id, vendor_id, vendor_product_id, vendor_identity_hash, canonical_title, p.get('title'),
                          canonical_title, product_url, discounted_price, p.get('price'), p.get('rating'), p.get('reviews'), offers_json, datetime.now(), vp_id))
                else:
                    cursor.execute("""
                        INSERT INTO vendor_products (variant_id, vendor_id, vendor_product_id, vendor_identity_hash, title, original_title, canonical_title, url, price, mrp, rating, reviews, offers, last_scraped_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (variant_id, vendor_id, vendor_product_id, vendor_identity_hash, canonical_title, p.get('title'), canonical_title,
                          product_url, discounted_price, p.get('price'), p.get('rating'), p.get('reviews'), offers_json, datetime.now()))
                    vp_id = cursor.lastrowid
                    if discounted_price is not None:
                        cursor.execute("INSERT INTO price_history (vendor_product_id, price, recorded_at) VALUES (?, ?, ?)", (vp_id, discounted_price, datetime.now()))

                logger.info(f"TELEMETRY: {{'raw': 1, 'imported': 1, 'offers': 1, 'vendor': '{target_vendor}'}}")



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
