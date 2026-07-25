import sqlite3
import json
from app.config import DB_PATH
from app.logger import get_logger

logger = get_logger("database")

def init_db():
    """Initializes the database and creates the necessary tables. Migrates existing tables if needed."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Schema for product tables
    schema = '''
    (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        brand TEXT,
        category TEXT,
        price REAL,
        discounted_price REAL,
        rating REAL,
        reviews INTEGER,
        seller_name TEXT,
        availability TEXT,
        ram TEXT,
        rom TEXT,
        camera TEXT,
        display TEXT,
        battery TEXT,
        processor TEXT,
        image_urls TEXT,
        product_link TEXT,
        offers TEXT,
        bank_offers TEXT,
        exchange_offers TEXT,
        coupon_offers TEXT,
        emi_offers TEXT,
        other_offers TEXT,
        vendor TEXT,
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    '''
    
    # Create main products table if not exists
    cursor.execute(f'CREATE TABLE IF NOT EXISTS products {schema}')
    
    # Check and add missing columns for existing tables (migration)
    table_names = ["products"]
    from app.config import VENDORS
    for v in VENDORS:
        table_names.append(f"{v}_products")
        cursor.execute(f'CREATE TABLE IF NOT EXISTS {v}_products {schema}')

    new_columns = [
        "ram", "rom", "camera", "display", "battery", "processor",
        "bank_offers", "exchange_offers", "coupon_offers", "emi_offers", "other_offers"
    ]
    
    for table in table_names:
        cursor.execute(f"PRAGMA table_info({table})")
        existing_columns = [col[1] for col in cursor.fetchall()]
        for col in new_columns:
            if col not in existing_columns:
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} TEXT")
                    logger.info(f"Added column {col} to table {table}")
                except sqlite3.OperationalError as e:
                    logger.warning(f"Could not add column {col} to {table}: {e}")

    conn.commit()
    conn.close()

def save_products_to_db(products: list):
    """Saves a list of product dictionaries to both the main table and vendor-specific tables."""
    if not products:
        return

    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for p in products:
        # Get specification dict
        specs_dict = p.get("specifications", {})
        
        # Convert list/dict to JSON strings for SQLite storage
        specs_json = json.dumps(specs_dict)
        img_urls = json.dumps(p.get("image_urls", []))
        offers = json.dumps(p.get("offers", []))
        
        vendor = p.get("vendor", "unknown").lower()
        table_names = ["products", f"{vendor}_products"]
        
        for table_name in table_names:
            try:
                # Basic categorization for backward compatibility or simple scrapers
                offers_list = p.get("offers", [])
                bank_offers = []
                exchange_offers = []
                coupon_offers = []
                emi_offers = []
                other_offers = []
                
                for o in offers_list:
                    o_upper = str(o).upper()
                    matched = False
                    if any(x in o_upper for x in ["BANK", "CARD", "CASHBACK", "ICICI", "SBI", "HDFC", "AXIS", "KOTAK", "RBL"]):
                        bank_offers.append(o)
                        matched = True
                    if "EXCHANGE" in o_upper:
                        exchange_offers.append(o)
                        matched = True
                    if "COUPON" in o_upper or "SAVE" in o_upper:
                        coupon_offers.append(o)
                        matched = True
                    if "EMI" in o_upper:
                        emi_offers.append(o)
                        matched = True
                    
                    if not matched:
                        other_offers.append(o)

                cursor.execute(f'''
                INSERT INTO {table_name} (
                    title, brand, category, price, discounted_price, 
                    rating, reviews, seller_name, availability, 
                    ram, rom, camera, display, battery, processor,
                    image_urls, product_link, offers, bank_offers, exchange_offers, coupon_offers, emi_offers, other_offers, vendor
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    p.get("title"),
                    p.get("brand"),
                    p.get("category"),
                    p.get("price"),
                    p.get("discounted_price"),
                    p.get("rating"),
                    p.get("reviews"),
                    p.get("seller_name"),
                    p.get("availability"),
                    specs_dict.get("ram", "N/A"),
                    specs_dict.get("rom", "N/A"),
                    specs_dict.get("camera", "N/A"),
                    specs_dict.get("display", "N/A"),
                    specs_dict.get("battery", "N/A"),
                    specs_dict.get("processor", "N/A"),
                    img_urls,
                    p.get("product_link"),
                    json.dumps(offers_list),
                    json.dumps(bank_offers),
                    json.dumps(exchange_offers),
                    json.dumps(coupon_offers),
                    json.dumps(emi_offers),
                    json.dumps(other_offers),
                    vendor
                ))
            except sqlite3.OperationalError as e:
                logger.error(f"Error saving to table {table_name}: {e}")
    
    conn.commit()
    conn.close()
    logger.info(f"Successfully saved {len(products)} products to database (main and vendor tables).")
