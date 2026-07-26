class QueryValidatorEngine:
    """Modules 9 & 10: Query Validation & Suggestions Engine (v3.0)."""

    INVALID_QUERIES = ['mobile', 'mobiles', 'laptop', 'laptops', 'cheap phone', 'best mobile', 'electronics', 'phone']

    SUGGESTED_COMMANDS = [
        "Samsung Galaxy S25 Ultra",
        "Samsung Mobiles",
        "Vivo Mobiles",
        "Gaming Laptops",
        "Apple Tablets",
        "Boat Earbuds",
        "Laptop Accessories",
        "Mobile Accessories",
        "Samsung Mobiles under ₹30000"
    ]

    def validate_query(self, query):
        q = (query or "").strip().lower()

        if not q or len(q) < 3:
            return {
                "is_valid": False,
                "rejection_reason": "Query string is empty or too short.",
                "suggested_commands": self.SUGGESTED_COMMANDS
            }

        if q in self.INVALID_QUERIES:
            return {
                "is_valid": False,
                "rejection_reason": f"Query '{query}' is too broad. Searching generic terms yields millions of unrelated results.",
                "explanation": "Please specify a Brand (e.g. Vivo Mobiles), Category (e.g. Gaming Laptops), or Exact Product (e.g. Samsung Galaxy S25 Ultra).",
                "suggested_commands": self.SUGGESTED_COMMANDS
            }

        return {
            "is_valid": True,
            "rejection_reason": None,
            "suggested_commands": []
        }

query_validator = QueryValidatorEngine()
