class OfferQualityScoreEngine:
    """Module 8: Offer Quality Score Engine."""

    def calculate_score(self, offer_data, verification_res=None, freshness_res=None):
        url_score = 100.0 if offer_data.get('url') else 50.0
        price_score = 100.0 if offer_data.get('price') else 40.0
        seller_score = 95.0
        stock_score = 100.0 if offer_data.get('stock_status', 'IN_STOCK') == 'IN_STOCK' else 30.0
        freshness_score = freshness_res.get('freshness_score', 100.0) if freshness_res else 100.0

        overall = round((url_score + price_score + seller_score + stock_score + freshness_score) / 5, 1)

        return {
            "offer_id": offer_data.get('id') or 1,
            "quality_score": overall,
            "url_score": url_score,
            "price_score": price_score,
            "seller_score": seller_score,
            "stock_score": stock_score,
            "freshness_score": freshness_score,
            "version": "v2.7"
        }

offer_quality_score = OfferQualityScoreEngine()
