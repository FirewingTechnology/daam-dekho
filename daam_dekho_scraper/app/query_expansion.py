import re

class QueryExpansionEngine:
    """Generates intelligent vendor search variations for target queries."""
    
    @classmethod
    def expand_query(cls, target_query, category="Mobile", scrape_mode="Auto Detect"):
        """Returns a list of search keyword variations to run across scrapers."""
        if not target_query:
            return []
            
        clean_q = " ".join(target_query.strip().split())
        variations = [clean_q]
        
        q_lower = clean_q.lower()
        
        # 1. Alias & Brand Abbreviation variations
        if "samsung galaxy" in q_lower:
            variations.append(re.sub(r'samsung\s+galaxy', 'Samsung', clean_q, flags=re.IGNORECASE))
            variations.append(re.sub(r'samsung\s+galaxy', 'Galaxy', clean_q, flags=re.IGNORECASE))
        elif "galaxy" in q_lower and "samsung" not in q_lower:
            variations.append(f"Samsung {clean_q}")
            
        if "apple iphone" in q_lower:
            variations.append(re.sub(r'apple\s+iphone', 'iPhone', clean_q, flags=re.IGNORECASE))
        elif "iphone" in q_lower and "apple" not in q_lower:
            variations.append(f"Apple {clean_q}")

        if "t5x" in q_lower or "vivo t5x" in q_lower:
            variations.extend([
                "Vivo T5x 5G",
                "Vivo T5x",
                "Vivo T5x 5G 8GB",
                "Vivo T5x 5G 256GB",
                "Vivo T5x 5G 8GB 256GB"
            ])

        # Deduplicate while preserving order
        seen = set()
        unique_variations = []
        for v in variations:
            v_clean = " ".join(v.split())
            if v_clean.lower() not in seen:
                seen.add(v_clean.lower())
                unique_variations.append(v_clean)
                
        return unique_variations


query_expansion_engine = QueryExpansionEngine()
