from typing import Dict, Any, Optional
from app.logger import get_logger
from app.database.manager import db_manager

logger = get_logger("v10_product_lineage")

class ProductLineageEngine:
    """DaamDekho v10.0 Product Lineage Engine.
    Provides complete end-to-end data lineage tracking:
    Raw Product → Normalized Entity → Master Product → Variant → Vendor Offer → Published Catalog.
    """

    def get_product_lineage(self, raw_product_id: Optional[int] = None, master_product_id: Optional[int] = None) -> Dict[str, Any]:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        lineage = {
            "raw_product": None,
            "normalized_entity": None,
            "master_product": None,
            "variant": None,
            "vendor_offers": [],
            "published_catalog": None
        }

        if raw_product_id:
            cursor.execute("SELECT id, session_id, vendor, search_query, raw_title, current_price, pdp_url, scraped_at FROM raw_products WHERE id = ?", (raw_product_id,))
            r_row = cursor.fetchone()
            if r_row:
                lineage["raw_product"] = {
                    "id": r_row[0], "session_id": r_row[1], "vendor": r_row[2],
                    "query": r_row[3], "title": r_row[4], "price": r_row[5], "url": r_row[6], "scraped_at": r_row[7]
                }

            cursor.execute("SELECT id, canonical_brand, canonical_series, canonical_model, normalized_title, hardware_fingerprint FROM normalized_products WHERE raw_product_id = ?", (raw_product_id,))
            n_row = cursor.fetchone()
            if n_row:
                lineage["normalized_entity"] = {
                    "id": n_row[0], "brand": n_row[1], "series": n_row[2], "model": n_row[3],
                    "normalized_title": n_row[4], "hardware_fingerprint": n_row[5]
                }
                m_hash = n_row[5].split('_')[0] if '_' in n_row[5] else ''

        if master_product_id:
            cursor.execute("SELECT id, master_identity_hash, canonical_title, brand, category, base_image, created_at FROM master_products WHERE id = ?", (master_product_id,))
            m_row = cursor.fetchone()
            if m_row:
                lineage["master_product"] = {
                    "id": m_row[0], "master_identity_hash": m_row[1], "canonical_title": m_row[2],
                    "brand": m_row[3], "category": m_row[4], "image": m_row[5], "created_at": m_row[6]
                }

                cursor.execute("SELECT id, variant_identity_hash, cpu, gpu, ram, storage, color FROM product_variants WHERE master_product_id = ?", (master_product_id,))
                variants = cursor.fetchall()
                if variants:
                    v_row = variants[0]
                    lineage["variant"] = {
                        "id": v_row[0], "variant_identity_hash": v_row[1], "cpu": v_row[2],
                        "gpu": v_row[3], "ram": v_row[4], "storage": v_row[5], "color": v_row[6]
                    }

                    cursor.execute("SELECT id, vendor_name, product_title, pdp_url, price, mrp, seller, stock_status FROM vendor_offers WHERE variant_id = ?", (v_row[0],))
                    offers = cursor.fetchall()
                    lineage["vendor_offers"] = [{
                        "id": o[0], "vendor": o[1], "title": o[2], "url": o[3],
                        "price": o[4], "mrp": o[5], "seller": o[6], "stock_status": o[7]
                    } for o in offers]

                cursor.execute("SELECT id, title, canonical_title, brand, category FROM products_master WHERE id = ?", (master_product_id,))
                pub_row = cursor.fetchone()
                if pub_row:
                    lineage["published_catalog"] = {
                        "id": pub_row[0], "title": pub_row[1], "canonical_title": pub_row[2],
                        "brand": pub_row[3], "category": pub_row[4]
                    }

        conn.close()
        return lineage

product_lineage_engine = ProductLineageEngine()
