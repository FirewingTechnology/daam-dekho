import unittest
import os
import sys

# Ensure root import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.telemetry_manager import telemetry_manager

class TestTelemetrySync(unittest.TestCase):

    def test_01_telemetry_manager_initial_state(self):
        telemetry_manager.reset(job_type="Unit Test Job")
        st = telemetry_manager.get_telemetry()
        self.assertEqual(st["job_type"], "Unit Test Job")
        self.assertEqual(st["imported_products"], 0)
        self.assertEqual(st["master_products"], 0)

    def test_02_telemetry_manager_metric_updates(self):
        telemetry_manager.update_metrics({
            "pages_crawled": 5,
            "products_found": 50,
            "imported_products": 10,
            "products_updated": 25,
            "hardware_models": 8
        })
        st = telemetry_manager.get_telemetry()

        self.assertEqual(st["pages_crawled"], 5)
        self.assertEqual(st["pages_scraped"], 5)
        self.assertEqual(st["imported_products"], 10)
        self.assertEqual(st["master_products"], 10)
        self.assertEqual(st["products_updated"], 25)
        self.assertEqual(st["vendor_offers"], 25)
        self.assertEqual(st["hardware_models"], 8)
        self.assertEqual(st["unique_hardware_models"], 8)

if __name__ == "__main__":
    unittest.main()
