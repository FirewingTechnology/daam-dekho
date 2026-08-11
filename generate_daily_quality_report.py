import sqlite3
import sys
import json
import os
from datetime import datetime
from pathlib import Path

# Fix stdout encoding for Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

project_root = Path(__file__).resolve().parent
db_path = project_root / "daamdekho.db"

def generate_daily_quality_report():
    print("=" * 110)
    print("📊 DAAMDEKHO V1.0 – AUTOMATED DATA QUALITY & ETL RELIABILITY REPORT")
    print("=" * 110)

    if not db_path.exists():
        print(f"❌ Critical Error: Database file not found at {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    hard_failures = 0
    warnings = 0

    # ---------------------------------------------------------
    # METRIC A: % of product_variants with color = 'Unspecified'
    # ---------------------------------------------------------
    cur.execute("SELECT COUNT(*) FROM product_variants;")
    total_variants = cur.fetchone()[0] or 0

    cur.execute("""
        SELECT COUNT(*) FROM product_variants 
        WHERE color IS NULL OR LOWER(color) IN ('unspecified', 'default', 'n/a', 'none', '');
    """)
    unspecified_colors = cur.fetchone()[0] or 0
    pct_unspecified_color = round((unspecified_colors / total_variants * 100), 1) if total_variants > 0 else 0.0
    status_a = "⚠️ WARNING (>15%)" if pct_unspecified_color > 15.0 else "✅ PASS"
    if pct_unspecified_color > 15.0: warnings += 1

    # ---------------------------------------------------------
    # METRIC B: Coverage breakdown (1 vendor vs 2+ vendors)
    # ---------------------------------------------------------
    cur.execute("SELECT COUNT(*) FROM products_master;")
    total_masters = cur.fetchone()[0] or 0

    cur.execute("""
        SELECT pm.id, COUNT(DISTINCT vo.vendor_name) as v_cnt
        FROM products_master pm
        JOIN product_variants pv ON pv.product_id = pm.id
        JOIN vendor_offers vo ON vo.variant_id = pv.id
        GROUP BY pm.id
    """)
    coverage_rows = cur.fetchall()
    single_vendor_count = 0
    multi_vendor_count = 0
    for r in coverage_rows:
        if r["v_cnt"] >= 2:
            multi_vendor_count += 1
        else:
            single_vendor_count += 1

    pct_multi_vendor = round((multi_vendor_count / total_masters * 100), 1) if total_masters > 0 else 0.0

    # ---------------------------------------------------------
    # METRIC C: Potential Duplicate Variants (HARD FAIL IF > 0)
    # ---------------------------------------------------------
    cur.execute("""
        SELECT COUNT(*) FROM product_variants pv1
        JOIN product_variants pv2 ON pv1.product_id = pv2.product_id AND pv1.id < pv2.id
        WHERE LOWER(COALESCE(pv1.storage, '')) = LOWER(COALESCE(pv2.storage, ''))
          AND LOWER(COALESCE(pv1.color, '')) = LOWER(COALESCE(pv2.color, ''))
          AND (pv1.ram IS NULL OR pv1.ram = '' OR pv2.ram IS NULL OR pv2.ram = '' OR LOWER(pv1.ram) = LOWER(pv2.ram));
    """)
    duplicate_variants_count = cur.fetchone()[0] or 0
    status_c = "❌ HARD FAIL (>0)" if duplicate_variants_count > 0 else "✅ PASS"
    if duplicate_variants_count > 0: hard_failures += 1

    # ---------------------------------------------------------
    # METRIC D: Leftover Marketing Noise in Titles
    # ---------------------------------------------------------
    noise_keywords = ['no cost emi', 'buy now', 'special offer', 'free delivery', 'rs.', 'off', 'discount']
    where_noise = " OR ".join([f"LOWER(canonical_title) LIKE '%{kw}%'" for kw in noise_keywords])
    cur.execute(f"SELECT COUNT(*) FROM products_master WHERE {where_noise};")
    marketing_noise_count = cur.fetchone()[0] or 0
    status_d = "⚠️ WARNING (>0)" if marketing_noise_count > 0 else "✅ PASS"
    if marketing_noise_count > 0: warnings += 1

    # ---------------------------------------------------------
    # METRIC E: Invalid Prices / Price > MRP (HARD FAIL IF > 0)
    # ---------------------------------------------------------
    cur.execute("""
        SELECT COUNT(*) FROM vendor_offers 
        WHERE price IS NULL OR price <= 0 OR (mrp IS NOT NULL AND mrp > 0 AND price > mrp);
    """)
    invalid_price_count = cur.fetchone()[0] or 0
    status_e = "❌ HARD FAIL (>0)" if invalid_price_count > 0 else "✅ PASS"
    if invalid_price_count > 0: hard_failures += 1

    # ---------------------------------------------------------
    # METRIC F: Average Vendors per Product
    # ---------------------------------------------------------
    cur.execute("SELECT COUNT(*) FROM vendor_offers;")
    total_offers = cur.fetchone()[0] or 0
    avg_vendors = round(total_offers / total_masters, 2) if total_masters > 0 else 0.0
    status_f = "❌ HARD FAIL (<1.0)" if avg_vendors < 1.0 else "✅ PASS"
    if avg_vendors < 1.0: hard_failures += 1

    conn.close()

    # Build Quality Report
    timestamp = datetime.now().isoformat()
    overall_status = "❌ HARD FAILURE" if hard_failures > 0 else ("⚠️ WARNINGS PRESENT" if warnings > 0 else "✅ ALL SYSTEMS PASSED")

    print(f"Timestamp: {timestamp}")
    print(f"Overall Data Quality Status: {overall_status}\n")

    print("-" * 110)
    print(f"{'METRIC NAME':<45} | {'VALUE / RESULT':<25} | {'STATUS':<20}")
    print("-" * 110)
    print(f"{'(a) Unspecified Color % (product_variants)':<45} | {pct_unspecified_color}% ({unspecified_colors}/{total_variants}){'':<5} | {status_a:<20}")
    print(f"{'(b) Multi-Vendor Coverage (2+ Vendors)':<45} | {pct_multi_vendor}% ({multi_vendor_count}/{total_masters}){'':<5} | {'ℹ️ INFO':<20}")
    print(f"{'(c) Potential Duplicate Variants (HARD FAIL)':<45} | {duplicate_variants_count} groups{'':<15} | {status_c:<20}")
    print(f"{'(d) Leftover Marketing Noise Titles':<45} | {marketing_noise_count} products{'':<13} | {status_d:<20}")
    print(f"{'(e) Invalid Price / Price > MRP (HARD FAIL)':<45} | {invalid_price_count} offers{'':<15} | {status_e:<20}")
    print(f"{'(f) Average Vendors Linked per Master':<45} | {avg_vendors} vendors/master{'':<5} | {status_f:<20}")
    print("-" * 110)

    report_payload = {
        "generated_at": timestamp,
        "overall_status": overall_status,
        "hard_failures": hard_failures,
        "warnings": warnings,
        "metrics": {
            "total_master_products": total_masters,
            "total_variants": total_variants,
            "total_vendor_offers": total_offers,
            "unspecified_color_pct": pct_unspecified_color,
            "multi_vendor_coverage_pct": pct_multi_vendor,
            "duplicate_variants_count": duplicate_variants_count,
            "marketing_noise_titles_count": marketing_noise_count,
            "invalid_price_count": invalid_price_count,
            "avg_vendors_per_product": avg_vendors
        }
    }

    report_file = project_root / "daily_quality_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, indent=2)

    print(f"\nSaved JSON Quality Report to: {report_file}")
    print("=" * 110)

    if hard_failures > 0:
        print("❌ Quality Gatekeeper Triggered HARD FAILURE. Terminating pipeline execution.")
        sys.exit(1)
    else:
        print("✅ Data Quality Validation Passed Successfully.")
        return report_payload

if __name__ == "__main__":
    generate_daily_quality_report()
