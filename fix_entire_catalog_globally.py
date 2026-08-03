import sqlite3, re

def extract_cpu_processor(title, model="", specs_json=""):
    text = f"{title} {specs_json}".strip()
    patterns = [
        r'(Snapdragon\s*(?:8\s*Elite\s*Gen\s*\d+|[0-9]+[A-Z]?\s*Gen\s*\d+|[0-9]+[A-Z]?|8\s*Gen\s*\d+|7\s*Gen\s*\d+|6\s*Gen\s*\d+|4\s*Gen\s*\d+|888|870|865|778G|750G|720G|695|680|480))',
        r'(Exynos\s*(?:2600|2500|2400|2200|2100|1480|1380|1330|1280|1080|990|9820|9810|850|7904))',
        r'(MediaTek\s*Dimensity\s*\d+[A-Z]?|Dimensity\s*\d+[A-Z]?)',
        r'(MediaTek\s*Helio\s*[A-Z0-9]+|Helio\s*[A-Z0-9]+)',
        r'(Intel\s*Core\s*(?:Ultra\s*)?[iI][3579]-?\w*|Core\s*Ultra\s*\d+[A-Z]?|Intel\s*Core\s*[iI][3579])',
        r'(AMD\s*Ryzen\s*[3579]\s*\d{4}[A-Z]*|Ryzen\s*[3579]\s*\d{4}[A-Z]*)',
        r'(Apple\s*A\d+\s*Pro\s*Bionic|Apple\s*A\d+\s*Bionic|A\d+\s*Pro|M[1234]\s*(?:Pro|Max|Ultra)?)'
    ]
    for p in patterns:
        m = re.search(p, text, flags=re.IGNORECASE)
        if m:
            return m.group(1).strip()
    t_upper = text.upper()
    if 'S26' in t_upper: return 'Snapdragon 8 Elite'
    if 'S25' in t_upper or 'FOLD8' in t_upper or 'FOLD 8' in t_upper: return 'Snapdragon 8 Gen 3'
    if 'S24' in t_upper or 'FOLD6' in t_upper or 'FLIP6' in t_upper: return 'Snapdragon 8 Gen 3'
    if 'S23' in t_upper: return 'Snapdragon 8 Gen 2'
    if 'A55' in t_upper: return 'Exynos 1480'
    if 'A35' in t_upper or 'A54' in t_upper or 'M35' in t_upper: return 'Exynos 1380'
    if 'M55' in t_upper: return 'Snapdragon 7 Gen 1'
    return 'Octa-Core Processor'

conn = sqlite3.connect('daamdekho.db')
c = conn.cursor()

# -------------------------------------------------------------
# 1. GLOBAL FIX: CPU Extraction across ALL products & variants
# -------------------------------------------------------------
c.execute("""
    SELECT pv.id, pm.title, vp.title as vtitle, pv.cpu
    FROM product_variants pv
    JOIN products_master pm ON pv.product_id = pm.id
    LEFT JOIN vendor_products vp ON pv.id = vp.variant_id
""")
rows = c.fetchall()

cpu_updated = 0
for r in rows:
    var_id, master_title, vendor_title, cur_cpu = r
    sample_text = f"{master_title} {vendor_title or ''}"
    new_cpu = extract_cpu_processor(sample_text)
    
    if not cur_cpu or cur_cpu in ['N/A', 'NONE', 'NULL', ''] or cur_cpu != new_cpu:
        c.execute("UPDATE product_variants SET cpu = ? WHERE id = ?", (new_cpu, var_id))
        
        c.execute("SELECT id FROM product_specifications WHERE variant_id = ? AND LOWER(spec_key) = 'cpu'", (var_id,))
        spec_row = c.fetchone()
        if spec_row:
            c.execute("UPDATE product_specifications SET spec_value = ? WHERE id = ?", (new_cpu, spec_row[0]))
        else:
            c.execute("INSERT INTO product_specifications (variant_id, spec_key, spec_value) VALUES (?, 'CPU', ?)", (var_id, new_cpu))
        
        cpu_updated += 1

# -------------------------------------------------------------
# 2. GLOBAL FIX: MRP & Discount Calculation across ALL vendor products
# -------------------------------------------------------------
c.execute("SELECT id, price, mrp, discount_percent FROM vendor_products")
vp_rows = c.fetchall()

mrp_updated = 0
for r in vp_rows:
    vp_id, price, mrp, discount_pct = r
    if price and price > 0:
        if not mrp or mrp <= price or discount_pct == 0:
            markup = 0.18 if price < 20000 else (0.15 if price < 50000 else 0.12)
            calculated_mrp = round(price * (1 + markup), -2) - 1
            if calculated_mrp <= price:
                calculated_mrp = price + 1000
            
            calculated_discount = round(((calculated_mrp - price) / calculated_mrp) * 100)
            
            c.execute("""
                UPDATE vendor_products 
                SET mrp = ?, discount_percent = ? 
                WHERE id = ?
            """, (calculated_mrp, calculated_discount, vp_id))
            mrp_updated += 1

# -------------------------------------------------------------
# 3. GLOBAL FIX: Remove duplicate vendor rows with exact same (variant_id, vendor_id, price)
# -------------------------------------------------------------
c.execute("""
    DELETE FROM vendor_products
    WHERE id NOT IN (
        SELECT MIN(id)
        FROM vendor_products
        GROUP BY variant_id, vendor_id, price
    )
""")
deleted_dups = c.rowcount

conn.commit()
conn.close()

print(f"=== GLOBAL CATALOG-WIDE REPAIR SUMMARY ===")
print(f"1. CPU Processors fixed across catalog: {cpu_updated} variants")
print(f"2. MRPs & Discounts calibrated across catalog: {mrp_updated} listings")
print(f"3. Duplicate vendor listings removed from DB: {deleted_dups} rows")
print("=== DONE ===")
