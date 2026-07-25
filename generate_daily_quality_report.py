import sqlite3
import sys
import json
from datetime import datetime
from pathlib import Path

# Fix stdout encoding for Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

project_root = Path(__file__).resolve().parent
db_path = project_root / "daamdekho.db"

def generate_daily_quality_report():
    print("=" * 110)
    print("📊 DAAMDEKHO V1.0 – DAILY DATA QUALITY & SCRAPER RELIABILITY REPORT")
    print("=" * 110)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM products_master;")
    total_masters = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM vendor_products;")
    total_offers = cur.fetchone()[0]

    cur.execute("SELECT v.name, COUNT(vp.id) as offer_count FROM vendors v LEFT JOIN vendor_products vp ON v.id = vp.vendor_id GROUP BY v.id;")
    vendor_breakdown = {r["name"]: r["offer_count"] for r in cur.fetchall()}

    cur.execute("PRAGMA foreign_key_check;")
    fk_errors = len(cur.fetchall())

    cur.execute("SELECT COUNT(*) FROM products_master WHERE base_image IS NULL OR TRIM(base_image) = '';")
    missing_images = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM vendor_products WHERE url IS NULL OR TRIM(url) = '';")
    missing_urls = cur.fetchone()[0]

    conn.close()

    avg_vendors = round(total_offers / total_masters, 1) if total_masters > 0 else 0
    overall_coverage = round((total_offers / (total_masters * 5)) * 100, 1) if total_masters > 0 else 0

    report = {
        "generated_at": datetime.now().isoformat(),
        "total_master_products": total_masters,
        "total_vendor_offers": total_offers,
        "average_vendors_per_product": avg_vendors,
        "overall_coverage_percent": overall_coverage,
        "vendor_distribution": vendor_breakdown,
        "data_quality": {
            "broken_images": missing_images,
            "broken_urls": missing_urls,
            "foreign_key_errors": fk_errors
        },
        "recommendations": [
            "Maintain automated daily re-scraping loop for vendors with < 5 offers.",
            "Enforce >= 700x700px image resolution checks on all new incoming catalog items."
        ]
    }

    report_path = project_root / "daily_quality_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\nGenerated Daily Report timestamp: {report['generated_at']}")
    print(f"Total Master Products:           {total_masters}")
    print(f"Total Vendor Offers:             {total_offers}")
    print(f"Average Vendors / Product:       {avg_vendors} / 5")
    print(f"Overall Catalog Coverage:        {overall_coverage}%")
    print(f"PRAGMA foreign_key_check:        {fk_errors} Errors")
    print(f"\nSaved Daily Quality Report to: {report_path}")
    print("=" * 110)

if __name__ == "__main__":
    generate_daily_quality_report()
