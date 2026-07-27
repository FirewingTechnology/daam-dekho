import urllib.parse
from app.adapters.base_adapter import BasePaginationAdapter

class JioMartPaginationAdapter(BasePaginationAdapter):
    def __init__(self):
        super().__init__("jiomart")

    def build_page_url(self, query: str, page: int, category: str = "Mobiles") -> str:
        encoded_q = urllib.parse.quote(query)
        if page == 1:
            return f"https://www.jiomart.com/search/{encoded_q}"
        return f"https://www.jiomart.com/search/{encoded_q}/page/{page}"
