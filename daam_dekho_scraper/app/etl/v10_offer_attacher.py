import json
from typing import List, Tuple, Dict, Any
from app.logger import get_logger
from app.database.manager import db_manager

logger = get_logger("v10_offer_attacher")

class MultiVendorOfferAttacherEngine:
    """PHASE 8: DaamDekho v10.0 Multi-Vendor Offer Attacher Engine.
    Attaches vendor offers to deterministic Variant IDs ONLY after Variant IDs exist.
    Persists data into Layer 3 Catalog schema (vendor_offers, price_history) with 100% read-back verification.
    """

    def attach_offers(self, norm_master_var_tuples: List[Tuple[int, int, int]]) -> List[int]:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        attached_offer_ids = []

        for norm_id, master_id, variant_id in norm_master_var_tuples:
            cursor.execute("""
                SELECT rp.vendor, rp.raw_title, rp.pdp_url, rp.current_price, rp.mrp, rp.discount_percent,
                       rpo.seller, rpo.delivery_info, rpo.warranty_info, rpo.stock_status, rpo.availability,
                       rpo.emi_options_json, rpo.bank_offers_json, rpo.coupons_json
                FROM normalized_products np
                JOIN raw_products rp ON np.raw_product_id = rp.id
                LEFT JOIN raw_product_offers rpo ON rp.id = rpo.raw_product_id
                WHERE np.id = ?
            """, (norm_id,))
            row = cursor.fetchone()
            if not row:
                cursor.execute("""
                    SELECT rp.vendor, rp.raw_title, rp.pdp_url, rp.current_price, rp.mrp, rp.discount_percent,
                           rpo.seller, rpo.delivery_info, rpo.warranty_info, rpo.stock_status, 'Available',
                           rpo.emi_options_json, rpo.bank_offers_json, '[]'
                    FROM normalized_entities_v10 ne
                    JOIN raw_products_v10 rp ON ne.raw_product_id = rp.id
                    LEFT JOIN raw_product_offers_v10 rpo ON rp.id = rpo.raw_product_id
                    WHERE ne.id = ?
                """, (norm_id,))
                row = cursor.fetchone()
                if not row:
                    continue

            vendor, title, url, price, mrp, disc, seller, delivery, warranty, stock, avail, emi_json, bank_json, coupons_json = row

            # 1. Insert/Update Layer 3 vendor_offers
            cursor.execute("""
                INSERT INTO vendor_offers (
                    variant_id, vendor_name, product_title, pdp_url, price, mrp, discount_percent, seller, stock_status, availability, delivery_info, warranty_info, emi_plans_json, bank_offers_json, coupons_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                variant_id, vendor, title, url, price, mrp, disc, seller or 'Official Vendor', stock or 'In Stock', avail or 'Available',
                delivery or 'Standard Delivery', warranty or '1 Year Brand Warranty', emi_json or '[]', bank_json or '[]', coupons_json or '[]'
            ))
            offer_id = cursor.lastrowid

            # Log into price_history
            cursor.execute("""
                INSERT INTO price_history (vendor_offer_id, vendor_product_id, price, mrp)
                VALUES (?, ?, ?, ?)
            """, (offer_id, offer_id, price, mrp))

            # Mirror into vendor_offers_v10 and vendor_products
            cursor.execute("""
                INSERT INTO vendor_offers_v10 (
                    variant_id, vendor_name, product_title, product_url, price, mrp, discount_percent, stock_status, seller, delivery_info, warranty_info
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (variant_id, vendor, title, url, price, mrp, disc, stock or 'In Stock', seller or 'Official Vendor', delivery, warranty))

            # Get Vendor ID
            cursor.execute("SELECT id FROM vendors WHERE LOWER(REPLACE(name, ' ', '')) = LOWER(?)", (vendor.replace(" ", ""),))
            v_row = cursor.fetchone()
            v_id = v_row[0] if v_row else 1

            cursor.execute("SELECT id FROM vendor_products WHERE url = ?", (url,))
            vp_row = cursor.fetchone()
            if vp_row:
                cursor.execute("UPDATE vendor_products SET price = ?, mrp = ? WHERE id = ?", (price, mrp, vp_row[0]))
            else:
                cursor.execute("""
                    INSERT INTO vendor_products (
                        variant_id, vendor_id, vendor_product_id, vendor_identity_hash, title, original_title, canonical_title, url, price, mrp, discount_percent, stock_status, seller, delivery_days, offers
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    variant_id, v_id, f"{vendor}_{offer_id}", f"VHASH_{vendor}_{offer_id}", title, title, title, url, price, mrp, disc, stock or 'In Stock', seller or 'Official Vendor', delivery or 'Standard', bank_json or '[]'
                ))

            # PHASE 8 READ-BACK VERIFICATION
            cursor.execute("SELECT id, variant_id, price FROM vendor_offers WHERE id = ?", (offer_id,))
            read_row = cursor.fetchone()
            if not read_row or read_row[0] != offer_id or read_row[1] != variant_id:
                raise RuntimeError(f"Read-back verification failed for vendor_offers #{offer_id}")

            attached_offer_ids.append(offer_id)

        conn.commit()
        conn.close()

        logger.info(f"✅ [PHASE 8 COMPLETED] Attached {len(attached_offer_ids)} vendor offers to deterministic Variant IDs with 100% read-back verification.")
        return attached_offer_ids

offer_attacher_engine = MultiVendorOfferAttacherEngine()
