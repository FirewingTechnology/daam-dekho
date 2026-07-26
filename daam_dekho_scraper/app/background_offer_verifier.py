import sqlite3
from app.database.manager import db_manager
from app.offer_verification_engine import offer_verification
from app.offer_freshness_engine import offer_freshness
from app.offer_quality_score import offer_quality_score
from app.logger import get_logger

logger = get_logger("background_offer_verifier")

class BackgroundOfferVerifierEngine:
    """Module 10: Incremental Background Offer Verification Engine."""

    def run_incremental_verification(self):
        logger.info("Executing Enterprise Background Incremental Offer Verification...")
        conn = db_manager.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT id, title, price, url FROM vendor_products LIMIT 100")
        offers = [dict(r) for r in cursor.fetchall()]

        verified_count = 0
        changed_count = 0

        for off in offers:
            off_id = off['id']
            v_res = offer_verification.verify_offer(off)
            f_res = offer_freshness.compute_freshness(off_id)
            q_res = offer_quality_score.calculate_score(off, verification_res=v_res, freshness_res=f_res)

            cursor.execute("""
                INSERT INTO offer_verification (offer_id, http_status, title_matched, price_matched, verification_result)
                VALUES (?, ?, ?, ?, ?)
            """, (off_id, v_res['http_status'], v_res['title_matched'], v_res['price_matched'], v_res['verification_result']))

            cursor.execute("""
                INSERT INTO offer_quality (offer_id, quality_score, freshness_score)
                VALUES (?, ?, ?)
                ON CONFLICT(offer_id) DO UPDATE SET quality_score=excluded.quality_score
            """, (off_id, q_res['quality_score'], f_res['freshness_score']))

            if v_res['verification_result'] == "VERIFIED":
                verified_count += 1
            else:
                changed_count += 1

        conn.commit()
        conn.close()

        logger.info(f"Background verification completed. Verified {verified_count} active offers, flagged {changed_count} changed offers.")
        return {
            "status": "SUCCESS",
            "verified_offers": verified_count,
            "changed_offers": changed_count,
            "version": "v2.7"
        }

background_offer_verifier = BackgroundOfferVerifierEngine()
