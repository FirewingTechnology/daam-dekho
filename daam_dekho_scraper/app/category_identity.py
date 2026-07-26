import hashlib
import re
from app.entity_extractor import entity_extractor

class CategoryIdentityEngine:
    """Category-Aware Canonical Identity Engine for Enterprise Master vs Variant Identity Hashing."""

    def build_identities(self, title, specs=None, category="Mobiles", brand=None):
        specs = specs or {}
        entities = entity_extractor.extract_all(title, specs, category=category, brand=brand)
        
        cat_norm = (category or "mobiles").lower().replace(" ", "")

        # Category-Specific Master Identity Component Array
        if "mobile" in cat_norm or "phone" in cat_norm:
            master_components = [
                entities['brand'] or 'generic',
                entities['series'] or 'std',
                entities['model'] or 'model',
                entities['network'] or '5g',
                entities['ram'] or 'noram',
                entities['storage'] or 'nostorage'
            ]

        elif "laptop" in cat_norm:
            master_components = [
                entities['brand'] or 'generic',
                entities['series'] or 'std',
                entities['cpu'] or 'nocpu',
                entities['gpu'] or 'nogpu',
                entities['ram'] or 'noram',
                entities['storage'] or 'nostorage',
                entities['display'] or 'nodisplay'
            ]

        elif "tablet" in cat_norm or "ipad" in cat_norm:
            master_components = [
                entities['brand'] or 'generic',
                entities['series'] or 'std',
                entities['cpu'] or 'chip',
                entities['ram'] or 'noram',
                entities['storage'] or 'nostorage',
                entities['display'] or 'nodisplay'
            ]

        elif "tv" in cat_norm or "television" in cat_norm:
            master_components = [
                entities['brand'] or 'generic',
                entities['series'] or 'std',
                entities['model_number'] or 'nomodel',
                entities['display'] or 'nodisplay'
            ]

        elif "headphone" in cat_norm or "earphone" in cat_norm or "earbuds" in cat_norm:
            master_components = [
                entities['brand'] or 'generic',
                entities['model'] or 'model',
                entities['series'] or 'std'
            ]

        elif "watch" in cat_norm or "smartwatch" in cat_norm:
            master_components = [
                entities['brand'] or 'generic',
                entities['series'] or 'std',
                entities['display'] or 'nodial',
                entities['network'] or 'bluetooth'
            ]

        else: # Accessories
            master_components = [
                entities['brand'] or 'generic',
                entities['model_number'] or entities['model'] or 'acc',
                entities['storage'] or entities['ram'] or 'nocapacity'
            ]

        # 1. Master Identity String & SHA-256 Hash (EXCLUDES Color and Marketing Noise)
        master_identity_str = "|".join([str(c).strip().lower().replace(" ", "") for c in master_components])
        master_identity_hash = hashlib.sha256(master_identity_str.encode('utf-8')).hexdigest()

        # 2. Variant Identity String & SHA-256 Hash (INCLUDES Color & Edition)
        color_str = (entities['color'] or 'nocolor').strip().lower().replace(" ", "-")
        edition_str = (specs.get('edition', '') or 'std').strip().lower().replace(" ", "-")
        
        variant_identity_str = f"{master_identity_str}|{color_str}|{edition_str}"
        variant_identity_hash = hashlib.sha256(variant_identity_str.encode('utf-8')).hexdigest()

        # 3. Hardware Identity (Hardware Specs)
        hw_str = f"{entities['brand']}|{entities['model']}|{entities['ram']}|{entities['storage']}|{entities['cpu']}|{entities['gpu']}"
        hardware_hash = hashlib.sha256(hw_str.encode('utf-8')).hexdigest()

        return {
            "category": category,
            "entities": entities,
            "master_identity": master_identity_str,
            "master_identity_hash": master_identity_hash,
            "variant_identity": variant_identity_str,
            "variant_identity_hash": variant_identity_hash,
            "hardware_identity": hw_str,
            "hardware_hash": hardware_hash,
            "color": entities['color'],
            "edition": edition_str if edition_str != 'std' else None
        }

category_identity_engine = CategoryIdentityEngine()
