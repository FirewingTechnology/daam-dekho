"""
Daam Dekho - Variant 3747 Detailed Inspection Script
Queries daamdekho.db to show Master Product, Variant details, and all linked Vendor Offers for Variant ID 3747.
"""

import sqlite3
import sys
from pathlib import Path

db_path = Path(__file__).resolve().parent / "daamdekho.db"

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def inspect_variant_3747():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    print("=" * 75)
    print("READ-ONLY INSPECTION: VARIANT ID 3747 & LINKED OFFERS")
    print("=" * 75)

    # 1. Variant details
    c.execute("""
        SELECT pv.id, pv.product_id, pm.title, pm.brand, pm.category, pv.storage, pv.ram, pv.color, pv.slug
        FROM product_variants pv
        JOIN products_master pm ON pv.product_id = pm.id
        WHERE pv.id = 3747
    """)
    var_row = c.fetchone()

    if not var_row:
        print("❌ Variant ID 3747 not found in DB!")
        conn.close()
        return

    print("\n--- VARIANT & MASTER DETAILS ---")
    print(f"  • Variant ID     : {var_row[0]}")
    print(f"  • Master ID      : {var_row[1]}")
    print(f"  • Master Title   : '{var_row[2]}'")
    print(f"  • Brand / Category: {var_row[3]} / {var_row[4]}")
    print(f"  • Hardware Specs : Storage = '{var_row[5]}' | RAM = '{var_row[6]}'")
    print(f"  • Variant Slug   : '{var_row[8]}'")

    # 2. Linked Vendor Offers
    c.execute("""
        SELECT vp.id, v.name, vp.title, vp.price, vp.mrp, vp.rating, vp.reviews, vp.url, vp.last_scraped_at
        FROM vendor_products vp
        JOIN vendors v ON vp.vendor_id = v.id
        WHERE vp.variant_id = 3747
        ORDER BY vp.id ASC
    """)
    offers = c.fetchall()

    print(f"\n--- LINKED VENDOR OFFERS (Total: {len(offers)}) ---")
    print("-" * 105)
    print(f"{'VP ID':<6} | {'Vendor':<10} | {'Price (₹)':<10} | {'MRP (₹)':<10} | {'Rating':<6} | {'Title':<45}")
    print("-" * 105)

    for o in offers:
        vp_id, vname, title, price, mrp, rating, reviews, url, scraped_at = o
        print(f"{vp_id:<6} | {vname:<10} | ₹{price:<9} | ₹{mrp:<9} | {rating:<6} | {title[:45]}")
        print(f"       -> Direct URL: {url}")
        print("-" * 105)

    conn.close()

if __name__ == "__main__":
    inspect_variant_3747()
