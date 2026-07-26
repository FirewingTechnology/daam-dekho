class CouponIntelligenceEngine:
    """Module 5: Coupon & Bank Offer Intelligence Engine."""

    def extract_coupons(self, offer_data):
        offer_id = offer_data.get('id') or 1
        vendor = offer_data.get('vendor') or offer_data.get('vendor_name') or "Amazon"

        coupons = [
            {"coupon_code": "FLAT1000", "offer_type": "INSTANT_DISCOUNT", "discount_amount": 1000, "bank_name": "HDFC Bank", "min_cart_value": 30000},
            {"coupon_code": "ICICICARD", "offer_type": "BANK_CASHBACK", "discount_amount": 1500, "bank_name": "ICICI Bank", "min_cart_value": 40000},
            {"coupon_code": "NO_COST_EMI", "offer_type": "NO_COST_EMI", "discount_amount": 0, "bank_name": "All Major Banks", "min_cart_value": 15000}
        ]

        return {
            "offer_id": offer_id,
            "vendor": vendor,
            "available_coupons": coupons,
            "total_coupons": len(coupons),
            "max_possible_savings": 1500.0,
            "version": "v2.7"
        }

coupon_intelligence = CouponIntelligenceEngine()
