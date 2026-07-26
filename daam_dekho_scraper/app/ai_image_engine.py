import hashlib

class AIImageEngine:
    """Module 7: AI Image Quality & Hero Selection Engine."""

    def evaluate_images(self, product, vendor_offers=None):
        vendor_offers = vendor_offers or []
        image_urls = []

        base_img = product.get('base_image') or product.get('image_url')
        if base_img: image_urls.append(base_img)

        for offer in vendor_offers:
            u = offer.get('image_url') or offer.get('base_image')
            if u and u not in image_urls:
                image_urls.append(u)

        valid_urls = []
        for url in image_urls:
            if not url or not url.startswith('http'):
                continue
            # Filter placeholders & error logos
            if any(ph in url.lower() for ph in ['placeholder', 'errorimg', 'no_image', 'default']):
                continue
            valid_urls.append(url)

        hero_image = valid_urls[0] if valid_urls else (base_img or "")
        image_quality_score = 95.0 if len(valid_urls) > 1 else (80.0 if valid_urls else 30.0)

        return {
            "product_id": product.get('id'),
            "hero_image": hero_image,
            "gallery_images": valid_urls,
            "image_quality_score": image_quality_score,
            "placeholder_count": len(image_urls) - len(valid_urls),
            "confidence": 95.0,
            "version": "v2.5"
        }

ai_image_engine = AIImageEngine()
