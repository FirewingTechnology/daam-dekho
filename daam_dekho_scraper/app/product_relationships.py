import re

class ProductRelationshipsEngine:
    """Enterprise Knowledge Graph Product Relationships Engine."""

    def build_relationships(self, master_product, candidate_products=None):
        candidate_products = candidate_products or []
        m_title = (master_product.get('title') or "").lower()
        m_brand = (master_product.get('brand') or "").lower()
        m_cat = (master_product.get('category') or "").lower()

        predecessor = None
        successor = None
        similar_products = []
        alternative_products = []
        accessories = []

        # Numerical gen extraction (e.g. S24 vs S25, iPhone 15 vs 16)
        gen_match = re.search(r'\b(s\d{2}|iphone\s*\d{2}|1\d{1}t)\b', m_title)
        
        for cand in candidate_products:
            if cand.get('id') == master_product.get('id'):
                continue
            c_title = (cand.get('title') or "").lower()
            c_brand = (cand.get('brand') or "").lower()

            # Same brand & category -> Check generation
            if c_brand == m_brand:
                similar_products.append(cand)
            elif c_brand != m_brand:
                alternative_products.append(cand)

        return {
            "master_product_id": master_product.get('id'),
            "predecessor": predecessor,
            "successor": successor,
            "similar_products": similar_products[:5],
            "alternative_products": alternative_products[:5],
            "accessories": accessories[:5]
        }

product_relationships_engine = ProductRelationshipsEngine()
