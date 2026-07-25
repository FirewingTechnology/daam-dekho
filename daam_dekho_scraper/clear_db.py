import sqlite3
from pathlib import Path

# Use a relative path to locate daamdekho.db at the project root
db_path = Path(__file__).parent.parent / 'daamdekho.db'

def clear_dummy_data():
    if not db_path.exists():
        print(f"[ERROR] Database not found at: {db_path}")
        return

    print(f"[INFO] Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        # Clear catalog tables
        print("[INFO] Purging price_history...")
        cur.execute("DELETE FROM price_history")
        
        print("[INFO] Purging vendor_products...")
        cur.execute("DELETE FROM vendor_products")
        
        print("[INFO] Purging product_specifications...")
        cur.execute("DELETE FROM product_specifications")
        
        print("[INFO] Purging product_variants...")
        cur.execute("DELETE FROM product_variants")
        
        print("[INFO] Purging products_master...")
        cur.execute("DELETE FROM products_master")
        
        # Reset sqlite auto-increment sequences
        print("[INFO] Resetting auto-increment sequences...")
        cur.execute("DELETE FROM sqlite_sequence WHERE name IN ('price_history', 'vendor_products', 'product_specifications', 'product_variants', 'products_master')")
        
        conn.commit()
        print("[SUCCESS] Database successfully cleared of all dummy product data!")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error during database purge: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    clear_dummy_data()
