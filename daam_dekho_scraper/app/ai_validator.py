import json
from app.entity_extractor import entity_extractor
from app.hardware_fingerprint import hardware_fingerprint_engine
from app.logger import get_logger

logger = get_logger("ai_validator")

class AIProductValidator:
    """Enterprise AI Product Validation Engine for Fallback Conflict Resolution."""

    def validate_product_pair(self, prod_a, prod_b):
        title_a = prod_a.get('title') or ""
        title_b = prod_b.get('title') or ""
        cat_a = prod_a.get('category') or "Mobiles"
        cat_b = prod_b.get('category') or "Mobiles"

        specs_a = prod_a.get('specifications', {})
        specs_b = prod_b.get('specifications', {})

        ent_a = entity_extractor.extract_all(title_a, specs_a, category=cat_a)
        ent_b = entity_extractor.extract_all(title_b, specs_b, category=cat_b)

        hw_a = hardware_fingerprint_engine.generate_fingerprint(title_a, specs_a, category=cat_a)
        hw_b = hardware_fingerprint_engine.generate_fingerprint(title_b, specs_b, category=cat_b)

        # Rule-based validation analysis
        same_brand = (ent_a['brand'].lower() == ent_b['brand'].lower())
        same_ram = (ent_a['ram'] == ent_b['ram']) if ent_a['ram'] and ent_b['ram'] else True
        same_storage = (ent_a['storage'] == ent_b['storage']) if ent_a['storage'] and ent_b['storage'] else True
        same_cpu = (ent_a['cpu'] == ent_b['cpu']) if ent_a['cpu'] and ent_b['cpu'] else True

        is_same = same_brand and same_ram and same_storage and same_cpu

        if is_same:
            confidence = 95.0
            reason = "Rule-based AI Entity Validation confirmed matching brand, RAM, storage, and CPU/GPU specifications."
        else:
            confidence = 20.0
            reasons = []
            if not same_brand: reasons.append(f"Brand Mismatch ({ent_a['brand']} vs {ent_b['brand']})")
            if not same_ram: reasons.append(f"RAM Mismatch ({ent_a['ram']} vs {ent_b['ram']})")
            if not same_storage: reasons.append(f"Storage Mismatch ({ent_a['storage']} vs {ent_b['storage']})")
            if not same_cpu: reasons.append(f"CPU Mismatch ({ent_a['cpu']} vs {ent_b['cpu']})")
            reason = f"Validation Rejected: {', '.join(reasons)}"

        return {
            "same_product": is_same,
            "confidence": confidence,
            "reason": reason,
            "correct_brand": ent_a['brand'] if is_same else ent_a['brand'],
            "correct_model": ent_a['model'] if is_same else ent_a['model'],
            "correct_variant": f"{ent_a['ram'] or ''}_{ent_a['storage'] or ''}".strip('_')
        }

ai_validator = AIProductValidator()
