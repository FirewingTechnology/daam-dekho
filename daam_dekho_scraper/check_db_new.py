import sqlite3
from pathlib import Path

# BUG-32 FIX (Stray script): Was hardcoded 'D:\shubham\...'
# Use a portable relative path so the script can run on any machine.
db_path = Path(__file__).parent.parent / 'daamdekho.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("--- Product Master ---")
cur.execute("SELECT id, title, brand, category FROM products_master LIMIT 20")
for row in cur.fetchall():
    print(row)

print("\n--- Vendor Products (Prices) ---")
cur.execute("""
    SELECT m.title, vp.vendor_id, vp.price, vp.url 
    FROM vendor_products vp 
    JOIN product_variants v ON vp.variant_id = v.id 
    JOIN products_master m ON v.product_id = m.id 
    LIMIT 20
""")
for row in cur.fetchall():
    print(row)

conn.close()
