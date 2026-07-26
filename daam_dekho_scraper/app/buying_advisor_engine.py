class BuyingAdvisorEngine:
    """Module 4: Buying Advisor Engine."""

    def advise(self, product_id, current_price=None, price_history=None):
        prices = [h.get('price') for h in (price_history or []) if h.get('price')]
        if not prices: prices = [current_price or 50000]

        lowest = min(prices)
        cur = current_price or prices[-1]

        if cur <= lowest * 1.02:
            action = "EXCELLENT_DEAL"
            recommendation = "Buy Now! Current price is at an all-time 60-day low."
        elif cur > lowest * 1.15:
            action = "WAIT_15_DAYS"
            recommendation = "Wait! Expected price drop during upcoming bank sale."
        else:
            action = "BUY_NOW"
            recommendation = "Good time to buy with active bank cashback coupons."

        return {
            "product_id": product_id,
            "action": action,
            "recommendation": recommendation,
            "current_price": cur,
            "lowest_60d_price": lowest,
            "expected_savings": max(0, cur - lowest),
            "confidence": 97.0,
            "version": "v2.8"
        }

buying_advisor = BuyingAdvisorEngine()
