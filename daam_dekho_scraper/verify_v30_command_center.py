import unittest
from app.query_understanding_engine import query_understanding_engine
from app.intent_router import intent_router
from app.query_validator import query_validator
from app.query_preview import query_preview
from app.command_history import command_history
from pipeline import pipeline

class TestV30ScraperCommandCenter(unittest.TestCase):

    def test_query_intent_classification(self):
        """Verify query intent classification for all 5 intent types."""
        cases = [
            ("Samsung Galaxy S25 Ultra", "EXACT_PRODUCT"),
            ("vivo all mobiles", "BRAND_DISCOVERY"),
            ("gaming laptops", "CATEGORY_DISCOVERY"),
            ("boat earbuds", "BRAND_CATEGORY_DISCOVERY"),
            ("realme mobiles under 20000", "FILTERED_DISCOVERY")
        ]

        for q, expected_intent in cases:
            res = query_understanding_engine.parse_query(q)
            self.assertEqual(res['intent'], expected_intent, f"Query '{q}' should be classified as '{expected_intent}' but got '{res['intent']}'")

    def test_intent_routing_execution(self):
        """Verify Intent Router executes matching specialized pipeline for each intent."""
        res1 = intent_router.route_and_execute("Samsung Galaxy S25 Ultra")
        self.assertEqual(res1['pipeline'], "PRODUCT_DISCOVERY_PIPELINE")

        res2 = intent_router.route_and_execute("vivo all mobiles")
        self.assertEqual(res2['pipeline'], "BRAND_DISCOVERY_PIPELINE")

        res3 = intent_router.route_and_execute("gaming laptops")
        self.assertEqual(res3['pipeline'], "CATEGORY_DISCOVERY_PIPELINE")

        res4 = intent_router.route_and_execute("realme mobiles under 20000")
        self.assertEqual(res4['pipeline'], "FILTERED_DISCOVERY_PIPELINE")

    def test_query_validation_and_suggestions(self):
        """Verify vague query rejection and suggestions."""
        v = query_validator.validate_query("mobile")
        self.assertFalse(v['is_valid'])
        self.assertGreater(len(v['suggested_commands']), 0)

        v_ok = query_validator.validate_query("Samsung Galaxy S25 Ultra")
        self.assertTrue(v_ok['is_valid'])

    def test_query_analysis_preview(self):
        """Verify pre-scraping query analysis preview metadata."""
        prev = query_preview.analyze_query_preview("Samsung Galaxy S25 Ultra")
        self.assertEqual(prev['status'], "APPROVED")
        self.assertEqual(prev['detected_intent'], "EXACT_PRODUCT")
        self.assertEqual(prev['detected_brand'], "Samsung")

    def test_unified_pipeline_runner_and_history(self):
        """Verify unified Command Line runner and command history recording."""
        res = pipeline.run_command("Samsung Galaxy S25 Ultra")
        self.assertEqual(res['status'], "SUCCESS")
        self.assertIn("command_uuid", res)

        hist = command_history.get_history()
        self.assertGreater(len(hist), 0)

if __name__ == '__main__':
    unittest.main()
