import sqlite3
from app.database.manager import db_manager
from app.logger import get_logger

logger = get_logger("ai_self_improvement")

class AIKnowledgeSelfImprovementEngine:
    """Module 11: Knowledge Graph Self Improvement Engine."""

    def run_nightly_improvement(self):
        logger.info("Executing Nightly AI Knowledge Graph Self-Improvement Pipeline...")
        conn = db_manager.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # 1. Audit missing specs & trigger AI Spec Enrichment
        cursor.execute("SELECT id, title, brand, category FROM products_master")
        masters = [dict(r) for r in cursor.fetchall()]
        
        enriched_count = 0
        conflicts_count = 0

        for m in masters:
            pid = m['id']
            title, brand, category = m['title'], m['brand'], m['category']
            cursor.execute("SELECT * FROM vendor_products WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)", (pid,))
            v_offers = [dict(r) for r in cursor.fetchall()]

            cursor.execute("SELECT spec_key, spec_value FROM product_specifications WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)", (pid,))
            specs = dict(cursor.fetchall())

            # Module 1 & 2 integration
            from app.ai_spec_enrichment import ai_spec_enrichment
            from app.ai_conflict_detector import ai_conflict_detector

            p_data = {"id": pid, "title": title, "brand": brand, "category": category}
            enrichment_res = ai_spec_enrichment.enrich_product_specs(p_data, vendor_offers=v_offers, existing_specs=specs)
            conflict_res = ai_conflict_detector.detect_conflicts(pid, vendor_offers=v_offers)

            if enrichment_res['enrichment_audit']:
                for item in enrichment_res['enrichment_audit']:
                    cursor.execute("""
                        INSERT INTO ai_enrichment_history (product_id, field_name, enriched_value, source_vendor, confidence)
                        VALUES (?, ?, ?, ?, ?)
                    """, (pid, item['field_name'], item['enriched_value'], item['source_vendor'], item['confidence']))
                    enriched_count += 1

            if conflict_res['conflicts']:
                for c_item in conflict_res['conflicts']:
                    cursor.execute("""
                        INSERT INTO ai_conflicts (product_id, spec_key, vendor_a, value_a, vendor_b, value_b, conflict_status)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (pid, c_item['spec_key'], c_item['vendor_a'], c_item['value_a'], c_item['vendor_b'], c_item['value_b'], c_item['conflict_status']))
                    conflicts_count += 1

        conn.commit()
        conn.close()

        logger.info(f"Nightly Self-Improvement complete. Enriched {enriched_count} missing fields, flagged {conflicts_count} specification conflicts.")
        return {
            "status": "SUCCESS",
            "enriched_fields": enriched_count,
            "flagged_conflicts": conflicts_count,
            "version": "v2.5"
        }

ai_self_improvement = AIKnowledgeSelfImprovementEngine()
