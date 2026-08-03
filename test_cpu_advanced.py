import re

def extract_cpu_processor(title, model="", specs_json=""):
    text = f"{title} {specs_json}".strip()
    
    # 1. Regex patterns for explicit CPU Processor names
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
            
    # 2. Known model fallback CPU map
    t_upper = text.upper()
    if 'S26 ULTRA' in t_upper or 'S26+' in t_upper or 'S26 5G' in t_upper:
        return 'Snapdragon 8 Elite'
    if 'S25 ULTRA' in t_upper or 'S25+' in t_upper or 'S25 5G' in t_upper:
        return 'Snapdragon 8 Gen 3'
    if 'S24 ULTRA' in t_upper or 'FOLD6' in t_upper or 'FLIP6' in t_upper:
        return 'Snapdragon 8 Gen 3'
    if 'S23 ULTRA' in t_upper or 'S23+' in t_upper or 'S23 5G' in t_upper:
        return 'Snapdragon 8 Gen 2'
    if 'S22 ULTRA' in t_upper or 'S22+' in t_upper or 'S22 5G' in t_upper:
        return 'Snapdragon 8 Gen 1'
    if 'FOLD8' in t_upper or 'FOLD 8' in t_upper:
        return 'Snapdragon 8 Gen 3'
    if 'A55' in t_upper:
        return 'Exynos 1480'
    if 'A35' in t_upper:
        return 'Exynos 1380'
    if 'A54' in t_upper:
        return 'Exynos 1380'
    if 'M55' in t_upper:
        return 'Snapdragon 7 Gen 1'
    if 'M35' in t_upper:
        return 'Exynos 1380'

    return 'Octa-Core Processor'

# Test on sample titles from database
test_titles = [
    "Galaxy Z Fold8 Ultra 5G Smartphone with Galaxy AI (Violet Shadow, 16GB RAM, 1TB)",
    "Galaxy M06 5G Mobile (Sage Green, 4GB RAM, 128GB Storage) MediaTek Dimensity 6300",
    "Galaxy M47 5G (Rogue Red, 6GB RAM, 128GB Storage) Powerful Snapdragon Processor",
    "SAMSUNG Galaxy S25 Ultra 5G",
    "Samsung Galaxy S26 Ultra 5G (12GB RAM, 256GB Storage) Snapdragon 8 Elite Gen 5 5G",
    "Samsung Galaxy S26 5G (12GB RAM, 256GB Storage) Exynos 2600 4300 mAh Battery AI",
    "Samsung Galaxy A17 5G (8+128GB) Exynos 1330 Processor",
    "Samsung Galaxy A27 5G (8GB RAM, 256GB Storage) Snapdragon 6 Gen 3"
]

for t in test_titles:
    print(f"Title: {t[:60]}...")
    print(f" -> CPU: {extract_cpu_processor(t)}\n")
