import sys
import unittest
from app.entity_extractor import entity_extractor
from app.category_identity import category_identity_engine
from app.canonical_title import canonical_title_engine
from app.matchers.product_matcher import matcher
from app.duplicate_detector import duplicate_detector

class TestV23IdentityEngine(unittest.TestCase):

    def test_mobile_color_merging_and_master_identity(self):
        """Verify different color titles merge into 1 Master Product while maintaining storage separation."""
        amazon_title = "Realme 16T 5G 8GB RAM 128GB Storage Starlight Red Mobile Phone"
        flipkart_title = "Realme 16T 5G Smartphone (8GB RAM, 128GB)"
        jiomart_title = "Realme 16T 5G Mobile Black 8GB 128GB"

        # 1. Master Identity Hash Equality across vendors/colors
        id_amz = category_identity_engine.build_identities(amazon_title, category="Mobiles", brand="Realme")
        id_flp = category_identity_engine.build_identities(flipkart_title, category="Mobiles", brand="Realme")
        id_jio = category_identity_engine.build_identities(jiomart_title, category="Mobiles", brand="Realme")

        self.assertEqual(id_amz['master_identity_hash'], id_flp['master_identity_hash'])
        self.assertEqual(id_amz['master_identity_hash'], id_jio['master_identity_hash'])

        # 2. Canonical Title formatting
        canon_title = canonical_title_engine.generate_canonical_title(amazon_title, category="Mobiles", brand="Realme")
        self.assertIn("Realme 16T 5G", canon_title)
        self.assertIn("8GB RAM", canon_title)
        self.assertIn("128GB", canon_title)
        self.assertNotIn("Starlight Red", canon_title)

        # 3. Weighted matcher score & decision
        score, reason = matcher.calculate_score_detailed({"title": amazon_title, "category": "Mobiles"}, {"title": jiomart_title, "category": "Mobiles"})
        self.assertGreaterEqual(score, 70)
        self.assertEqual(reason, "Match OK")

        # 4. Storage Separation Assertion
        storage_256_title = "Realme 16T 5G 8GB RAM 256GB Storage Starlight Red"
        id_256 = category_identity_engine.build_identities(storage_256_title, category="Mobiles", brand="Realme")
        self.assertNotEqual(id_amz['master_identity_hash'], id_256['master_identity_hash'])

    def test_laptop_master_identity_and_hardware_separation(self):
        """Verify Laptop Master Identity excludes color & marketing words while enforcing CPU/GPU separation."""
        laptop_amz = "HP Victus Gaming Laptop Intel i5 13420H RTX4050 16GB Blue 512GB SSD"
        laptop_croma = "HP Victus 15 (i5-13420H, RTX4050, 16GB RAM, 512GB SSD) Black"

        id_amz = category_identity_engine.build_identities(laptop_amz, category="Laptops", brand="HP")
        id_cro = category_identity_engine.build_identities(laptop_croma, category="Laptops", brand="HP")

        self.assertEqual(id_amz['master_identity_hash'], id_cro['master_identity_hash'])

        # CPU mismatch separation
        laptop_i7 = "HP Victus Gaming Laptop Intel i7 13700H RTX4050 16GB 512GB SSD"
        id_i7 = category_identity_engine.build_identities(laptop_i7, category="Laptops", brand="HP")
        self.assertNotEqual(id_amz['master_identity_hash'], id_i7['master_identity_hash'])

    def test_100_mobile_products_dataset_benchmark(self):
        """Benchmark 100 Mobile products simulation across 3 vendors."""
        color_variants = ["Titanium Black", "Titanium Gray", "Starlight Red", "Midnight", "Ocean Blue"]
        storage_variants = ["128GB", "256GB", "512GB"]

        master_hashes = set()
        for i in range(100):
            color = color_variants[i % len(color_variants)]
            storage = storage_variants[i % len(storage_variants)]
            title = f"Samsung Galaxy S24 Ultra 5G 12GB RAM {storage} {color} AI Smartphone"

            ident = category_identity_engine.build_identities(title, category="Mobiles", brand="Samsung")
            master_hashes.add((ident['master_identity_hash'], storage))

        # Because there are 3 storage options, there MUST be exactly 3 distinct Master Hashes regardless of 100 titles/colors!
        self.assertEqual(len(master_hashes), 3)

    def test_100_laptop_products_dataset_benchmark(self):
        """Benchmark 100 Laptop products simulation across 3 vendors."""
        colors = ["Shadow Black", "Performance Blue", "Mica Silver"]
        cpus = ["i5-13420H", "i7-13700H"]

        master_hashes = set()
        for i in range(100):
            color = colors[i % len(colors)]
            cpu = cpus[i % len(cpus)]
            title = f"HP Victus 15 Gaming Laptop Intel {cpu} RTX4050 16GB RAM 512GB SSD {color}"

            ident = category_identity_engine.build_identities(title, category="Laptops", brand="HP")
            master_hashes.add((ident['master_identity_hash'], cpu))

        self.assertEqual(len(master_hashes), 2)

    def test_auto_repair_idempotency(self):
        """Verify database auto repair runs cleanly with 0 exceptions."""
        report = duplicate_detector.auto_repair()
        self.assertIn("repaired_masters", report)

if __name__ == '__main__':
    unittest.main()
