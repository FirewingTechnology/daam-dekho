from app.query_understanding_engine import query_understanding_engine
from app.query_rewriter import query_rewriter
from app.query_validator import query_validator

class QueryPreviewEngine:
    """Module 7: Pre-Scraping Query Analysis Preview Engine (v3.0)."""

    def analyze_query_preview(self, query):
        validation = query_validator.validate_query(query)
        if not validation['is_valid']:
            return {
                "status": "REJECTED",
                "validation": validation
            }

        parsed = query_understanding_engine.parse_query(query)
        expansions = query_rewriter.expand_query(query)

        vendors = ["Amazon", "Flipkart", "Croma", "JioMart", "Vijay Sales"]
        estimated_products = len(expansions['expanded_queries']) * len(vendors) * 5
        estimated_runtime_seconds = round(len(expansions['expanded_queries']) * 1.5, 1)

        return {
            "status": "APPROVED",
            "original_query": query,
            "detected_intent": parsed['intent'],
            "detected_category": parsed['category'],
            "detected_brand": parsed['brand'],
            "detected_model": parsed['model'] or "N/A",
            "model_number": parsed['model_number'] or "N/A",
            "max_price_filter": parsed['max_price'],
            "expanded_queries": expansions['expanded_queries'],
            "expansion_count": len(expansions['expanded_queries']),
            "expected_vendors": vendors,
            "estimated_products": estimated_products,
            "estimated_runtime_seconds": estimated_runtime_seconds,
            "confidence": parsed['confidence'],
            "version": "v3.0"
        }

query_preview = QueryPreviewEngine()
