class AIProductScorecardEngine:
    """Module 10: AI Product Scorecard Engine."""

    def calculate_scorecard(self, product, specs=None, price_intel=None):
        specs = specs or {}
        price_intel = price_intel or {}

        category = (product.get('category') or "Mobiles").lower()
        title = (product.get('canonical_title') or product.get('title') or "").lower()

        # Dynamic sub-score calculations based on extracted hardware
        cpu = (specs.get('processor') or specs.get('cpu') or "").lower()
        gpu = (specs.get('gpu') or "").lower()
        ram = (specs.get('ram') or "").lower()
        storage = (specs.get('storage') or "").lower()

        perf_score = 92.0 if ('i7' in cpu or 'i9' in cpu or 'ryzen 7' in cpu or 'gen 3' in cpu or 'm3' in cpu or '16gb' in ram) else 82.0
        disp_score = 90.0 if ('oled' in title or 'amoled' in title or '120hz' in title or 'retina' in title) else 84.0
        batt_score = 88.0 if ('5000mah' in title or '6000mah' in title or 'macbook' in title) else 80.0
        cam_score = 94.0 if ('ultra' in title or 'pro max' in title or 'pixel' in title or '50mp' in title) else 78.0
        gaming_score = 95.0 if ('rtx' in gpu or 'rog' in title or 'victus' in title or 'legion' in title) else 75.0
        val_score = 88.0 if price_intel.get('expected_savings', 0) > 1000 else 82.0
        repair_score = 75.0
        software_score = 90.0 if ('iphone' in title or 'galaxy' in title or 'pixel' in title or 'macbook' in title) else 80.0

        overall = round((perf_score + disp_score + batt_score + cam_score + gaming_score + val_score + repair_score + software_score) / 8, 1)

        return {
            "product_id": product.get('id'),
            "performance_score": perf_score,
            "display_score": disp_score,
            "battery_score": batt_score,
            "camera_score": cam_score,
            "gaming_score": gaming_score,
            "value_score": val_score,
            "repairability_score": repair_score,
            "software_score": software_score,
            "overall_ai_score": overall,
            "confidence": 95.0,
            "version": "v2.5"
        }

ai_scorecard_engine = AIProductScorecardEngine()
