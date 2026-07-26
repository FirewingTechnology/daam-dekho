import json

class AIProductSummaryEngine:
    """Module 3: AI Product Summary Engine."""

    def generate_summary(self, product, specs=None, vendor_offers=None):
        specs = specs or {}
        vendor_offers = vendor_offers or []

        title = product.get('canonical_title') or product.get('title') or "Product"
        brand = product.get('brand') or "Brand"
        category = product.get('category') or "Electronics"

        ram = specs.get('ram') or "Standard Memory"
        storage = specs.get('storage') or "Standard Storage"
        processor = specs.get('processor') or specs.get('cpu') or "High-Performance Processor"

        short_summary = f"{title} delivers top-tier performance with {processor}, {ram}, and {storage}."
        long_summary = f"The {title} from {brand} is a flagship {category.lower()} solution engineered for demanding multi-tasking, media consumption, and daily efficiency, featuring {ram} and {storage}."

        pros = [
            f"High-performance {processor} for smooth multitasking",
            f"Generous {storage} capacity for apps and media",
            "Vibrant, responsive display quality",
            "Multi-vendor price competition guarantees lowest market price"
        ]

        cons = [
            "Higher price tier compared to entry-level models",
            "Non-expandable internal storage in select configurations"
        ]

        highlights = [
            f"{ram} High-Speed RAM",
            f"{storage} Internal Memory",
            f"{processor} Processing Engine",
            "Multi-Vendor Price Protection"
        ]

        ideal_for = ["Power Users", "Gamers", "Content Creators", "Professionals"]
        not_recommended_for = ["Basic feature-phone users", "Ultra-budget shoppers"]

        return {
            "product_id": product.get('id'),
            "short_summary": short_summary,
            "long_summary": long_summary,
            "pros": json.dumps(pros),
            "cons": json.dumps(cons),
            "highlights": json.dumps(highlights),
            "ideal_for": json.dumps(ideal_for),
            "not_recommended_for": json.dumps(not_recommended_for),
            "confidence": 95.0,
            "version": "v2.5"
        }

ai_summary_engine = AIProductSummaryEngine()
