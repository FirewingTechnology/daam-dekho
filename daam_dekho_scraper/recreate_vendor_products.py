import sqlite3
from pathlib import Path

db_path = Path(__file__).parent.parent / 'daamdekho.db'

def migrate_schema():
    if not db_path.exists():
        print(f"[ERROR] Database not found at: {db_path}")
        return

    print(f"[INFO] Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        # Drop the table to easily update constraints since it is empty
        print("[INFO] Dropping existing empty vendor_products table...")
        cur.execute("DROP TABLE IF EXISTS vendor_products")
        
        # Recreate the table with a UNIQUE constraint on 'url' and the 'offers' column
        print("[INFO] Recreating vendor_products table with unified schema...")
        cur.execute('''
            CREATE TABLE IF NOT EXISTS vendor_products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER,
                variant_id INTEGER,
                vendor_product_id TEXT,
                title TEXT,
                url TEXT UNIQUE,
                price REAL,
                mrp REAL,
                discount_percent REAL,
                rating REAL,
                reviews INTEGER,
                stock_status TEXT,
                delivery_days TEXT,
                seller TEXT,
                offers TEXT,
                last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES vendors(id),
                FOREIGN KEY (variant_id) REFERENCES product_variants(id)
            )
        ''')
        
        conn.commit()
        print("[SUCCESS] Successfully recreated vendor_products table with url UNIQUE and offers columns!")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_schema()
