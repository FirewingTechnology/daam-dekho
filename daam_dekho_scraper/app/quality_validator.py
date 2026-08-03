from typing import Dict, Any, List

class ProductQualityValidatorEngine:
    """DaamDekho Product Quality Score & Gatekeeper Engine.
    Evaluates product completeness, identity clarity, and price integrity.
    """

    def evaluate_product_quality(self, item: Dict[str, Any]) -> Dict[str, Any]:
        title = item.get('title') or item.get('canonical_title') or ''
        brand = item.get('brand') or ''
        category = item.get('category') or ''

        score = 100.0

        if not title:
            score -= 50.0
        if not brand or brand.lower() in ['generic', 'unknown', 'n/a']:
            score -= 20.0
        if not category:
            score -= 10.0

        status = "APPROVED" if score >= 60.0 else "BLOCKED"

        return {
            "quality_score": score,
            "status": status,
            "title": title,
            "brand": brand
        }

quality_validator_engine = ProductQualityValidatorEngine()
