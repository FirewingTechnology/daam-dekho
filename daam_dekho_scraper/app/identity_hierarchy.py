import re
import hashlib
from app.entity_extractor import entity_extractor
from app.hardware_fingerprint import hardware_fingerprint_engine
from app.brand_alias import brand_alias_engine

class IdentityHierarchyEngine:
    """Enterprise 6-Level Product Identity Hierarchy Engine."""

    def resolve_identity(self, title, specs=None, category="Mobiles", brand=None):
        specs = specs or {}
        entities = entity_extractor.extract_all(title, specs, category=category, brand=brand)
        hw_fp = hardware_fingerprint_engine.generate_fingerprint(title, specs, category=category, brand=brand)

        # 1. Level 1: Model Number Extraction & Resolution
        model_number = (specs.get('model_number') or specs.get('model_no') or entities.get('model_number') or "").strip().upper()
        if not model_number:
            # Title model number extraction (e.g. SM-S931B, SM-A556B, 15-FA1000TX)
            m_num = re.search(r'\b(sm-[a-z0-9]{4,6}|[a-z0-9]{4,6}-[a-z0-9]{3,6})\b', (title or "").lower())
            if m_num:
                model_number = m_num.group(1).upper()

        # 2. Level 2: Part Number
        part_number = (specs.get('part_number') or specs.get('mpn') or specs.get('sku') or "").strip().upper()

        # 3. Level 3: GTIN / EAN / UPC Barcodes
        gtin = (specs.get('gtin') or specs.get('ean') or specs.get('upc') or "").strip()

        # 4. Level 4: Hardware Fingerprint
        hw_hash = hw_fp['hardware_fingerprint']

        # 5. Level 5: Brand, Series, Model, Generation
        norm_brand = brand_alias_engine.normalize_brand(brand or entities['brand'], title)
        series = entities['series'] or 'Standard'
        model = entities['model'] or 'Model'

        level5_str = f"b:{norm_brand.lower()}|s:{series.lower()}|m:{model.lower()}"

        # Level Resolution Evaluation
        match_level = "Level 6 (Title Similarity Fallback)"
        confidence = 60.0

        if model_number and len(model_number) >= 4:
            match_level = "Level 1 (Model Number Match)"
            confidence = 100.0
        elif part_number:
            match_level = "Level 2 (Part Number Match)"
            confidence = 95.0
        elif gtin:
            match_level = "Level 3 (GTIN/EAN Barcode Match)"
            confidence = 95.0
        elif hw_hash:
            match_level = "Level 4 (Hardware Fingerprint Match)"
            confidence = 88.0
        elif norm_brand and model:
            match_level = "Level 5 (Brand & Model Hierarchy Match)"
            confidence = 80.0

        identity_uuid_seed = f"{model_number}|{part_number}|{gtin}|{hw_hash}|{level5_str}"
        product_uuid = hashlib.sha256(identity_uuid_seed.encode('utf-8')).hexdigest()[:16]

        return {
            "product_uuid": f"PROD-{product_uuid.upper()}",
            "match_level": match_level,
            "confidence": confidence,
            "level1_model_number": model_number or None,
            "level2_part_number": part_number or None,
            "level3_gtin": gtin or None,
            "level4_hardware_fingerprint": hw_hash,
            "level5_hierarchy": level5_str,
            "entities": entities,
            "hardware_details": hw_fp
        }

identity_hierarchy_engine = IdentityHierarchyEngine()
