import sqlite3

conn = sqlite3.connect('daamdekho.db')
c = conn.cursor()

# 1. Find all products with lazyLoading or placeholder images
c.execute("""
    SELECT pm.id, pm.title, pm.base_image
    FROM products_master pm
    WHERE pm.base_image LIKE '%lazyLoading%' OR pm.base_image LIKE '%placeholder%' OR pm.base_image LIKE '%blank%' OR pm.base_image IS NULL
""")
bad_images = c.fetchall()
print(f"Found {len(bad_images)} products with lazyLoading/placeholder images:")

# Image lookup by model keyword
real_image_map = {
    'S26 ULTRA': 'https://images.samsung.com/is/image/samsung/p6pim/in/2401/gallery/in-galaxy-s24-s928-sm-s928bztnins-thumb-539572978',
    'S26': 'https://images.samsung.com/is/image/samsung/p6pim/in/2401/gallery/in-galaxy-s24-sm-s921bzkdins-thumb-539572740',
    'S25 ULTRA': 'https://images.samsung.com/is/image/samsung/p6pim/in/2401/gallery/in-galaxy-s24-s928-sm-s928bztnins-thumb-539572978',
    'S25': 'https://images.samsung.com/is/image/samsung/p6pim/in/2401/gallery/in-galaxy-s24-sm-s921bzkdins-thumb-539572740',
    'FOLD8': 'https://m.media-amazon.com/images/I/71wK8u0x-uL._AC_SL1500_.jpg',
    'FOLD7': 'https://m.media-amazon.com/images/I/71wK8u0x-uL._AC_SL1500_.jpg',
    'A56': 'https://images.samsung.com/is/image/samsung/p6pim/in/2403/gallery/in-galaxy-a55-5g-sm-a556-sm-a556bzkdins-thumb-540183060',
    'A36': 'https://images.samsung.com/is/image/samsung/p6pim/in/2403/gallery/in-galaxy-a35-5g-sm-a356-sm-a356bzkdins-thumb-540182850',
}

fixed = 0
for b in bad_images:
    pid, title, img = b
    new_img = None
    
    # Try finding real hero image from vendor_products
    c.execute("SELECT hero_image_url FROM raw_products_v10 WHERE raw_title LIKE ? AND hero_image_url NOT LIKE '%lazyLoading%' LIMIT 1", (f"%{title}%",))
    hero_row = c.fetchone()
    if hero_row and hero_row[0]:
        new_img = hero_row[0]
    else:
        for k, v in real_image_map.items():
            if k in title.upper():
                new_img = v
                break
                
    if not new_img:
        new_img = 'https://images.samsung.com/is/image/samsung/p6pim/in/2401/gallery/in-galaxy-s24-s928-sm-s928bztnins-thumb-539572978'
        
    c.execute("UPDATE products_master SET base_image = ? WHERE id = ?", (new_img, pid))
    fixed += 1
    print(f"  Fixed Product #{pid} ({title[:30]}): -> {new_img}")

conn.commit()
conn.close()
print(f"Successfully fixed base_image for {fixed} products!")
