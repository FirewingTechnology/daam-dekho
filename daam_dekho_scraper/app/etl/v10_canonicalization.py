from typing import Dict, Any
from app.logger import get_logger

logger = get_logger("v10_canonicalization")

class CanonicalTitleEngine:
    """PHASE 5: DaamDekho v10.0 Canonical Title Generator Engine.
    Generates deterministic, vendor-independent canonical titles from normalized hardware attributes.
    """

    def generate_canonical_master_title(self, brand: str, series: str, model: str) -> str:
        b = str(brand or '').strip()
        s = str(series or '').strip()
        m = str(model or '').strip()

        parts = [b]
        if s and s.lower() not in b.lower():
            parts.append(s)
        if m and m.lower() not in s.lower() and m.lower() not in b.lower():
            parts.append(m)

        return " ".join(parts).strip()

    def generate_canonical_variant_title(self, master_title: str, ram: str, storage: str, color: str = "") -> str:
        var_specs = []
        if ram: var_specs.append(f"{ram} RAM")
        if storage: var_specs.append(storage)

        spec_str = f"({', '.join(var_specs)})" if var_specs else ""
        full_title = f"{master_title} {spec_str}".strip()
        if color and color.lower() != 'default':
            full_title = f"{full_title} - {color}".strip()

        return full_title

canonical_title_engine = CanonicalTitleEngine()
