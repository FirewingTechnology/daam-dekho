import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.logger import get_logger
from app.database.manager import db_manager
from app.product_entity import MasterProductEntity
from app.vendor_adapters import vendor_adapter_registry

logger = get_logger("v10_raw_acquisition")

class RawDataAcquisitionEngine:
    """PHASE 1 & 2: DaamDekho v10.0 Raw Data Acquisition & Data Lake Engine.
    Crawls requested vendors independently, opens every PDP, and persists full raw PDP specifications,
    pricing, offers, commercial terms, and media into the immutable Layer 1 Raw Data Lake.
    Performs ZERO inline matching, merging, or early rejection.
    """

    def acquire_raw_data(self, target_query: str, category: str, brand: str, scrapers: Dict[str, Any], target_vendors: List[str], max_pages: int = 2) -> Dict[str, Any]:
        session_id = f"session_{uuid.uuid4().hex[:10]}"
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        # 1. Register Session in Layer 1 Data Lake
        cursor.execute("PRAGMA table_info(crawl_sessions)")
        cs_cols = [row[1] for row in cursor.fetchall()]
        if 'session_uuid' in cs_cols:
            cursor.execute("""
                INSERT INTO crawl_sessions (session_id, session_uuid, discovery_mode, target_query, category, brand, target_vendors_json, max_pages, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (session_id, session_id, 'v10_etl', target_query, category, brand, json.dumps(target_vendors), max_pages, "RUNNING"))
        else:
            cursor.execute("""
                INSERT INTO crawl_sessions (session_id, target_query, category, brand, target_vendors_json, max_pages, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (session_id, target_query, category, brand, json.dumps(target_vendors), max_pages, "RUNNING"))
        
        cursor.execute("""
            INSERT INTO raw_scrape_sessions_v10 (session_id, target_query, category, brand, target_vendors_json, status)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (session_id, target_query, category, brand, json.dumps(target_vendors), "RUNNING"))
        conn.commit()

        raw_product_ids = []
        total_acquired = 0

        # Base queries
        master_stub = MasterProductEntity(title=target_query, category=category, brand=brand)
        base_queries = [target_query, f"{brand} {category}".strip(), master_stub.series, master_stub.model]
        base_queries = [q for q in base_queries if q]

        for vendor in target_vendors:
            v_clean = vendor.lower().replace(" ", "")
            if v_clean not in scrapers:
                logger.warning(f"⚠️ Vendor '{v_clean}' missing from scraper factory. Skipping.")
                cursor.execute("""
                    INSERT INTO raw_logs (session_id, vendor, log_level, message)
                    VALUES (?, ?, ?, ?)
                """, (session_id, v_clean, "WARNING", f"Vendor {v_clean} missing from scraper factory"))
                continue

            scraper = scrapers[v_clean]
            v_queries = vendor_adapter_registry.get_queries_for_vendor(v_clean, master_stub, base_queries)
            query_slice = v_queries[:max_pages * 2]

            for q_var in query_slice:
                try:
                    logger.info(f"📥 [PHASE 1 CRAWL - {v_clean.upper()}] Crawling: '{q_var}'")
                    cursor.execute("""
                        INSERT INTO raw_logs (session_id, vendor, log_level, message)
                        VALUES (?, ?, ?, ?)
                    """, (session_id, v_clean, "INFO", f"Crawling query: {q_var}"))

                    try:
                        candidates = scraper.scrape(q_var, category=category, max_pages=max_pages, max_results=30) or []
                    except TypeError:
                        candidates = scraper.scrape(q_var, category=category) or []

                    for rank, cand in enumerate(candidates, 1):
                        pdp_url = cand.get('product_link') or cand.get('url') or ''
                        raw_title = cand.get('title') or cand.get('name') or ''
                        if not pdp_url or not raw_title:
                            continue

                        # Log search result
                        cursor.execute("""
                            INSERT INTO raw_search_results (session_id, vendor, query, page_number, rank, product_url, title, raw_price)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (session_id, v_clean, q_var, 1, rank, pdp_url, raw_title, float(cand.get('price') or cand.get('discounted_price') or 0)))

                        price = float(cand.get('price') or cand.get('discounted_price') or 0)
                        mrp = float(cand.get('mrp') or cand.get('original_price') or price)
                        disc = round(((mrp - price) / mrp) * 100, 2) if mrp > price else 0.0
                        thumb = cand.get('image') or cand.get('thumbnail') or (cand.get('image_urls')[0] if cand.get('image_urls') else '')

                        # Insert into raw_products
                        cursor.execute("""
                            INSERT INTO raw_products (
                                session_id, vendor, search_query, page_number, rank_in_page, raw_title, current_price, mrp, discount_percent, pdp_url, canonical_url, hero_image_url
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            session_id, v_clean, q_var, 1, rank, raw_title, price, mrp, disc, pdp_url, cand.get('canonical_url', pdp_url), thumb
                        ))
                        raw_p_id = cursor.lastrowid
                        raw_product_ids.append(raw_p_id)
                        total_acquired += 1

                        # Mirror to raw_products_v10
                        cursor.execute("""
                            INSERT INTO raw_products_v10 (
                                session_id, vendor, search_query, page_number, rank_in_page, raw_title, current_price, mrp, discount_percent, pdp_url, hero_image_url, raw_html, raw_json_ld
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            session_id, v_clean, q_var, 1, rank, raw_title, price, mrp, disc, pdp_url, thumb, json.dumps(cand), json.dumps(cand.get('json_ld', {}))
                        ))

                        # Insert PDP HTML and JSONLD
                        if cand.get('raw_html'):
                            cursor.execute("INSERT INTO raw_html (raw_product_id, pdp_url, html_content) VALUES (?, ?, ?)",
                                           (raw_p_id, pdp_url, cand.get('raw_html')))
                        if cand.get('json_ld'):
                            cursor.execute("INSERT INTO raw_jsonld (raw_product_id, pdp_url, jsonld_content) VALUES (?, ?, ?)",
                                           (raw_p_id, pdp_url, json.dumps(cand.get('json_ld'))))

                        # Extract PDP Spec Entity
                        pdp_entity = MasterProductEntity(raw_data=cand, title=raw_title, category=category)
                        spec_table = cand.get('specifications') or cand.get('specs') or {}
                        p_mpn = getattr(pdp_entity, 'mpn', cand.get('mpn', None))
                        p_sku = getattr(pdp_entity, 'sku', cand.get('sku', None))
                        p_ean = getattr(pdp_entity, 'ean', cand.get('ean', None))
                        p_upc = getattr(pdp_entity, 'upc', cand.get('upc', None))

                        # Insert into raw_product_specs
                        cursor.execute("""
                            INSERT INTO raw_product_specs (
                                raw_product_id, brand, series, model, generation, model_number, part_number, mpn, sku, ean, upc,
                                category, subcategory, processor, cpu, gpu, chipset, ram, storage, expandable_storage,
                                operating_system, display_size, display_resolution, refresh_rate, brightness, panel_type,
                                battery_capacity, battery_type, charging, rear_cameras, front_camera, video_specs,
                                network_5g, sim_specs, bluetooth, wifi, usb_type, nfc, gps, weight, dimensions, color,
                                description, highlights, spec_table_json
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            raw_p_id, pdp_entity.brand, pdp_entity.series, pdp_entity.model, cand.get('generation', ''),
                            pdp_entity.model_number, pdp_entity.part_number, p_mpn, p_sku, p_ean, p_upc,
                            category, cand.get('subcategory', ''), pdp_entity.cpu, pdp_entity.cpu, pdp_entity.gpu, cand.get('chipset', ''),
                            pdp_entity.ram, pdp_entity.storage, cand.get('expandable_storage', ''),
                            pdp_entity.operating_system, pdp_entity.display_size, cand.get('display_resolution', ''),
                            cand.get('refresh_rate', ''), cand.get('brightness', ''), cand.get('panel_type', ''),
                            pdp_entity.battery, cand.get('battery_type', ''), cand.get('charging', ''),
                            pdp_entity.camera, cand.get('front_camera', ''), cand.get('video_specs', ''),
                            pdp_entity.network, cand.get('sim_specs', ''), cand.get('bluetooth', ''), cand.get('wifi', ''),
                            cand.get('usb_type', ''), cand.get('nfc', ''), cand.get('gps', ''), cand.get('weight', ''),
                            cand.get('dimensions', ''), pdp_entity.color, cand.get('description', ''),
                            cand.get('highlights', ''), json.dumps(spec_table)
                        ))

                        cursor.execute("""
                            INSERT INTO raw_product_specs_v10 (
                                raw_product_id, brand, series, model, model_number, part_number, sku, ean, upc,
                                cpu, gpu, ram, storage, display, battery, camera, network, operating_system, color, spec_table_json
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            raw_p_id, pdp_entity.brand, pdp_entity.series, pdp_entity.model, pdp_entity.model_number,
                            pdp_entity.part_number, p_sku, p_ean, p_upc,
                            pdp_entity.cpu, pdp_entity.gpu, pdp_entity.ram, pdp_entity.storage, pdp_entity.display_size,
                            pdp_entity.battery, pdp_entity.camera, pdp_entity.network, pdp_entity.operating_system,
                            pdp_entity.color, json.dumps(spec_table)
                        ))

                        # Insert into raw_product_offers
                        cursor.execute("""
                            INSERT INTO raw_product_offers (
                                raw_product_id, seller, stock_status, availability, delivery_info, warranty_info,
                                replacement_policy, emi_options_json, no_cost_emi_json, bank_offers_json, coupons_json,
                                exchange_offer_info, cashback_info
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            raw_p_id, cand.get('seller', 'Official Vendor'), "In Stock" if cand.get('in_stock', True) else "Out of Stock",
                            "Available" if cand.get('in_stock', True) else "Unavailable", cand.get('delivery', 'Standard Delivery'),
                            cand.get('warranty', '1 Year Brand Warranty'), cand.get('replacement_policy', '7 Days Policy'),
                            json.dumps(cand.get('emi', [])), json.dumps(cand.get('no_cost_emi', [])),
                            json.dumps(cand.get('bank_offers', [])), json.dumps(cand.get('coupons', [])),
                            cand.get('exchange_offer', ''), cand.get('cashback', '')
                        ))

                        cursor.execute("""
                            INSERT INTO raw_product_offers_v10 (
                                raw_product_id, seller, stock_status, delivery_info, warranty_info, emi_options_json, bank_offers_json, exchange_offer_info, cashback_info
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            raw_p_id, cand.get('seller', 'Official Vendor'), "In Stock" if cand.get('in_stock', True) else "Out of Stock",
                            cand.get('delivery', 'Standard Delivery'), cand.get('warranty', '1 Year Brand Warranty'),
                            json.dumps(cand.get('emi', [])), json.dumps(cand.get('bank_offers', [])),
                            cand.get('exchange_offer', ''), cand.get('cashback', '')
                        ))

                        # Insert Gallery Images
                        gallery = cand.get('image_urls') or ([thumb] if thumb else [])
                        for img_url in gallery:
                            if img_url:
                                cursor.execute("""
                                    INSERT INTO raw_product_images (raw_product_id, image_url, image_type)
                                    VALUES (?, ?, ?)
                                """, (raw_p_id, img_url, "gallery"))
                                cursor.execute("""
                                    INSERT INTO raw_product_images_v10 (raw_product_id, image_url, image_type)
                                    VALUES (?, ?, ?)
                                """, (raw_p_id, img_url, "gallery"))

                except Exception as e:
                    logger.error(f"Error during raw acquisition for vendor '{v_clean}' query '{q_var}': {e}")
                    cursor.execute("""
                        INSERT INTO raw_logs (session_id, vendor, log_level, message)
                        VALUES (?, ?, ?, ?)
                    """, (session_id, v_clean, "ERROR", f"Acquisition error for query '{q_var}': {str(e)}"))

        now_str = datetime.utcnow().isoformat()
        cursor.execute("UPDATE crawl_sessions SET completed_at = ?, status = ? WHERE session_id = ?",
                       (now_str, "COMPLETED", session_id))
        cursor.execute("UPDATE raw_scrape_sessions_v10 SET completed_at = ?, status = ? WHERE session_id = ?",
                       (now_str, "COMPLETED", session_id))
        conn.commit()
        conn.close()

        logger.info(f"✅ [PHASE 1 & 2 COMPLETED] Session '{session_id}' acquired {total_acquired} raw candidate PDPs into Data Lake.")

        return {
            "session_id": session_id,
            "raw_product_ids": raw_product_ids,
            "total_acquired": total_acquired
        }

raw_acquisition_engine = RawDataAcquisitionEngine()
