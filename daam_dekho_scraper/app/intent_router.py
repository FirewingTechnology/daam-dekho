from app.query_understanding_engine import query_understanding_engine
from app.product_discovery_pipeline import product_discovery_pipeline
from app.brand_discovery_pipeline import brand_discovery_pipeline
from app.category_discovery_pipeline import category_discovery_pipeline
from app.filtered_discovery_pipeline import filtered_discovery_pipeline
from app.logger import get_logger

logger = get_logger("intent_router")

class IntentRouter:
    """Modules 2 & 13: Intent Router & Pipeline Execution Engine (v3.0)."""

    def route_and_execute(self, query):
        parsed = query_understanding_engine.parse_query(query)
        intent = parsed['intent']

        logger.info(f"Intent Router received query '{query}'. Classified Intent: '{intent}'")

        if intent == "EXACT_PRODUCT":
            return product_discovery_pipeline.execute(query)
        elif intent in ["BRAND_DISCOVERY", "BRAND_CATEGORY_DISCOVERY"]:
            return brand_discovery_pipeline.execute(query)
        elif intent == "CATEGORY_DISCOVERY":
            return category_discovery_pipeline.execute(query)
        elif intent == "FILTERED_DISCOVERY":
            return filtered_discovery_pipeline.execute(query)
        else:
            return product_discovery_pipeline.execute(query)

intent_router = IntentRouter()
