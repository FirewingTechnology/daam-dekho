class ProductHealthEngine:
    """Enterprise Product Health Scoring Engine (0-100%)."""

    def calculate_health(self, product_data, variants_data=None, vendor_offers=None, specs_data=None):
        product_data = product_data or {}
        vendor_offers = vendor_offers or []
        specs_data = specs_data or {}

        # 1. Identity Score (25%)
        identity_score = 0
        if product_data.get('master_identity'): identity_score += 10
        if product_data.get('model_number'): identity_score += 5
        if product_data.get('brand'): identity_score += 5
        if product_data.get('category'): identity_score += 5

        # 2. Specifications Score (20%)
        spec_keys = ['processor', 'cpu', 'gpu', 'ram', 'storage', 'display', 'battery', 'camera']
        found_specs = sum(1 for k in spec_keys if k in specs_data or k in product_data)
        spec_score = round(min(20, (found_specs / len(spec_keys)) * 20), 1)

        # 3. Images Score (15%)
        image_score = 0
        base_img = product_data.get('base_image') or product_data.get('image_url')
        if base_img and base_img.startswith('http'):
            image_score += 10
        if product_data.get('image_urls') and len(product_data.get('image_urls')) > 1:
            image_score += 5

        # 4. Vendor Coverage Score (15%)
        v_count = len(vendor_offers)
        coverage_score = round(min(15, v_count * 3.75), 1)

        # 5. Price Integrity Score (10%)
        price_score = 0
        valid_prices = [vo.get('price') for vo in vendor_offers if vo.get('price') and vo.get('price') > 0]
        if valid_prices:
            price_score += 10

        # 6. URL Health Score (10%)
        url_score = 0
        if product_data.get('canonical_url'): url_score += 5
        valid_urls = [vo.get('url') for vo in vendor_offers if vo.get('url') and vo.get('url').startswith('http')]
        if valid_urls: url_score += 5

        # 7. Reviews & Ratings Score (5%)
        review_score = 0
        has_rating = any(vo.get('rating') and vo.get('rating') > 0 for vo in vendor_offers)
        has_reviews = any(vo.get('reviews') and vo.get('reviews') > 0 for vo in vendor_offers)
        if has_rating: review_score += 3
        if has_reviews: review_score += 2

        overall_health = round(identity_score + spec_score + image_score + coverage_score + price_score + url_score + review_score, 1)

        return {
            "overall_health_score": min(100.0, overall_health),
            "breakdown": {
                "identity_completeness": identity_score, # max 25
                "specifications_completeness": spec_score, # max 20
                "images_completeness": image_score, # max 15
                "vendor_coverage": coverage_score, # max 15
                "price_integrity": price_score, # max 10
                "url_health": url_score, # max 10
                "reviews_and_ratings": review_score # max 5
            },
            "status": "EXCELLENT" if overall_health >= 85 else ("GOOD" if overall_health >= 70 else "NEEDS_REPAIR")
        }

product_health_engine = ProductHealthEngine()
