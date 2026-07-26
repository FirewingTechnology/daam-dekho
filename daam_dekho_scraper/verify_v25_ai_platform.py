import unittest
from app.ai_spec_enrichment import ai_spec_enrichment
from app.ai_conflict_detector import ai_conflict_detector
from app.ai_summary_engine import ai_summary_engine
from app.ai_alternatives_engine import ai_alternatives_engine
from app.ai_accessory_graph import ai_accessory_graph
from app.ai_successor_graph import ai_successor_graph
from app.ai_image_engine import ai_image_engine
from app.ai_price_intelligence import ai_price_intelligence
from app.ai_buying_recommendation import ai_buying_recommendation
from app.ai_scorecard_engine import ai_scorecard_engine
from app.ai_self_improvement import ai_self_improvement
from app.ai_product_agent import ai_product_agent

class TestV25AIProductIntelligencePlatform(unittest.TestCase):

    def setUp(self):
        from app.database.manager import db_manager
        conn = db_manager.get_connection()
        c = conn.cursor()
        c.execute("INSERT OR IGNORE INTO products_master (id, title, brand, category, canonical_title) VALUES (1, 'Samsung Galaxy S25 5G', 'Samsung', 'Mobiles', 'Samsung Galaxy S25 (12GB RAM, 256GB Storage)')")
        conn.commit()
        conn.close()

        self.sample_product = {
            "id": 1,
            "title": "Samsung Galaxy S25 5G 12GB RAM 256GB Storage",
            "canonical_title": "Samsung Galaxy S25 (12GB RAM, 256GB Storage)",
            "brand": "Samsung",
            "category": "Mobiles",
            "price": 79999
        }
        self.sample_offers = [
            {"vendor": "Amazon", "vendor_name": "Amazon", "title": "Samsung Galaxy S25 12GB RAM 256GB 5000mAh", "price": 79999, "image_url": "https://img.com/a.jpg"},
            {"vendor": "Flipkart", "vendor_name": "Flipkart", "title": "Samsung S25 12GB 256GB 5100mAh", "price": 78999, "image_url": "https://img.com/f.jpg"}
        ]
        self.sample_specs = {"ram": "12GB", "storage": "256GB", "processor": "Snapdragon 8 Gen 3"}

    def test_module1_spec_enrichment(self):
        res = ai_spec_enrichment.enrich_product_specs(self.sample_product, vendor_offers=self.sample_offers, existing_specs={})
        self.assertIn("confidence", res)
        self.assertEqual(res['version'], "v2.5")

    def test_module2_conflict_detector(self):
        res = ai_conflict_detector.detect_conflicts(1, vendor_offers=self.sample_offers)
        self.assertTrue(res['has_conflicts'])
        self.assertEqual(len(res['conflicts']), 1)

    def test_module3_summary_engine(self):
        res = ai_summary_engine.generate_summary(self.sample_product, specs=self.sample_specs)
        self.assertIn("Samsung Galaxy S25", res['short_summary'])
        self.assertEqual(res['confidence'], 95.0)

    def test_module4_alternatives_engine(self):
        candidates = [
            {"id": 2, "title": "Samsung Galaxy S24", "brand": "Samsung", "price": 64999},
            {"id": 3, "title": "Apple iPhone 16 Pro", "brand": "Apple", "price": 119900}
        ]
        res = ai_alternatives_engine.discover_alternatives(self.sample_product, catalog_candidates=candidates)
        self.assertGreaterEqual(len(res['cheaper_alternatives']), 1)

    def test_module5_accessory_graph(self):
        res = ai_accessory_graph.discover_accessories(self.sample_product)
        self.assertIn("compatible_chargers", res['accessory_graph'])

    def test_module6_successor_graph(self):
        candidates = [
            {"id": 2, "title": "Samsung Galaxy S24", "brand": "Samsung"},
            {"id": 3, "title": "Samsung Galaxy S26", "brand": "Samsung"}
        ]
        res = ai_successor_graph.detect_lineage(self.sample_product, candidate_products=candidates)
        self.assertIsNotNone(res['predecessor'])

    def test_module7_image_ai(self):
        res = ai_image_engine.evaluate_images(self.sample_product, vendor_offers=self.sample_offers)
        self.assertTrue(res['hero_image'].startswith("http"))

    def test_module8_price_intelligence(self):
        res = ai_price_intelligence.analyze_pricing(self.sample_product, vendor_offers=self.sample_offers)
        self.assertEqual(res['current_best_price'], 78999)

    def test_module9_buying_recommendation(self):
        res = ai_buying_recommendation.generate_recommendation(self.sample_product, vendor_offers=self.sample_offers)
        self.assertEqual(res['best_vendor_today'], "Flipkart")
        self.assertEqual(res['recommendation_action'], "BUY_NOW")

    def test_module10_product_scorecard(self):
        res = ai_scorecard_engine.calculate_scorecard(self.sample_product, specs=self.sample_specs)
        self.assertGreaterEqual(res['overall_ai_score'], 80.0)

    def test_module11_self_improvement(self):
        res = ai_self_improvement.run_nightly_improvement()
        self.assertEqual(res['status'], "SUCCESS")

    def test_master_ai_product_agent(self):
        res = ai_product_agent.analyze_and_enrich_product(1)
        self.assertEqual(res['status'], "AI_ENRICHED")

if __name__ == '__main__':
    unittest.main()
