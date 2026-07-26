from datetime import datetime
from app.entity_extractor import entity_extractor

class AISpecificationEnrichmentEngine:
    """Module 1: AI Specification Enrichment Engine."""

    def enrich_product_specs(self, product, vendor_offers=None, existing_specs=None):
        existing_specs = existing_specs or {}
        vendor_offers = vendor_offers or []

        enriched_fields = []
        new_specs = dict(existing_specs)

        target_fields = ['processor', 'cpu', 'gpu', 'ram', 'storage', 'display', 'battery', 'camera', 'network']

        for field in target_fields:
            if not new_specs.get(field) or new_specs.get(field) in ['N/A', 'none', 'unknown']:
                # Look across vendor listing titles/specs for cross-vendor extraction
                for offer in vendor_offers:
                    v_title = offer.get('title') or ""
                    v_name = offer.get('vendor') or offer.get('vendor_name') or "Vendor Listing"
                    extracted = entity_extractor.extract_all(v_title, category=product.get('category'))
                    
                    found_val = extracted.get(field)
                    if found_val:
                        new_specs[field] = found_val
                        enriched_fields.append({
                            "field_name": field,
                            "enriched_value": str(found_val),
                            "source_vendor": v_name,
                            "confidence": 95.0,
                            "verified_at": datetime.now().isoformat()
                        })
                        break

        return {
            "product_id": product.get('id'),
            "enriched_specs": new_specs,
            "enrichment_audit": enriched_fields,
            "version": "v2.5",
            "confidence": 95.0
        }

ai_spec_enrichment = AISpecificationEnrichmentEngine()
