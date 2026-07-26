class ShoppingScoreEngine:
    """Module 8: Shopping Score Engine."""

    def calculate_shopping_score(self, product_data):
        pid = product_data.get('id') or 1
        title = (product_data.get('title') or "").lower()

        perf = 94.0 if ("i7" in title or "s25" in title or "macbook" in title or "rtx" in title) else 84.0
        cam = 92.0 if ("s25" in title or "iphone" in title or "pixel" in title) else 80.0
        gaming = 95.0 if ("rtx" in title or "rog" in title or "victus" in title) else 78.0
        batt = 88.0
        disp = 90.0
        soft = 90.0
        build = 88.0
        repair = 75.0
        val = 90.0

        overall = round((perf + cam + gaming + batt + disp + soft + build + repair + val) / 9, 1)

        return {
            "product_id": pid,
            "performance_score": perf,
            "camera_score": cam,
            "gaming_score": gaming,
            "battery_score": batt,
            "display_score": disp,
            "software_score": soft,
            "build_quality_score": build,
            "repairability_score": repair,
            "value_score": val,
            "overall_shopping_score": overall,
            "version": "v2.8"
        }

shopping_score_engine = ShoppingScoreEngine()
