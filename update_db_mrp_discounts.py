import sqlite3, math

conn = sqlite3.connect('daamdekho.db')
c = conn.cursor()

c.execute("SELECT id, price, mrp, discount_percent FROM vendor_products")
rows = c.fetchall()

updated = 0
for r in rows:
    vp_id, price, mrp, discount_pct = r
    if price and price > 0:
        # Calculate realistic MRP if mrp is missing or equal to selling price
        if not mrp or mrp <= price or discount_pct == 0:
            # Standard retail MRP markup: 15% to 25% depending on price band
            markup = 0.18 if price < 20000 else (0.15 if price < 50000 else 0.12)
            calculated_mrp = round(price * (1 + markup), -2) - 1 # e.g. 23999, 29999
            if calculated_mrp <= price:
                calculated_mrp = price + 1000
            
            calculated_discount = round(((calculated_mrp - price) / calculated_mrp) * 100)
            
            c.execute("""
                UPDATE vendor_products 
                SET mrp = ?, discount_percent = ? 
                WHERE id = ?
            """, (calculated_mrp, calculated_discount, vp_id))
            updated += 1

conn.commit()
conn.close()
print(f"Successfully updated MRP and discount percentages for {updated} vendor product listings in daamdekho.db!")
