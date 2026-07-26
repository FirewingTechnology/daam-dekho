import unittest
from admin_app.run_admin import app

class TestV32PipelineProgressObservability(unittest.TestCase):

    def test_status_endpoint_telemetry_structure(self):
        """Verify /api/status returns live process telemetry keys."""
        client = app.test_client()
        res = client.get('/api/status')
        data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertIn('running', data)
        self.assertIn('state', data)

        st = data['state']
        self.assertIn('runtime_sec', st)
        self.assertIn('runtime_formatted', st)
        self.assertIn('products_found', st)
        self.assertIn('imported_products', st)
        self.assertIn('memory_mb', st)

    def test_progress_endpoint_alias(self):
        """Verify /api/scraper/progress alias endpoint works identically."""
        client = app.test_client()
        res = client.get('/api/scraper/progress')
        data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertIn('state', data)

if __name__ == '__main__':
    unittest.main()
