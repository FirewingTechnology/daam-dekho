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

        # 2. Spec/Variant expansions for Family Mode or Auto Detect
        if scrape_mode in ["Product Family", "Auto Detect"]:
            if "s24 ultra" in q_lower or "s23 ultra" in q_lower or "s25 ultra" in q_lower:
                base = re.sub(r'\b(256gb|512gb|1tb|12gb)\b', '', clean_q, flags=re.IGNORECASE).strip()
                variations.extend([
                    f"{base} 256GB",
                    f"{base} 512GB"
                ])
            elif "iphone 15" in q_lower or "iphone 16" in q_lower or "iphone 17" in q_lower:
                base = re.sub(r'\b(128gb|256gb|512gb|1tb)\b', '', clean_q, flags=re.IGNORECASE).strip()
                variations.extend([
                    f"{base} 128GB",
                    f"{base} 256GB",
                    f"{base} 512GB"
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
