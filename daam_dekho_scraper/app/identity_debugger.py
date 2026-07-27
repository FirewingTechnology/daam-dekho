from app.entity_extractor import entity_extractor
from app.category_identity import category_identity_engine
from app.canonical_title_generator import canonical_title_generator
from app.pdp_verifier import pdp_verifier
from app.logger import get_logger

logger = get_logger("identity_debugger")

class IdentityDebugger:
    """Enterprise Identity Debugger — Explains exact decision lineage for every offer."""

    def debug_offer(self, title: str, specs: dict = None, category: str = "Mobiles", vendor: str = "amazon", url: str = None, price: float = 0) -> dict:
        specs = specs or {}
        candidate = {
            "title": title,
            "url": url or "https://www.vendor.com/dp/TEST12345",
            "price": price or 15000,
            "image_urls": ["https://m.media-amazon.com/images/I/71R1u9L.jpg"],
            "category": category,
            "vendor": vendor
        }

        # 1. PDP Verification
        is_valid, confidence, reason = pdp_verifier.verify_candidate(candidate)

        # 2. Entity Extraction
        entities = entity_extractor.extract_all(title, specs=specs, category=category)

        # 3. Identities
        identities = category_identity_engine.build_identities(title, specs=specs, category=category)

        # 4. Canonical Title
        canonical_title = canonical_title_generator.generate_canonical_title(entities, category=category)

        merge_decision = "MERGE_APPROVED" if is_valid else "REJECTED"

        return {
            "original_vendor_title": title,
            "vendor": vendor,
            "extracted_entities": entities,
            "canonical_identity": identities["master_identity"],
            "canonical_identity_hash": identities["master_identity_hash"],
            "hardware_identity": identities["hardware_identity"],
            "hardware_hash": identities["hardware_hash"],
            "variant_identity": identities["variant_identity"],
            "variant_identity_hash": identities["variant_identity_hash"],
            "canonical_display_title": canonical_title,
            "merge_decision": merge_decision,
            "rejection_reason": reason if not is_valid else None,
            "confidence_score": confidence,
            "final_master_product": canonical_title
        }

identity_debugger = IdentityDebugger()
