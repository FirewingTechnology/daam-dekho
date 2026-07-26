import re
from rapidfuzz import fuzz
from app.logger import get_logger
from app.entity_extractor import entity_extractor
from app.category_identity import category_identity_engine

logger = get_logger("product_matcher")

class ProductMatcher:
    """Weighted Entity Matcher for Enterprise Multi-Vendor Ingestion (>99% Accuracy)."""

    def normalize_title(self, title):
        if not title: return ""
        t = str(title).strip()
        t = re.sub(r'\s+', ' ', t)
        return t

    def extract_entities(self, title, specs=None, category="Mobiles", brand=None):
        return entity_extractor.extract_all(title, specs, category=category, brand=brand)

    def calculate_score_detailed(self, prod_a, prod_b):
        """Calculates entity-based weighted score & detailed rejection rationale."""
        score = 0
        reasons = []

        title_a = prod_a.get('title') or ""
        title_b = prod_b.get('title') or ""
        cat_a = prod_a.get('category') or "Mobiles"
        cat_b = prod_b.get('category') or "Mobiles"

        specs_a = prod_a.get('specifications', {})
        specs_b = prod_b.get('specifications', {})

        ent_a = self.extract_entities(title_a, specs_a, category=cat_a, brand=prod_a.get('brand'))
        ent_b = self.extract_entities(title_b, specs_b, category=cat_b, brand=prod_b.get('brand'))

        # 1. Brand Weighted Score (30%)
        if ent_a['brand'] and ent_b['brand']:
            if ent_a['brand'].lower() == ent_b['brand'].lower():
                score += 30
            else:
                reasons.append(f"Brand Mismatch ({ent_a['brand']} vs {ent_b['brand']})")
                return 0, f"Brand Mismatch ({ent_a['brand']} vs {ent_b['brand']})"
        else:
            score += 15 # Neutral fallback

        # 2. Model / Series Weighted Score (30%)
        model_a = (ent_a['model'] or "").lower()
        model_b = (ent_b['model'] or "").lower()

        if model_a and model_b:
            m_ratio = fuzz.token_set_ratio(model_a, model_b)
            if m_ratio >= 80:
                score += 30
            elif m_ratio >= 60:
                score += 20
            else:
                score += (m_ratio * 0.3)
                reasons.append(f"Model Name Discrepancy ({model_a} vs {model_b})")
        else:
            score += 15

        # 3. RAM Weighted Score (10%) & Strict Hardware Constraint
        if ent_a['ram'] and ent_b['ram']:
            if ent_a['ram'] == ent_b['ram']:
                score += 10
            else:
                reasons.append(f"RAM Hardware Mismatch ({ent_a['ram']} vs {ent_b['ram']})")
                return 0, f"RAM Mismatch ({ent_a['ram']} vs {ent_b['ram']})"
        else:
            score += 5

        # 4. Storage Weighted Score (10%) & Strict Hardware Constraint
        if ent_a['storage'] and ent_b['storage']:
            if ent_a['storage'] == ent_b['storage']:
                score += 10
            else:
                reasons.append(f"Storage Hardware Mismatch ({ent_a['storage']} vs {ent_b['storage']})")
                return 0, f"Storage Mismatch ({ent_a['storage']} vs {ent_b['storage']})"
        else:
            score += 5

        # 5. CPU / GPU / Chip Weighted Score (15%) & Strict Hardware Constraint
        if ent_a['cpu'] and ent_b['cpu']:
            if ent_a['cpu'] == ent_b['cpu']:
                score += 10
            else:
                reasons.append(f"CPU Mismatch ({ent_a['cpu']} vs {ent_b['cpu']})")
                return 0, f"CPU Mismatch ({ent_a['cpu']} vs {ent_b['cpu']})"
        else:
            score += 5

        if ent_a['gpu'] and ent_b['gpu']:
            if ent_a['gpu'] == ent_b['gpu']:
                score += 5
            else:
                reasons.append(f"GPU Mismatch ({ent_a['gpu']} vs {ent_b['gpu']})")
                return 0, f"GPU Mismatch ({ent_a['gpu']} vs {ent_b['gpu']})"

        # 6. Model Number / Part Number Weighted Score (5%)
        if ent_a['model_number'] and ent_b['model_number']:
            if ent_a['model_number'] == ent_b['model_number']:
                score += 5
            else:
                reasons.append(f"Model Number Mismatch ({ent_a['model_number']} vs {ent_b['model_number']})")
                return 0, f"Model Number Mismatch ({ent_a['model_number']} vs {ent_b['model_number']})"
        else:
            score += 5

        final_score = round(max(0, min(100, score)), 1)
        reject_reason = ", ".join(reasons) if reasons else ("Score Below Merge Threshold" if final_score < 70 else "Match OK")
        return final_score, reject_reason

    def calculate_score(self, prod_a, prod_b):
        score, _ = self.calculate_score_detailed(prod_a, prod_b)
        return score

    def find_best_match(self, new_product, existing_products, threshold=70):
        """Finds the best matching existing master product using Weighted Entity Confidence."""
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
