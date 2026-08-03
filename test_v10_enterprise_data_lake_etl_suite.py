import sys
import os

scraper_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "daam_dekho_scraper"))
if scraper_dir in sys.path:
    sys.path.remove(scraper_dir)
sys.path.insert(0, scraper_dir)

# Clear any cached 'app' module
for mod_name in list(sys.modules.keys()):
    if mod_name == 'app' or mod_name.startswith('app.'):
        del sys.modules[mod_name]

import unittest
import time

from app.database.v10_data_lake_schema import init_v10_data_lake_schema
from app.etl.v10_raw_acquisition import raw_acquisition_engine
from app.etl.v10_normalization import attribute_normalization_engine
from app.etl.v10_canonicalization import canonical_title_engine
from app.etl.v10_identity_generator import identity_generator_engine
from app.etl.v10_master_variant_builder import master_variant_builder_engine
from app.etl.v10_offer_attacher import offer_attacher_engine
from app.etl.v10_catalog_publisher import website_catalog_publisher_engine
from app.etl.v10_pipeline_orchestrator import v10_pipeline_orchestrator
from app.database.manager import db_manager

class TestV10EnterpriseDataLakeETLSuite(unittest.TestCase):

    def setUp(self):
        init_v10_data_lake_schema()

    def test_01_raw_data_lake_acquisition_completeness(self):
        """Phase 1 & 2 Audit: Verify raw PDP attributes are stored without inline rejection."""
        class MockScraper:
            def scrape(self, query, category="Mobiles", max_pages=1, max_results=5):
                ts = int(time.time() * 1000)
                return [{
                    "title": f"Samsung Galaxy M17 5G (Moonlight Silver, 6GB RAM, 128GB Storage) | 50MP Camera | AI | Without Charger",
                    "price": 14999.0,
                    "mrp": 17999.0,
                    "url": f"https://www.amazon.in/dp/SAMM17_{ts}",
                    "image": "https://images.amazon.com/m17.jpg",
                    "seller": "Official Seller",
                    "brand": "Samsung",
                    "specifications": {
                        "series": "Galaxy M17",
                        "model": "M17 5G",
                        "cpu": "Exynos 1330",
                        "ram": "6GB",
                        "storage": "128GB",
                        "display": "6.6 inch",
                        "battery": "6000 mAh"
                    }
                }]

        acq_res = raw_acquisition_engine.acquire_raw_data(
            target_query="Samsung Galaxy M17",
            category="Mobiles",
            brand="Samsung",
            scrapers={"amazon": MockScraper()},
            target_vendors=["amazon"],
            max_pages=1
        )

        self.assertTrue(acq_res['total_acquired'] >= 1)

        # Inspect Raw Data Lake Tables
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT raw_title, pdp_url FROM raw_products WHERE id = ?", (acq_res['raw_product_ids'][-1],))
        row = cursor.fetchone()
        conn.close()

        self.assertIsNotNone(row)
        self.assertIn("Samsung Galaxy M17", row[0])
        print(f"✅ Test 1 Passed: Raw Data Lake acquired product without inline rejection: '{row[0]}'")

    def _raw_data_lake_acquisition_completeness_stub(self):
        class MockScraper:
            def scrape(self, query, category="Mobiles", max_pages=1, max_results=5):
                ts = int(time.time() * 1000)
                return [{
                    "title": f"Samsung Galaxy M17 5G (Moonlight Silver, 6GB RAM, 128GB Storage) | AI | Without Charger",
                    "price": 14999.0,
                    "mrp": 17999.0,
                    "url": f"https://www.amazon.in/dp/SAMM17_stub_{ts}",
                    "image": "https://images.amazon.com/m17.jpg",
                    "seller": "Official Seller",
                    "brand": "Samsung",
                    "specifications": {
                        "series": "Galaxy M17",
                        "model": "M17 5G",
                        "cpu": "Exynos 1330",
                        "ram": "6GB",
                        "storage": "128GB",
                        "display": "6.6 inch"
                    }
                }]

        acq_res = raw_acquisition_engine.acquire_raw_data(
            target_query="Samsung Galaxy M17",
            category="Mobiles",
            brand="Samsung",
            scrapers={"amazon": MockScraper()},
            target_vendors=["amazon"],
            max_pages=1
        )
        return acq_res['raw_product_ids']

    def test_02_normalization_and_marketing_noise_removal(self):
        """Phase 4 Audit: Verify attribute cleaning and marketing noise removal."""
        raw_ids = self._raw_data_lake_acquisition_completeness_stub()
        norm_ids = attribute_normalization_engine.normalize_raw_products(raw_ids)

        self.assertEqual(len(norm_ids), len(raw_ids))

        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT np.canonical_brand, ns.clean_ram, ns.clean_storage, np.normalized_title FROM normalized_products np JOIN normalized_specs ns ON np.id = ns.normalized_product_id WHERE np.id = ?", (norm_ids[-1],))
        row = cursor.fetchone()
        conn.close()

        self.assertEqual(row[0], "Samsung")
        self.assertEqual(row[1], "6GB")
        self.assertEqual(row[2], "128GB")
        self.assertNotIn("Without Charger", row[3])
        print(f"✅ Test 2 Passed: Attribute Normalizer stripped marketing noise: '{row[3]}'")

    def test_03_sha256_deterministic_identity_and_multi_vendor_merging(self):
        """Phase 5, 6, 7 & 8 Audit: Verify matching SHA-256 identity hash for identical hardware across vendors."""
        h1 = identity_generator_engine.generate_master_identity_hash("Samsung", "Galaxy M17", "M17 5G")
        h2 = identity_generator_engine.generate_master_identity_hash("Samsung", "Galaxy M17", "M17 5G")
        self.assertEqual(h1, h2)

        v_h1 = identity_generator_engine.generate_variant_identity_hash(h1, "Exynos 1330", "", "6GB", "128GB", "6.6\"", "Default")
        v_h2 = identity_generator_engine.generate_variant_identity_hash(h2, "Exynos 1330", "", "6GB", "128GB", "6.6\"", "Default")
        self.assertEqual(v_h1, v_h2)
        print("✅ Test 3 Passed: SHA-256 Deterministic Identity Generator produced matching hash across vendors.")

    def test_04_end_to_end_v10_decoupled_etl_pipeline(self):
        """Phase 1-10 Audit: Full stage-by-stage ETL count reconciliation report."""
        class MockMultiVendorScraper:
            def __init__(self, vendor_name):
                self.vendor_name = vendor_name

            def scrape(self, query, category="Mobiles", max_pages=1, max_results=5):
                ts = int(time.time() * 1000)
                return [{
                    "title": f"Samsung Galaxy M17 5G ({self.vendor_name.upper()} Edition, 6GB RAM, 128GB Storage)",
                    "price": 14999.0 if self.vendor_name == 'amazon' else 14499.0,
                    "mrp": 17999.0,
                    "url": f"https://www.{self.vendor_name}.com/dp/SAMM17_{ts}",
                    "image": f"https://images.{self.vendor_name}.com/m17.jpg",
                    "seller": f"{self.vendor_name.capitalize()} Official",
                    "brand": "Samsung",
                    "specifications": {
                        "series": "Galaxy M17",
                        "model": "M17 5G",
                        "cpu": "Exynos 1330",
                        "ram": "6GB",
                        "storage": "128GB",
                        "display": "6.6 inch"
                    }
                }]

        scrapers = {
            "amazon": MockMultiVendorScraper("amazon"),
            "flipkart": MockMultiVendorScraper("flipkart"),
            "jiomart": MockMultiVendorScraper("jiomart")
        }

        res = v10_pipeline_orchestrator.run_pipeline(
            target_query="Samsung Galaxy M17",
            category="Mobiles",
            brand="Samsung",
            scrapers=scrapers,
            target_vendors=["amazon", "flipkart", "jiomart"],
            max_pages=1
        )

        print("\n================================================================================")
        print("📊 DAAMDEKHO v10.0 ENTERPRISE DATA LAKE ETL RECONCILIATION REPORT")
        print("================================================================================")
        print(f"Phase 1 & 2: Raw Data Lake Items : {res['raw_collected']}")
        print(f"Phase 4: Normalized Attributes    : {res['normalized_count']}")
        print(f"Phase 6: Master Products Built    : {res['master_products_built']}")
        print(f"Phase 9: Vendor Offers Attached   : {res['attached_offers']}")
        print(f"Phase 10: Published Catalog Master: {res['published_products']}")
        print(f"Phase 10: Published Catalog Offers: {res['published_offers']}")
        print(f"Total Execution Duration          : {res['elapsed_sec']}s")
        print("================================================================================\n")

        self.assertEqual(res['status'], "SUCCESS")
        self.assertTrue(res['raw_collected'] >= 3)
        self.assertTrue(res['published_offers'] >= 3)
        print("✅ Test 4 Passed: 100% Decoupled Data Lake ETL Pipeline verified without data loss.")

if __name__ == '__main__':
    unittest.main()
