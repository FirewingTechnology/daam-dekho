from app.query_understanding_engine import query_understanding_engine
from app.logger import get_logger

logger = get_logger("filtered_discovery_pipeline")

class FilteredDiscoveryPipeline:
    """Module 6: Filtered Discovery Pipeline with Price & Attribute Filtering."""

    def execute(self, query):
        parsed = query_understanding_engine.parse_query(query)
        brand = parsed['brand']
        category = parsed['category']
        max_price = parsed['max_price'] or 20000.0

        logger.info(f"Executing Filtered Pipeline for '{brand} {category}' with max price <= ₹{max_price}")

        candidates = [
            {"title": f"{brand} Mobile A", "price": 14999, "vendor": "Amazon"},
            {"title": f"{brand} Mobile B", "price": 18999, "vendor": "Flipkart"},
            {"title": f"{brand} Mobile C (Over budget)", "price": 24999, "vendor": "Croma"}
        ]

        accepted = [c for c in candidates if c['price'] <= max_price]
        rejected = [c for c in candidates if c['price'] > max_price]

        return {
            "pipeline": "FILTERED_DISCOVERY_PIPELINE",
            "brand": brand,
            "category": category,
            "max_price": max_price,
            "total_candidates": len(candidates),
            "accepted_count": len(accepted),
            "rejected_count": len(rejected),
            "accepted": accepted,
            "rejected": rejected,
            "status": "COMPLETED"
        }

filtered_discovery_pipeline = FilteredDiscoveryPipeline()
