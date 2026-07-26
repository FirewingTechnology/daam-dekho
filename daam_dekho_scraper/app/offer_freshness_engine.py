from datetime import datetime, timedelta

class OfferFreshnessEngine:
    """Module 1: Offer Freshness Engine."""

    def compute_freshness(self, offer_id, last_verified_dt=None):
        now = datetime.now()
        last_v = last_verified_dt or now

        diff_minutes = (now - last_v).total_seconds() / 60.0

        if diff_minutes <= 15:
            label = f"Fresh ({int(diff_minutes)} mins ago)"
            score = 100.0
            status = "FRESH"
        elif diff_minutes <= 1440:
            label = "Verified Today"
            score = 90.0
            status = "RECENT"
        elif diff_minutes <= 2880:
            label = "Yesterday"
            score = 75.0
            status = "STALE"
        else:
            label = "Expired"
            score = 40.0
            status = "EXPIRED"

        next_v = (now + timedelta(hours=6)).isoformat()

        return {
            "offer_id": offer_id,
            "last_seen": now.isoformat(),
            "last_verified": last_v.isoformat(),
            "verification_status": status,
            "freshness_label": label,
            "freshness_score": score,
            "next_verification": next_v,
            "version": "v2.7"
        }

offer_freshness = OfferFreshnessEngine()
