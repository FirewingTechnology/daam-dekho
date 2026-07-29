import re

class BrandAliasEngine:
    """Normalizes brand names and handles sub-brands & series aliases."""
    
    BRAND_MAP = {
        # Samsung
        'galaxy': 'Samsung',
        'samsung galaxy': 'Samsung',
        'samsung': 'Samsung',
        's25': 'Samsung',
        's24': 'Samsung',
        's23': 'Samsung',
        'a55': 'Samsung',
        'a35': 'Samsung',
        'm55': 'Samsung',
        'f55': 'Samsung',
        'z fold': 'Samsung',
        'z flip': 'Samsung',
        
        # Apple
        'apple inc': 'Apple',
        'apple': 'Apple',
        'iphone': 'Apple',
        'macbook': 'Apple',
        'ipad': 'Apple',
        
        # Xiaomi / Redmi / POCO
        'mi': 'Xiaomi',
        'redmi': 'Xiaomi',
        'poco': 'POCO',
        'xiaomi': 'Xiaomi',

        # ASUS
        'rog': 'ASUS',
        'tuf': 'ASUS',
        'asus': 'ASUS',
        'zenbook': 'ASUS',
        'vivobook': 'ASUS',
        
        # HP
        'victus': 'HP',
        'omen': 'HP',
        'hp': 'HP',
        'pavilion': 'HP',
        'spectre': 'HP',
        'envy': 'HP',
        
        # Lenovo
        'legion': 'Lenovo',
        'thinkpad': 'Lenovo',
        'ideapad': 'Lenovo',
        'yoga': 'Lenovo',
        'lenovo': 'Lenovo',
        'loq': 'Lenovo',
        
        # Acer
        'predator': 'Acer',
        'nitro': 'Acer',
        'acer': 'Acer',
        'aspire': 'Acer',
        'swift': 'Acer',
        
        # OnePlus
        'oneplus': 'OnePlus',
        '1plus': 'OnePlus',
        '15r': 'OnePlus',
        '13r': 'OnePlus',
        '12r': 'OnePlus',
        'nord': 'OnePlus',
        
        # Realme
        'realme': 'Realme',
        'narzo': 'Realme',
        
        # Motorola
        'moto': 'Motorola',
        'motorola': 'Motorola',
        
        # Vivo / IQOO
        'vivo': 'Vivo',
        't5x': 'Vivo',
        't3x': 'Vivo',
        't2x': 'Vivo',
        'iqoo': 'iQOO',
        
        # Oppo
        'oppo': 'Oppo',
        'f31': 'Oppo',
        'f27': 'Oppo',
        'reno': 'Oppo',
        
        # Dell
        'dell': 'Dell',
        'alienware': 'Dell',
        'inspiron': 'Dell',
        'vostro': 'Dell',
        'xps': 'Dell'
    }

    @classmethod
    def normalize_brand(cls, brand_name, product_title=""):
        """Returns normalized brand name using explicit brand string or title context."""
        combined = f"{brand_name or ''} {product_title or ''}".strip().lower()
        
        # 1. Direct match on brand_name if clean key
        if brand_name:
            b_lower = brand_name.strip().lower()
            if b_lower in cls.BRAND_MAP:
                return cls.BRAND_MAP[b_lower]
                
        # 2. Match brand substring in combined text
        if re.search(r'\b(oneplus|1plus)\b', combined): return 'OnePlus'
        if re.search(r'\b(samsung|galaxy)\b', combined): return 'Samsung'
        if re.search(r'\b(apple|iphone|macbook|ipad)\b', combined): return 'Apple'
        if re.search(r'\b(vivo|t5x|t3x|t2x)\b', combined): return 'Vivo'
        if re.search(r'\b(oppo|reno)\b', combined): return 'Oppo'
        if re.search(r'\b(iqoo)\b', combined): return 'iQOO'
        if re.search(r'\b(poco)\b', combined): return 'POCO'
        if re.search(r'\b(xiaomi|redmi|mi)\b', combined): return 'Xiaomi'
        if re.search(r'\b(realme|narzo)\b', combined): return 'Realme'
        if re.search(r'\b(motorola|moto)\b', combined): return 'Motorola'
        if re.search(r'\b(asus|rog|tuf|zenbook|vivobook)\b', combined): return 'ASUS'
        if re.search(r'\b(hp|victus|omen|pavilion|spectre|envy)\b', combined): return 'HP'
        if re.search(r'\b(lenovo|legion|thinkpad|ideapad|yoga|loq)\b', combined): return 'Lenovo'
        if re.search(r'\b(acer|predator|nitro|aspire|swift)\b', combined): return 'Acer'
        if re.search(r'\b(dell|alienware|inspiron|vostro|xps)\b', combined): return 'Dell'

        # 3. Signature regex matching on model prefixes
        if re.search(r'\b(15r|13r|12r|11r|10r|nord\s+ce\d?|nord\s+\d)\b', combined): return 'OnePlus'
        if re.search(r'\b(t5x|t3x|t2x|v30|v29|y200|y100|x100)\b', combined): return 'Vivo'
        if re.search(r'\b(f31|f27|f25|reno\s*\d+)\b', combined): return 'Oppo'
        if re.search(r'\b(s25|s24|s23|s22|a55|a35|m55|f55|z\s*fold|z\s*flip)\b', combined): return 'Samsung'
        if re.search(r'\b(iphone\s*\d*|macbook\s*(?:air|pro)?)\b', combined): return 'Apple'

        if brand_name:
            b_clean = brand_name.strip()
            if b_clean.lower() not in ['generic', 'n/a', 'unknown', 'null', '']:
                return b_clean.title()
                
        return "Generic"

brand_alias_engine = BrandAliasEngine()

