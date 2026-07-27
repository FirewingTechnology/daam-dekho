import re
from app.entity_extractor import entity_extractor
from app.canonical_title_generator import canonical_title_generator

class CanonicalTitleEngine:
    """Canonical Title Generator for Clean Display across Frontend & Search."""

    def generate_canonical_title(self, title, specs=None, category="Mobiles", brand=None):
        specs = specs or {}
        entities = entity_extractor.extract_all(title, specs, category=category, brand=brand)
        return canonical_title_generator.generate_canonical_title(entities, category=category)

canonical_title_engine = CanonicalTitleEngine()

