import unittest
from app.query_understanding_engine import query_understanding_engine
from app.query_rewriter import query_rewriter
from app.vendor_query_optimizer import vendor_query_optimizer
from app.search_result_clustering import search_result_clustering
from app.multi_pass_scraping_engine import multi_pass_scraping
from app.search_coverage_score import search_coverage_score
from app.smart_rejection_engine import smart_rejection_engine
from app.discovery_memory import discovery_memory
from app.discovery_playback import discovery_playback
from app.discovery_quality_rules import discovery_quality_rules

class TestV26AutonomousProductDiscoveryPlatform(unittest.TestCase):

    def test_100_products_discovery_benchmark(self):
        """100 Benchmark Product Verification Suite across 8 categories."""
        queries = [
            # Mobiles (20)
            "Samsung S25", "Galaxy S25", "S25", "Samsung flagship", "Samsung phone", "iphone 16",
            "realme 16t", "realme mobile", "Nothing Phone", "OnePlus", "SM-S931B", "A3090",
            "new samsung phone", "vivo V30", "oppo reno", "xiaomi 14", "poco X6", "iqoo 12",
            "motorola edge", "google pixel 8",
            # Laptops (20)
            "gaming laptop", "hp victus", "asus rog", "macbook m4", "lenovo legion", "dell xps",
            "acer nitro", "msi katana", "macbook air", "thinkpad x1", "hp pavilion", "asus tuf",
            "zephyrus g14", "alienware m16", "galaxy book", "inbook x2", "honor magicbook",
            "surface laptop", "chromebook", "rtx 4060 laptop",
            # Laptop Accessories (10)
            "usb-c dock", "laptop stand", "wireless mouse", "laptop sleeve", "65w gan charger",
            "keyboard wireless", "cooling pad", "nvme ssd enclosure", "thunderbolt cable", "webcam 4k",
            # Mobile Accessories (10)
            "fast charger 25w", "phone case clear", "tempered glass s25", "magsafe power bank",
            "type c cable", "car charger fast", "selfie stick tripod", "camera lens protector",
            "waterproof pouch", "wireless charging pad",
            # Tablets (10)
            "ipad pro m4", "galaxy tab s9", "xiaomi pad 6", "ipad air", "oneplus pad",
            "lenovo tab p12", "realme pad", "honor pad", "surface pro", "redmi pad",
            # Headphones (10)
            "sony headphones", "bose noise cancelling", "sennheiser momentum", "jbl tune 760",
            "boat rockerz", "marshall major iv", "anker q30", "skullcandy crusher", "audio technica", "sony wh-1000xm5",
            # Earbuds (10)
            "boat earbuds", "airpods pro 2", "galaxy buds 3", "nothing ear", "realme buds air",
            "oneplus buds pro", "jbl wave", "oppo enco", "boult audio", "noise buds",
            # Smartwatches (10)
            "apple watch series 9", "galaxy watch 6", "amazfit gtr", "noise colorfit", "fire boltt",
            "boat storm", "fastrack limitles", "realme watch", "oneplus watch 2", "garmin forerunner"
        ]

        self.assertEqual(len(queries), 100)

        successful_discoveries = 0
        total_coverage_accum = 0.0

        for q in queries:
            parsed = query_understanding_engine.parse_query(q)
            expansions = query_rewriter.expand_query(q)
            v_opt = vendor_query_optimizer.optimize_queries(q)
            res = multi_pass_scraping.execute_5_pass_discovery(q)
            cov = search_coverage_score.calculate_coverage()

            if parsed['category'] and res['total_found'] > 0:
                successful_discoveries += 1
            total_coverage_accum += cov['overall_coverage_score']

        accuracy_pct = (successful_discoveries / 100.0) * 100
        avg_coverage_pct = total_coverage_accum / 100.0

        self.assertGreaterEqual(accuracy_pct, 95.0)
        self.assertGreaterEqual(avg_coverage_pct, 95.0)

    def test_discovery_quality_rules(self):
        cands = [
            {"vendor": "Amazon", "title": "Samsung Galaxy S25"},
            {"vendor": "Flipkart", "title": "Samsung Galaxy S25"},
            {"vendor": "Croma", "title": "Samsung Galaxy S25"},
            {"vendor": "JioMart", "title": "Samsung Galaxy S25"},
            {"vendor": "Vijay Sales", "title": "Samsung Galaxy S25"}
        ]
        q_rules = discovery_quality_rules.enforce_rules(cands)
        self.assertTrue(q_rules['quality_certified'])

if __name__ == '__main__':
    unittest.main()
