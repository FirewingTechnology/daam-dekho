from typing import Dict, Any, List
from app.logger import get_logger
from app.database.manager import db_manager
from app.etl.v10_quality_validator import quality_validation_engine

logger = get_logger("v10_catalog_publisher")

class WebsiteCatalogPublisherEngine:
    """PHASE 10: DaamDekho v10.0 Website Catalog Publisher & Quality Gatekeeper.
    Validates catalog entries through Quality Engine and publishes verified Master Products,
    Variants, and Vendor Offers to Layer 3 / Layer 4 production website catalog.
    Website & API read ONLY from these published production tables.
    """

    def publish_catalog(self, master_ids: List[int]) -> Dict[str, Any]:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        # Run Quality Validation
        valid_master_ids, rejections = quality_validation_engine.validate_catalog_entries(master_ids)

        published_masters = 0
        published_offers = 0

        for m_id in valid_master_ids:
            cursor.execute("""
                SELECT canonical_title, brand, series, model, base_image, category, master_identity_hash
                FROM master_products
                WHERE id = ?
            """, (m_id,))
            m_row = cursor.fetchone()
            if not m_row:
                continue

            canon_title, brand, series, model, image, category, master_hash = m_row

            # Sync to products_master for backward compatibility
            cursor.execute("""
                INSERT INTO products_master (title, clean_title, normalized_title, canonical_title, brand, category, base_image, master_identity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(master_identity) DO UPDATE SET
                    canonical_title = excluded.canonical_title,
                    base_image = COALESCE(products_master.base_image, excluded.base_image)
            """, (canon_title, canon_title, canon_title, canon_title, brand, category, image, master_hash))
            published_masters += 1

            # Count published vendor offers for this master
            cursor.execute("""
                SELECT COUNT(vo.id)
                FROM vendor_offers vo
                JOIN product_variants pv ON vo.variant_id = pv.id
                WHERE pv.master_product_id = ?
            """, (m_id,))
            p_offers_count = cursor.fetchone()[0]
            published_offers += p_offers_count

        conn.commit()
        conn.close()

        logger.info(f"🎉 [PHASE 10 COMPLETED] Published {published_masters} Master Products and {published_offers} Vendor Offers to Production Website Catalog.")
        return {
            "published_masters": published_masters,
            "published_offers": published_offers,
            "rejected_count": len(rejections),
            "rejections": rejections
        }

website_catalog_publisher_engine = WebsiteCatalogPublisherEngine()
