from app.database.manager import db_manager
from app.ai_spec_enrichment import ai_spec_enrichment
from app.ai_conflict_detector import ai_conflict_detector
from app.ai_summary_engine import ai_summary_engine
from app.ai_alternatives_engine import ai_alternatives_engine
from app.ai_accessory_graph import ai_accessory_graph
from app.ai_successor_graph import ai_successor_graph
from app.ai_image_engine import ai_image_engine
from app.ai_price_intelligence import ai_price_intelligence
from app.ai_buying_recommendation import ai_buying_recommendation
from app.ai_scorecard_engine import ai_scorecard_engine
from app.logger import get_logger

logger = get_logger("ai_product_agent")

class AIProductAgent:
    """Master AI Product Agent for DaamDekho v2.5."""

    def analyze_and_enrich_product(self, product_id):
        import sqlite3
        conn = db_manager.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT id, title, brand, category, canonical_title, base_image FROM products_master WHERE id = ?", (product_id,))
        pm = cursor.fetchone()
        if not pm:
            conn.close()
            return {"status": "error", "message": "Product not found"}

        p_data = dict(pm)

        cursor.execute("SELECT * FROM vendor_products WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)", (product_id,))
        v_offers = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT spec_key, spec_value FROM product_specifications WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)", (product_id,))
        specs = dict(cursor.fetchall())

        cursor.execute("SELECT price, recorded_at FROM price_history WHERE vendor_product_id IN (SELECT id FROM vendor_products WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?))", (product_id,))
        p_history = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT id, title, brand, category FROM products_master WHERE id != ? LIMIT 20", (product_id,))
        cands = [dict(r) for r in cursor.fetchall()]

        # Run 11 AI Modules
        enrichment = ai_spec_enrichment.enrich_product_specs(p_data, vendor_offers=v_offers, existing_specs=specs)
        conflicts = ai_conflict_detector.detect_conflicts(product_id, vendor_offers=v_offers)
        summary = ai_summary_engine.generate_summary(p_data, specs=enrichment['enriched_specs'], vendor_offers=v_offers)
        alternatives = ai_alternatives_engine.discover_alternatives(p_data, catalog_candidates=cands)
        accessories = ai_accessory_graph.discover_accessories(p_data)
        lineage = ai_successor_graph.detect_lineage(p_data, candidate_products=cands)
        image_ai = ai_image_engine.evaluate_images(p_data, vendor_offers=v_offers)
        price_intel = ai_price_intelligence.analyze_pricing(p_data, vendor_offers=v_offers, price_history=p_history)
        recommendation = ai_buying_recommendation.generate_recommendation(p_data, vendor_offers=v_offers, price_intel=price_intel)
        scorecard = ai_scorecard_engine.calculate_scorecard(p_data, specs=enrichment['enriched_specs'], price_intel=recommendation)

        # Store AI Summary
        cursor.execute("""
            INSERT INTO ai_product_summary (product_id, short_summary, long_summary, pros, cons, highlights, ideal_for, not_recommended_for, confidence, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(product_id) DO UPDATE SET 
                short_summary=excluded.short_summary,
                long_summary=excluded.long_summary,
                pros=excluded.pros,
                cons=excluded.cons,
                highlights=excluded.highlights
        """, (product_id, summary['short_summary'], summary['long_summary'], summary['pros'], summary['cons'],
              summary['highlights'], summary['ideal_for'], summary['not_recommended_for'], summary['confidence'], summary['version']))

        # Store AI Scorecard
        cursor.execute("""
            INSERT INTO ai_product_score (product_id, performance_score, display_score, battery_score, camera_score, gaming_score, value_score, repairability_score, software_score, overall_ai_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(product_id) DO UPDATE SET overall_ai_score=excluded.overall_ai_score
        """, (product_id, scorecard['performance_score'], scorecard['display_score'], scorecard['battery_score'],
              scorecard['camera_score'], scorecard['gaming_score'], scorecard['value_score'], scorecard['repairability_score'],
              scorecard['software_score'], scorecard['overall_ai_score']))

        # Store AI Recommendation
        cursor.execute("""
            INSERT INTO ai_recommendations (product_id, best_vendor_today, expected_savings, recommendation_action, why_reason, price_confidence)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(product_id) DO UPDATE SET recommendation_action=excluded.recommendation_action, why_reason=excluded.why_reason
        """, (product_id, recommendation['best_vendor_today'], recommendation['expected_savings'],
              recommendation['recommendation_action'], recommendation['why_reason'], recommendation['price_confidence']))

        conn.commit()
        conn.close()

        return {
            "product_id": product_id,
            "summary": summary,
            "scorecard": scorecard,
            "recommendation": recommendation,
            "price_intelligence": price_intel,
            "alternatives": alternatives,
            "accessories": accessories,
            "lineage": lineage,
            "image_eval": image_ai,
            "conflicts": conflicts,
            "status": "AI_ENRICHED"
        }

ai_product_agent = AIProductAgent()
