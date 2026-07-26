import re

class AISuccessorGraphEngine:
    """Module 6: AI Successor Lineage Graph Engine."""

    def detect_lineage(self, product, candidate_products=None):
        candidate_products = candidate_products or []
        title = (product.get('canonical_title') or product.get('title') or "").lower()
        brand = (product.get('brand') or "").lower()

        predecessor = None
        successor = None

        # Extract generation integer (e.g. S23 -> 23, S24 -> 24, iPhone 15 -> 15)
        num_match = re.search(r'\b(s\d{2}|iphone\s*\d{2}|\d{2})\b', title)
        if num_match:
            raw_str = num_match.group(1)
            digits = re.search(r'\d{2}', raw_str)
            if digits:
                cur_num = int(digits.group(0))
                pred_num = cur_num - 1
                succ_num = cur_num + 1

                for cand in candidate_products:
                    c_title = (cand.get('canonical_title') or cand.get('title') or "").lower()
                    if str(pred_num) in c_title and cand.get('brand', '').lower() == brand:
                        predecessor = cand
                    elif str(succ_num) in c_title and cand.get('brand', '').lower() == brand:
                        successor = cand

        return {
            "product_id": product.get('id'),
            "predecessor": predecessor,
            "current_product": {"id": product.get('id'), "title": product.get('canonical_title') or product.get('title')},
            "successor": successor,
            "confidence": 95.0,
            "version": "v2.5"
        }

ai_successor_graph = AISuccessorGraphEngine()
