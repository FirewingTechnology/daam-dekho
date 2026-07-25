import sys
import os

# Add parent directory to path so we can import app modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

class DataCleanup:
    @staticmethod
    def clean_product_list(products):
        from app.cleaner import clean_product_list
        return clean_product_list(products)
