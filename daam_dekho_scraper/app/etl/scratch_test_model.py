import re

titles = [
    "Samsung Galaxy A35 5G (Awesome Navy, 8GB RAM, 128GB Storage)",
    "SAMSUNG Galaxy A35 5G (Awesome Iceblue, 128 GB)",
    "Samsung Galaxy A35 5G 8GB RAM 128GB ROM Awesome Navy",
    "Samsung Galaxy A35 5G, Smartphone (8GB RAM, 128GB)",
    "Samsung Galaxy A35 5G (Awesome Lilac, 8GB RAM, 256GB Storage)"
]

def clean_model_name(title: str, brand: str = "Samsung", series: str = "Galaxy A") -> str:
    clean = re.sub(r'\(.*?\)', '', title)
    if brand:
        clean = re.sub(r'\b' + re.escape(brand) + r'\b', '', clean, flags=re.IGNORECASE)
    if series:
        clean = re.sub(r'\b' + re.escape(series) + r'\b', '', clean, flags=re.IGNORECASE)

    noise_patterns = [
        r'\b(?:smartphone|mobile|phone|phones|laptops?|notebooks?|computers?)\b',
        r'\b(?:rom|ram|ssd|hdd|storage|gb|tb|mb|edition|dual sim|unlocked)\b',
        r'\b(?:awesome|navy|iceblue|black|silver|grey|gray|gold|white|green|purple|lavender|blue|red|lilac)\b',
        r'\b(?:victus|zapcase|cover|case|pouch|protector|tempered|glass|with|without|charger)\b'
    ]
    for pat in noise_patterns:
        clean = re.sub(pat, '', clean, flags=re.IGNORECASE)

    clean = re.sub(r'[^\w\s]', ' ', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()

    # Extract model like A35 5G or A35
    m = re.search(r'\b([A-Z0-9]{1,5}(?:\s*5G|\s*4G|\s*Ultra|\s*Plus|\s*Pro|\s*FE)?)\b', clean, re.IGNORECASE)
    if m:
        return m.group(1).upper()

    return clean.upper()

for t in titles:
    print(f"TITLE: {t}")
    print(f"  --> NORM MODEL: '{clean_model_name(t)}'\n")
