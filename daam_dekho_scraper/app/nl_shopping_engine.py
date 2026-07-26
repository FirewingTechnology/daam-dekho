import re

class NLShoppingEngine:
    """Module 1: Natural Language Shopping Engine."""

    def parse_shopping_prompt(self, prompt):
        p = (prompt or "").strip()
        p_lower = p.lower()

        # Extract budget (e.g., under 80000, under 80k, under ₹30,000)
        budget = None
        b_match = re.search(r'(?:under|below|around|within|\<|₹|\b)\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(k|lakh)?', p_lower)
        if b_match:
            val_str = b_match.group(1).replace(',', '')
            if val_str.isdigit():
                val = float(val_str)
                unit = b_match.group(2)
                if unit == 'k': val *= 1000
                elif unit == 'lakh': val *= 100000
                if val >= 1000:
                    budget = val

        # Extract category & primary use case
        category = "Mobiles"
        use_case = "General"

        if "laptop" in p_lower or "macbook" in p_lower:
            category = "Laptops"
            if "gaming" in p_lower: use_case = "Gaming"
            elif "coding" in p_lower or "developer" in p_lower: use_case = "Coding"
        elif "phone" in p_lower or "mobile" in p_lower or "smartphone" in p_lower:
            category = "Mobiles"
            if "camera" in p_lower: use_case = "Camera"
            elif "gaming" in p_lower: use_case = "Gaming"
            elif "battery" in p_lower: use_case = "Battery"
        elif "earbuds" in p_lower or "buds" in p_lower or "headphone" in p_lower:
            category = "Headphones"
        elif "watch" in p_lower or "smartwatch" in p_lower:
            category = "Smartwatches"
            if "fitness" in p_lower or "sports" in p_lower: use_case = "Fitness"
        elif "ssd" in p_lower or "storage" in p_lower:
            category = "Accessories"
            use_case = "Storage"

        return {
            "original_prompt": p,
            "category": category,
            "budget": budget,
            "use_case": use_case,
            "version": "v2.8"
        }

nl_shopping_engine = NLShoppingEngine()
