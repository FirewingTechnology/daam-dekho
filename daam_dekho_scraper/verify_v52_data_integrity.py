import unittest
import os
import sys

# Ensure root import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.live_pdp_validator import live_pdp_validator
from app.spec_cross_validator import spec_cross_validator
from app.live_price_validator import live_price_validator
from app.url_validator_v52 import url_validator_v52
from app.image_validator_v52 import image_validator_v52
from app.missing_vendor_discovery import missing_vendor_discovery_engine
from app.completeness_trust_score import completeness_trust_score_engine
from app.auto_recovery_engine import auto_recovery_engine

class TestDaamDekhoV52DataIntegrity(unittest.TestCase):

    def test_01_live_pdp_validation(self):
        valid_candidate = {
            "title": "Vivo T5x 5G",
            "url": "https://www.amazon.in/dp/B0CS5X7K98",
            "price": 14999,
            "image_urls": ["https://m.media-amazon.com/images/I/71R1u9L.jpg"],
            "stock_status": "IN_STOCK",
            "vendor": "amazon"
        }
        passed, msg, checks = live_pdp_validator.validate_pdp(valid_candidate)
        self.assertTrue(passed)
        self.assertTrue(checks["buy_button_exists"])

    def test_02_specification_cross_validation(self):
        specs_list = [
            {"vendor": "amazon", "specs": {"ram": "8gb", "storage": "256gb"}},
            {"vendor": "flipkart", "specs": {"ram": "8gb", "storage": "256gb"}},
            {"vendor": "croma", "specs": {"ram": "8gb", "storage": "256gb"}}
        ]
        matrix = spec_cross_validator.validate_specs(specs_list)
        self.assertEqual(matrix["ram"]["status"], "VERIFIED")
        self.assertEqual(matrix["storage"]["status"], "VERIFIED")

    def test_03_live_price_validation_timeline(self):
        res = live_price_validator.validate_and_record_price(vendor_product_id=1, new_price=13999, mrp=17999)
        self.assertEqual(res["status"], "VALIDATED")
        self.assertGreater(res["discount_percent"], 0)

    def test_04_url_validation_and_broken_flag(self):
        valid, msg = url_validator_v52.validate_url("https://www.amazon.in/dp/B0CS5X7K98")
        self.assertTrue(valid)

        invalid, msg = url_validator_v52.validate_url("https://www.amazon.in/sspa/click?url=xyz")
        self.assertFalse(invalid)

    def test_05_image_validation_hero_selection(self):
        imgs = ["https://m.media-amazon.com/images/I/small.jpg", "https://m.media-amazon.com/images/I/71R1u9L._SL1500_.jpg"]
        hero, is_valid, msg = image_validator_v52.validate_and_select_hero(imgs)
        self.assertTrue(is_valid)
        self.assertIn("_SL1500_", hero)

    def test_06_vendor_coverage_and_missing_discovery(self):
        cov = missing_vendor_discovery_engine.audit_product_coverage(1)
        self.assertIn("coverage_pct", cov)
        self.assertIn("missing_vendors", cov)

    def test_07_completeness_and_trust_scores(self):
        score_data = completeness_trust_score_engine.calculate_completeness_score(1)
        self.assertIn("completeness_score", score_data)
        self.assertIn("vendor_trust_scores", score_data)

    def test_08_auto_recovery_engine_processing(self):
        res = auto_recovery_engine.process_pending_recovery_jobs()
        self.assertEqual(res["status"], "SUCCESS")

if __name__ == "__main__":
    unittest.main()
