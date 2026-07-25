import sqlite3
import os
import subprocess
import sys

# Paths
db_path = r'd:\shubham\daam_dekho_final\daamdekho.db'
scraper_dir = r'd:\shubham\daam_dekho_final\daam_dekho_scraper'

def nuclear_fix():
    print("--- NUCLEAR FIX: Resetting Database ---")
    
    # 1. Clear Database
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            tables = ['price_history', 'vendor_products', 'product_specifications', 'product_variants', 'products_master']
            for table in tables:
                print(f"Cleaning table: {table}")
                cursor.execute(f"DELETE FROM {table}")
            conn.commit()
            conn.close()
            print("Database cleared successfully.")
        except Exception as e:
            print(f"Error clearing database: {e}")
            print("Trying to delete file...")
            os.remove(db_path)
    
    # 2. Run Fresh Scrapes
    print("\n--- Starting Fresh Scrapes ---")
    
    queries = [
        ("Samsung S24 Ultra", "mobiles"),
        ("iPhone 15", "mobiles")
    ]
    
    for query, cat in queries:
        print(f"Scraping: {query} in category: {cat}")
        cmd = [sys.executable, "main.py", "--query", query, "--category", cat]
        subprocess.run(cmd, cwd=scraper_dir)
    
    print("\n--- NUCLEAR FIX COMPLETE ---")
    print("Please go to the Home Page and search for 'Samsung S24 Ultra'.")

if __name__ == "__main__":
    nuclear_fix()
