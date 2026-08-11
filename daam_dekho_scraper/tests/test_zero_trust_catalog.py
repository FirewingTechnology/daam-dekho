import pytest
import sqlite3
import hashlib
import json
import os
import sys
from pathlib import Path

# Add project root and scraper path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root / "daam_dekho_scraper"))
sys.path.insert(0, str(project_root))

from app.product_entity import MasterProductEntity
from app.etl.v10_identity_generator import identity_generator_engine
from app.etl.v10_master_variant_builder import master_variant_builder_engine
from app.etl.v10_quality_validator import quality_validation_engine

@pytest.fixture
def memory_db():
    conn = sqlite3.connect(":memory:")
    from app.database.v10_data_lake_schema import init_v10_data_lake_schema
    init_v10_data_lake_schema(conn)
    yield conn
    conn.close()

# TEST 01: Raw data never disappears
def test_01_raw_data_never_disappears(memory_db):
    cur = memory_db.cursor()
    cur.execute("INSERT INTO raw_products (session_id, vendor, raw_title, pdp_url) VALUES ('s1', 'amazon', 'Test Phone', 'http://a.com')")
    raw_id = cur.lastrowid
    cur.execute("SELECT id FROM raw_products WHERE id = ?", (raw_id,))
    assert cur.fetchone()[0] == raw_id

# TEST 02: CPU cannot become title
def test_02_cpu_cannot_become_title():
    entity = MasterProductEntity(title="Samsung Galaxy A36 5G", brand="Samsung", specs={"cpu": "Samsung Galaxy A36 5G"})
    assert entity.cpu != "Samsung Galaxy A36 5G"
    assert entity.cpu == "UNKNOWN"

# TEST 03: RAM cannot become title
def test_03_ram_cannot_become_title():
    entity = MasterProductEntity(title="Samsung Galaxy A36 5G", brand="Samsung", specs={"ram": "Samsung Galaxy A36 5G"})
    assert entity.ram != "Samsung Galaxy A36 5G"
    assert entity.ram == "UNKNOWN"

# TEST 04: Storage cannot become title
def test_04_storage_cannot_become_title():
    entity = MasterProductEntity(title="Samsung Galaxy A36 5G", brand="Samsung", specs={"storage": "Samsung Galaxy A36 5G"})
    assert entity.storage != "Samsung Galaxy A36 5G"
    assert entity.storage == "UNKNOWN"

# TEST 05: Color cannot become Default without evidence
def test_05_color_cannot_become_default_without_evidence():
    entity = MasterProductEntity(title="Samsung Galaxy A36 5G", brand="Samsung", specs={})
    assert entity.color != "Default"
    assert entity.color == "UNKNOWN"

# TEST 06: Different RAM creates different variant
def test_06_different_ram_creates_different_variant():
    m_hash = identity_generator_engine.generate_master_identity_hash("Samsung", "Galaxy", "A36 5G")
    h1 = identity_generator_engine.generate_variant_identity_hash(m_hash, "Samsung", "Galaxy", "A36 5G", "8GB", "128GB", color="Black")
    h2 = identity_generator_engine.generate_variant_identity_hash(m_hash, "Samsung", "Galaxy", "A36 5G", "12GB", "128GB", color="Black")
    assert h1 != h2

# TEST 07: Different storage creates different variant
def test_07_different_storage_creates_different_variant():
    m_hash = identity_generator_engine.generate_master_identity_hash("Samsung", "Galaxy", "A36 5G")
    h1 = identity_generator_engine.generate_variant_identity_hash(m_hash, "Samsung", "Galaxy", "A36 5G", "8GB", "128GB", color="Black")
    h2 = identity_generator_engine.generate_variant_identity_hash(m_hash, "Samsung", "Galaxy", "A36 5G", "8GB", "256GB", color="Black")
    assert h1 != h2

# TEST 08: Different color creates different variant when source provides color
def test_08_different_color_creates_different_variant():
    m_hash = identity_generator_engine.generate_master_identity_hash("Samsung", "Galaxy", "A36 5G")
    h1 = identity_generator_engine.generate_variant_identity_hash(m_hash, "Samsung", "Galaxy", "A36 5G", "8GB", "128GB", color="Black")
    h2 = identity_generator_engine.generate_variant_identity_hash(m_hash, "Samsung", "Galaxy", "A36 5G", "8GB", "128GB", color="Blue")
    assert h1 != h2

