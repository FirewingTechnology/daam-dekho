import sqlite3
import json
from datetime import datetime
from pathlib import Path
from app.config import DB_PATH
from app.logger import get_logger

logger = get_logger("db_manager")

class DatabaseManager:
    def __init__(self, db_path=None):
        self.db_path = db_path or DB_PATH
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_path, timeout=60)

    def init_db(self):
        """Initializes the production-grade schema."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # 1. Vendors Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS vendors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    base_url TEXT,
                    is_active INTEGER DEFAULT 1
                )
            ''')

            # 2. Products Master Table (Unified Products)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS products_master (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    clean_title TEXT,
                    brand TEXT,
                    category TEXT,
                    subcategory TEXT,
                    base_image TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 3. Product Variants Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS product_variants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    color TEXT,
                    ram TEXT,
                    storage TEXT,
                    slug TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # 4. Product Specifications Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS product_specifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    variant_id INTEGER,
                    spec_key TEXT,
                    spec_value TEXT,
                    FOREIGN KEY (variant_id) REFERENCES product_variants (id),
                    UNIQUE(variant_id, spec_key)
                )
            ''')

            # 5. Vendor Products Table (Actual listings)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS vendor_products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    variant_id INTEGER,
                    vendor_id INTEGER,
                    vendor_product_id TEXT,
                    title TEXT,
                    url TEXT UNIQUE,
                    price REAL,
                    mrp REAL,
                    discount_percent REAL,
                    rating REAL,
                    reviews INTEGER,
                    stock_status TEXT,
                    seller TEXT,
                    delivery_days TEXT,
                    offers TEXT,
                    last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (variant_id) REFERENCES product_variants (id),
                    FOREIGN KEY (vendor_id) REFERENCES vendors (id)
                )
            ''')

            # 6. Price History Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS price_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    vendor_product_id INTEGER,
                    price REAL,
                    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (vendor_product_id) REFERENCES vendor_products (id)
                )
            ''')

            # Seed vendors if empty
            vendors = [
                ('Amazon', 'https://www.amazon.in'),
                ('Flipkart', 'https://www.flipkart.com'),
                ('Croma', 'https://www.croma.com'),
                ('JioMart', 'https://www.jiomart.com'),
                ('Vijay Sales', 'https://www.vijaysales.com'),
                ('Reliance Digital', 'https://www.reliancedigital.in')
            ]
            for v_name, v_url in vendors:
                cursor.execute('INSERT OR IGNORE INTO vendors (name, base_url) VALUES (?, ?)', (v_name, v_url))

            conn.commit()
            conn.close()
            logger.info("Database initialized with production schema.")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")

    def save_raw_product(self, product_data):
        """Saves or updates a product listing and tracks price history."""
        # This is a placeholder for the logic that will be called by the pipeline
        # Actual implementation will involve matching engine first
        pass

db_manager = DatabaseManager()
