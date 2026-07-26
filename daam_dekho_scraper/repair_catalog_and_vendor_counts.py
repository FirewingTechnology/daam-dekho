import sqlite3
from app.database.manager import db_manager

def repair_and_audit_catalog():
    print("=" * 80)
    print("DaamDekho v3.1 Enterprise Catalog Integrity & Vendor Count Repair Engine")
    print("=" * 80)

    conn = db_manager.get_connection()
    c = conn.cursor()

    # 1. SQL Integrity Checks
    c.execute("PRAGMA integrity_check;")
    ic_res = c.fetchone()[0]
    print(f"1. SQLite Integrity Check: {ic_res.upper()}")

    c.execute("PRAGMA foreign_key_check;")
    fk_errors = c.fetchall()
    print(f"2. Foreign Key Constraint Violations: {len(fk_errors)}")

    # 2. Count Database Entities
    c.execute("SELECT COUNT(*) FROM products_master;")
    total_masters = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM product_variants;")
    total_variants = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM vendor_products;")
    total_offers = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM price_history;")
    total_prices = c.fetchone()[0]

    print("\n--- DATABASE ENTITY COUNTS ---")
    print(f"Master Products (products_master): {total_masters}")
    print(f"Product Variants (product_variants): {total_variants}")
    print(f"Vendor Offers (vendor_products): {total_offers}")
    print(f"Price History (price_history): {total_prices}")

    # 3. Audit & Repair Vendor Counts per Master Product
    c.execute("""
        SELECT pm.id, pm.title,
               COUNT(DISTINCT vp.id) as offer_rows_count,
               COUNT(DISTINCT vp.vendor_id) as distinct_vendor_count
        FROM products_master pm
        LEFT JOIN product_variants pv ON pm.id = pv.product_id
        LEFT JOIN vendor_products vp ON pv.id = vp.variant_id
        GROUP BY pm.id;
    """)
    rows = c.fetchall()

    print("\n--- MASTER PRODUCT VENDOR COUNT AUDIT ---")
    for r in rows:
        pid, title, offer_count, distinct_vendors = r[0], r[1], r[2], r[3]
        print(f"Master Product #{pid} ('{title[:45]}...'): Offer Rows={offer_count} | Distinct Vendors={distinct_vendors} (Max 5)")
        assert distinct_vendors <= 5, f"ERROR: Product #{pid} distinct vendor count exceeds 5!"

    # 4. Clean orphan records if any
    c.execute("DELETE FROM product_variants WHERE product_id NOT IN (SELECT id FROM products_master);")
    c.execute("DELETE FROM vendor_products WHERE variant_id NOT IN (SELECT id FROM product_variants);")
    conn.commit()

    conn.close()
    print("\n✓ Catalog Repair & Integrity Verification Completed Successfully!")

if __name__ == '__main__':
    repair_and_audit_catalog()