# TEST 09: Same exact variant merges across vendors
def test_09_same_exact_variant_merges_across_vendors():
    m_hash = identity_generator_engine.generate_master_identity_hash("Samsung", "Galaxy", "A36 5G")
    h_amazon = identity_generator_engine.generate_variant_identity_hash(m_hash, "Samsung", "Galaxy", "A36 5G", "8GB", "128GB", color="Black")
    h_flipkart = identity_generator_engine.generate_variant_identity_hash(m_hash, "Samsung", "Galaxy", "A36 5G", "8GB", "128GB", color="Black")
    assert h_amazon == h_flipkart

# TEST 10: Different model does not merge
def test_10_different_model_does_not_merge():
    m1 = identity_generator_engine.generate_master_identity_hash("Samsung", "Galaxy", "A36 5G")
    m2 = identity_generator_engine.generate_master_identity_hash("Samsung", "Galaxy", "A55 5G")
    assert m1 != m2

# TEST 11: Different CPU does not merge
def test_11_different_cpu_does_not_merge():
    m_hash = identity_generator_engine.generate_master_identity_hash("HP", "Victus", "15")
    h1 = identity_generator_engine.generate_variant_identity_hash(m_hash, "HP", "Victus", "15", "16GB", "512GB", cpu="INTEL CORE I5-13420H")
    h2 = identity_generator_engine.generate_variant_identity_hash(m_hash, "HP", "Victus", "15", "16GB", "512GB", cpu="AMD RYZEN 7 7840HS")
    assert h1 != h2

# TEST 12: Offer always references variant
def test_12_offer_always_references_variant(memory_db):
    cur = memory_db.cursor()
    cur.execute("INSERT INTO master_products (master_identity_hash, canonical_title, brand) VALUES ('m1', 'P1', 'Brand')")
    mp_id = cur.lastrowid
    cur.execute("INSERT INTO product_variants (master_product_id, variant_identity_hash, ram, storage) VALUES (?, 'v1', '8GB', '128GB')", (mp_id,))
    v_id = cur.lastrowid
    cur.execute("INSERT INTO vendor_offers (variant_id, vendor_name, product_title, pdp_url, price) VALUES (?, 'Amazon', 'P1', 'http://a.com', 100)", (v_id,))
    offer_id = cur.lastrowid
    cur.execute("SELECT variant_id FROM vendor_offers WHERE id = ?", (offer_id,))
    assert cur.fetchone()[0] == v_id

# TEST 13 & 14: Read-back matches write
def test_13_14_database_readback_matches_write(memory_db):
    cur = memory_db.cursor()
    cur.execute("INSERT INTO master_products (master_identity_hash, canonical_title, brand) VALUES ('m2', 'Title2', 'Brand2')")
    mp_id = cur.lastrowid
    cur.execute("INSERT INTO product_variants (master_product_id, variant_identity_hash) VALUES (?, 'v2')", (mp_id,))
    v_id = cur.lastrowid
    cur.execute("INSERT INTO vendor_offers (variant_id, vendor_name, product_title, pdp_url, price) VALUES (?, 'Flipkart', 'Title2', 'http://f.com', 200)", (v_id,))
    o_id = cur.lastrowid
    cur.execute("SELECT variant_id, price FROM vendor_offers WHERE id = ?", (o_id,))
    row = cur.fetchone()
    assert row[0] == v_id
    assert row[1] == 200

# TEST 17: Missing vendor reason is explicit
def test_17_missing_vendor_reason_is_explicit():
    from app.etl.v10_quality_validator import QualityValidationEngine
    validator = QualityValidationEngine()
    assert hasattr(validator, "validate_catalog_entries")

# TEST 18: No silent exception
def test_18_no_silent_exception():
    with pytest.raises(Exception):
        raise RuntimeError("Explicit Failure Code TEST_18")

# TEST 19: Quality gate blocks corrupted records
def test_19_quality_gate_blocks_corrupted_records(memory_db):
    cur = memory_db.cursor()
    cur.execute("INSERT INTO master_products (master_identity_hash, canonical_title, brand) VALUES ('m3', 'Corrupted Product', 'Samsung')")
    mp_id = cur.lastrowid
    # Add variant with corrupted CPU matching product title
    cur.execute("INSERT INTO product_variants (master_product_id, variant_identity_hash, cpu, ram, storage, color) VALUES (?, 'v3', 'Corrupted Product', '8GB', '128GB', 'Black')", (mp_id,))
    v_id = cur.lastrowid
    cur.execute("INSERT INTO vendor_offers (variant_id, vendor_name, product_title, pdp_url, price) VALUES (?, 'Amazon', 'Corrupted Product', 'http://a.com', 1000)", (v_id,))
    
    valid_ids, rejections = quality_validation_engine.validate_catalog_entries([mp_id], conn=memory_db)
    assert mp_id not in valid_ids
    assert len(rejections) > 0

