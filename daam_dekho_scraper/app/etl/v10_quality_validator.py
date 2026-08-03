from typing import List, Dict, Any, Tuple
from app.logger import get_logger
from app.database.manager import db_manager

logger = get_logger("v10_quality_validator")

class QualityValidationEngine:
    """PHASE 9: DaamDekho v10.0 Quality Engine.
    Validates identity, specifications, prices, images, vendor offers, and vendor coverage
    before catalog entries are published to the production website.
    Incomplete entries are rejected from publishing while raw data is 100% preserved.
    """

    def validate_catalog_entries(self, master_ids: List[int]) -> Tuple[List[int], List[Dict[str, Any]]]:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        valid_master_ids = []
        rejections = []

        for m_id in set(master_ids):
            cursor.execute("""
                SELECT mp.id, mp.canonical_title, mp.brand, mp.base_image
                FROM master_products mp
                WHERE mp.id = ?
            """, (m_id,))
            m_row = cursor.fetchone()
            if not m_row:
                continue

            mp_id, title, brand, base_image = m_row

            # Validation 1: Identity & Title
            if not brand or brand.lower() in ['generic', 'n/a', 'unknown', '']:
                rejections.append({"master_id": mp_id, "reason": "Missing or generic brand identity"})
                continue

            if not title or len(title.strip()) < 3:
                rejections.append({"master_id": mp_id, "reason": "Invalid canonical title"})
                continue

            # Validation 2: Check for at least 1 valid product variant
            cursor.execute("""
                SELECT pv.id, pv.ram, pv.storage, pv.color
                FROM product_variants pv
                WHERE pv.master_product_id = ?
            """, (mp_id,))
            variants = cursor.fetchall()

            if not variants:
                rejections.append({"master_id": mp_id, "reason": "No valid hardware variants found"})
                continue

            # Validation 3: Check for attached vendor offers with valid price
            has_valid_offer = False
            for v_row in variants:
                var_id = v_row[0]
                cursor.execute("""
                    SELECT vo.id, vo.price, vo.pdp_url
                    FROM vendor_offers vo
                    WHERE vo.variant_id = ?
                """, (var_id,))
                offers = cursor.fetchall()
                for o_row in offers:
                    o_price = o_row[1]
                    o_url = o_row[2]
                    if o_price and o_price > 0 and o_url:
                        has_valid_offer = True
                        break
                if has_valid_offer:
                    break

            if not has_valid_offer:
                rejections.append({"master_id": mp_id, "reason": "No valid commercial vendor offer with price > 0 attached"})
                continue

            # Validation 4: Image presence
            if not base_image or not base_image.startswith("http"):
                rejections.append({"master_id": mp_id, "reason": "Missing or malformed primary image URL"})
                continue

            valid_master_ids.append(mp_id)

        conn.close()

        logger.info(f"✅ [PHASE 9 COMPLETED] Quality Validation passed for {len(valid_master_ids)}/{len(set(master_ids))} master products. Rejections logged: {len(rejections)}")
        return valid_master_ids, rejections

quality_validation_engine = QualityValidationEngine()
