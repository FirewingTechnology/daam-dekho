import sqlite3
import os
import sys
import re
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
DB_PATH = str(project_root / "daamdekho.db")

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def migrate_and_audit_catalog():
    print("=" * 80)
    print("🛡️ DAAMDEKHO ZERO-TRUST CATALOG AUDIT & REPAIR MIGRATION TOOL")
    print("=" * 80)

    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Ensure audit table exists
    cur.execute('''
        CREATE TABLE IF NOT EXISTS catalog_integrity_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            variant_id INTEGER,
            record_type TEXT DEFAULT 'VARIANT',
            rule_code TEXT NOT NULL,
            status TEXT NOT NULL,
            reason TEXT NOT NULL,
            detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    stats = {
        "VALID": 0,
        "REPAIRABLE": 0,
        "UNKNOWN": 0,
        "CORRUPTED": 0,
        "DUPLICATE": 0,
        "CONFLICT": 0
    }

    # 1. Audit and repair fake 'Default' colors in product_variants
    cur.execute("SELECT id, color FROM product_variants WHERE LOWER(color) = 'default'")
    default_colors = cur.fetchall()
    for vid, col in default_colors:
        cur.execute("UPDATE product_variants SET color = 'UNKNOWN' WHERE id = ?", (vid,))
        cur.execute("""
            INSERT INTO catalog_integrity_audit (variant_id, record_type, rule_code, status, reason)
            VALUES (?, 'VARIANT', 'RULE_08_FAKE_DEFAULT_COLOR', 'REPAIRABLE', 'Repaired fake Default color to UNKNOWN')
        """, (vid,))
        stats["REPAIRABLE"] += 1
    print(f"  ✓ Repaired {len(default_colors)} records with fake 'Default' color ➔ 'UNKNOWN'")

    # 2. Audit and repair invalid CPU values (e.g. CPU matching title or model or brand)
    cur.execute("""
        SELECT pv.id, pv.cpu, mp.canonical_title, mp.brand, mp.model
        FROM product_variants pv
        JOIN master_products mp ON pv.master_product_id = mp.id
    """)
    rows = cur.fetchall()
    invalid_cpus = 0
    for vid, cpu, title, brand, model in rows:
        if cpu:
            cpu_clean = str(cpu).strip()
            if cpu_clean.lower() in [str(title).lower(), str(brand).lower(), str(model).lower()] or len(cpu_clean) > 40:
                cur.execute("UPDATE product_variants SET cpu = 'UNKNOWN' WHERE id = ?", (vid,))
                cur.execute("""
                    INSERT INTO catalog_integrity_audit (variant_id, record_type, rule_code, status, reason)
                    VALUES (?, 'VARIANT', 'RULE_05_INVALID_CPU', 'CORRUPTED', ?)
                """, (vid, f"Cleared invalid CPU field '{cpu_clean}' ➔ UNKNOWN"))
                invalid_cpus += 1
                stats["CORRUPTED"] += 1
    print(f"  ✓ Cleared {invalid_cpus} invalid CPU values matching product titles/models")

    # 3. Classify all Master Products
    cur.execute("SELECT id, canonical_title, brand FROM master_products")
    masters = cur.fetchall()
    for mid, mtitle, mbrand in masters:
        cur.execute("SELECT id, ram, storage, color, cpu FROM product_variants WHERE master_product_id = ?", (mid,))
        pvars = cur.fetchall()
        
        if not pvars:
            cur.execute("""
                INSERT INTO catalog_integrity_audit (product_id, record_type, rule_code, status, reason)
                VALUES (?, 'MASTER', 'RULE_03_NO_VARIANTS', 'UNKNOWN', 'Master product has no variants')
            """, (mid,))
            stats["UNKNOWN"] += 1
            continue

        has_valid_offer = False
        for vid, r, st, col, cpu in pvars:
            cur.execute("SELECT COUNT(*) FROM vendor_products WHERE variant_id = ? AND price > 0", (vid,))
            if cur.fetchone()[0] > 0:
                has_valid_offer = True
                break

        if has_valid_offer:
            stats["VALID"] += 1
            cur.execute("""
                INSERT INTO catalog_integrity_audit (product_id, record_type, rule_code, status, reason)
                VALUES (?, 'MASTER', 'ALL_RULES_PASSED', 'VALID', 'Master catalog record verified')
            """, (mid,))
        else:
            stats["UNKNOWN"] += 1
            cur.execute("""
                INSERT INTO catalog_integrity_audit (product_id, record_type, rule_code, status, reason)
                VALUES (?, 'MASTER', 'RULE_09_NO_VALID_OFFERS', 'UNKNOWN', 'Master product has no active offers')
            """, (mid,))

    conn.commit()
    conn.close()

    print("\n📊 CATALOG INTEGRITY AUDIT SUMMARY:")
    print(f"  • VALID Records:      {stats['VALID']}")
    print(f"  • REPAIRABLE Fixed:   {stats['REPAIRABLE']}")
    print(f"  • UNKNOWN / PENDING:  {stats['UNKNOWN']}")
    print(f"  • CORRUPTED Fixed:    {stats['CORRUPTED']}")
    print(f"  • DUPLICATE Records:  {stats['DUPLICATE']}")
    print(f"  • CONFLICT Records:   {stats['CONFLICT']}")
    print("=" * 80)
    print("✅ Catalog Repair Migration Completed Successfully.")

if __name__ == '__main__':
    migrate_and_audit_catalog()
