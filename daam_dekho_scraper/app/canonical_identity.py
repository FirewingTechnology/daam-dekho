import hashlib
import re
from app.brand_alias import brand_alias_engine

class CanonicalIdentityEngine:
    """Canonical Identity v2 Engine for Enterprise Product & Variant Identification."""

    @classmethod
    def extract_series_and_generation(cls, title):
        """Extracts series name and generation/model version."""
        if not title:
            return "unknown_series", "gen_1"

        t = title.lower()

        # iPhone Series & Gen
        iphone = re.search(r'\biphone\s+(11|12|13|14|15|16|17|se|x|xr|xs)\b', t)
        if iphone:
            return "iPhone", iphone.group(1)

        # Samsung Series & Gen
        galaxy = re.search(r'\bgalaxy\s+([a-z]\d{1,2}|s\d{1,2}|z\s*(?:fold|flip)\s*\d?)\b', t)
        if galaxy:
            return "Galaxy", galaxy.group(1).replace(' ', '')

        # Laptop Series (Legion, XPS, MacBook Air, ThinkPad, Victus, Omen, ROG)
        laptop_match = re.search(r'\b(macbook\s*(?:air|pro)?|xps|legion|thinkpad|victus|omen|rog|tuf|predator|inspiron|pavilion)\b', t)
        if laptop_match:
            gen = re.search(r'\b(m1|m2|m3|m4|g\d|v\d|\d{4})\b', t)
            return laptop_match.group(1).title(), (gen.group(1) if gen else "std")

        return "standard", "gen_1"

    @classmethod
    def generate_canonical_key(cls, brand, title, specs=None):
        """Generates Canonical Identity v2: Brand|Series|Gen|Variant|RAM|Storage|CPU|GPU|Display|Color|PartNo."""
        specs = specs or {}
        norm_brand = brand_alias_engine.normalize_brand(brand, title)
        series, gen = cls.extract_series_and_generation(title)

        # Variant qualifiers (Ultra, Pro Max, Pro, Plus, Mini, FE, Lite)
        t_lower = (title or "").lower()
        variant_qualifiers = []
        for qual in ['pro max', 'pro', 'plus', 'mini', 'ultra', 'fe', 'lite']:
            if re.search(r'\b' + re.escape(qual) + r'\b', t_lower):
                variant_qualifiers.append(qual.replace(' ', ''))
        variant = "-".join(variant_qualifiers) if variant_qualifiers else "base"

        ram = (specs.get('ram', '')).lower().replace(' ', '')
        storage = (specs.get('storage', '') or specs.get('rom', '')).lower().replace(' ', '')
        color = (specs.get('color', '')).lower().strip()
        cpu = (specs.get('processor', '') or specs.get('cpu', '')).lower().strip()
        gpu = (specs.get('gpu', '')).lower().strip()
        display = (specs.get('display', '') or specs.get('screen_size', '')).lower().strip()
        part_number = (specs.get('part_number', '') or specs.get('sku', '') or specs.get('model_number', '')).lower().strip()

        # Title spec fallback extraction
        if not ram:
            ram_match = re.search(r'\b(\d+)\s*gb\s*ram\b', t_lower)
            if ram_match:
                ram = f"{ram_match.group(1)}gb"
            else:
                ram_unmatch = re.search(r'\b(4|6|8|12|16|24|32)\s*gb\b', t_lower)
                if ram_unmatch:
                    ram = f"{ram_unmatch.group(1)}gb"

        if not storage:
            storage_match = re.search(r'\b(\d+)\s*(gb|tb)\s*(storage|rom|ssd|hdd)\b', t_lower)
            if storage_match:
                storage = f"{storage_match.group(1)}{storage_match.group(2).lower()}"
            else:
                storage_unmatch = re.search(r'\b(64|128|256|512|1024)\s*gb\b', t_lower)
                if storage_unmatch:
                    storage = f"{storage_unmatch.group(1)}gb"
                else:
                    tb_match = re.search(r'\b(1|2)\s*tb\b', t_lower)
                    if tb_match:
                        storage = f"{tb_match.group(1)}tb"

        identity_components = [
            norm_brand, series, gen, variant, ram or 'noram', storage or 'nostorage',
            cpu or 'nocpu', gpu or 'nogpu', display or 'nodisplay', color or 'nocolor', part_number or 'nopart'
        ]
        identity_str = "|".join([c.strip().lower() for c in identity_components])
        canonical_hash = hashlib.sha256(identity_str.encode('utf-8')).hexdigest()

        return {
            "brand": norm_brand,
            "series": series,
            "generation": gen,
            "variant": variant,
            "ram": ram,
            "storage": storage,
            "cpu": cpu,
            "gpu": gpu,
            "display": display,
            "color": color,
            "part_number": part_number,
            "identity_string": identity_str,
            "canonical_hash": canonical_hash
        }

canonical_identity_engine = CanonicalIdentityEngine()
