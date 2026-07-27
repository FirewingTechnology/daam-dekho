import urllib.parse
from app.adapters.base_adapter import BasePaginationAdapter

class FlipkartPaginationAdapter(BasePaginationAdapter):
    def __init__(self):
        super().__init__("flipkart")

    def build_page_url(self, query: str, page: int, category: str = "Mobiles") -> str:
        encoded_q = urllib.parse.quote(query)
        if page == 1:
            return f"https://www.flipkart.com/search?q={encoded_q}"
        return f"https://www.flipkart.com/search?q={encoded_q}&page={page}"
