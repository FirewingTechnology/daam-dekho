from rapidfuzz import fuzz

def match_products(products: list, threshold: int = 80) -> list:
    """
    Groups products by matching titles across different vendors using RapidFuzz.
    """
    merged = []
    matched_indices = set()

    for i, p1 in enumerate(products):
        if i in matched_indices:
            continue
            
        current_group = {
            "master_title": p1["title"],
            "brand": p1["brand"],
            "category": p1.get("category", "General"),
            "vendors": [p1],
            "offers": p1.get("offers", [])
        }
        matched_indices.add(i)

        for j, p2 in enumerate(products):
            if j in matched_indices:
                continue

            # Compare titles
            similarity = fuzz.token_sort_ratio(p1["title"].lower(), p2["title"].lower())
            
            if similarity >= threshold:
                current_group["vendors"].append(p2)
                current_group["offers"].extend(p2.get("offers", []))
                matched_indices.add(j)
                
        merged.append(current_group)

    return merged
