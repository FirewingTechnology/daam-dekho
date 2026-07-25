import sys
from pathlib import Path
scraper_dir = Path(__file__).resolve().parent / "daam_dekho_scraper"
sys.path.insert(0, str(scraper_dir))

from app.matchers.product_matcher import matcher
from rapidfuzz import fuzz


prod1 = {"title": "Apple iPhone 15", "brand": "Apple", "specifications": {}}
prod2 = {"title": "Apple iPhone 15 (128 GB) - Black", "brand": "Apple", "specifications": {"rom": "128 GB"}}

title_a = matcher.normalize_title(prod1['title'])
title_b = matcher.normalize_title(prod2['title'])

print(f"Title A: '{title_a}'")
print(f"Title B: '{title_b}'")

token_set = fuzz.token_set_ratio(title_a, title_b)
print(f"Token Set Ratio: {token_set}")

score = matcher.calculate_score(prod1, prod2)
print(f"Calculated Score: {score}")
