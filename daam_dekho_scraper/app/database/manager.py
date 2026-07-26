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
        conn = sqlite3.connect(self.db_path, timeout=60)
        try:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA synchronous = NORMAL;")
            conn.execute("PRAGMA busy_timeout = 60000;")
        except Exception:
            pass
        return conn

    def init_db(self):
        """Initializes the production-grade schema with strict v2.1 constraints."""
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
                    normalized_title TEXT,
                    canonical_title TEXT,
                    brand TEXT,
                    category TEXT,
                    subcategory TEXT,
                    base_image TEXT,
                    master_identity TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            cursor.execute("PRAGMA table_info(products_master)")
            pm_cols = [row[1] for row in cursor.fetchall()]
            for col_name in ['master_identity', 'normalized_title', 'canonical_title']:
                if col_name not in pm_cols:
                    try: cursor.execute(f"ALTER TABLE products_master ADD COLUMN {col_name} TEXT")
                    except Exception: pass

            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_products_master_identity ON products_master(master_identity);")

            # 3. Product Variants Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS product_variants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    color TEXT,
                    edition TEXT,
                    ram TEXT,
                    storage TEXT,
                    slug TEXT UNIQUE,
                    canonical_hash TEXT UNIQUE,
                    variant_identity TEXT UNIQUE,
                    hardware_identity TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')
            
            cursor.execute("PRAGMA table_info(product_variants)")
            pv_cols = [row[1] for row in cursor.fetchall()]
            for col_name in ['variant_identity', 'hardware_identity', 'color', 'edition']:
                if col_name not in pv_cols:
                    try: cursor.execute(f"ALTER TABLE product_variants ADD COLUMN {col_name} TEXT")
                    except Exception: pass

            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_canonical ON product_variants(canonical_hash);")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_identity ON product_variants(variant_identity);")

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

            # 5. Vendor Products Table (Actual listings with v2.1 vendor_identity_hash & v2.3 titles)
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

            cursor.execute("PRAGMA table_info(vendor_products)")
            vp_cols = [row[1] for row in cursor.fetchall()]
            for col_name in ['vendor_identity_hash', 'original_title', 'canonical_title']:
                if col_name not in vp_cols:
                    try: cursor.execute(f"ALTER TABLE vendor_products ADD COLUMN {col_name} TEXT")
                    except Exception: pass

            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_identity_hash ON vendor_products(vendor_identity_hash);")

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

            # 7. Product Identity Knowledge Table (v2.4)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS product_identity (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    product_uuid TEXT UNIQUE,
                    model_number TEXT,
                    part_number TEXT,
                    gtin TEXT,
                    ean TEXT,
                    upc TEXT,
                    hardware_fingerprint TEXT UNIQUE,
                    master_identity TEXT,
                    variant_identity TEXT,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # 8. Product Graph Master Table (v2.4)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS product_graph (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER UNIQUE,
                    brand TEXT,
                    series TEXT,
                    model TEXT,
                    generation TEXT,
                    category TEXT,
                    chipset TEXT,
                    cpu TEXT,
                    gpu TEXT,
                    ram TEXT,
                    storage TEXT,
                    display_size TEXT,
                    battery TEXT,
                    os TEXT,
                    canonical_url TEXT,
                    canonical_title TEXT,
                    health_score REAL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # 9. Product Health Table (v2.4)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS product_health (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER UNIQUE,
                    overall_health_score REAL,
                    identity_completeness REAL,
                    specs_completeness REAL,
                    image_completeness REAL,
                    vendor_coverage REAL,
                    price_integrity REAL,
                    url_health REAL,
                    reviews_ratings REAL,
                    status TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # 10. Product Images Knowledge Table (v2.4)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS product_images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    image_url TEXT UNIQUE,
                    image_type TEXT DEFAULT 'main',
                    image_hash TEXT,
                    source TEXT,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # 11. Product Relationships Table (v2.4)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS product_relationships (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    related_product_id INTEGER,
                    relationship_type TEXT,
                    confidence REAL,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # --- v2.5 AI PRODUCT INTELLIGENCE PLATFORM TABLES ---

            # 12. AI Product Summary Table (v2.5)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ai_product_summary (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER UNIQUE,
                    short_summary TEXT,
                    long_summary TEXT,
                    pros TEXT,
                    cons TEXT,
                    highlights TEXT,
                    ideal_for TEXT,
                    not_recommended_for TEXT,
                    confidence REAL DEFAULT 95.0,
                    version TEXT DEFAULT 'v2.5',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # 13. AI Product Scorecard Table (v2.5)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ai_product_score (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER UNIQUE,
                    performance_score REAL,
                    display_score REAL,
                    battery_score REAL,
                    camera_score REAL,
                    gaming_score REAL,
                    value_score REAL,
                    repairability_score REAL,
                    software_score REAL,
                    overall_ai_score REAL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # 14. AI Relationships Table (v2.5)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ai_relationships (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    related_product_id INTEGER,
                    relationship_type TEXT,
                    confidence REAL,
                    source TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # 15. AI Specification Conflicts Table (v2.5)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ai_conflicts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    spec_key TEXT,
                    vendor_a TEXT,
                    value_a TEXT,
                    vendor_b TEXT,
                    value_b TEXT,
                    conflict_status TEXT DEFAULT 'FLAGGED',
                    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # 16. AI Recommendations Table (v2.5)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ai_recommendations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER UNIQUE,
                    best_vendor_today TEXT,
                    expected_savings REAL,
                    recommendation_action TEXT,
                    why_reason TEXT,
                    price_confidence REAL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # 17. AI Enrichment History Table (v2.5)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ai_enrichment_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    field_name TEXT,
                    enriched_value TEXT,
                    source_vendor TEXT,
                    confidence REAL,
                    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # --- v2.6 AUTONOMOUS PRODUCT DISCOVERY PLATFORM TABLES ---

            # 18. Discovery Sessions Table (v2.6)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS discovery_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_uuid TEXT UNIQUE,
                    query_input TEXT,
                    category_detected TEXT,
                    brand_detected TEXT,
                    passes_count INTEGER DEFAULT 5,
                    total_found INTEGER DEFAULT 0,
                    total_accepted INTEGER DEFAULT 0,
                    total_rejected INTEGER DEFAULT 0,
                    coverage_score REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 19. Vendor Queries Table (v2.6)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS vendor_queries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    vendor_name TEXT,
                    pass_number INTEGER,
                    query_string TEXT,
                    products_found INTEGER DEFAULT 0,
                    products_accepted INTEGER DEFAULT 0,
                    products_rejected INTEGER DEFAULT 0,
                    confidence_score REAL DEFAULT 95.0,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES discovery_sessions (id)
                )
            ''')

            # 20. Query Expansions Table (v2.6)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS query_expansions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    original_query TEXT,
                    expanded_query TEXT,
                    source_module TEXT,
                    conversion_rate REAL DEFAULT 1.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES discovery_sessions (id)
                )
            ''')

            # 21. Vendor Search Logs Table (v2.6)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS vendor_search_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    vendor_name TEXT,
                    pass_name TEXT,
                    query_used TEXT,
                    response_status TEXT DEFAULT '200_OK',
                    result_count INTEGER DEFAULT 0,
                    latency_ms INTEGER DEFAULT 120,
                    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES discovery_sessions (id)
                )
            ''')

            # 22. Rejection Logs Table (v2.6)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS rejection_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    vendor_name TEXT,
                    raw_title TEXT,
                    rejected_reason TEXT,
                    expected_attribute TEXT,
                    actual_attribute TEXT,
                    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES discovery_sessions (id)
                )
            ''')

            # 23. Coverage History Table (v2.6)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS coverage_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    vendor_name TEXT UNIQUE,
                    total_searches INTEGER DEFAULT 0,
                    avg_coverage_percent REAL DEFAULT 100.0,
                    success_rate REAL DEFAULT 100.0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # --- v2.7 ENTERPRISE LIVE OFFER INTELLIGENCE PLATFORM TABLES ---

            # 24. Offer Verification Table (v2.7)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS offer_verification (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    offer_id INTEGER,
                    http_status INTEGER DEFAULT 200,
                    title_matched BOOLEAN DEFAULT 1,
                    price_matched BOOLEAN DEFAULT 1,
                    seller_exists BOOLEAN DEFAULT 1,
                    buy_button_exists BOOLEAN DEFAULT 1,
                    image_exists BOOLEAN DEFAULT 1,
                    stock_status TEXT DEFAULT 'IN_STOCK',
                    verification_result TEXT DEFAULT 'VERIFIED',
                    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 25. Offer Timeline Table (v2.7)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS offer_timeline (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    offer_id INTEGER,
                    recorded_date DATE DEFAULT CURRENT_DATE,
                    price REAL,
                    mrp REAL,
                    seller_name TEXT,
                    in_stock BOOLEAN DEFAULT 1,
                    event_type TEXT DEFAULT 'PRICE_CHECK',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 26. Offer Coupons Table (v2.7)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS offer_coupons (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    offer_id INTEGER,
                    coupon_code TEXT,
                    offer_type TEXT,
                    discount_amount REAL DEFAULT 0.0,
                    bank_name TEXT,
                    min_cart_value REAL DEFAULT 0.0,
                    valid_till TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 27. Offer Seller Table (v2.7)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS offer_seller (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    offer_id INTEGER UNIQUE,
                    seller_name TEXT,
                    seller_rating REAL DEFAULT 4.5,
                    is_fulfilled BOOLEAN DEFAULT 1,
                    is_prime_assured BOOLEAN DEFAULT 1,
                    replacement_policy TEXT DEFAULT '7 Days Replacement',
                    warranty_info TEXT DEFAULT '1 Year Brand Warranty',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 28. Offer Stock Table (v2.7)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS offer_stock (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    offer_id INTEGER UNIQUE,
                    stock_state TEXT DEFAULT 'IN_STOCK',
                    units_remaining INTEGER DEFAULT 50,
                    expected_restock TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 29. Offer Quality Table (v2.7)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS offer_quality (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    offer_id INTEGER UNIQUE,
                    quality_score REAL DEFAULT 95.0,
                    url_score REAL DEFAULT 100.0,
                    price_score REAL DEFAULT 95.0,
                    seller_score REAL DEFAULT 95.0,
                    stock_score REAL DEFAULT 100.0,
                    freshness_score REAL DEFAULT 100.0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 30. Offer Events Table (v2.7)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS offer_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    offer_id INTEGER,
                    event_name TEXT,
                    old_value TEXT,
                    new_value TEXT,
                    change_delta REAL DEFAULT 0.0,
                    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # --- v2.8 ENTERPRISE CONSUMER AI SHOPPING ASSISTANT PLATFORM TABLES ---

            # 31. User Preferences Table (v2.8)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT UNIQUE,
                    preferred_brand TEXT,
                    preferred_os TEXT,
                    max_budget REAL DEFAULT 100000.0,
                    primary_use_case TEXT DEFAULT 'General',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 32. Shopping Sessions Table (v2.8)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS shopping_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE,
                    user_id TEXT,
                    current_intent TEXT,
                    active_budget REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 33. Recommendation History Table (v2.8)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS recommendation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    query_input TEXT,
                    recommended_product_id INTEGER,
                    rank INTEGER DEFAULT 1,
                    confidence REAL DEFAULT 95.0,
                    why_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 34. AI Chat History Table (v2.8)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ai_chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    sender TEXT,
                    message TEXT,
                    metadata_json TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 35. Wishlist Table (v2.8)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS wishlist (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    product_id INTEGER,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products_master (id)
                )
            ''')

            # 36. Saved Searches Table (v2.8)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS saved_searches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    query_text TEXT,
                    filters_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 37. Recommendation Feedback Table (v2.8)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS recommendation_feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    recommendation_id INTEGER,
                    user_rating INTEGER DEFAULT 5,
                    feedback_text TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # --- v3.0 INTELLIGENT SCRAPER COMMAND CENTER TABLES ---

            # 38. Scraper Command History Table (v3.0)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS scraper_command_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    command_uuid TEXT UNIQUE,
                    original_query TEXT,
                    detected_intent TEXT,
                    detected_category TEXT,
                    detected_brand TEXT,
                    expanded_queries_json TEXT,
                    total_found INTEGER DEFAULT 0,
                    total_saved INTEGER DEFAULT 0,
                    coverage_score REAL DEFAULT 100.0,
                    runtime_seconds REAL DEFAULT 0.0,
                    operator TEXT DEFAULT 'Administrator',
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # --- v3.2 ENTERPRISE DATA OBSERVABILITY & PIPELINE EXPLORER TABLES ---

            # 39. Pipeline Scrape Sessions Table (v3.2)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pipeline_scrape_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_uuid TEXT UNIQUE,
                    original_query TEXT,
                    intent TEXT,
                    category TEXT,
                    mode TEXT DEFAULT 'Auto Detect',
                    total_raw INTEGER DEFAULT 0,
                    total_accepted INTEGER DEFAULT 0,
                    total_rejected INTEGER DEFAULT 0,
                    total_duplicates INTEGER DEFAULT 0,
                    total_merged INTEGER DEFAULT 0,
                    total_masters INTEGER DEFAULT 0,
                    total_variants INTEGER DEFAULT 0,
                    total_offers INTEGER DEFAULT 0,
                    runtime_seconds REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 40. Pipeline Raw Listings Table (v3.2)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pipeline_raw_listings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_uuid TEXT,
                    vendor_name TEXT,
                    original_title TEXT,
                    image_url TEXT,
                    price REAL,
                    url TEXT,
                    category TEXT,
                    status TEXT DEFAULT 'Accepted',
                    confidence REAL DEFAULT 98.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 41. Pipeline Rejection Logs Table (v3.2)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pipeline_rejection_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_uuid TEXT,
                    vendor_name TEXT,
                    product_title TEXT,
                    rejection_reason TEXT,
                    expected_val TEXT,
                    found_val TEXT,
                    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 42. Pipeline Product Events Table (v3.2)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pipeline_product_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    event_name TEXT,
                    event_details TEXT,
                    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            logger.info("Database initialized with v2.1 enterprise constraints.")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")

db_manager = DatabaseManager()
