from app.multi_pass_scraping_engine import multi_pass_scraping
from app.logger import get_logger

logger = get_logger("product_discovery_pipeline")

class ProductDiscoveryPipeline:
    """Module 4: Exact Product Discovery Pipeline."""

    def execute(self, query):
        logger.info(f"Executing Exact Product Pipeline for '{query}' using 5-pass scraping engine")
        discovery_res = multi_pass_scraping.execute_5_pass_discovery(query)

        return {
            "pipeline": "PRODUCT_DISCOVERY_PIPELINE",
            "original_query": query,
            "session_uuid": discovery_res['session_uuid'],
            "pass_results": discovery_res['pass_results'],
            "total_found": discovery_res['total_found'],
            "clusters_count": discovery_res['clusters_count'],
            "clusters": discovery_res['clusters'],
            "status": "COMPLETED"
        }

product_discovery_pipeline = ProductDiscoveryPipeline()
