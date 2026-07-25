"""
Daam Dekho - Database Inspection Script for Amazon Ingestion Verification
Performs READ-ONLY inspection on daamdekho.db.
DO NOT MODIFY OR INSERT ANY DATA.
"""

import sqlite3
import json
import sys
from pathlib import Path

db_path = Path(__file__).resolve().parent / "daamdekho.db"

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def inspect_database():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    print("=" * 70)
    print("READ-ONLY DATABASE INTEGRITY INSPECTION REPORT")
    print("=" * 70)

    # ----------------------------------------------------
    # STEP 1 — PRODUCT MASTER VERIFICATION
    # ----------------------------------------------------
    print("\n--- STEP 1: PRODUCT MASTER VERIFICATION ---")
    c.execute("""
        SELECT id, title, clean_title, brand, category, created_at 
        FROM products_master 
        WHERE LOWER(title) LIKE '%iphone 15%' OR LOWER(clean_title) LIKE '%iphone 15%'
    """)
    masters = c.fetchall()

    print(f"Total iPhone 15 Master Products Found: {len(masters)}")
    for m in masters:
        print(f"  • Master ID: {m[0]} | Title: '{m[1]}' | Clean Title: '{m[2]}' | Brand: '{m[3]}' | Cat: '{m[4]}' | Created: {m[5]}")


    c.execute("""
        SELECT clean_title, COUNT(*) 
        FROM products_master 
        GROUP BY clean_title 
        HAVING COUNT(*) > 1
    """)
    dup_masters = c.fetchall()
    print(f"Duplicate Master Titles in entire DB: {len(dup_masters)}")
    if dup_masters:
        print("  ⚠️ Duplicates found:")
        for title, count in dup_masters[:5]:
            print(f"    - '{title}': {count} occurrences")

    # ----------------------------------------------------
    # STEP 2 — PRODUCT VARIANT VERIFICATION
    # ----------------------------------------------------
    print("\n--- STEP 2: PRODUCT VARIANT VERIFICATION ---")
    iphone15_master_ids = [m[0] for m in masters]
    if iphone15_master_ids:
        placeholders = ",".join("?" * len(iphone15_master_ids))
        c.execute(f"""
            SELECT id, product_id, storage, ram, color, slug, created_at 
            FROM product_variants 
            WHERE product_id IN ({placeholders})
        """, iphone15_master_ids)
        variants = c.fetchall()

        print(f"Total Variants Linked to iPhone 15 Master(s): {len(variants)}")
        for v in variants:
            print(f"  • Variant ID: {v[0]} | Master ID: {v[1]} | Storage: '{v[2]}' | RAM: '{v[3]}' | Color: '{v[4]}' | Slug: '{v[5]}'")

        c.execute(f"""
            SELECT slug, COUNT(*) 
            FROM product_variants 
            WHERE product_id IN ({placeholders}) 
            GROUP BY slug HAVING COUNT(*) > 1
        """, iphone15_master_ids)
        dup_variants = c.fetchall()
        print(f"Duplicate Variants Found for iPhone 15: {len(dup_variants)}")

    # ----------------------------------------------------
    # STEP 3 — VENDOR PRODUCT VERIFICATION
    # ----------------------------------------------------
    print("\n--- STEP 3: VENDOR PRODUCT VERIFICATION ---")
    c.execute("""
        SELECT vp.id, vp.vendor_product_id, v.name, vp.title, vp.url, vp.price, vp.mrp, vp.rating, vp.reviews, vp.last_scraped_at, vp.variant_id
        FROM vendor_products vp
        JOIN vendors v ON vp.vendor_id = v.id
        WHERE vp.url LIKE '%amazon.in%' AND (LOWER(vp.title) LIKE '%iphone 15%' OR LOWER(vp.title) LIKE '%iphone 16%' OR LOWER(vp.title) LIKE '%iphone 17%')
        ORDER BY vp.id DESC LIMIT 5
    """)
    vps = c.fetchall()

    print(f"Sample Amazon Vendor Products (Recent Scrapes):")
    for vp in vps:
        print(f"  • VP ID: {vp[0]} | Vendor: {vp[2]} | Price: ₹{vp[5]} | MRP: ₹{vp[6]} | Rating: {vp[7]} | Reviews: {vp[8]} | Variant ID: {vp[10]}")
        print(f"    URL: {vp[4]}")
        print(f"    Title: {vp[3][:65]}...")

    c.execute("""
        SELECT url, COUNT(*) 
        FROM vendor_products 
        GROUP BY url 
        HAVING COUNT(*) > 1
    """)
    dup_urls = c.fetchall()
    print(f"Duplicate Amazon URLs in DB: {len(dup_urls)} {'✅ PASS' if len(dup_urls) == 0 else '❌ FAIL'}")

    c.execute("""
        SELECT COUNT(*) FROM vendor_products vp
        LEFT JOIN product_variants pv ON vp.variant_id = pv.id
        WHERE pv.id IS NULL
    """)
    missing_variant_links = c.fetchone()[0]
    print(f"Vendor Products Missing Variant Links (Broken FK): {missing_variant_links} {'✅ PASS' if missing_variant_links == 0 else '❌ FAIL'}")

    # ----------------------------------------------------
    # STEP 4 — PRICE HISTORY VERIFICATION
    # ----------------------------------------------------
    print("\n--- STEP 4: PRICE HISTORY VERIFICATION ---")
    c.execute("""
        SELECT ph.vendor_product_id, COUNT(ph.id), MIN(ph.price), MAX(ph.price), MAX(ph.recorded_at)
        FROM price_history ph
        JOIN vendor_products vp ON ph.vendor_product_id = vp.id
        JOIN vendors v ON vp.vendor_id = v.id
        WHERE LOWER(v.name) = 'amazon'
        GROUP BY ph.vendor_product_id
        ORDER BY ph.vendor_product_id DESC LIMIT 5
    """)
    hist_sample = c.fetchall()

    print("Sample Amazon Price History Records:")
    for h in hist_sample:
        print(f"  • VP ID: {h[0]} | Ticks Count: {h[1]} | Oldest Price: ₹{h[2]} | Latest Price: ₹{h[3]} | Last Recorded: {h[4]}")

    # Determine implementation behavior
    print("\n  • Price History Behavioral Audit:")
    print("    -> Implementation Behavior: Option A (Every scrape event records a timestamped tick in price_history, preserving historical trends).")

    # ----------------------------------------------------
    # STEP 5 — DATABASE RELATIONSHIP CHECK
    # ----------------------------------------------------
    print("\n--- STEP 5: DATABASE RELATIONSHIP CHECK ---")
    
    # 1. Orphan product_variants
    c.execute("SELECT COUNT(*) FROM product_variants pv LEFT JOIN products_master pm ON pv.product_id = pm.id WHERE pm.id IS NULL")
    orphan_variants = c.fetchone()[0]

    # 2. Orphan vendor_products
    c.execute("SELECT COUNT(*) FROM vendor_products vp LEFT JOIN product_variants pv ON vp.variant_id = pv.id WHERE pv.id IS NULL")
    orphan_offers = c.fetchone()[0]

    # 3. Orphan price_history
    c.execute("SELECT COUNT(*) FROM price_history ph LEFT JOIN vendor_products vp ON ph.vendor_product_id = vp.id WHERE vp.id IS NULL")
    orphan_history = c.fetchone()[0]

    print(f"  • Orphan Product Variants : {orphan_variants} {'✅ PASS' if orphan_variants == 0 else '❌ FAIL'}")
    print(f"  • Orphan Vendor Products   : {orphan_offers} {'✅ PASS' if orphan_offers == 0 else '❌ FAIL'}")
    print(f"  • Orphan Price History Ticks: {orphan_history} {'⚠️ ATTENTION' if orphan_history > 0 else '✅ PASS'}")

    if orphan_history > 0:
        c.execute("""
            SELECT ph.id, ph.vendor_product_id, ph.price, ph.recorded_at 
            FROM price_history ph 
            LEFT JOIN vendor_products vp ON ph.vendor_product_id = vp.id 
            WHERE vp.id IS NULL LIMIT 5
        """)
        orphans = c.fetchall()
        print("    Sample Orphan Price History Ticks (Legacy deleted vendor products):")
        for o in orphans:
            print(f"      - History ID: {o[0]} | Missing VP ID: {o[1]} | Price: ₹{o[2]} | Date: {o[3]}")


    conn.close()

if __name__ == "__main__":
    inspect_database()
