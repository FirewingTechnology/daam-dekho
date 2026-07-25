import re
from rapidfuzz import fuzz, process
from app.logger import get_logger

logger = get_logger("product_matcher")

class ProductMatcher:
    def __init__(self):
        # Common marketing words to strip
        self.stop_words = [
            'brand new', 'latest model', 'fast delivery', 'genuine', 'authentic',
            'with warranty', 'original', 'sealed pack', 'special offer'
        ]

    def normalize_title(self, title):
        """Normalizes product title for better matching."""
        if not title: return ""
        
        # Lowercase
        t = title.lower()
        
        # Remove common fluff
        t = t.replace("5g", "").replace("4g", "")
        
        # Remove symbols and extra whitespace
        t = re.sub(r'[^a-z0-9\s\.\/]', ' ', t)
        t = " ".join(t.split())
        
        # Standardize units (GB, TB, Inch)
        t = re.sub(r'(\d+)\s*gb', r'\1gb', t)
        t = re.sub(r'(\d+)\s*tb', r'\1tb', t)
        
        # Remove stop words
        for sw in self.stop_words:
            t = t.replace(sw, "")
            
        return " ".join(t.split())


    def extract_entities(self, title, specs=None):
        """Extracts key entities (brand, ram, storage, processor, color) accurately regardless of word order."""
        specs = specs or {}
        entities = {
            'brand': specs.get('brand', '').lower(),
            'ram': specs.get('ram', '').lower(),
            'storage': specs.get('rom', '').lower() or specs.get('storage', '').lower(),
            'processor': specs.get('processor', '').lower(),
            'color': specs.get('color', '').lower()
        }
        
        title_norm = self.normalize_title(title)

        # 1. Parse explicit RAM / Storage annotations first (e.g. "8gb ram", "128gb storage", "128gb rom")
        ram_explicit = re.search(r'\b(\d+)\s*gb\s*ram\b', title_norm, re.IGNORECASE)
        if ram_explicit and not entities['ram']:
            entities['ram'] = ram_explicit.group(1) + "gb"

        storage_explicit = re.search(r'\b(\d+)\s*(gb|tb)\s*(storage|rom|ssd|hdd)\b', title_norm, re.IGNORECASE)
        if storage_explicit and not entities['storage']:
            entities['storage'] = storage_explicit.group(1) + storage_explicit.group(2).lower()

        # 2. Extract all unannotated GB/TB capacity mentions
        capacity_matches = re.findall(r'\b(\d+)\s*(gb|tb)\b', title_norm, re.IGNORECASE)
        
        for val_str, unit in capacity_matches:
            val = int(val_str)
            unit_lower = unit.lower()
            token = f"{val}{unit_lower}"
            
            # TB capacities are ALWAYS storage
            if unit_lower == 'tb':
                if not entities['storage']:
                    entities['storage'] = token
                continue
                
            # GB capacities >= 32GB are STORAGE (32GB, 64GB, 128GB, 256GB, 512GB)
            if val >= 32:
                if not entities['storage']:
                    entities['storage'] = token
            # GB capacities in standard RAM sizes (2, 3, 4, 6, 8, 12, 16, 24) are RAM
            elif val in [2, 3, 4, 6, 8, 12, 16, 24]:
                if not entities['ram']:
                    entities['ram'] = token

        # Guardrail: RAM cannot equal Storage
        if entities['ram'] and entities['storage'] and entities['ram'] == entities['storage']:
            entities['ram'] = 'n/a'

        return entities



    def calculate_score_detailed(self, prod_a, prod_b):
        """Calculates a matching score and returns breakdown + rejection reasons."""
        score = 0
        reasons = []
        
        title_a = self.normalize_title(prod_a.get('title'))
        title_b = self.normalize_title(prod_b.get('title'))
        title_fuzz = fuzz.token_set_ratio(title_a, title_b)
        score += (title_fuzz * 0.5)

        brand_a = prod_a.get('brand', '').lower()
        brand_b = prod_b.get('brand', '').lower()
        if brand_a and brand_b:
            if brand_a == brand_b:
                score += 35
            else:
                reasons.append(f"Brand Mismatch ({brand_a} vs {brand_b})")
        
        specs_a = prod_a.get('specifications', {})
        specs_b = prod_b.get('specifications', {})
        
        ent_a = self.extract_entities(prod_a.get('title'), specs_a)
        ent_b = self.extract_entities(prod_b.get('title'), specs_b)
        
        if ent_a['ram'] and ent_b['ram']:
            if ent_a['ram'] == ent_b['ram']:
                score += 15
            else:
                score -= 30
                reasons.append(f"RAM Mismatch ({ent_a['ram']} vs {ent_b['ram']})")
            
        if ent_a['storage'] and ent_b['storage']:
            if ent_a['storage'] == ent_b['storage']:
                score += 15
            else:
                score -= 30
                reasons.append(f"Storage Mismatch ({ent_a['storage']} vs {ent_b['storage']})")
            
        accessory_keywords = [
            'case', 'cover', 'tempered', 'screen guard', 'screen protector', 
            'glass guard', 'lens protector', 'adapter', 'cable', 'charger', 
            'stand', 'pouch', 'holder', 'mount', 'strap', 'sleeve', 'bag',
            'buds', 'earpods', 'airpods', 'headphone', 'earphone',
            'skin', 'wrap', 'decal', 'film', 'glass', 'protector', 'guard', 'shield',
            'star-craftune', 'polo grey', 'back cover', 'transparent', 'silicone'
        ]
        is_acc_a = any(kw in title_a for kw in accessory_keywords)
        is_acc_b = any(kw in title_b for kw in accessory_keywords)
        
        if is_acc_a != is_acc_b:
            score -= 100
            reasons.append("Accessory Type Mismatch")
            
        if 'iphone' in title_a or 'iphone' in title_b:
            iphone_model_a = re.findall(r'\b(11|12|13|14|15|16|8|7|6|x|xs|xr|se)\b', title_a)
            iphone_model_b = re.findall(r'\b(11|12|13|14|15|16|8|7|6|x|xs|xr|se)\b', title_a)
            if iphone_model_a and iphone_model_b:
                if iphone_model_a[0] != iphone_model_b[0]:
                    score -= 120
                    reasons.append(f"iPhone Model Mismatch (iPhone {iphone_model_a[0]} vs iPhone {iphone_model_b[0]})")

        submodel_qualifiers = ['pro max', 'pro', 'plus', 'mini', 'ultra', 'fe', 'lite']
        for qual in submodel_qualifiers:
            in_a = bool(re.search(r'\b' + re.escape(qual) + r'\b', title_a))
            in_b = bool(re.search(r'\b' + re.escape(qual) + r'\b', title_b))
            if in_a != in_b:
                score -= 100
                reasons.append(f"Sub-model Qualifier Mismatch ({qual})")

        final_score = round(max(0, min(100, score)), 1)
        reject_reason = ", ".join(reasons) if reasons else ("Title Similarity Below Threshold" if final_score < 75 else "Match OK")
        return final_score, reject_reason

    def calculate_score(self, prod_a, prod_b):
        score, _ = self.calculate_score_detailed(prod_a, prod_b)
        return score

    def find_best_match(self, new_product, existing_products, threshold=75):
        """Finds the best matching existing product variant with failure reasons."""
        best_match = None
        highest_score = 0
        best_reject_reason = "No candidates found"
        
        for existing in existing_products:
            score, reason = self.calculate_score_detailed(new_product, existing)
            if score > highest_score:
                highest_score = score
                best_match = existing
                best_reject_reason = reason
                
        if highest_score >= threshold:
            return best_match, highest_score, "Match OK"
        return None, highest_score, best_reject_reason

matcher = ProductMatcher()
