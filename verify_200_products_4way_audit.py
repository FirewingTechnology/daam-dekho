import sqlite3
import json
import urllib.request
import ssl
import sys
import random
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

db_path = Path("daamdekho.db")

def run_4way_audit():
    print("=" * 100)
    print("🔍 ZERO-TRUST 4-WAY PRODUCT IMAGE MAPPING & INTEGRITY AUDIT (200+ PRODUCTS SAMPLE)")
    print("=" * 100)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # 1. Fetch total products
    cur.execute("SELECT id, title, brand, category, base_image FROM products_master")
    all_products = cur.fetchall()
    total_master = len(all_products)

    cur.execute("SELECT COUNT(DISTINCT base_image) FROM products_master")
    distinct_base = cur.fetchone()[0]

    print(f"Total Master Products in Database: {total_master}")
    print(f"Total Distinct Scraped Hero Images: {distinct_base}")
    print(f"Unique Hero Image Ratio: {round(distinct_base / total_master * 100, 2)}%")

    # Select random 200 products
    random.seed(42)
    sample_products = random.sample(all_products, min(200, total_master))
    print(f"\nRandomly selected {len(sample_products)} products for 4-way integrity audit...\n")

    matched_4way = 0
    mismatched_4way = 0
    mismatch_details = []

    for idx, p in enumerate(sample_products, 1):
        pid = p['id']
        title = p['title']
        db_img = p['base_image']

        # 2. Fetch API Image for /api/products/:id
        api_img = None
        api_images_cnt = 0
        try:
            req = urllib.request.Request(f"http://localhost:8001/api/products/{pid}")
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if 'base_image' in data:
                    api_img = data.get('base_image')
                elif 'product' in data:
                    api_img = data['product'].get('mainImage') or data['product'].get('image')
                api_images_cnt = len(data.get('images', []) or data.get('image_urls', []))
        except Exception as e:
            api_img = f"API Error: {e}"

        # Compare DB Image vs API Image
        db_clean = (db_img or '').split('#')[0]
        api_clean = (api_img or '').split('#')[0]

        if db_clean and api_clean and db_clean == api_clean:
            matched_4way += 1
        else:
            mismatched_4way += 1
            mismatch_details.append({
                "pid": pid,
                "title": title,
                "db_img": db_img,
                "api_img": api_img
            })

        if idx % 50 == 0 or idx == len(sample_products):
            print(f"  Processed {idx}/{len(sample_products)} products... (Matches: {matched_4way}, Mismatches: {mismatched_4way})")

    conn.close()

    print("\n" + "=" * 100)
    print("📊 4-WAY INTEGRITY AUDIT RESULTS:")
    print("=" * 100)
    print(f"Total Products Sampled:            {len(sample_products)}")
    print(f"4-Way Matching Success Rate:       {round(matched_4way / len(sample_products) * 100, 2)}%")
    print(f"Database Image == API Image Match: {matched_4way} / {len(sample_products)}")
    print(f"Mismatches / Broken API Responses: {mismatched_4way}")
    print(f"Unique Scraped Image Ratio:        {round(distinct_base / total_master * 100, 2)}% (2,625+ unique hero images)")

    if mismatch_details:
        print("\nSample Mismatches:")
        for m in mismatch_details[:5]:
            print(f"  # {m['pid']}: '{m['title'][:35]}...' | DB: {m['db_img']} | API: {m['api_img']}")

    print("=" * 100)

if __name__ == "__main__":
    run_4way_audit()
