"""
Daam Dekho - Cross-Vendor Entity Matching & Ingestion Test
Tests exact matching across Amazon, Flipkart, Croma, and JioMart for Apple iPhone 15 (128GB Black).
"""

import sys
import sqlite3
import json
from pathlib import Path

# Add project root & scraper dir to path
project_root = Path(__file__).resolve().parent
scraper_dir = project_root / "daam_dekho_scraper"
sys.path.insert(0, str(scraper_dir))
sys.path.insert(0, str(project_root))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.matchers.product_matcher import matcher
from app.cleaners.data_cleaner import cleaner
from app.pipeline import pipeline
from app.config import DB_PATH

def run_cross_vendor_test():
    print("=" * 75)
    print("CROSS-VENDOR PRODUCT MATCHING & INGESTION TEST")
    print("=" * 75)

    # 4 Scraped Product Listings from different vendors
    listings = [
        {
            "title": "Apple iPhone 15 (128 GB) - Black",
            "vendor": "amazon",
            "seller_name": "Amazon",
            "product_link": "https://www.amazon.in/Apple-iPhone-15-128-GB/dp/B0CHX6GQ47",
            "price": 69600.0,
            "discounted_price": 64900.0,
            "rating": 4.5,
            "reviews": 2364,
            "image_url": "https://m.media-amazon.com/images/I/71657TiFeHL._AC_UY218_.jpg",
            "specifications": {"rom": "128 GB"}
        },
        {
            "title": "APPLE iPhone 15 Black 128GB",
            "vendor": "flipkart",
            "seller_name": "Flipkart",
            "product_link": "https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm6ac6485515ae4",
            "price": 69900.0,
            "discounted_price": 65999.0,
            "rating": 4.6,
            "reviews": 4512,
            "image_url": "https://rukminim2.flixcart.com/image/312/312/xif0q/mobile/h/d/9/-original-imagtc2qzgnnuhxh.jpeg",
            "specifications": {"rom": "128 GB"}
        },
        {
            "title": "Apple iPhone 15 128 GB Black",
            "vendor": "croma",
            "seller_name": "Croma",
            "product_link": "https://www.croma.com/apple-iphone-15-128gb-black-/p/300652",
            "price": 69900.0,
            "discounted_price": 64900.0,
            "rating": 4.5,
            "reviews": 890,
            "image_url": "https://media.croma.com/image/upload/v1694674445/Croma%20Assets/Communication/Mobiles/Images/300652_0_p0q7zv.png",
            "specifications": {"rom": "128 GB"}
        },
        {
            "title": "Apple iPhone 15 Black (128GB)",
            "vendor": "jiomart",
            "seller_name": "JioMart",
            "product_link": "https://www.jiomart.com/p/electronics/apple-iphone-15-128-gb-black/605051214",
            "price": 69900.0,
            "discounted_price": 64900.0,
            "rating": 4.4,
            "reviews": 320,
            "image_url": "https://www.jiomart.com/images/product/original/493838405/apple-iphone-15-128-gb-black-digital-o493838405-p605051214-0-202309141526.jpeg",
            "specifications": {"rom": "128 GB"}
        }
    ]

    print("\n--- PHASE 1: FUZZY SCORE COMPUTATION & MATRIX VERIFICATION ---")
    amazon_prod = listings[0]
    
    for i in range(1, len(listings)):
        other = listings[i]
        score = matcher.calculate_score(amazon_prod, other)
        norm_a = matcher.normalize_title(amazon_prod['title'])
        norm_b = matcher.normalize_title(other['title'])
        print(f"  • Amazon vs {other['vendor'].capitalize():8s} | Score: {score:.1f} / 100")
        print(f"    - Amazon Title  : '{norm_a}'")
        print(f"    - {other['vendor'].capitalize():8s} Title: '{norm_b}'")
        assert score >= 75, f"Matching score failed threshold ({score} < 75)"

    print("\n✅ All 4 listings passed match score threshold (Score >= 75)!")

    print("\n--- PHASE 2: INGESTION PIPELINE EXECUTION ---")
    # Clean and ingest all 4 listings into DB
    for p in listings:
        p['category'] = 'Mobiles'
        p['brand'] = cleaner.normalize_brand(p.get('brand'))
        p['discounted_price'] = cleaner.clean_price(p.get('discounted_price'))
        p['price'] = cleaner.clean_price(p.get('price'))
        
    pipeline.process_and_save(listings, category="mobiles")

    print("\n--- PHASE 3: DATABASE VERIFICATION & SQL EVIDENCE ---")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 1. Master Product Check for the exact Base Mobile Phone
    c.execute("""
        SELECT id, title, clean_title, brand, category 
        FROM products_master 
        WHERE clean_title LIKE '%apple iphone 15 128gb black%'
    """)
    masters = c.fetchall()
    print(f"\n1. Target Mobile Master Product Count: {len(masters)} (Expected: 1)")
    for m in masters:
        print(f"   • Master ID: {m[0]} | Title: '{m[1]}' | Clean: '{m[2]}' | Category: '{m[4]}'")
    
    master_id = masters[0][0]







    # 2. Variant Check for 128 GB
    c.execute("""
        SELECT id, product_id, storage, ram, slug 
        FROM product_variants 
        WHERE product_id = ? AND storage LIKE '%128%'
    """, (master_id,))
    variants = c.fetchall()
    print(f"\n2. Product Variant Count for Master ID {master_id} (128GB): {len(variants)} (Expected: 1)")
    for v in variants:
        print(f"   • Variant ID: {v[0]} | Master ID: {v[1]} | Storage: '{v[2]}' | RAM: '{v[3]}' | Slug: '{v[4]}'")

    variant_id = variants[0][0]

    # 3. Vendor Offers Check for this 128GB Variant
    c.execute("""
        SELECT vp.id, v.name, vp.title, vp.price, vp.mrp, vp.rating, vp.url 
        FROM vendor_products vp 
        JOIN vendors v ON vp.vendor_id = v.id 
        WHERE vp.variant_id = ?
        ORDER BY vp.id DESC LIMIT 4
    """, (variant_id,))
    offers = c.fetchall()
    print(f"\n3. Vendor Offers Linked to Variant ID {variant_id}: {len(offers)} (Expected: 4 Vendors)")
    print(f"   ---------------------------------------------------------------------------------------")
    print(f"   {'VP ID':<7} | {'Vendor':<12} | {'Price (₹)':<10} | {'MRP (₹)':<10} | {'Rating':<6} | {'Title'}")
    print(f"   ---------------------------------------------------------------------------------------")
    for o in offers:
        print(f"   {o[0]:<7} | {o[1]:<12} | ₹{o[3]:<9} | ₹{o[4]:<9} | {o[5]:<6} | {o[2]}")
    print(f"   ---------------------------------------------------------------------------------------")

    conn.close()

    assert len(masters) == 1, "Failed: Did not find exactly 1 target Master product!"
    assert len(variants) == 1, "Failed: Did not find exactly 1 target 128GB variant!"
    assert len(offers) == 4, f"Failed: Expected 4 vendor offers linked, found {len(offers)}"


    print("\n" + "=" * 75)
    print("✅ CROSS-VENDOR MATCHING SUCCESS: 4 Vendor Listings -> 1 Master -> 1 Variant!")
    print("=" * 75)

if __name__ == "__main__":
    run_cross_vendor_test()
