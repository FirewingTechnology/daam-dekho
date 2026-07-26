from app.query_understanding_engine import query_understanding_engine

class VendorQueryOptimizerEngine:
    """Module 3: Vendor Query Optimizer Engine."""

    def optimize_queries(self, query):
        parsed = query_understanding_engine.parse_query(query)
        brand = parsed['brand'] or ""
        model = parsed['model'] or query
        ram = parsed['ram'] or ""
        storage = parsed['storage'] or ""
        m_num = parsed['model_number'] or ""

        # Vendor specific query formatting
        amazon_q = f"{brand} {model} {ram} {storage}".strip()
        flipkart_q = f"{model} {ram} {storage}".strip()
        jio_q = f"{brand} {model}".strip()
        croma_q = f"{brand} {model}".strip()
        vijay_q = f"{brand} {m_num}" if m_num else f"{brand} {model}".strip()

        return {
            "original_query": query,
            "vendor_queries": {
                "Amazon": amazon_q,
                "Flipkart": flipkart_q,
                "Croma": croma_q,
                "JioMart": jio_q,
                "Vijay Sales": vijay_q
            }
        }

vendor_query_optimizer = VendorQueryOptimizerEngine()
