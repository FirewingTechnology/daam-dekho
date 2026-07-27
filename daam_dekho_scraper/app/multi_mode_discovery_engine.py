import logging
from app.hardware_identity_engine import hardware_identity_engine
from app.logger import get_logger

logger = get_logger("multi_mode_discovery")

class MultiModeDiscoveryEngine:
    """DaamDekho v4.0 Multi-Mode Discovery & Batch Grouping Ingestion Engine."""

    def process_scraped_batch(self, raw_listings, mode="BRAND_CATALOG", category="Mobiles", brand=None):
        logger.info(f"Processing v4.0 Scraped Batch of {len(raw_listings)} listings in mode '{mode}' for brand '{brand}' / category '{category}'")

        grouped_hardware = {}
        rejected_listings = []

        for p in raw_listings:
            hw_ident = hardware_identity_engine.build_hardware_identity(
                title=p.get('title'),
                specs=p.get('specifications', {}),
                category=p.get('category') or category,
                brand=p.get('brand') or brand
            )

            matched_hash = None
            for existing_hash, existing_group in grouped_hardware.items():
                can_merge, _ = hardware_identity_engine.can_merge(hw_ident, existing_group["identity"])
                if can_merge:
                    matched_hash = existing_hash
                    # Upgrade N/A specs if current listing has explicit specs
                    if existing_group["identity"]["ram"] == "N/A" and hw_ident["ram"] != "N/A":
                        existing_group["identity"]["ram"] = hw_ident["ram"]
                    if existing_group["identity"]["storage"] == "N/A" and hw_ident["storage"] != "N/A":
                        existing_group["identity"]["storage"] = hw_ident["storage"]
                    break

            if not matched_hash:
                matched_hash = hw_ident['hardware_identity_hash']
                grouped_hardware[matched_hash] = {
                    "identity": hw_ident,
                    "canonical_title": f"{hw_ident['brand']} {hw_ident['model']} {hw_ident['ram']} {hw_ident['storage']}".strip(),
                    "listings": []
                }

            grouped_hardware[matched_hash]["listings"].append(p)

        logger.info(f"Grouped {len(raw_listings)} raw listings into {len(grouped_hardware)} distinct hardware Master Products (Zero Over-Consolidation)")

        return {
            "mode": mode,
            "total_raw": len(raw_listings),
            "master_products_count": len(grouped_hardware),
            "grouped_hardware": grouped_hardware,
            "rejected_count": len(rejected_listings)
        }

multi_mode_discovery_engine = MultiModeDiscoveryEngine()
