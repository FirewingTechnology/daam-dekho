import time
from typing import Dict, Any, List
from app.logger import get_logger
from app.database.v10_data_lake_schema import init_v10_data_lake_schema
from app.etl.v10_raw_acquisition import raw_acquisition_engine
from app.etl.v10_normalization import attribute_normalization_engine
from app.etl.v10_master_variant_builder import master_variant_builder_engine
from app.etl.v10_offer_attacher import offer_attacher_engine
from app.etl.v10_catalog_publisher import website_catalog_publisher_engine
from app.etl.v10_product_lineage import product_lineage_engine

logger = get_logger("v10_pipeline_orchestrator")

class EnterpriseV10ETLPipelineOrchestrator:
    """DaamDekho v10.0 Enterprise Decoupled Data Lake ETL Pipeline Orchestrator.
    Executes Phase 1 through Phase 10 sequentially with full telemetry, lineage tracking, and zero inline matching.
    """

    def run_pipeline(self, target_query: str, category: str, brand: str, scrapers: Dict[str, Any], target_vendors: List[str], max_pages: int = 2) -> Dict[str, Any]:
        logger.info(f"🚀 [v10.0 ENTERPRISE ETL DATA LAKE PIPELINE] Initiating Execution for '{target_query}' ({category})")
        start_time = time.time()

        # Initialize v10.0 4-Layer Schema
        init_v10_data_lake_schema()

        # Phase 1 & 2: Multi-Vendor Crawl & Raw Data Acquisition into Data Lake
        logger.info("📥 Phase 1 & 2: Crawling vendors and storing raw PDP data into Immutable Data Lake...")
        acq_res = raw_acquisition_engine.acquire_raw_data(
            target_query=target_query,
            category=category,
            brand=brand,
            scrapers=scrapers,
            target_vendors=target_vendors,
            max_pages=max_pages
        )
        raw_ids = acq_res.get("raw_product_ids", [])
        if not raw_ids:
            logger.warning("⚠️ No raw products acquired during Phase 1. Pipeline terminating.")
            return {
                "status": "NO_RAW_DATA",
                "session_id": acq_res.get("session_id", ""),
                "raw_collected": 0,
                "pdp_opened": 0,
                "pdp_failed": 0,
                "normalized_count": 0,
                "master_products_built": 0,
                "variants_created": 0,
                "attached_offers": 0,
                "coverage_pct": 0.0,
                "published_products": 0,
                "published_offers": 0,
                "elapsed_sec": round(time.time() - start_time, 2)
            }

        # Phase 3: Attribute Normalization Engine
        logger.info("🧹 Phase 3: Normalizing raw attributes and cleaning promotional noise...")
        normalized_ids = attribute_normalization_engine.normalize_raw_products(raw_ids)

        # Phase 4, 5, 6 & 7: Canonical Title Generation, Master Product Building, Variant Building & Deterministic Identity Resolution
        logger.info("🏗️ Phase 4, 5, 6 & 7: Building Master Products, Variants & Generating SHA-256 Variant IDs...")
        norm_master_var_tuples = master_variant_builder_engine.build_master_and_variants(normalized_ids, default_category=category)

        # Phase 8: Multi-Vendor Offer Attachment
        logger.info("🏷️ Phase 8: Attaching multi-vendor offers to resolved Variant IDs...")
        attached_offer_ids = offer_attacher_engine.attach_offers(norm_master_var_tuples)

        # Phase 9 & 10: Quality Validation & Website Catalog Publishing
        logger.info("🛡️ Phase 9 & 10: Validating catalog quality and publishing to Website Production Catalog...")
        master_ids = [t[1] for t in norm_master_var_tuples]
        variant_ids = [t[2] for t in norm_master_var_tuples]
        pub_res = website_catalog_publisher_engine.publish_catalog(master_ids)

        # Calculate Coverage %
        vendor_count = len(target_vendors)
        coverage_pct = round((len(attached_offer_ids) / (len(set(master_ids)) * vendor_count)) * 100, 2) if master_ids and vendor_count else 100.0
        coverage_pct = min(100.0, coverage_pct)

        # Get Sample Lineage View
        sample_lineage = product_lineage_engine.get_product_lineage(
            raw_product_id=raw_ids[0] if raw_ids else None,
            master_product_id=master_ids[0] if master_ids else None
        )

        elapsed = round(time.time() - start_time, 2)
        logger.info(f"🎉 [v10.0 ETL PIPELINE COMPLETED in {elapsed}s] Raw Data Lake: {len(raw_ids)} | Master Products: {len(set(master_ids))} | Published Master Products: {pub_res['published_masters']} | Published Offers: {pub_res['published_offers']}")

        return {
            "status": "SUCCESS",
            "session_id": acq_res["session_id"],
            "raw_collected": len(raw_ids),
            "pdp_opened": len(raw_ids),
            "pdp_failed": 0,
            "normalized_count": len(normalized_ids),
            "master_products_built": len(set(master_ids)),
            "variants_created": len(set(variant_ids)),
            "attached_offers": len(attached_offer_ids),
            "coverage_pct": coverage_pct,
            "published_products": pub_res["published_masters"],
            "published_offers": pub_res["published_offers"],
            "lineage_sample": sample_lineage,
            "elapsed_sec": elapsed
        }

v10_pipeline_orchestrator = EnterpriseV10ETLPipelineOrchestrator()
