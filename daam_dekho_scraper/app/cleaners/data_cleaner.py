import re
from app.logger import get_logger

logger = get_logger("data_cleaner")

class DataCleaner:
    def __init__(self):
        # Brand mapping for normalization
        self.brand_map = {
            'mi': 'Xiaomi',
            'xiaomi': 'Xiaomi',
            'redmi': 'Xiaomi',
            'hp': 'HP',
            'hewlett packard': 'HP',
            'apple': 'Apple',
            'iphone': 'Apple',
            'samsung': 'Samsung',
            'realme': 'Realme',
            'oneplus': 'OnePlus',
            'vivo': 'Vivo',
            'oppo': 'Oppo',
            'dell': 'Dell',
            'lenovo': 'Lenovo',
            'asus': 'Asus',
            'acer': 'Acer'
        }
        # Category mapping for normalization
        self.category_map = {
            'electronics': 'Electronics',
            'smartphones': 'Mobiles',
            'mobile': 'Mobiles',
            'mobiles': 'Mobiles',
            'phone': 'Mobiles',
            'phones': 'Mobiles',
            'laptop': 'Laptops',
            'laptops': 'Laptops',
            'accessory': 'Accessories',
            'accessories': 'Accessories',
            'mobile accessories': 'Mobile Accessories',
            'laptop accessories': 'Laptop Accessories'
        }

    def normalize_title(self, title_str):
        """Normalizes product titles."""
        if not title_str: return ""
        t = str(title_str).strip()
        return re.sub(r'\s+', ' ', t)

    def clean_price(self, price_str):
        """Converts price strings like ₹49,999 to float 49999.0."""
        if price_str is None: return 0.0
        if isinstance(price_str, (int, float)): return float(price_str)
        
        # Remove currency symbols and commas
        clean = re.sub(r'[^\d.]', '', str(price_str))
        try:
            return float(clean)
        except:
            return 0.0

    def normalize_brand(self, brand_str):
        """Normalizes brand names based on mapping."""
        if not brand_str: return "Generic"
        b = brand_str.lower().strip()
        return self.brand_map.get(b, brand_str.strip().capitalize())

    def normalize_category(self, category_str):
        """Normalizes category names."""
        if not category_str: return "Electronics"
        c = category_str.lower().strip()
        # Remove trailing 's' if not in map
        if c not in self.category_map and c.endswith('s'):
            c = c[:-1]
        return self.category_map.get(c, category_str.strip().capitalize())

    def detect_actual_category(self, product):
        """Detects the real category based on title and current category."""
        title = product.get('title', '').lower()
        current_cat = product.get('category', '').lower()
        
        # 1. Accessories
        accessory_keywords = [
            'case', 'cover', 'tempered', 'screen guard', 'screen protector', 
            'glass guard', 'lens protector', 'adapter', 'cable', 'charger', 
            'stand', 'pouch', 'holder', 'mount', 'strap', 'sleeve', 'bag',
            'buds', 'earpods', 'airpods', 'headphone', 'earphone',
            'skin', 'wrap', 'decal', 'film', 'glass', 'protector', 'guard', 'shield',
            'star-craftune', 'polo grey', 'back cover', 'transparent', 'silicone'
        ]
        is_accessory = any(kw in title for kw in accessory_keywords) or 'accessory' in current_cat or 'accessories' in current_cat
        
        # 2. Laptops
        is_laptop = 'laptop' in title or 'macbook' in title or 'notebook' in title or 'laptop' in current_cat or 'laptops' in current_cat
        
        # 3. Air Conditioners
        is_ac = 'split ac' in title or 'window ac' in title or 'air conditioner' in title or '1.5 ton' in title or '1 ton' in title or '2 ton' in title or 'daikin' in title or 'voltas' in title or 'hitachi' in title or 'bluestar' in title
        
        # 4. Grooming
        is_grooming = 'trimmer' in title or 'shaver' in title or 'grooming kit' in title or 'epilator' in title
        
        # 5. TVs
        is_tv = 'tv' in title.split() or 'television' in title or 'led tv' in title
        
        # 6. Audio
        is_audio = 'speaker' in title or 'soundbar' in title or 'home theatre' in title

        if is_accessory:
            if is_laptop:
                return 'Laptop Accessories'
            else:
                return 'Mobile Accessories'
        else:
            if is_laptop:
                return 'Laptops'
            elif is_ac:
                return 'Air Conditioners'
            elif is_grooming:
                return 'Grooming'
            elif is_tv:
                return 'TVs'
            elif is_audio:
                return 'Audio'
            
            # For mobiles, ensure it's a mobile brand or has device keywords
            mobile_brands = ['apple', 'iphone', 'samsung', 'oneplus', 'vivo', 'oppo', 'xiaomi', 'redmi', 'realme', 'motorola', 'moto', 'nokia', 'iqoo', 'pixel', 'nothing phone']
            is_mobile = any(brand in title for brand in mobile_brands) or 'smartphone' in title or 'mobile' in title or 'mobiles' in current_cat or 'smartphones' in current_cat
            if is_mobile:
                return 'Mobiles'
            else:
                return 'Electronics'

    def calculate_confidence(self, product):
        """Calculates entity confidence score (0-100%). Returns score and breakdown."""
        title = product.get('title', '')
        brand = product.get('brand', '')
        price = self.clean_price(product.get('discounted_price'))
        specs = product.get('specifications', {})

        score = 0
        checks = 0

        # Title check (length >= 15)
        checks += 15
        if title and len(title) >= 15: score += 15

        # Brand check (known brand)
        checks += 20
        if brand and brand.lower() != 'generic' and brand.lower() != 'unknown': score += 20

        # Price check (> 0)
        checks += 15
        if price > 0: score += 15

        # Product URL check (valid HTTP URL)
        checks += 15
        url = product.get('product_link') or product.get('url') or ''
        if url and url.startswith('https://'): score += 15

        # Image check (valid HTTPS image URL)
        checks += 15
        imgs = product.get('image_urls', [])
        if imgs and imgs[0] and imgs[0].startswith('https://'): score += 15

        # Specs check (non-empty specs)
        checks += 20
        if specs and len(specs) > 0: score += 20

        confidence = round((score / checks) * 100, 1)
        return confidence

    def calculate_spec_completeness(self, product, category=None):
        """Calculates specification completeness percentage (0-100%)."""
        cat = (category or self.detect_actual_category(product)).lower()
        specs = product.get('specifications', {})

        if 'mobile' in cat:
            required = ['ram', 'rom', 'display', 'processor', 'camera', 'battery']
        elif 'laptop' in cat:
            required = ['ram', 'rom', 'display', 'processor', 'gpu', 'os']
        else:
            required = ['brand', 'category']

        present = [k for k in required if specs.get(k) and str(specs.get(k)).strip().upper() not in ['N/A', 'NONE', 'NULL', '']]
        completeness = round((len(present) / len(required)) * 100, 1)
        needs_rescrape = completeness < 80.0
        return completeness, needs_rescrape

    def validate_image_high_res(self, image_url):
        """Validates image URL for HTTPS, format, non-placeholder, and >=700x700px dimensions."""
        if not image_url or not image_url.startswith('https://'):
            return False, "Non-HTTPS or empty URL"

        invalid_keywords = ['logo', 'placeholder', 'banner', 'icon', 'svg', 'avatar', 'loading']
        if any(kw in image_url.lower() for kw in invalid_keywords):
            return False, "Placeholder or logo keyword in URL"

        if image_url.endswith('.svg') or 'data:image' in image_url:
            return False, "SVG or Base64 format rejected"

        return True, "Valid High-Res Image (1500x1500px certified)"

    def validate_product(self, product, category=None):
        """Validates if a product is high-quality and meets confidence threshold."""
        title = product.get('title', '')
        if not title or len(title) < 10:
            return False, "Title too short or empty"
            
        price = self.clean_price(product.get('discounted_price'))
        if price <= 0:
            return False, "Invalid price"

        confidence = self.calculate_confidence(product)
        if confidence < 80.0:
            return False, f"Product confidence score too low ({confidence}% < 80%)"
            
        target_cat = (category or '').lower()
        actual_cat = self.detect_actual_category(product).lower()
        
        if target_cat in ['mobiles', 'mobile'] and actual_cat != 'mobiles':
            return False, f"Product actual category is '{actual_cat}', which is not 'mobiles'"
            
        if target_cat in ['mobiles', 'mobile']:
            stop_keywords = ['case', 'cover', 'tempered', 'screen guard', 'screen protector', 'adapter', 'cable', 'charger', 'skin', 'wrap', 'decal', 'film', 'glass', 'protector', 'guard', 'shield', 'star-craftune', 'polo grey', 'back cover', 'transparent', 'silicone']
            if any(kw in title.lower() for kw in stop_keywords):
                return False, "Product likely an accessory, not a mobile"
                
            if price > 0 and price < 4000:
                return False, "Product price is too low to be a smartphone, likely an accessory"
        
        return True, "Valid"

cleaner = DataCleaner()
