import unittest
import os
import sys

# Ensure root import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.category_identity import category_identity_engine
from app.canonical_title_generator import canonical_title_generator
from app.identity_debugger import identity_debugger
from app.entity_extractor import entity_extractor

class TestDaamDekhoV51HardwareMatching(unittest.TestCase):

    def test_01_multi_vendor_title_hardware_identity_unification(self):
        """Verify identical hardware across 5 vendors with different titles produces identical hardware identity."""
        flipkart_title = "vivo T5x 5G (Star Silver, 8GB RAM, 256GB Storage)"
        amazon_title = "Vivo T5x 5G Smartphone with 8GB RAM 256GB ROM"
        croma_title = "Vivo T5x 5G Mobile (8GB, 256GB)"
        jiomart_title = "Vivo T5x 5G Smartphone (8GB RAM, 256GB Storage)"
        vijaysales_title = "Vivo T5x 5G 8GB RAM 256GB Storage"

        id_fk = category_identity_engine.build_identities(flipkart_title, category="Mobiles", brand="Vivo")
        id_az = category_identity_engine.build_identities(amazon_title, category="Mobiles", brand="Vivo")
        id_cr = category_identity_engine.build_identities(croma_title, category="Mobiles", brand="Vivo")
        id_jm = category_identity_engine.build_identities(jiomart_title, category="Mobiles", brand="Vivo")
        id_vs = category_identity_engine.build_identities(vijaysales_title, category="Mobiles", brand="Vivo")

        # Master identity hash excludes color & promotional words
        self.assertEqual(id_fk["master_identity_hash"], id_az["master_identity_hash"])
        self.assertEqual(id_az["master_identity_hash"], id_cr["master_identity_hash"])
        self.assertEqual(id_cr["master_identity_hash"], id_jm["master_identity_hash"])
        self.assertEqual(id_jm["master_identity_hash"], id_vs["master_identity_hash"])

    def test_02_canonical_display_title_generation(self):
        """Verify clean vendor-independent display titles are generated."""
        amazon_title = "Vivo T5x 5G Smartphone with 8GB RAM 256GB ROM Star Silver"
        entities = entity_extractor.extract_all(amazon_title, category="Mobiles")
        canon_title = canonical_title_generator.generate_canonical_title(entities, category="Mobiles")

        self.assertIn("vivo t5x 5g", canon_title.lower())
        self.assertIn("8GB RAM", canon_title)
        self.assertIn("256GB Storage", canon_title)
        self.assertNotIn("Smartphone", canon_title)
        self.assertNotIn("ROM", canon_title)
        self.assertNotIn("Star Silver", canon_title)  # Color belongs to variant, not master title


    def test_03_strict_hardware_boundaries(self):
        """Verify different models, storage, or RAM never merge."""
        realme_16 = category_identity_engine.build_identities("Realme 16 5G 8GB 128GB", category="Mobiles")
        realme_16pro = category_identity_engine.build_identities("Realme 16 Pro 5G 8GB 128GB", category="Mobiles")
        self.assertNotEqual(realme_16["master_identity_hash"], realme_16pro["master_identity_hash"])

        t5x_128 = category_identity_engine.build_identities("Vivo T5x 5G 8GB 128GB", category="Mobiles")
        t5x_256 = category_identity_engine.build_identities("Vivo T5x 5G 8GB 256GB", category="Mobiles")
        self.assertNotEqual(t5x_128["master_identity_hash"], t5x_256["master_identity_hash"])

        t5x_8ram = category_identity_engine.build_identities("Vivo T5x 5G 8GB 256GB", category="Mobiles")
        t5x_12ram = category_identity_engine.build_identities("Vivo T5x 5G 12GB 256GB", category="Mobiles")
        self.assertNotEqual(t5x_8ram["master_identity_hash"], t5x_12ram["master_identity_hash"])

    def test_04_color_variations_always_merge(self):
        """Verify color variations under identical hardware merge under the same master product."""
        silver = category_identity_engine.build_identities("Vivo T5x 5G (Star Silver, 8GB RAM, 256GB Storage)", category="Mobiles")
        black = category_identity_engine.build_identities("Vivo T5x 5G (Midnight Black, 8GB RAM, 256GB Storage)", category="Mobiles")

        self.assertEqual(silver["master_identity_hash"], black["master_identity_hash"])
        self.assertNotEqual(silver["variant_identity_hash"], black["variant_identity_hash"])

    def test_05_identity_debugger_lineage(self):
        """Verify Identity Debugger outputs full 10-stage decision tree."""
        debug = identity_debugger.debug_offer("Vivo T5x 5G Smartphone with 8GB RAM 256GB ROM Star Silver")

        self.assertEqual(debug["original_vendor_title"], "Vivo T5x 5G Smartphone with 8GB RAM 256GB ROM Star Silver")
        self.assertEqual(debug["merge_decision"], "MERGE_APPROVED")
        self.assertIn("canonical_identity", debug)
        self.assertIn("hardware_identity", debug)
        self.assertIn("canonical_display_title", debug)

if __name__ == "__main__":
    unittest.main()
