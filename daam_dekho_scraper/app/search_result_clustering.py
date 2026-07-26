from app.category_identity import category_identity_engine
from app.hardware_fingerprint import hardware_fingerprint_engine
from app.matchers.product_matcher import matcher

class SearchResultClusteringEngine:
    """Modules 4 & 5: Search Result & AI Product Clustering Engine."""

    def cluster_candidates(self, raw_candidates, category="Mobiles"):
        clusters = {}

        for cand in raw_candidates:
            title = cand.get('title') or ""
            brand = cand.get('brand')
            specs = cand.get('specifications', {})

            ident = category_identity_engine.build_identities(title, specs, category=category, brand=brand)
            master_hash = ident['master_identity_hash']

            if master_hash not in clusters:
                clusters[master_hash] = {
                    "master_identity_hash": master_hash,
                    "master_identity": ident['master_identity'],
                    "canonical_title": ident['entities']['cleaned_title'],
                    "brand": ident['entities']['brand'],
                    "category": category,
                    "candidates": []
                }
            clusters[master_hash]['candidates'].append(cand)

        return list(clusters.values())

search_result_clustering = SearchResultClusteringEngine()
