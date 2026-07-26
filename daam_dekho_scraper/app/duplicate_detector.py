import sqlite3
from app.database.manager import db_manager
from app.logger import get_logger

logger = get_logger("duplicate_detector")

class DuplicateDetectionEngine:
    """Scans and automatically repairs duplicate records across the database."""

    def __init__(self, db_mgr=None):
        self.db_manager = db_mgr or db_manager

    def scan_duplicates(self):
        """Scans database and returns diagnostic report of all duplicate instances."""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()

        # 1. Duplicate Vendor Offers (by vendor_identity_hash or url)
        cursor.execute("""
            SELECT vendor_identity_hash, COUNT(*) as cnt 
            FROM vendor_products 
            WHERE vendor_identity_hash IS NOT NULL AND vendor_identity_hash != ''
            GROUP BY vendor_identity_hash HAVING cnt > 1
        """)
        dup_vendor_hashes = cursor.fetchall()

        cursor.execute("""
            SELECT url, COUNT(*) as cnt 
            FROM vendor_products 
            WHERE url IS NOT NULL AND url != ''
            GROUP BY url HAVING cnt > 1
        """)
        dup_urls = cursor.fetchall()

        # 2. Duplicate Variants (by canonical_hash or slug)
        cursor.execute("""
            SELECT canonical_hash, COUNT(*) as cnt 
            FROM product_variants 
            WHERE canonical_hash IS NOT NULL AND canonical_hash != ''
            GROUP BY canonical_hash HAVING cnt > 1
        """)
        dup_variant_hashes = cursor.fetchall()

        # 3. Duplicate Master Products (by exact clean_title and brand)
        cursor.execute("""
            SELECT clean_title, brand, COUNT(*) as cnt 
            FROM products_master 
            WHERE clean_title IS NOT NULL AND clean_title != ''
            GROUP BY clean_title, brand HAVING cnt > 1
        """)
        dup_masters = cursor.fetchall()

        conn.close()

        report = {
            "duplicate_vendor_hashes_count": len(dup_vendor_hashes),
            "duplicate_urls_count": len(dup_urls),
            "duplicate_variant_hashes_count": len(dup_variant_hashes),
            "duplicate_master_products_count": len(dup_masters),
            "clean_integrity": (len(dup_vendor_hashes) == 0 and len(dup_urls) == 0 and len(dup_variant_hashes) == 0 and len(dup_masters) == 0)
        }
        return report

    def auto_repair(self):
        """Merges duplicate master products/variants and removes duplicate vendor offer rows."""
        logger.info("Starting automated duplicate detection and repair pipeline...")
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()

        # 1. Remove duplicate vendor_products rows (keep lowest ID)
        cursor.execute("""
            DELETE FROM vendor_products
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM vendor_products
                GROUP BY url
            )
        """)
        repaired_urls = cursor.rowcount

        cursor.execute("""
            DELETE FROM vendor_products
            WHERE vendor_identity_hash IS NOT NULL AND vendor_identity_hash != ''
              AND id NOT IN (
                SELECT MIN(id)
                FROM vendor_products
                GROUP BY vendor_identity_hash
            )
        """)
        repaired_hashes = cursor.rowcount

        # 2. Recalculate Master Identities & Merge Duplicate Master Products
        from app.category_identity import category_identity_engine
        from app.canonical_title import canonical_title_engine

        cursor.execute("SELECT id, title, brand, category FROM products_master")
        masters = cursor.fetchall()
        for pid, title, brand, category in masters:
            # Fetch specs for first variant
            cursor.execute("""
                SELECT ps.spec_key, ps.spec_value 
                FROM product_variants pv 
                JOIN product_specifications ps ON pv.id = ps.variant_id 
                WHERE pv.product_id = ?
            """, (pid,))
            specs = dict(cursor.fetchall())
            
            identities = category_identity_engine.build_identities(title, specs, category=category, brand=brand)
            master_hash = identities['master_identity_hash']
            canonical_title = canonical_title_engine.generate_canonical_title(title, specs, category=category, brand=brand)

            cursor.execute("UPDATE products_master SET master_identity = ?, canonical_title = ? WHERE id = ?",
                           (master_hash, canonical_title, pid))

        # Merge Masters with identical master_identity
        cursor.execute("""
            SELECT master_identity, MIN(id) as primary_id, GROUP_CONCAT(id) as all_ids
            FROM products_master
            WHERE master_identity IS NOT NULL AND master_identity != ''
            GROUP BY master_identity
            HAVING COUNT(*) > 1
        """)
        dup_groups = cursor.fetchall()
        repaired_masters = 0

        for m_hash, primary_id, all_ids_str in dup_groups:
            all_ids = [int(i) for i in all_ids_str.split(',')]
            duplicate_ids = [i for i in all_ids if i != primary_id]
            
            for dup_id in duplicate_ids:
                cursor.execute("UPDATE product_variants SET product_id = ? WHERE product_id = ?", (primary_id, dup_id))
                cursor.execute("DELETE FROM products_master WHERE id = ?", (dup_id,))
                repaired_masters += 1

        # 3. Re-assign orphaned specifications or variants
        cursor.execute("""
            DELETE FROM product_specifications
            WHERE variant_id NOT IN (SELECT id FROM product_variants)
        """)

        conn.commit()
        conn.close()
        logger.info(f"Duplicate repair complete. Purged {repaired_urls} duplicate URLs, {repaired_hashes} duplicate hashes, and merged {repaired_masters} duplicate master products.")
        return {
            "repaired_urls": repaired_urls,
            "repaired_hashes": repaired_hashes,
            "repaired_masters": repaired_masters
        }

duplicate_detector = DuplicateDetectionEngine()
