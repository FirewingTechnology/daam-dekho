import re
from app.entity_extractor import entity_extractor

class CanonicalURLEngine:
    """Enterprise SEO Canonical URL Generator."""

    def generate_canonical_url(self, title, specs=None, category="Mobiles", brand=None):
        specs = specs or {}
        entities = entity_extractor.extract_all(title, specs, category=category, brand=brand)

        cat_slug = (category or "mobile").lower().replace("s", "").replace(" ", "")
        brand_slug = (entities['brand'] or "generic").lower().replace(" ", "-")
        model_slug = (entities['model'] or "model").lower()
        model_slug = re.sub(r'[^a-z0-9]', '-', model_slug)
        model_slug = re.sub(r'-+', '-', model_slug).strip('-')

        ram_slug = (entities['ram'] or "noram").lower()
        storage_slug = (entities['storage'] or "nostorage").lower()

        # Build clean URL path: /category/brand/model/ram/storage
        url_path = f"/{cat_slug}/{brand_slug}/{model_slug}"
        if ram_slug != "noram":
            url_path += f"/{ram_slug}"
        if storage_slug != "nostorage":
            url_path += f"/{storage_slug}"

        return url_path

canonical_url_engine = CanonicalURLEngine()
