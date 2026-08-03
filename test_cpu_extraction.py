import sqlite3, re

def extract_cpu(title):
    patterns = [
        r'(Snapdragon\s*\d+\s*Gen\s*\d+|Snapdragon\s*\d+[A-Z]?)',
        r'(Exynos\s*\d+)',
        r'(Dimensity\s*\d+[A-Z]?)',
        r'(Helio\s*[A-Z0-9]+)',
        r'(Intel\s*Core\s*(?:Ultra\s*)?[iI][3579]-?\w*|Core\s*Ultra\s*\d+|Intel\s*Core\s*[iI][3579])',
        r'(AMD\s*Ryzen\s*\d+\s*\d{4}[A-Z]*|Ryzen\s*\d+\s*\d{4}[A-Z]*)',
        r'(Apple\s*A\d+\s*Bionic|A\d+\s*Pro|M[1234]\s*(?:Pro|Max|Ultra)?)'
    ]
    for p in patterns:
        m = re.search(p, title, flags=re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None

conn = sqlite3.connect('daamdekho.db')
c = conn.cursor()

c.execute("SELECT id, title FROM vendor_products WHERE title LIKE '%Snapdragon%' OR title LIKE '%Exynos%' OR title LIKE '%Dimensity%' OR title LIKE '%Intel%' OR title LIKE '%Ryzen%' OR title LIKE '%Core%' OR title LIKE '%Ultra%'")
rows = c.fetchall()
print(f"Found {len(rows)} products with CPU processor keywords in title:")
for r in rows:
    extracted = extract_cpu(r[1])
    print(f"  ID: {r[0]} | Extracted: '{extracted}' | Title: '{r[1][:80]}...'")

conn.close()
