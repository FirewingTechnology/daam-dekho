import urllib.parse
from app.adapters.base_adapter import BasePaginationAdapter

class AmazonPaginationAdapter(BasePaginationAdapter):
    def __init__(self):
        super().__init__("amazon")

    def build_page_url(self, query: str, page: int, category: str = "Mobiles") -> str:
        encoded_q = urllib.parse.quote(query)
        if page == 1:
            return f"https://www.amazon.in/s?k={encoded_q}"
        return f"https://www.amazon.in/s?k={encoded_q}&page={page}"

    def is_last_page(self, soup_or_driver, items_found: int, current_page: int, max_pages: int) -> bool:
        if current_page >= max_pages:
            return True
        if items_found == 0:
            return True
        return False
