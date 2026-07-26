class PriceChangeDetectionEngine:
    """Module 3: Price Change Detection Engine."""

    def detect_changes(self, offer_id, old_data, new_data):
        events = []

        old_price = old_data.get('price', 0)
        new_price = new_data.get('price', 0)
        delta = new_price - old_price

        if old_price > 0 and new_price > 0:
            if new_price < old_price:
                events.append({
                    "offer_id": offer_id,
                    "event_name": "PRICE_DROP",
                    "old_value": str(old_price),
                    "new_value": str(new_price),
                    "change_delta": delta
                })
            elif new_price > old_price:
                events.append({
                    "offer_id": offer_id,
                    "event_name": "PRICE_INCREASE",
                    "old_value": str(old_price),
                    "new_value": str(new_price),
                    "change_delta": delta
                })

        old_seller = old_data.get('seller_name', '')
        new_seller = new_data.get('seller_name', '')
        if old_seller and new_seller and old_seller != new_seller:
            events.append({
                "offer_id": offer_id,
                "event_name": "SELLER_CHANGE",
                "old_value": old_seller,
                "new_value": new_seller,
                "change_delta": 0.0
            })

        return {
            "offer_id": offer_id,
            "events_detected": events,
            "has_changes": len(events) > 0,
            "version": "v2.7"
        }

price_change_detection = PriceChangeDetectionEngine()
