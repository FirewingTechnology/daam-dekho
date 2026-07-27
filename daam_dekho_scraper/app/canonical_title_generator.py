class CanonicalTitleGenerator:
    """Canonical Display Title Generator — Produces Clean, Vendor-Independent Titles."""

    def generate_canonical_title(self, entities: dict, category: str = "Mobiles") -> str:
        brand = (entities.get('brand') or 'Generic').strip().title()
        model = (entities.get('model') or entities.get('series') or 'Product').strip()
        ram = (entities.get('ram') or '').upper()
        storage = (entities.get('storage') or '').upper()
        cpu = (entities.get('cpu') or '').upper()

        cat_norm = (category or 'Mobiles').lower()

        if 'mobile' in cat_norm or 'phone' in cat_norm:
            # Format: Brand Model (RAM, Storage)
            # E.g. Vivo T5x 5G (8GB RAM, 256GB Storage)
            spec_parts = []
            if ram:
                spec_parts.append(f"{ram} RAM")
            if storage:
                spec_parts.append(f"{storage} Storage")
            
            spec_str = f" ({', '.join(spec_parts)})" if spec_parts else ""
            
            # Ensure model starts with brand if missing
            if not model.lower().startswith(brand.lower()):
                title = f"{brand} {model}{spec_str}"
            else:
                title = f"{model}{spec_str}"
            return title.strip()

        elif 'laptop' in cat_norm:
            # Format: Brand Series CPU RAM Storage
            # E.g. HP Victus 15 Core i5 13420H 16GB RAM 512GB SSD
            parts = [brand]
            if model and not model.lower().startswith(brand.lower()):
                parts.append(model)
            elif model:
                parts = [model]
            
            if cpu:
                parts.append(cpu)
            if ram:
                parts.append(f"{ram} RAM")
            if storage:
                parts.append(f"{storage} SSD" if 'ssd' not in storage.lower() else storage)
            
            return " ".join(parts).strip()

        else: # Accessories & generic categories
            spec_parts = []
            if ram: spec_parts.append(ram)
            if storage: spec_parts.append(storage)
            spec_str = f" ({', '.join(spec_parts)})" if spec_parts else ""
            if not model.lower().startswith(brand.lower()):
                return f"{brand} {model}{spec_str}".strip()
            return f"{model}{spec_str}".strip()

canonical_title_generator = CanonicalTitleGenerator()
