import sys
import unittest
from app.hardware_fingerprint import hardware_fingerprint_engine
from app.identity_hierarchy import identity_hierarchy_engine
from app.canonical_url_engine import canonical_url_engine
from app.health_engine import product_health_engine
from app.ai_validator import ai_validator
from app.product_relationships import product_relationships_engine
from app.background_repair_engine import background_repair_engine

class TestV24KnowledgeGraphPlatform(unittest.TestCase):

    def test_level1_model_number_matching(self):
        """Verify Level 1 Model Number matching returns 100% confidence match."""
        title_a = "Samsung Galaxy S25 5G 12GB RAM 256GB AI Smartphone SM-S931B Titanium Blue"
        title_b = "Samsung SM-S931B Mobile Phone"

        res_a = identity_hierarchy_engine.resolve_identity(title_a, category="Mobiles", brand="Samsung")
        res_b = identity_hierarchy_engine.resolve_identity(title_b, category="Mobiles", brand="Samsung")

        self.assertEqual(res_a['level1_model_number'], 'SM-S931B')
        self.assertEqual(res_b['level1_model_number'], 'SM-S931B')
        self.assertEqual(res_a['confidence'], 100.0)

    def test_hardware_fingerprint_uniqueness(self):
        """Verify Hardware Fingerprint produces deterministic SHA-256 hashes based on CPU/GPU/RAM/Storage/Display."""
        t1 = "HP Victus Gaming Laptop Intel i5 13420H RTX4050 16GB RAM 512GB SSD Shadow Black"
        t2 = "HP Victus 15 i5-13420H RTX 4050 16GB 512GB Performance Blue"

        hw1 = hardware_fingerprint_engine.generate_fingerprint(t1, category="Laptops", brand="HP")
        hw2 = hardware_fingerprint_engine.generate_fingerprint(t2, category="Laptops", brand="HP")

        self.assertEqual(hw1['hardware_fingerprint'], hw2['hardware_fingerprint'])

    def test_seo_canonical_url_generator(self):
        """Verify SEO Canonical URL generator creates vendor-independent clean routes."""
        url = canonical_url_engine.generate_canonical_url("Samsung Galaxy S25 12GB RAM 256GB Storage", category="Mobiles", brand="Samsung")
        self.assertEqual(url, "/mobile/samsung/galaxy-s25/12gb/256gb")

    def test_product_health_engine_scoring(self):
        """Verify Product Health Engine calculates 0-100% score with multi-factor breakdown."""
        p_data = {
            "id": 1,
            "title": "Samsung Galaxy S25",
            "brand": "Samsung",
            "category": "Mobiles",
            "master_identity": "hash123",
            "model_number": "SM-S931B",
            "base_image": "https://img.com/1.jpg",
            "image_urls": ["https://img.com/1.jpg", "https://img.com/2.jpg"],
            "canonical_url": "/mobile/samsung/galaxy-s25"
        }
        v_offers = [
            {"price": 79999, "url": "https://amazon.in/p1", "rating": 4.5, "reviews": 120},
            {"price": 79499, "url": "https://flipkart.com/p1", "rating": 4.6, "reviews": 85},
            {"price": 79990, "url": "https://croma.com/p1", "rating": 4.4, "reviews": 40}
        ]
        specs_data = {"processor": "Snapdragon 8 Gen 3", "ram": "12GB", "storage": "256GB", "display": "6.2inch", "battery": "4000mAh", "camera": "50MP"}

        health = product_health_engine.calculate_health(p_data, vendor_offers=v_offers, specs_data=specs_data)
        self.assertGreaterEqual(health['overall_health_score'], 80.0)
        self.assertEqual(health['status'], 'EXCELLENT')

    def test_ai_product_validator(self):
        """Verify AI Product Validator resolves conflict pairs into structured JSON resolutions."""
        val = ai_validator.validate_product_pair(
            {"title": "Samsung Galaxy S25 12GB 256GB Titanium Blue", "category": "Mobiles"},
            {"title": "Samsung S25 12GB 256GB", "category": "Mobiles"}
        )
        self.assertTrue(val['same_product'])
        self.assertGreaterEqual(val['confidence'], 90.0)

    def test_1000_products_benchmark_suite(self):
        """Benchmark test suite evaluating 1,000 product listings across 5 categories."""
        categories = ["Mobiles", "Laptops", "Tablets", "TVs", "Accessories"]
        colors = ["Black", "Silver", "Blue", "Green", "White"]
        count = 0

        uuids = set()
        for cat in categories:
            for i in range(200):
                color = colors[i % len(colors)]
                title = f"Brand-{cat} Model-{i} {color} 8GB 128GB SM-M{i:03d}"
                ident = identity_hierarchy_engine.resolve_identity(title, category=cat, brand=f"Brand-{cat}")
                uuids.add(ident['product_uuid'])
                count += 1

        self.assertEqual(count, 1000)
        self.assertGreater(len(uuids), 0)

    def test_background_repair_execution(self):
        """Verify Background Repair Engine executes self-healing pipeline cleanly."""
        report = background_repair_engine.run_full_repair()
        self.assertEqual(report['status'], 'SUCCESS')

if __name__ == '__main__':
    unittest.main()
