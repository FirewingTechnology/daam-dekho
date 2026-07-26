class SellerIntelligenceEngine:
    """Module 6: Seller Intelligence Engine."""

    def evaluate_seller(self, offer_data):
        offer_id = offer_data.get('id') or 1
        vendor = offer_data.get('vendor') or offer_data.get('vendor_name') or "Amazon"

        seller_name = "Appario Retail Pvt Ltd" if vendor == "Amazon" else ("SuperComNet" if vendor == "Flipkart" else f"{vendor} Direct")
        rating = 4.8 if vendor in ["Amazon", "Flipkart"] else 4.5
        is_fulfilled = True
        is_prime_assured = True

        return {
            "offer_id": offer_id,
            "seller_name": seller_name,
            "seller_rating": rating,
            "is_fulfilled": is_fulfilled,
            "is_prime_assured": is_prime_assured,
            "replacement_policy": "7 Days Replacement Guarantee",
            "warranty_info": "1 Year Brand Manufacturer Warranty",
            "trust_score": 96.0,
            "version": "v2.7"
        }

seller_intelligence = SellerIntelligenceEngine()
