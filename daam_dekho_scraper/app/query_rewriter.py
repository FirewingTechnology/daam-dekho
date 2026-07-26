from app.query_understanding_engine import query_understanding_engine

class QueryRewriterEngine:
    """Module 2: Query Rewriter Engine."""

    def expand_query(self, query):
        parsed = query_understanding_engine.parse_query(query)
        expansions = set()

        q = parsed['original_query']
        brand = parsed['brand']
        series = parsed['series']
        model = parsed['model']
        category = parsed['category']
        ram = parsed['ram'] or ""
        storage = parsed['storage'] or ""

        expansions.add(q)
        if brand and model:
            expansions.add(f"{brand} {model}")
            expansions.add(f"{model}")
            if ram: expansions.add(f"{brand} {model} {ram}")
            if storage: expansions.add(f"{brand} {model} {storage}")
            if ram and storage: expansions.add(f"{brand} {model} {ram} {storage}")
            expansions.add(f"{brand} {model} Smartphone" if category == "Mobiles" else f"{brand} {model} Laptop")
            expansions.add(f"{brand} {model} 5G" if category == "Mobiles" else f"{brand} {model} Gaming")

        if parsed['model_number']:
            expansions.add(parsed['model_number'])
            expansions.add(f"{brand} {parsed['model_number']}")

        return {
            "original_query": query,
            "parsed_intent": parsed,
            "expanded_queries": list(expansions),
            "expansion_count": len(expansions)
        }

query_rewriter = QueryRewriterEngine()
