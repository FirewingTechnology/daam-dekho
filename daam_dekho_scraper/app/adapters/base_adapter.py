class BasePaginationAdapter:
    """Base Vendor Pagination Adapter for v5.0 Catalog Ingestion."""

    def __init__(self, vendor_name):
        self.vendor_name = vendor_name

    def build_page_url(self, query: str, page: int, category: str = "Mobiles") -> str:
        raise NotImplementedError

    def is_last_page(self, soup_or_driver, items_found: int, current_page: int, max_pages: int) -> bool:
        if current_page >= max_pages:
            return True
        if items_found == 0:
            return True
        return False