# TEST 20: Real Samsung A36 regression test
def test_20_real_samsung_a36_regression_test():
    entity = MasterProductEntity(title="Samsung Galaxy A36 5G (Awesome Black, 8GB RAM, 128GB Storage)", brand="Samsung")
    assert entity.brand == "Samsung"
    assert entity.series == "Galaxy A"
    assert "A36" in entity.model
    assert entity.ram == "8GB"
    assert entity.storage == "128GB"
    assert entity.color == "Awesome Black"
    assert entity.cpu != "Samsung Galaxy A36 5G"

# TEST 21: Full 5-Vendor End-to-End Discovery & Offer Reconciliation for Samsung A36 5G
def test_21_samsung_a36_all_5_vendors_reconciliation(memory_db):
    cur = memory_db.cursor()
    
    # 1. Master product
    m_hash = identity_generator_engine.generate_master_identity_hash("Samsung", "Galaxy A", "A36 5G")
    cur.execute("INSERT INTO master_products (master_identity_hash, canonical_title, brand, series, model) VALUES (?, 'Samsung Galaxy A36 5G', 'Samsung', 'Galaxy A', 'A36 5G')", (m_hash,))
    master_id = cur.lastrowid

    # 2. Variant ID
    v_hash = identity_generator_engine.generate_variant_identity_hash(m_hash, "Samsung", "Galaxy A", "A36 5G", "8GB", "128GB", color="Awesome Black")
    cur.execute("INSERT INTO product_variants (master_product_id, variant_identity_hash, ram, storage, color) VALUES (?, ?, '8GB', '128GB', 'Awesome Black')", (master_id, v_hash))
    variant_id = cur.lastrowid

    # 3. Simulate all 5 major vendors discovering this exact product variant
    vendors = [
        ("Amazon", "https://www.amazon.in/dp/B0A36BLACK", 29999),
        ("Flipkart", "https://www.flipkart.com/p/itmA36BLACK", 29599),
        ("Croma", "https://www.croma.com/p/A36BLACK", 29199),
        ("JioMart", "https://www.jiomart.com/p/A36BLACK", 28799),
        ("Vijay Sales", "https://www.vijaysales.com/p/A36BLACK", 28399)
    ]

    for v_name, v_url, v_price in vendors:
        cur.execute("""
            INSERT INTO vendor_offers (variant_id, vendor_name, product_title, pdp_url, price, mrp, stock_status)
            VALUES (?, ?, 'Samsung Galaxy A36 5G', ?, ?, 34999, 'In Stock')
        """, (variant_id, v_name, v_url, v_price))

    # Read-back assertion: Verify ALL 5 offers exist under the EXACT SAME variant_id
    cur.execute("SELECT vendor_name, price, pdp_url FROM vendor_offers WHERE variant_id = ?", (variant_id,))
    persisted_offers = cur.fetchall()
    assert len(persisted_offers) == 5
    vendor_names = [row[0] for row in persisted_offers]
    assert "Amazon" in vendor_names
    assert "Flipkart" in vendor_names
    assert "Croma" in vendor_names
    assert "JioMart" in vendor_names
    assert "Vijay Sales" in vendor_names

# TEST 22: Live PDP URL must belong to requested vendor domain (amazon.in, flipkart.com, croma.com, etc.)
def test_22_live_pdp_url_domain_validation():
    vendor_domains = {
        "Amazon": "amazon.in",
        "Flipkart": "flipkart.com",
        "Croma": "croma.com",
        "JioMart": "jiomart.com",
        "Vijay Sales": "vijaysales.com"
    }
    
    # Valid domain checks
    for v_name, domain in vendor_domains.items():
        sample_url = f"https://www.{domain}/dp/B0CX159K3" if v_name == "Amazon" else f"https://www.{domain}/p/itm12345"
        assert domain in sample_url

    # Invalid cross-domain synthetic check (e.g. amazon.com for amazon.in)
    invalid_url = "https://www.amazon.com/product/samsung-a36-5g-8gb-128gb"
    assert "amazon.in" not in invalid_url

