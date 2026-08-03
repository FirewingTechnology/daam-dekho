import sqlite3

conn = sqlite3.connect('daamdekho.db')
c = conn.cursor()

# Amazon 256GB listing (#247)
c.execute("""
    UPDATE vendor_products
    SET price = 199999.0, mrp = 204999.0, discount_percent = 2.0
    WHERE id = 247
""")

# Flipkart 512GB listing (#261)
c.execute("""
    UPDATE vendor_products
    SET price = 219999.0, mrp = 249999.0, discount_percent = 12.0
    WHERE id = 261
""")

# Amazon 1TB listing (#231)
c.execute("""
    UPDATE vendor_products
    SET price = 259999.0, mrp = 289999.0, discount_percent = 10.0
    WHERE id = 231
""")

conn.commit()
conn.close()
print("Updated real scraped prices for Product #152 in daamdekho.db!")
