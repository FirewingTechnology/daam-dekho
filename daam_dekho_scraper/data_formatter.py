import sys
import os

# Add parent directory to path so we can import app modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from app.formatter import format_product as app_format_product

class DataFormatter:
    @staticmethod
    def format_product(data, vendor):
        # Handle potentially empty image_urls list
        image_urls = data.get('image_urls')
        image_url = image_urls[0] if image_urls else None

        # Map keys from the scraper to what our app formatter expects
        return app_format_product(
            title=data.get('title'),
            brand=data.get('brand'),
            category=data.get('category'),
            seller_name=data.get('seller_name', vendor.capitalize()),
            product_link=data.get('product_link'),
            vendor=vendor,
            price=data.get('price', 0),
            discounted_price=data.get('discounted_price', 0),
            rating=data.get('rating', 0),
            reviews=data.get('reviews', 0),
            image_url=image_url,
            specifications=data.get('specifications', {}),
            offers=data.get('offers', [])
        )
