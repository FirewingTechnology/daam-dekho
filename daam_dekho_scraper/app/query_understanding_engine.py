import re
from app.entity_extractor import entity_extractor

class QueryUnderstandingEngine:
    """Module 1: Command Center Query Understanding Engine (v3.0)."""

    def parse_query(self, query):
        q = (query or "").strip()
        q_lower = q.lower()

        # Extract Price Range / Max Price (e.g., under 20000, under ₹30,000)
        max_price = None
        b_match = re.search(r'(?:under|below|around|within|\<|₹)\s*(\d+)\s*(k|lakh)?', q_lower)
        if b_match:
            val_str = b_match.group(1).replace(',', '')
            if val_str.isdigit():
                val = float(val_str)
                unit = b_match.group(2)
                if unit == 'k': val *= 1000
                elif unit == 'lakh': val *= 100000
                if val >= 1000:
                    max_price = val

        # Category Detection
        category = "Mobiles"
        if any(w in q_lower for w in ['laptop', 'notebook', 'macbook', 'victus', 'rog', 'legion', 'ideapad', 'thinkpad', 'pavilion']):
            category = "Laptops"
        elif any(w in q_lower for w in ['tablet', 'ipad', 'tab']):
            category = "Tablets"
        elif any(w in q_lower for w in ['tv', 'television', 'led tv', 'oled tv', 'qled tv']):
            category = "TVs"
        elif any(w in q_lower for w in ['headphone', 'earphone', 'earbuds', 'buds', 'airpods', 'headset']):
            category = "Earbuds" if "earbuds" in q_lower or "buds" in q_lower else "Headphones"
        elif any(w in q_lower for w in ['watch', 'smartwatch']):
            category = "Smartwatches"
        elif any(w in q_lower for w in ['case', 'cover', 'charger', 'adapter', 'cable', 'screen guard', 'tempered', 'mouse', 'dock']):
            category = "Accessories"

        # Brand Detection
        brand = entity_extractor.normalize_brand(q, None)
        if brand == "Generic" and any(b in q_lower for b in ['samsung', 'apple', 'vivo', 'oppo', 'realme', 'hp', 'asus', 'boat', 'dell', 'lenovo', 'sony']):
            for b in ['samsung', 'apple', 'vivo', 'oppo', 'realme', 'hp', 'asus', 'boat', 'dell', 'lenovo', 'sony']:
                if b in q_lower:
                    brand = b.capitalize()
                    break

        # Entity Extraction
        entities = entity_extractor.extract_all(q, category=category, brand=brand)

        # Model / Part Number match (e.g. SM-S938, 15-FA1000TX)
        model_number = None
        m_num = re.search(r'\b(sm-[a-z0-9]{4,6}|[a-z0-9]{4,6}-[a-z0-9]{3,6})\b', q_lower)
        if m_num:
            model_number = m_num.group(1).upper()

        # Intent Classification logic (Module 1 v3.0)
        has_brand_discovery_kw = any(kw in q_lower for kw in ['all mobiles', 'all phones', 'mobiles', 'phones', 'smartphones'])
        clean_model = (entities['model'] or "").lower()
        generic_model_terms = ['vivo all mobiles', 'samsung mobiles', 'all mobiles', 'mobiles', 'phones', 'smartphones', 'gaming laptops', 'boat earbuds', 'earbuds', 'buds', 'headphones', 'tablets', 'mobile']
        has_specific_model = bool(entities['model']) and clean_model not in generic_model_terms and not has_brand_discovery_kw and "ultra" in q_lower or "pro" in q_lower or "s25" in q_lower or bool(model_number)

        if max_price:
            intent = "FILTERED_DISCOVERY"
        elif has_brand_discovery_kw and brand != "Generic":
            intent = "BRAND_DISCOVERY"
        elif brand != "Generic" and category != "Mobiles" and not has_specific_model:
            intent = "BRAND_CATEGORY_DISCOVERY"
        elif has_specific_model and brand != "Generic":
            intent = "EXACT_PRODUCT"
        elif brand == "Generic" and (category != "Mobiles" or "gaming" in q_lower):
            intent = "CATEGORY_DISCOVERY"
        elif brand != "Generic":
            intent = "BRAND_DISCOVERY"
        else:
            intent = "CATEGORY_DISCOVERY"

        return {
            "original_query": q,
            "intent": intent,
            "category": category,
            "brand": brand,
            "series": entities['series'],
            "model": entities['model'],
            "ram": entities['ram'],
            "storage": entities['storage'],
            "cpu": entities['cpu'],
            "gpu": entities['gpu'],
            "color": entities['color'],
            "model_number": model_number,
            "max_price": max_price,
            "confidence": 99.0 if intent == "EXACT_PRODUCT" else 95.0,
            "cleaned_query": entities['cleaned_title']
        }

query_understanding_engine = QueryUnderstandingEngine()
