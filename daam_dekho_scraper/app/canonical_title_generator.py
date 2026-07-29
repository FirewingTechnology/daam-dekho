import re

BRAND_CASE_MAP = {

    'oneplus': 'OnePlus',
    'iqoo': 'iQOO',
    'poco': 'POCO',
    'asus': 'ASUS',
    'hp': 'HP',
    'dell': 'Dell',
    'apple': 'Apple',
    'samsung': 'Samsung',
    'vivo': 'Vivo',
    'oppo': 'Oppo',
    'realme': 'Realme',
    'xiaomi': 'Xiaomi',
    'sony': 'Sony',
    'lenovo': 'Lenovo',
    'acer': 'Acer'
}

class CanonicalTitleGenerator:
    """Canonical Display Title Generator — Produces Clean, Vendor-Independent Enterprise Titles."""

    def generate_canonical_title(self, entities: dict, category: str = "Mobiles") -> str:
        raw_brand = (entities.get('brand') or 'Generic').strip()
        brand_lower = raw_brand.lower()
        brand = BRAND_CASE_MAP.get(brand_lower, raw_brand.title())
        if brand in ['N/A', 'Unknown', 'Null', 'Generic']:
            brand = 'Generic'

        model = (entities.get('model') or entities.get('series') or 'Product').strip()
        
        # Remove brand prefix from model if model starts with brand
        if model.lower().startswith(brand.lower()):
            model = model[len(brand):].strip()
        
        # Purge any residual specs/chipsets/marketing from model
        model = re.sub(r'\b\d+\s*gb\b|\b\d+\s*tb\b|\b5g\b|\b4g\b|\bwith\s+.*$', '', model, flags=re.IGNORECASE).strip()
        model = re.sub(r'\b(?:snapdragon|dimensity|exynos|tensor|bionic|helio|camera|battery|mah|mp|ai|refresh|rate|display|launch|edition|official|deals?)\b.*$', '', model, flags=re.IGNORECASE).strip()
        model = re.sub(r'\s+', ' ', model).strip()
        if not model or model.lower() in ['product', 'model', 'series', 'standard']:
            model = (entities.get('series') or 'Standard').strip()

        ram = (entities.get('ram') or '').upper()
        storage = (entities.get('storage') or '').upper()
        cpu = (entities.get('cpu') or '').upper()
        network = (entities.get('network') or '').upper()
        network_str = "5G" if "5G" in network or "5G" in (entities.get('cleaned_title') or '').upper() else ("4G" if "4G" in network else "")

        cat_norm = (category or 'Mobiles').lower()

        if 'mobile' in cat_norm or 'phone' in cat_norm:
            # Format: Brand Model Network (RAM RAM, Storage Storage)
            # E.g. OnePlus 15R 5G (12GB RAM, 256GB Storage)
            if brand != 'Generic':
                base_part = f"{brand} {model}".strip()
            else:
                base_part = model.strip()

            if network_str and network_str not in base_part.upper():
                base_part = f"{base_part} {network_str}"

            spec_parts = []
            if ram and ram not in ['N/A', 'UNKNOWN']:
                ram_fmt = f"{ram} RAM" if "RAM" not in ram else ram
                spec_parts.append(ram_fmt)
            if storage and storage not in ['N/A', 'UNKNOWN']:
                st_fmt = f"{storage} Storage" if ("STORAGE" not in storage and "ROM" not in storage) else storage
                spec_parts.append(st_fmt)
            
            spec_str = f" ({', '.join(spec_parts)})" if spec_parts else ""
            return f"{base_part}{spec_str}".strip()

        elif 'laptop' in cat_norm:
            # Format: Brand Series/Model (CPU, RAM RAM, Storage SSD)
            # E.g. HP Victus 15 (Core i5, 16GB RAM, 512GB SSD)
            base_part = f"{brand} {model}".strip() if brand != 'Generic' else model.strip()
            spec_parts = []
            if cpu and cpu not in ['UNKNOWN', 'N/A']:
                spec_parts.append(cpu)
            if ram and ram not in ['N/A', 'UNKNOWN']:
                spec_parts.append(f"{ram} RAM" if "RAM" not in ram else ram)
            if storage and storage not in ['N/A', 'UNKNOWN']:
                st_fmt = f"{storage} SSD" if ('SSD' not in storage and 'HDD' not in storage) else storage
                spec_parts.append(st_fmt)

            spec_str = f" ({', '.join(spec_parts)})" if spec_parts else ""
            return f"{base_part}{spec_str}".strip()

        else: # Accessories & generic categories
            base_part = f"{brand} {model}".strip() if brand != 'Generic' else model.strip()
            spec_parts = []
            if ram and ram not in ['N/A', 'UNKNOWN']: spec_parts.append(ram)
            if storage and storage not in ['N/A', 'UNKNOWN']: spec_parts.append(storage)
            spec_str = f" ({', '.join(spec_parts)})" if spec_parts else ""
            return f"{base_part}{spec_str}".strip()

canonical_title_generator = CanonicalTitleGenerator()

