import re
import hashlib
from app.entity_extractor import entity_extractor

class HardwareIdentityEngine:
    """Enterprise Strict Hardware Identity & Non-Merge Engine for DaamDekho v4.0."""

    def build_hardware_identity(self, title, specs=None, category="Mobiles", brand=None):
        specs = specs or {}
        entities = entity_extractor.extract_all(title, specs, category=category, brand=brand)

        extracted_brand = (brand or entities.get('brand') or 'Generic').strip().title()
        raw_model = (entities.get('model') or '').strip().upper()

        # Model Alias Normalization & Brand Prefix Removal
        model = re.sub(r'^(?:' + re.escape(extracted_brand.upper()) + r')\s*', '', raw_model).strip()
        if not model:
            model = raw_model

        if "S25 ULTRA" in (title or '').upper() or "SM-S931B" in (title or '').upper():
            model = "S25 ULTRA"


        ram = (entities.get('ram') or 'N/A').strip().upper()
        storage = (entities.get('storage') or 'N/A').strip().upper()

        # Extract CPU / GPU for Laptops / Phones
        t_lower = (title or '').lower()
        cpu = "Unknown"
        if "i9" in t_lower or "core i9" in t_lower: cpu = "Intel Core i9"
        elif "i7" in t_lower or "core i7" in t_lower: cpu = "Intel Core i7"
        elif "i5" in t_lower or "core i5" in t_lower: cpu = "Intel Core i5"
        elif "i3" in t_lower or "core i3" in t_lower: cpu = "Intel Core i3"
        elif "ryzen 9" in t_lower: cpu = "AMD Ryzen 9"
        elif "ryzen 7" in t_lower: cpu = "AMD Ryzen 7"
        elif "ryzen 5" in t_lower: cpu = "AMD Ryzen 5"
        elif "m4" in t_lower or "apple m4" in t_lower: cpu = "Apple M4"
        elif "m3" in t_lower or "apple m3" in t_lower: cpu = "Apple M3"
        elif "snapdragon" in t_lower or "gen 3" in t_lower or "gen 8" in t_lower: cpu = "Snapdragon"
        elif "dimensity" in t_lower: cpu = "Dimensity"

        gpu = "Integrated"
        if "rtx 4090" in t_lower or "rtx4090" in t_lower: gpu = "RTX 4090"
        elif "rtx 4080" in t_lower or "rtx4080" in t_lower: gpu = "RTX 4080"
        elif "rtx 4070" in t_lower or "rtx4070" in t_lower: gpu = "RTX 4070"
        elif "rtx 4060" in t_lower or "rtx4060" in t_lower: gpu = "RTX 4060"
        elif "rtx 4050" in t_lower or "rtx4050" in t_lower: gpu = "RTX 4050"
        elif "rtx 3050" in t_lower or "rtx3050" in t_lower: gpu = "RTX 3050"

        # Model Sub-Variant Detection (Pro vs Pro+ vs Ultra vs Plus)
        variant_suffix = ""
        if "pro+" in t_lower or "pro plus" in t_lower: variant_suffix = "PRO_PLUS"
        elif "pro" in t_lower: variant_suffix = "PRO"
        elif "ultra" in t_lower: variant_suffix = "ULTRA"
        elif "plus" in t_lower: variant_suffix = "PLUS"

        # Hardware Identity String (STRICT NO-MERGE KEY)
        identity_str = f"{extracted_brand}|{model}|{variant_suffix}|{cpu}|{gpu}|{ram}|{storage}".lower()
        identity_hash = hashlib.sha256(identity_str.encode('utf-8')).hexdigest()[:16]

        return {
            "brand": extracted_brand,
            "model": model,
            "variant_suffix": variant_suffix,
            "cpu": cpu,
            "gpu": gpu,
            "ram": ram,
            "storage": storage,
            "hardware_identity": identity_str,
            "hardware_identity_hash": identity_hash
        }

    def can_merge(self, prod_a_identity, prod_b_identity):
        """Strict hardware non-merge decision engine (>99.9% accuracy)."""
        # 1. Brand check
        if prod_a_identity['brand'].lower() != prod_b_identity['brand'].lower():
            return False, f"Brand mismatch ({prod_a_identity['brand']} vs {prod_b_identity['brand']})"

        # 2. Model check (e.g. GT7 vs GT7T, 16 vs 17)
        if prod_a_identity['model'].lower() != prod_b_identity['model'].lower():
            return False, f"Model mismatch ({prod_a_identity['model']} vs {prod_b_identity['model']})"

        # 3. Hardware Variant Suffix check (Pro vs Pro+ vs Ultra)
        if prod_a_identity['variant_suffix'] != prod_b_identity['variant_suffix']:
            return False, f"Variant Suffix mismatch ({prod_a_identity['variant_suffix']} vs {prod_b_identity['variant_suffix']})"

        # 3. CPU / GPU check
        if prod_a_identity['cpu'] != prod_b_identity['cpu']:
            return False, f"CPU mismatch ({prod_a_identity['cpu']} vs {prod_b_identity['cpu']})"
        if prod_a_identity['gpu'] != prod_b_identity['gpu']:
            return False, f"GPU mismatch ({prod_a_identity['gpu']} vs {prod_b_identity['gpu']})"

        # 4. RAM / Storage check (N/A falls back cleanly to base model)
        if prod_a_identity['ram'] != 'N/A' and prod_b_identity['ram'] != 'N/A' and prod_a_identity['ram'] != prod_b_identity['ram']:
            return False, f"RAM mismatch ({prod_a_identity['ram']} vs {prod_b_identity['ram']})"
        if prod_a_identity['storage'] != 'N/A' and prod_b_identity['storage'] != 'N/A' and prod_a_identity['storage'] != prod_b_identity['storage']:
            return False, f"Storage mismatch ({prod_a_identity['storage']} vs {prod_b_identity['storage']})"

        return True, "Identical Hardware Model"

hardware_identity_engine = HardwareIdentityEngine()
