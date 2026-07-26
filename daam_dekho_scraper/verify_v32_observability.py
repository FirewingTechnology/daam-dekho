import unittest
from app.pipeline_observability import pipeline_observability
from app.product_lineage_engine import product_lineage_engine
from app.enterprise_analytics_engine import enterprise_analytics_engine

class TestV32EnterpriseObservability(unittest.TestCase):

    def test_session_and_discovery_funnel(self):
        """Verify scrape session recording and discovery funnel metrics."""
        sess_uuid = pipeline_observability.record_session("Samsung Galaxy S25 Ultra")
        self.assertTrue(sess_uuid.startswith("SESS-"))

        funnel = pipeline_observability.get_discovery_funnel(sess_uuid)
        self.assertGreater(funnel['raw_listings'], 0)
        self.assertGreater(funnel['master_products'], 0)

    def test_vendor_breakdown_matrix(self):
        """Verify per-vendor breakdown stats across 5 vendors."""
        vb = pipeline_observability.get_vendor_breakdown()
        self.assertEqual(len(vb), 5)
        vendor_names = [v['vendor_name'] for v in vb]
        self.assertIn("Amazon", vendor_names)
        self.assertIn("Flipkart", vendor_names)

    def test_product_lineage_and_hierarchy(self):
        """Verify end-to-end product lineage tree generation."""
        lineage = product_lineage_engine.get_product_lineage(30)
        self.assertIn("master_product", lineage)
        self.assertIn("lineage_tree", lineage)
        self.assertLessEqual(lineage['lineage_tree']['distinct_vendors'], 5)

    def test_vendor_coverage_heatmap(self):
        """Verify product vendor coverage matrix ratios <= 5."""
        hm = product_lineage_engine.get_coverage_heatmap()
        self.assertEqual(len(hm['supported_vendors']), 5)
        for row in hm['matrix']:
            self.assertLessEqual(row['coverage_percent'], 100.0)

    def test_product_explainer_and_analytics(self):
        """Verify "Explain This Product" debugger and catalog statistics."""
        exp = product_lineage_engine.explain_product(30)
        self.assertIn("explanation", exp)
        self.assertEqual(exp['confidence'], 99.0)

        stats = enterprise_analytics_engine.get_catalog_statistics()
        self.assertGreater(stats['master_products'], 0)

if __name__ == '__main__':
    unittest.main()
