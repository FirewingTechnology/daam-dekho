import sys
import os
import sqlite3

root_dir = os.path.dirname(os.path.abspath(__file__))
scraper_dir = os.path.join(root_dir, "daam_dekho_scraper")

# Ensure daam_dekho_scraper app package is importable
sys.path = [p for p in sys.path if p not in (root_dir, '', os.getcwd())]
sys.path.insert(0, scraper_dir)

import app
app.__path__ = [os.path.join(scraper_dir, "app")]

from app.entity_extractor import entity_extractor
from app.extractors.spec_extractor import extractor as spec_extractor

DB_PATH = os.path.join(root_dir, "daamdekho.db")

def resolve_variant_color(raw_items, category="mobiles"):
    """
    Two-Pass Color Resolution Algorithm:
    Pass 1: Extract color from raw_title or pdp_url (highest confidence).
    Pass 2: Fall back to rps_color if non-empty and valid.
    """
    # Pass 1: Extract from raw_title or pdp_url
    for raw_title, pdp_url, rps_color in raw_items:
        full_text = f"{raw_title or ''} {pdp_url or ''}".strip()
        color = entity_extractor.extract_color(full_text)
        if not color and raw_title:
            extracted_specs = spec_extractor.extract_from_title(raw_title, category=category or "mobiles")
            if extracted_specs.get("color") and extracted_specs["color"].lower() not in ("n/a", "default", "unspecified"):
                color = extracted_specs["color"]

        if color and color.lower() not in ('default', 'unspecified', 'n/a', 'none'):
            return color.strip().title()

    # Pass 2: Fall back to rps_color if valid
    for raw_title, pdp_url, rps_color in raw_items:
        if rps_color:
            color = entity_extractor.extract_color("", {"color": rps_color})
            if color and color.lower() not in ('default', 'unspecified', 'n/a', 'none'):
                return color.strip().title()

    return "Unspecified"

def backfill_colors():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🔍 Scanning database for variants requiring color backfill...")

    # Fetch all variants
    cursor.execute("""
        SELECT DISTINCT pv.id, pv.color, mp.brand, mp.model, pm.category, pm.title
        FROM product_variants pv
        LEFT JOIN master_products mp ON pv.master_product_id = mp.id
        LEFT JOIN products_master pm ON pv.product_id = pm.id
    """)
    all_variants = cursor.fetchall()

    total_scanned = len(all_variants)
    print(f"Found {total_scanned} variant records in database.\n")

    fixed_with_real_color = 0
    updated_to_unspecified = 0
    sample_changes = []

    for v_id, old_color, brand, model, category, pm_title in all_variants:
        # Fetch linked raw items from normalized_products -> raw_products / raw_product_specs
        cursor.execute("""
            SELECT DISTINCT rp.raw_title, rp.pdp_url, rps.color
            FROM product_variants pv
            JOIN master_products mp ON pv.master_product_id = mp.id
            JOIN normalized_products np ON (np.canonical_brand = mp.brand AND np.canonical_model = mp.model)
            LEFT JOIN raw_products rp ON np.raw_product_id = rp.id
            LEFT JOIN raw_product_specs rps ON rp.id = rps.raw_product_id
            WHERE pv.id = ?
        """, (v_id,))
        raw_items = cursor.fetchall()

        if not raw_items:
            # Fallback to v10 tables
            cursor.execute("""
                SELECT DISTINCT rpv10.raw_title, rpv10.canonical_url, rpsv10.color
                FROM product_variants pv
                JOIN master_products mp ON pv.master_product_id = mp.id
                JOIN normalized_entities_v10 ne ON (ne.canonical_brand = mp.brand AND ne.canonical_model = mp.model)
                LEFT JOIN raw_products_v10 rpv10 ON ne.raw_product_id = rpv10.id
                LEFT JOIN raw_product_specs_v10 rpsv10 ON rpv10.id = rpsv10.raw_product_id
                WHERE pv.id = ?
            """, (v_id,))
            raw_items = cursor.fetchall()

        new_color = resolve_variant_color(raw_items, category=category or "mobiles")

        if new_color != "Unspecified":
            fixed_with_real_color += 1
        else:
            updated_to_unspecified += 1

        # Update product_variants
        cursor.execute("UPDATE product_variants SET color = ? WHERE id = ?", (new_color, v_id))

        # Update product_variants_v10 if table exists
        try:
            cursor.execute("UPDATE product_variants_v10 SET color = ? WHERE id = ?", (new_color, v_id))
        except sqlite3.OperationalError:
            pass

        # Update normalized_specs and normalized_entities_v10 if present
        try:
            cursor.execute("UPDATE normalized_specs SET clean_color = ? WHERE normalized_product_id = ?", (new_color, v_id))
            cursor.execute("UPDATE normalized_entities_v10 SET clean_color = ? WHERE id = ?", (new_color, v_id))
        except sqlite3.OperationalError:
            pass

        # Update product_specifications and variant_specifications for "Color" key
        cursor.execute("""
            UPDATE product_specifications SET spec_value = ? 
            WHERE variant_id = ? AND LOWER(spec_key) IN ('color', 'colour')
        """, (new_color, v_id))

        cursor.execute("""
            UPDATE variant_specifications SET spec_value = ? 
            WHERE variant_id = ? AND LOWER(spec_key) IN ('color', 'colour')
        """, (new_color, v_id))

        sample_title = (raw_items[0][0] if raw_items and raw_items[0][0] else (pm_title or f"Variant {v_id}"))[:65]
        if len(sample_changes) < 15:
            sample_changes.append({
                "variant_id": v_id,
                "title": sample_title,
                "before": old_color,
                "after": new_color
            })

    conn.commit()
    conn.close()

    print("=" * 70)
    print("                 COLOR BACKFILL REPORT")
    print("=" * 70)
    print(f"Total rows scanned              : {total_scanned}")
    print(f"Fixed with real extracted color  : {fixed_with_real_color}")
    print(f"Updated to 'Unspecified'         : {updated_to_unspecified}")
    print("-" * 70)
    print("Sample Before / After Changes:")
    for s in sample_changes:
        print(f"  [ID {s['variant_id']}] {s['title']}")
        print(f"         Before: '{s['before']}' --> After: '{s['after']}'")
    print("=" * 70)
    print("✅ Backfill completed successfully.")

if __name__ == "__main__":
    backfill_colors()
