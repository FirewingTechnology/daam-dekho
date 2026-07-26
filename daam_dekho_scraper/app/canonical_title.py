import re
from app.entity_extractor import entity_extractor

class CanonicalTitleEngine:
    """Canonical Title Generator for Clean Display across Frontend & Search."""

    def generate_canonical_title(self, title, specs=None, category="Mobiles", brand=None):
        specs = specs or {}
        entities = entity_extractor.extract_all(title, specs, category=category, brand=brand)

        b_name = (entities['brand'] or brand or 'Generic').title()
        model_name = (entities['model'] or title).strip()

        # Normalize model title presentation
        if b_name.lower() in model_name.lower():
            base_name = model_name
        else:
            base_name = f"{b_name} {model_name}"

        base_name = entity_extractor.clean_marketing_words(base_name)

        # Build clean specs tuple
        spec_parts = []
        
        # Processor / GPU / Chip
        if entities['cpu']:
            spec_parts.append(entities['cpu'].upper())
        if entities['gpu']:
            spec_parts.append(entities['gpu'].upper())

        # RAM
        if entities['ram']:
            ram_upper = entities['ram'].upper()
            if 'RAM' not in ram_upper:
                ram_upper += " RAM"
            spec_parts.append(ram_upper)

        # Storage
        if entities['storage']:
            st_upper = entities['storage'].upper()
            if 'LAPTOP' in (category or "").upper():
                if 'SSD' not in st_upper and 'HDD' not in st_upper:
                    st_upper += " SSD"
            else:
                if 'STORAGE' not in st_upper:
                    st_upper += " Storage"
            spec_parts.append(st_upper)

        # Display
        if entities['display'] and "LAPTOP" in (category or "").upper():
            spec_parts.append(f"{entities['display'].replace('inch', '')}\" Display")

        if spec_parts:
            canonical_title = f"{base_name} ({', '.join(spec_parts)})"
        else:
            canonical_title = base_name

        # Clean trailing / double punctuation
        canonical_title = re.sub(r'\s+', ' ', canonical_title).strip()
        return canonical_title

canonical_title_engine = CanonicalTitleEngine()
