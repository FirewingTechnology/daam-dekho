import sqlite3
import json
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = "daamdekho.db"


def audit_database():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print("=" * 80)
    print("🔍 DAAMDEKHO V1.0 COMPLETE SQLITE DATABASE SCHEMA & DATA AUDIT REPORT")
    print("=" * 80)

    # PHASE 1: TABLE & SCHEMA AUDIT
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [r[0] for r in cur.fetchall()]

    print(f"\n📋 PHASE 1: Database Tables ({len(tables)} tables found):")
    schema_info = {}

    for tbl in tables:
        cur.execute(f"PRAGMA table_info({tbl})")
        cols = cur.fetchall()
        cur.execute(f"PRAGMA foreign_key_list({tbl})")
        fks = cur.fetchall()
        cur.execute(f"PRAGMA index_list({tbl})")
        idxs = cur.fetchall()

        schema_info[tbl] = {
            "columns": cols,
            "foreign_keys": fks,
            "indexes": idxs
        }

        print(f"\n  📌 Table: [{tbl}]")
        print("    Columns:")
        for c in cols:
            cid, cname, ctype, notnull, dflt, pk = c
            pk_str = " [PRIMARY KEY]" if pk else ""
            print(f"      • {cname} ({ctype}){pk_str}")
        
        if fks:
            print("    Foreign Keys:")
            for fk in fks:
                print(f"      • {fk[3]} -> {fk[2]}({fk[4]})")
        
        if idxs:
            print("    Indexes:")
            for idx in idxs:
                print(f"      • {idx[1]} (unique={idx[2]})")

    # PHASE 2 & 3: IMAGE & RATING FIELD AUDIT
    print("\n" + "=" * 80)
    print("📸 PHASE 2 & 3: Image & Rating Field Audit Across All Tables")
    print("=" * 80)

    image_cols = []
    rating_cols = []

    for tbl, info in schema_info.items():
        for c in info["columns"]:
            cname = c[1].lower()
            if any(img_k in cname for img_k in ["image", "img", "thumbnail", "picture", "photo", "icon"]):
                image_cols.append((tbl, c[1], c[2]))
            if any(rat_k in cname for rat_k in ["rating", "review", "star", "score"]):
                rating_cols.append((tbl, c[1], c[2]))

    print(f"\n  Image Columns Found ({len(image_cols)}):")
    for tbl, col, ctype in image_cols:
        print(f"    ✓ {tbl}.{col} ({ctype})")

    print(f"\n  Rating & Review Columns Found ({len(rating_cols)}):")
    for tbl, col, ctype in rating_cols:
        print(f"    ✓ {tbl}.{col} ({ctype})")

    # PHASE 4: SPECIFICATION STORAGE AUDIT
    print("\n" + "=" * 80)
    print("⚙️ PHASE 4: Specification Storage Architecture Audit")
    print("=" * 80)
    print("  • Dedicated Columns in product_variants : color, ram, storage, slug")
    print("  • Master Metadata in products_master     : title, brand, category, subcategory, base_image")
    print("  • EAV Key-Value Pairs in product_specifications: spec_key -> spec_value")
    
    cur.execute("SELECT DISTINCT spec_key FROM product_specifications")
    spec_keys = [r[0] for r in cur.fetchall()]
    print(f"  • Extracted EAV Specification Keys in DB ({len(spec_keys)} keys): {spec_keys}")

    # PHASE 5: RECORD STATISTICS
    print("\n" + "=" * 80)
    print("📊 PHASE 5: Database Record Statistics & Data Population Audit")
    print("=" * 80)

    cur.execute("SELECT COUNT(*) FROM products_master")
    total_pm = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM products_master WHERE base_image IS NOT NULL AND TRIM(base_image) != ''")
    pm_with_img = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM vendor_products WHERE rating IS NOT NULL AND rating > 0")
    vp_with_rating = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM vendor_products WHERE reviews IS NOT NULL AND reviews > 0")
    vp_with_reviews = cur.fetchone()[0]

    cur.execute("SELECT COUNT(DISTINCT variant_id) FROM product_specifications WHERE spec_key = 'processor'")
    with_proc = cur.fetchone()[0]

    cur.execute("SELECT COUNT(DISTINCT variant_id) FROM product_specifications WHERE spec_key = 'display'")
    with_disp = cur.fetchone()[0]

    cur.execute("SELECT COUNT(DISTINCT variant_id) FROM product_specifications WHERE spec_key = 'battery'")
    with_batt = cur.fetchone()[0]

    print(f"  • Total Master Products (products_master)        : {total_pm}")
    print(f"  • Master Products with Base Image (base_image)   : {pm_with_img} / {total_pm} ({(pm_with_img/total_pm*100) if total_pm else 0:.1f}%)")
    print(f"  • Vendor Listings with Valid Rating (>0)        : {vp_with_rating}")
    print(f"  • Vendor Listings with Review Counts (>0)       : {vp_with_reviews}")
    print(f"  • Product Variants with Processor Specifications : {with_proc}")
    print(f"  • Product Variants with Display Specifications   : {with_disp}")
    print(f"  • Product Variants with Battery Specifications   : {with_batt}")

    conn.close()

if __name__ == "__main__":
    audit_database()
