import re

class BrandAliasEngine:
    """Normalizes brand names and handles sub-brands & series aliases."""
    
    BRAND_MAP = {
        # Samsung
        'galaxy': 'Samsung',
        'samsung galaxy': 'Samsung',
        'samsung': 'Samsung',
        
        # Apple
        'apple inc': 'Apple',
        'apple': 'Apple',
        'iphone': 'Apple',
        'macbook': 'Apple',
        'ipad': 'Apple',
        
        # Xiaomi
        'mi': 'Xiaomi',
        'redmi': 'Xiaomi',
        'poco': 'Xiaomi',
        'xiaomi': 'Xiaomi',

        # ASUS
        'rog': 'ASUS',
        'tuf': 'ASUS',
        'asus': 'ASUS',
        
        # HP
        'victus': 'HP',
        'omen': 'HP',
        'hp': 'HP',
        'pavilion': 'HP',
        
        # Lenovo
        'legion': 'Lenovo',
        'thinkpad': 'Lenovo',
        'ideapad': 'Lenovo',
        'yoga': 'Lenovo',
        'lenovo': 'Lenovo',
        
        # Acer
        'predator': 'Acer',
        'nitro': 'Acer',
        'acer': 'Acer',
        'aspire': 'Acer',
        
        # OnePlus
        'oneplus': 'OnePlus',
        '1plus': 'OnePlus',
        
        # Realme
        'realme': 'Realme',
        
        # Motorola
        'moto': 'Motorola',
        'motorola': 'Motorola',
        
        # Vivo / IQOO
        'vivo': 'Vivo',
        'iqoo': 'iQOO',
        
        # Oppo
        'oppo': 'Oppo',
        
        # Dell
        'dell': 'Dell',
        'alienware': 'Dell',
        'inspiron': 'Dell',
        'vostro': 'Dell'
    }

    @classmethod
    def normalize_brand(cls, brand_name, product_title=""):
        """Returns normalized brand name using explicit brand string or title context."""
        if brand_name:
            b_lower = brand_name.strip().lower()
            if b_lower in cls.BRAND_MAP:
                return cls.BRAND_MAP[b_lower]
        
        # Check product title for brand keywords
        if product_title:
            t_lower = product_title.lower()
            for key, val in cls.BRAND_MAP.items():
                if re.search(r'\b' + re.escape(key) + r'\b', t_lower):
                    return val
                    
        return brand_name.strip().title() if brand_name else "Generic"

brand_alias_engine = BrandAliasEngine()
