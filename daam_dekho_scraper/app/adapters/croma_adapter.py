import urllib.parse
from app.adapters.base_adapter import BasePaginationAdapter

class CromaPaginationAdapter(BasePaginationAdapter):
    def __init__(self):
        super().__init__("croma")

    def build_page_url(self, query: str, page: int, category: str = "Mobiles") -> str:
        encoded_q = urllib.parse.quote(query)
        page_idx = page - 1
        return f"https://www.croma.com/searchB?q={encoded_q}%3Arelevance&page={page_idx}"
