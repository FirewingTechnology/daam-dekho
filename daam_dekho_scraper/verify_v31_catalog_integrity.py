import unittest
import sqlite3
from app.database.manager import db_manager
from admin_app.run_admin import app

class TestV31CatalogIntegrity(unittest.TestCase):

    def test_database_sqlite_integrity(self):
        """Verify SQLite database integrity_check returns OK."""
        conn = db_manager.get_connection()
        c = conn.cursor()
        c.execute("PRAGMA integrity_check;")
        res = c.fetchone()[0]
        conn.close()
        self.assertEqual(res.lower(), "ok")

    def test_vendor_count_never_exceeds_5(self):
        """Verify vendor_count in /api/products never exceeds 5 (Issue 2 fix)."""
        client = app.test_client()
        res = client.get('/api/products')
        data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertIn("products", data)

        for p in data['products']:
            vc = p['vendor_count']
            self.assertLessEqual(vc, 5, f"Product #{p['id']} ('{p['title']}') reported vendor_count = {vc}, which exceeds max 5!")
            self.assertGreaterEqual(vc, 0)

    def test_api_product_counts_consistency(self):
        """Verify API products count matches products_master DB count (Issue 1 fix)."""
        conn = db_manager.get_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM products_master;")
        db_master_count = c.fetchone()[0]
        conn.close()

        client = app.test_client()
        res = client.get('/api/products')
        data = res.get_json()

        self.assertEqual(data['total'], db_master_count, f"API total ({data['total']}) does not match DB master count ({db_master_count})!")

if __name__ == '__main__':
    unittest.main()
