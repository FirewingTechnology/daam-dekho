import unittest
import os
import sys

# Ensure root import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.crawl_session_manager import crawl_session_manager
from app.candidate_cache import candidate_cache
from app.crawl_queue_manager import crawl_queue_manager
from app.pdp_verifier import pdp_verifier
from app.catalog_completeness import catalog_completeness_engine
from app.crawl_resume_engine import crawl_resume_engine
from app.intelligent_stop_engine import intelligent_stop_engine
from app.category_identity import category_identity_engine

class TestDaamDekhoV50DistributedCrawler(unittest.TestCase):

    def test_01_session_manager_and_resume_tokens(self):
        sess = crawl_session_manager.create_session("BRAND_CATALOG", brand="Samsung", category="Mobiles")
        self.assertIsNotNone(sess["session_uuid"])
        self.assertTrue(sess["resume_token"].startswith("TOKEN-"))
        
        fetched = crawl_session_manager.get_session(sess["session_uuid"])
        self.assertEqual(fetched["brand"], "Samsung")

    def test_02_candidate_cache_deduplication(self):
        import uuid
        test_url = f"https://www.amazon.in/dp/TEST{uuid.uuid4().hex[:8]}?th=1"
        self.assertFalse(candidate_cache.is_seen(test_url))
        candidate_cache.mark_seen(test_url, vendor="amazon")
        self.assertTrue(candidate_cache.is_seen(test_url))


    def test_03_observable_7_stage_crawl_queue(self):
        item = {"title": "Test Phone", "url": "https://www.amazon.in/dp/B0CS5X7K98"}
        crawl_queue_manager.push("candidate", item)
        snap = crawl_queue_manager.get_snapshot()
        self.assertGreaterEqual(snap["candidate_queue"], 1)

    def test_04_pdp_verification_confidence(self):
        valid_item = {
            "title": "Samsung Galaxy S25 Ultra 5G 512GB Titanium Black",
            "url": "https://www.amazon.in/dp/B0CS5X7K98",
            "price": 129999,
            "image_urls": ["https://m.media-amazon.com/images/I/71R1u9L.jpg"],
            "brand": "Samsung",
            "model": "S25 Ultra"
        }
        is_val, conf, reason = pdp_verifier.verify_candidate(valid_item)
        self.assertTrue(is_val)
        self.assertGreaterEqual(conf, 95.0)

    def test_05_catalog_completeness_and_heatmap(self):
        report = catalog_completeness_engine.get_completeness_report("Samsung", "Mobiles")
        self.assertIn("heatmap_matrix", report)
        self.assertIn("amazon", report["heatmap_matrix"])
        self.assertIn("color_code", report["heatmap_matrix"]["amazon"])

    def test_06_resume_engine_token_recovery(self):
        sess = crawl_session_manager.create_session("EXACT_PRODUCT", brand="Apple", category="Mobiles")
        res = crawl_resume_engine.resume_from_token(sess["resume_token"])
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["session_uuid"], sess["session_uuid"])

    def test_07_intelligent_stop_rules(self):
        stop, reason = intelligent_stop_engine.should_stop(current_page=3, max_pages=3, items_found=10, duplicate_count=0)
        self.assertTrue(stop)
        self.assertIn("Maximum pages limit reached", reason)

    def test_08_hardware_boundary_non_over_consolidation(self):
        id_16 = category_identity_engine.build_identities("Realme 16 5G 8GB 128GB", category="Mobiles", brand="Realme")
        id_16pro = category_identity_engine.build_identities("Realme 16 Pro 5G 8GB 128GB", category="Mobiles", brand="Realme")
        self.assertNotEqual(id_16["master_identity_hash"], id_16pro["master_identity_hash"])

if __name__ == "__main__":
    unittest.main()
