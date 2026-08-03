from typing import List, Dict, Any

class VendorAdapterRegistry:
    """Vendor Adapter Registry for generating customized queries per target vendor."""

    def get_queries_for_vendor(self, vendor: str, master_entity: Any, base_queries: List[str]) -> List[str]:
        v = str(vendor or '').lower().replace(" ", "")
        queries = list(base_queries)

        if master_entity:
            mpn = getattr(master_entity, 'part_number', '')
            mn = getattr(master_entity, 'model_number', '')
            b = getattr(master_entity, 'brand', '')
            s = getattr(master_entity, 'series', '')
            m = getattr(master_entity, 'model', '')
            ram = getattr(master_entity, 'ram', '')
            st = getattr(master_entity, 'storage', '')

            if mpn: queries.insert(0, mpn)
            if mn and mn not in queries: queries.insert(0, mn)
            if b and s and m:
                spec_q = f"{b} {s} {m} {ram} {st}".strip()
                if spec_q not in queries:
                    queries.insert(0, spec_q)

        seen = set()
        deduped = []
        for q in queries:
            q_clean = str(q).strip()
            if q_clean and q_clean.lower() not in seen:
                seen.add(q_clean.lower())
                deduped.append(q_clean)

        return deduped

vendor_adapter_registry = VendorAdapterRegistry()