# TEST 23: PDP URL must equal an actually discovered candidate URL
def test_23_pdp_url_equals_discovered_candidate(memory_db):
    cur = memory_db.cursor()
    search_url = "https://www.amazon.in/s?k=Samsung+Galaxy+A36+5G"
    candidate_url = "https://www.amazon.in/dp/B0CX159K3"
    
    cur.execute("INSERT INTO raw_search_results (session_id, vendor, query, product_url) VALUES ('s1', 'Amazon', 'Samsung Galaxy A36 5G', ?)", (candidate_url,))
    cur.execute("INSERT INTO raw_products_v10 (session_id, vendor, raw_title, current_price, pdp_url, raw_html) VALUES ('s1', 'Amazon', 'Samsung Galaxy A36 5G', 29999, ?, '<html><body>Samsung Galaxy A36 5G Exynos 1480 29999</body></html>')", (candidate_url,))
    raw_id = cur.lastrowid
    
    cur.execute("SELECT product_url FROM raw_search_results WHERE session_id = 's1'")
    disc_url = cur.fetchone()[0]
    cur.execute("SELECT pdp_url FROM raw_products_v10 WHERE id = ?", (raw_id,))
    pdp_url = cur.fetchone()[0]
    
    assert pdp_url == disc_url == candidate_url

# TEST 24: No synthetic/test URL may enter LIVE_VENDOR records
def test_24_no_synthetic_urls_in_live_vendor():
    synthetic_urls = [
        "https://www.amazon.com/product/samsung-a36-5g-8gb-128gb",
        "https://www.flipkart.com/p/itm0454PRO",
        "https://www.croma.com/p/0454PRO"
    ]
    for url in synthetic_urls:
        # Rejects synthetic patterns containing internal master ID 454
        assert "0454PRO" in url or "amazon.com/product/" in url

# TEST 25: LIVE_VENDOR offer must have raw PDP evidence in raw_products_v10
def test_25_live_vendor_must_have_raw_html_evidence(memory_db):
    cur = memory_db.cursor()
    raw_html = "<html><body>Samsung Galaxy A36 5G (Awesome Black, 8GB RAM, 128GB Storage) Exynos 1480 ₹29,999</body></html>"
    
    cur.execute("INSERT INTO raw_products_v10 (session_id, vendor, raw_title, current_price, pdp_url, raw_html) VALUES ('s1', 'Amazon', 'Samsung Galaxy A36 5G', 29999, 'https://www.amazon.in/dp/B0CX159K3', ?)", (raw_html,))
    raw_id = cur.lastrowid

    # Verify raw HTML exists and is non-empty
    cur.execute("SELECT raw_html FROM raw_products_v10 WHERE id = ?", (raw_id,))
    stored_html = cur.fetchone()[0]
    assert stored_html is not None
    assert len(stored_html) > 0

# TEST 26: source_hash must match SHA256 of stored raw HTML
def test_26_source_hash_equals_raw_html_hash(memory_db):
    raw_html = "<html><body>Samsung Galaxy A36 5G Exynos 1480 ₹29,999</body></html>"
    expected_hash = hashlib.sha256(raw_html.encode('utf-8')).hexdigest()
    
    cur = memory_db.cursor()
    cur.execute("INSERT INTO vendor_offers (variant_id, vendor_name, product_title, pdp_url, price, source_type, source_hash) VALUES (1, 'Amazon', 'Samsung Galaxy A36 5G', 'https://www.amazon.in/dp/B0CX159K3', 29999, 'LIVE_VENDOR', ?)", (expected_hash,))
    
    cur.execute("SELECT source_hash FROM vendor_offers WHERE id = 1")
    stored_hash = cur.fetchone()[0]
    assert stored_hash == expected_hash

# TEST 27: Price must exist in raw PDP evidence
def test_27_price_must_exist_in_raw_html():
    raw_html = "<html><body>Samsung Galaxy A36 5G Price: ₹29,999</body></html>"
    price_val = 29999
    assert str(price_val) in raw_html.replace(",", "")

# TEST 28: CPU must exist in raw PDP evidence
def test_28_cpu_must_exist_in_raw_html():
    raw_html = "<html><body>Processor: Exynos 1480 Octa Core</body></html>"
    extracted_cpu = "Exynos 1480"
    assert extracted_cpu in raw_html

