import unittest
from app.hardware_identity_engine import hardware_identity_engine
from app.multi_mode_discovery_engine import multi_mode_discovery_engine

class TestV40MultiModeEngine(unittest.TestCase):

    def test_scenario_1_exact_product(self):
        """Scenario 1: Samsung Galaxy S25 Ultra -> 1 Master Product, 5 Vendors."""
        raw_listings = [
            {"title": "Samsung Galaxy S25 Ultra 5G (Titanium Black, 12GB, 256GB)", "brand": "Samsung", "vendor": "Amazon"},
            {"title": "Samsung S25 Ultra (12GB RAM, 256GB Storage)", "brand": "Samsung", "vendor": "Flipkart"},
            {"title": "Galaxy S25 Ultra Mobile 12GB 256GB", "brand": "Samsung", "vendor": "Croma"},
            {"title": "Samsung Galaxy S25 Ultra Titanium 256GB", "brand": "Samsung", "vendor": "JioMart"},
            {"title": "Samsung SM-S931B S25 Ultra 12GB 256GB", "brand": "Samsung", "vendor": "Vijay Sales"}
        ]

        res = multi_mode_discovery_engine.process_scraped_batch(raw_listings, mode="EXACT_PRODUCT", category="Mobiles", brand="Samsung")
        self.assertEqual(res['master_products_count'], 1, f"Exact product search should yield 1 Master Product, got {res['master_products_count']}")

    def test_scenario_2_brand_catalog_isolation(self):
        """Scenario 2: Realme Mobiles -> Separate Master Products for 16, 16 Pro, 16 Pro+, GT7, GT7T."""
        raw_listings = [
            {"title": "Realme 16 5G (8GB RAM, 128GB)", "brand": "Realme", "vendor": "Amazon"},
            {"title": "Realme 16 5G (8GB, 128GB)", "brand": "Realme", "vendor": "Flipkart"},
            {"title": "Realme 16 Pro 5G (8GB RAM, 128GB)", "brand": "Realme", "vendor": "Amazon"},
            {"title": "Realme 16 Pro+ 5G (12GB RAM, 256GB)", "brand": "Realme", "vendor": "Flipkart"},
            {"title": "Realme GT7 5G (12GB RAM, 256GB)", "brand": "Realme", "vendor": "Amazon"},
            {"title": "Realme GT7T 5G (12GB RAM, 256GB)", "brand": "Realme", "vendor": "JioMart"}
        ]

        res = multi_mode_discovery_engine.process_scraped_batch(raw_listings, mode="BRAND_CATALOG", category="Mobiles", brand="Realme")
        self.assertEqual(res['master_products_count'], 5, f"Realme catalog should yield 5 distinct Master Products, got {res['master_products_count']}")

    def test_scenario_3_hp_laptops_catalog(self):
        """Scenario 3: HP Laptops -> Victus, Omen, Pavilion, Spectre distinct Master Products."""
        raw_listings = [
            {"title": "HP Victus Gaming Laptop Core i5 16GB 512GB RTX4050", "brand": "HP", "vendor": "Amazon"},
            {"title": "HP Omen Gaming Laptop Core i7 16GB 1TB RTX4060", "brand": "HP", "vendor": "Flipkart"},
            {"title": "HP Pavilion Laptop Core i5 8GB 512GB", "brand": "HP", "vendor": "Croma"},
            {"title": "HP Spectre x360 Intel Core i7 16GB 1TB", "brand": "HP", "vendor": "Amazon"}
        ]

        res = multi_mode_discovery_engine.process_scraped_batch(raw_listings, mode="BRAND_CATEGORY", category="Laptops", brand="HP")
        self.assertEqual(res['master_products_count'], 4)

    def test_scenario_4_gpu_no_merge_boundary(self):
        """Scenario 4: RTX4060 vs RTX4050 vs RTX4070 non-merge boundary."""
        ident_4050 = hardware_identity_engine.build_hardware_identity("ASUS ROG Strix RTX4050 16GB 512GB", category="Laptops")
        ident_4060 = hardware_identity_engine.build_hardware_identity("ASUS ROG Strix RTX4060 16GB 512GB", category="Laptops")
        ident_4070 = hardware_identity_engine.build_hardware_identity("ASUS ROG Strix RTX4070 16GB 512GB", category="Laptops")

        can_merge_1, reason_1 = hardware_identity_engine.can_merge(ident_4050, ident_4060)
        self.assertFalse(can_merge_1, "RTX4050 and RTX4060 must NEVER merge!")

        can_merge_2, reason_2 = hardware_identity_engine.can_merge(ident_4060, ident_4070)
        self.assertFalse(can_merge_2, "RTX4060 and RTX4070 must NEVER merge!")

if __name__ == '__main__':
    unittest.main()
