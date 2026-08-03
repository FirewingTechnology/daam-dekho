import sqlite3
from app.logger import get_logger

logger = get_logger("v10_data_lake_schema")

def init_v10_data_lake_schema(conn=None):
    """Initializes the DaamDekho v10.0 Enterprise 4-Layer Database Schema:
    Layer 1: Immutable Raw Data Lake
    Layer 2: Attribute Normalization & Extraction
    Layer 3: Enterprise Master Catalog & Variants
    Layer 4: Published Catalog Views & Backward Compatibility
    """
    close_conn = False
    if conn is None:
        from app.database.manager import db_manager
        conn = db_manager.get_connection()
        close_conn = True

    try:
        cursor = conn.cursor()

        # =========================================================================
        # LAYER 1: IMMUTABLE RAW DATA LAKE
        # =========================================================================
        
        # 1. Crawl Sessions Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS crawl_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE,
                target_query TEXT,
                category TEXT DEFAULT 'Mobiles',
                brand TEXT,
                target_vendors_json TEXT,
                max_pages INTEGER DEFAULT 3,
                status TEXT DEFAULT 'RUNNING',
                initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        ''')

        cursor.execute("PRAGMA table_info(crawl_sessions)")
        cs_cols = [row[1] for row in cursor.fetchall()]
        for col_name in ['session_id', 'target_query', 'category', 'brand', 'target_vendors_json', 'max_pages', 'initiated_at', 'completed_at']:
            if col_name not in cs_cols:
                try: cursor.execute(f"ALTER TABLE crawl_sessions ADD COLUMN {col_name} TEXT")
                except Exception: pass

        # Backward compatibility for legacy table name
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_scrape_sessions_v10 (
                session_id TEXT PRIMARY KEY,
                target_query TEXT,
                category TEXT,
                brand TEXT,
                target_vendors_json TEXT,
                initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                status TEXT DEFAULT 'RUNNING'
            )
        ''')

        # 2. Immutable Raw Products Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                vendor TEXT NOT NULL,
                search_query TEXT,
                page_number INTEGER DEFAULT 1,
                rank_in_page INTEGER,
                raw_title TEXT NOT NULL,
                current_price REAL DEFAULT 0.0,
                mrp REAL DEFAULT 0.0,
                discount_percent REAL DEFAULT 0.0,
                pdp_url TEXT NOT NULL,
                canonical_url TEXT,
                hero_image_url TEXT,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 3. Immutable Raw Product Specifications Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_product_specs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_product_id INTEGER NOT NULL,
                brand TEXT,
                series TEXT,
                model TEXT,
                generation TEXT,
                model_number TEXT,
                part_number TEXT,
                mpn TEXT,
                sku TEXT,
                ean TEXT,
                upc TEXT,
                category TEXT,
                subcategory TEXT,
                processor TEXT,
                cpu TEXT,
                gpu TEXT,
                chipset TEXT,
                ram TEXT,
                storage TEXT,
                expandable_storage TEXT,
                operating_system TEXT,
                display_size TEXT,
                display_resolution TEXT,
                refresh_rate TEXT,
                brightness TEXT,
                panel_type TEXT,
                battery_capacity TEXT,
                battery_type TEXT,
                charging TEXT,
                rear_cameras TEXT,
                front_camera TEXT,
                video_specs TEXT,
                network_5g TEXT,
                sim_specs TEXT,
                bluetooth TEXT,
                wifi TEXT,
                usb_type TEXT,
                nfc TEXT,
                gps TEXT,
                weight TEXT,
                dimensions TEXT,
                color TEXT,
                description TEXT,
                highlights TEXT,
                spec_table_json TEXT
            )
        ''')

        # 4. Immutable Raw Product Images Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_product_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_product_id INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                image_type TEXT DEFAULT 'gallery'
            )
        ''')

        # 5. Immutable Raw Product Offers Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_product_offers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_product_id INTEGER NOT NULL,
                seller TEXT,
                stock_status TEXT DEFAULT 'In Stock',
                availability TEXT DEFAULT 'Available',
                delivery_info TEXT,
                warranty_info TEXT,
                replacement_policy TEXT,
                emi_options_json TEXT,
                no_cost_emi_json TEXT,
                bank_offers_json TEXT,
                coupons_json TEXT,
                exchange_offer_info TEXT,
                cashback_info TEXT
            )
        ''')

        # 6. Immutable Raw HTML Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_html (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_product_id INTEGER NOT NULL,
                pdp_url TEXT NOT NULL,
                html_content TEXT,
                captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 7. Immutable Raw JSON-LD Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_jsonld (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_product_id INTEGER NOT NULL,
                pdp_url TEXT NOT NULL,
                jsonld_content TEXT,
                captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 8. Immutable Raw Audit Logs Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                vendor TEXT,
                log_level TEXT DEFAULT 'INFO',
                message TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 9. Immutable Raw Search Results Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_search_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                vendor TEXT NOT NULL,
                query TEXT NOT NULL,
                page_number INTEGER DEFAULT 1,
                rank INTEGER,
                product_url TEXT NOT NULL,
                title TEXT,
                raw_price REAL,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Legacy raw v10 table mirrors for backward compatibility
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_products_v10 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                vendor TEXT NOT NULL,
                search_query TEXT,
                page_number INTEGER DEFAULT 1,
                rank_in_page INTEGER,
                raw_title TEXT NOT NULL,
                current_price REAL DEFAULT 0.0,
                mrp REAL DEFAULT 0.0,
                discount_percent REAL DEFAULT 0.0,
                pdp_url TEXT NOT NULL,
                hero_image_url TEXT,
                raw_html TEXT,
                raw_json_ld TEXT,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_product_specs_v10 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_product_id INTEGER NOT NULL,
                brand TEXT, series TEXT, model TEXT, model_number TEXT, part_number TEXT,
                sku TEXT, ean TEXT, upc TEXT, cpu TEXT, gpu TEXT, ram TEXT, storage TEXT,
                display TEXT, battery TEXT, camera TEXT, network TEXT, operating_system TEXT,
                color TEXT, spec_table_json TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_product_offers_v10 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_product_id INTEGER NOT NULL,
                seller TEXT, stock_status TEXT DEFAULT 'IN_STOCK', delivery_info TEXT,
                warranty_info TEXT, emi_options_json TEXT, bank_offers_json TEXT,
                exchange_offer_info TEXT, cashback_info TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_product_images_v10 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_product_id INTEGER NOT NULL,
                image_url TEXT NOT NULL, image_type TEXT DEFAULT 'gallery'
            )
        ''')

        # =========================================================================
        # LAYER 2: ATTRIBUTE NORMALIZATION & EXTRACTION SCHEMA
        # =========================================================================

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS normalized_products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_product_id INTEGER NOT NULL,
                canonical_brand TEXT NOT NULL,
                canonical_series TEXT,
                canonical_model TEXT,
                normalized_title TEXT NOT NULL,
                hardware_fingerprint TEXT NOT NULL,
                mpn TEXT,
                model_number TEXT,
                ean TEXT,
                upc TEXT,
                sku TEXT,
                normalized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS normalized_specs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                normalized_product_id INTEGER NOT NULL,
                clean_cpu TEXT,
                clean_gpu TEXT,
                clean_ram TEXT,
                clean_storage TEXT,
                clean_display TEXT,
                clean_battery TEXT,
                clean_color TEXT,
                clean_network TEXT,
                clean_os TEXT,
                spec_attributes_json TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS normalized_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                normalized_product_id INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                is_hero INTEGER DEFAULT 0,
                aspect_ratio TEXT DEFAULT '1:1'
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS normalized_entities_v10 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_product_id INTEGER NOT NULL,
                canonical_brand TEXT NOT NULL, canonical_series TEXT, canonical_model TEXT,
                clean_cpu TEXT, clean_gpu TEXT, clean_ram TEXT, clean_storage TEXT,
                clean_display TEXT, clean_color TEXT, normalized_title TEXT NOT NULL,
                hardware_fingerprint TEXT NOT NULL, normalized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # =========================================================================
        # LAYER 3: ENTERPRISE MASTER CATALOG & VARIANTS SCHEMA
        # =========================================================================

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS master_products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                master_identity_hash TEXT UNIQUE NOT NULL,
                canonical_title TEXT NOT NULL,
                brand TEXT NOT NULL,
                series TEXT,
                model TEXT,
                category TEXT DEFAULT 'Mobiles',
                base_image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS product_variants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                master_product_id INTEGER,
                product_id INTEGER,
                variant_identity_hash TEXT UNIQUE,
                mpn TEXT,
                model_number TEXT,
                ean TEXT,
                upc TEXT,
                sku TEXT,
                cpu TEXT,
                gpu TEXT,
                ram TEXT,
                storage TEXT,
                display_size TEXT,
                color TEXT DEFAULT 'Default',
                edition TEXT,
                network TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute("PRAGMA table_info(product_variants)")
        pv_cols = [row[1] for row in cursor.fetchall()]
        for col in ['master_product_id', 'product_id', 'variant_identity_hash', 'mpn', 'model_number', 'ean', 'upc', 'sku', 'cpu', 'gpu', 'ram', 'storage', 'display_size', 'color', 'edition', 'network']:
            if col not in pv_cols:
                try: cursor.execute(f"ALTER TABLE product_variants ADD COLUMN {col} TEXT")
                except Exception: pass

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS variant_specifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                variant_id INTEGER NOT NULL,
                spec_key TEXT NOT NULL,
                spec_value TEXT NOT NULL,
                spec_group TEXT DEFAULT 'General'
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS variant_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                variant_id INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                is_primary INTEGER DEFAULT 0
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vendor_offers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                variant_id INTEGER NOT NULL,
                vendor_name TEXT NOT NULL,
                product_title TEXT NOT NULL,
                pdp_url TEXT NOT NULL,
                price REAL NOT NULL,
                mrp REAL,
                discount_percent REAL DEFAULT 0.0,
                seller TEXT,
                stock_status TEXT DEFAULT 'In Stock',
                availability TEXT DEFAULT 'Available',
                delivery_info TEXT,
                warranty_info TEXT,
                emi_plans_json TEXT,
                bank_offers_json TEXT,
                coupons_json TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_offer_id INTEGER,
                vendor_product_id INTEGER,
                price REAL NOT NULL,
                mrp REAL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute("PRAGMA table_info(price_history)")
        ph_cols = [row[1] for row in cursor.fetchall()]
        for col in ['vendor_offer_id', 'vendor_product_id', 'price', 'mrp']:
            if col not in ph_cols:
                try: cursor.execute(f"ALTER TABLE price_history ADD COLUMN {col} REAL")
                except Exception: pass

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS master_products_v10 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                master_identity_hash TEXT UNIQUE NOT NULL,
                canonical_title TEXT NOT NULL, brand TEXT NOT NULL, series TEXT,
                model TEXT, base_image TEXT, category TEXT DEFAULT 'Mobiles',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS product_variants_v10 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                master_product_id INTEGER NOT NULL,
                variant_identity_hash TEXT UNIQUE NOT NULL,
                cpu TEXT, gpu TEXT, ram TEXT, storage TEXT, display_size TEXT,
                color TEXT DEFAULT 'Default', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vendor_offers_v10 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                variant_id INTEGER NOT NULL,
                vendor_name TEXT NOT NULL, product_title TEXT NOT NULL,
                product_url TEXT NOT NULL, price REAL NOT NULL, mrp REAL,
                discount_percent REAL DEFAULT 0.0, stock_status TEXT DEFAULT 'In Stock',
                seller TEXT, delivery_info TEXT, warranty_info TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # =========================================================================
        # LAYER 4: WEBSITE PUBLISHED CATALOG VIEWS & BACKWARD COMPATIBILITY
        # =========================================================================

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vendors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                base_url TEXT,
                is_active INTEGER DEFAULT 1
            )
        ''')

        vendors_seed = [
            ("Amazon", "https://www.amazon.in"),
            ("Flipkart", "https://www.flipkart.com"),
            ("Croma", "https://www.croma.com"),
            ("JioMart", "https://www.jiomart.com"),
            ("Vijay Sales", "https://www.vijaysales.com")
        ]
        for vname, vurl in vendors_seed:
            cursor.execute("INSERT OR IGNORE INTO vendors (name, base_url) VALUES (?, ?)", (vname, vurl))

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products_master (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                clean_title TEXT,
                normalized_title TEXT,
                canonical_title TEXT,
                brand TEXT,
                category TEXT DEFAULT 'Mobiles',
                subcategory TEXT,
                base_image TEXT,
                master_identity TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vendor_products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                variant_id INTEGER,
                vendor_id INTEGER,
                vendor_product_id TEXT,
                vendor_identity_hash TEXT UNIQUE,
                title TEXT,
                original_title TEXT,
                canonical_title TEXT,
                url TEXT UNIQUE,
                price REAL,
                mrp REAL,
                discount_percent REAL,
                rating REAL DEFAULT 4.5,
                reviews INTEGER DEFAULT 100,
                stock_status TEXT DEFAULT 'In Stock',
                seller TEXT,
                delivery_days TEXT,
                offers TEXT,
                last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS product_specifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                variant_id INTEGER,
                spec_key TEXT,
                spec_value TEXT,
                UNIQUE(variant_id, spec_key)
            )
        ''')

        conn.commit()
        if close_conn:
            conn.close()
        logger.info("✅ DaamDekho v10.0 Enterprise 4-Layer Database Schema initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize v10.0 schema: {e}")

if __name__ == '__main__':
    init_v10_data_lake_schema()
