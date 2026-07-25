import sqlite3
import json
import sys
from pathlib import Path

# Set console encoding to UTF-8 to prevent UnicodeEncodeError on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# BUG-32 FIX: Was hardcoded 'D:\\shubham\\...' - worked only on one machine.
# Use a path relative to the script itself so it works on any machine.
db_path = Path(__file__).parent / 'daamdekho.db'

def query_db():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- Searching for products in 'Mobiles' Category ---")
    cursor.execute("SELECT id, title, brand, category FROM products_master WHERE category = 'Mobiles'")
    products = cursor.fetchall()
    for pid, title, brand, cat in products:
        print(f"\nProduct ID: {pid} | Title: {title} | Brand: {brand} | Cat: {cat}")
        
        cursor.execute("SELECT id, ram, storage, slug FROM product_variants WHERE product_id = ?", (pid,))
        variants = cursor.fetchall()
        for vid, ram, storage, slug in variants:
            print(f"  Variant ID: {vid} | RAM: {ram} | Storage: {storage} | Slug: {slug}")
            
            cursor.execute("SELECT vp.id, v.name, vp.price, vp.url FROM vendor_products vp JOIN vendors v ON vp.vendor_id = v.id WHERE vp.variant_id = ?", (vid,))
            v_prods = cursor.fetchall()
            for v_id, v_name, price, url in v_prods:
                print(f"    - Vendor: {v_name} | Price: {price} | URL: {url[:50]}...")
            
            cursor.execute("SELECT spec_key, spec_value FROM product_specifications WHERE variant_id = ?", (vid,))
            specs = cursor.fetchall()
            if specs:
                print(f"    - Specs: {dict(specs)}")
            else:
                print(f"    - Specs: None found")
                
    # Print Table Summaries
    print("\n" + "="*50)
    print("DATABASE TABLE SUMMARIES:")
    print("="*50)
    cursor.execute("SELECT COUNT(*) FROM products_master")
    print(f"Total Master Products: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM product_variants")
    print(f"Total Product Variants: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM vendor_products")
    print(f"Total Vendor Products (Prices): {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM price_history")
    print(f"Total Price History ticks: {cursor.fetchone()[0]}")
    conn.close()

if __name__ == "__main__":
    query_db()