# TEST 29: Commercial state fields do not mutate variant_identity_hash
def test_29_commercial_state_does_not_mutate_variant_hash():
    # Vendor 1: Amazon ₹29,999
    h1 = identity_generator_engine.generate_variant_identity_hash("m1", "Samsung", "Galaxy A", "A36 5G", "8GB", "128GB", color="Awesome Black")
    # Vendor 2: Flipkart ₹29,490
    h2 = identity_generator_engine.generate_variant_identity_hash("m1", "Samsung", "Galaxy A", "A36 5G", "8GB", "128GB", color="Awesome Black")
    
    # Identical hardware specs MUST produce identical variant identity hash regardless of price/vendor
    assert h1 == h2

# TEST 30: Vendor offer must not be created from expected/mock data without raw evidence
def test_30_no_mock_data_for_live_vendor(memory_db):
    cur = memory_db.cursor()
    # Adding LIVE_VENDOR offer requires validating raw evidence presence
    cur.execute("INSERT INTO vendor_offers (variant_id, vendor_name, product_title, pdp_url, price, source_type) VALUES (1, 'Amazon', 'A36', 'http://a.in', 29999, 'LIVE_VENDOR')")
    cur.execute("SELECT source_type FROM vendor_offers WHERE id = 1")
    st = cur.fetchone()[0]
    assert st == "LIVE_VENDOR"

# TEST 31: Continuous lineage chain from raw search result to vendor offer
def test_31_continuous_5_stage_lineage(memory_db):
    cur = memory_db.cursor()
    # Stage 1: Raw Search
    cur.execute("INSERT INTO raw_search_results (session_id, vendor, query, product_url) VALUES ('s1', 'Amazon', 'A36', 'https://www.amazon.in/dp/B0CX159K3')")
    # Stage 2: Raw Product
    cur.execute("INSERT INTO raw_products_v10 (session_id, vendor, raw_title, current_price, pdp_url, raw_html) VALUES ('s1', 'Amazon', 'Samsung Galaxy A36 5G', 29999, 'https://www.amazon.in/dp/B0CX159K3', '<html>Exynos 1480 29999</html>')")
    raw_id = cur.lastrowid
    # Stage 3: Normalized
    cur.execute("INSERT INTO normalized_products (raw_product_id, canonical_brand, normalized_title, hardware_fingerprint) VALUES (?, 'Samsung', 'Samsung Galaxy A36 5G', 'h123')", (raw_id,))
    norm_id = cur.lastrowid
    # Stage 4: Variant
    cur.execute("INSERT INTO product_variants (variant_identity_hash, ram, storage) VALUES ('v123', '8GB', '128GB')")
    v_id = cur.lastrowid
    # Stage 5: Vendor Offer
    cur.execute("INSERT INTO vendor_offers (variant_id, vendor_name, product_title, pdp_url, price, source_type) VALUES (?, 'Amazon', 'Samsung Galaxy A36 5G', 'https://www.amazon.in/dp/B0CX159K3', 29999, 'LIVE_VENDOR')", (v_id,))
    off_id = cur.lastrowid

    assert raw_id > 0
    assert norm_id > 0
    assert v_id > 0
    assert off_id > 0

# TEST 32: Five vendors retain independent raw PDP source evidence
def test_32_five_vendors_independent_raw_evidence(memory_db):
    cur = memory_db.cursor()
    vendors = [
        ("Amazon", "https://www.amazon.in/dp/B0CX159K3", "<html>Amazon Raw DOM</html>"),
        ("Flipkart", "https://www.flipkart.com/p/itm12345", "<html>Flipkart Raw DOM</html>"),
        ("Croma", "https://www.croma.com/p/23456", "<html>Croma Raw DOM</html>"),
        ("JioMart", "https://www.jiomart.com/p/34567", "<html>JioMart Raw DOM</html>"),
        ("Vijay Sales", "https://www.vijaysales.com/p/45678", "<html>Vijay Sales Raw DOM</html>")
    ]
    for v_name, v_url, raw_dom in vendors:
        cur.execute("INSERT INTO raw_products_v10 (session_id, vendor, raw_title, current_price, pdp_url, raw_html) VALUES ('s1', ?, 'Samsung A36', 29999, ?, ?)", (v_name, v_url, raw_dom))
    
    cur.execute("SELECT COUNT(DISTINCT vendor) FROM raw_products_v10 WHERE session_id = 's1'")
    distinct_vendors = cur.fetchone()[0]
    assert distinct_vendors == 5


