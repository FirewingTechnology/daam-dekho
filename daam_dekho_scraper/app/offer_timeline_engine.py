class OfferTimelineEngine:
    """Module 4: Offer Timeline Engine."""

    def generate_timeline(self, offer_id, history_events=None):
        history_events = history_events or []

        prices = [h.get('price') for h in history_events if h.get('price') and h.get('price') > 0]
        if not prices:
            prices = [50000]

        lowest = min(prices)
        highest = max(prices)
        avg = round(sum(prices) / max(1, len(prices)), 2)

        timeline_points = [
            {"label": "Today", "price": prices[-1]},
            {"label": "Yesterday", "price": prices[-2] if len(prices) > 1 else prices[-1]},
            {"label": "Last Week", "price": prices[0]}
        ]

        return {
            "offer_id": offer_id,
            "timeline": timeline_points,
            "lowest_price": lowest,
            "highest_price": highest,
            "average_price": avg,
            "version": "v2.7"
        }

offer_timeline = OfferTimelineEngine()
