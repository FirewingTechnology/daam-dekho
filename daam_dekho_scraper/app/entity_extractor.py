import re
from app.brand_alias import brand_alias_engine

COLOR_DICTIONARY = [
    "titanium gray", "titanium grey", "titanium black", "titanium blue", "titanium yellow",
    "titanium silver", "titanium white", "titanium whitesilver", "titanium silverblue",
    "natural titanium", "desert titanium", "phantom black", "phantom white", "starlight red",
    "crimson red", "space black", "space gray", "space grey", "sky blue", "ocean blue",
    "midnight black", "midnight blue", "cobalt violet", "deep purple", "sierra blue",
    "alpine green", "pacific blue", "rose gold", "champagne gold", "cosmic black",
    "starlight", "midnight", "graphite", "lavender", "cream", "yellow", "lime", "violet",
    "black", "blue", "green", "silver", "white", "gray", "grey", "red", "purple",
    "pink", "gold", "orange", "bronze", "beige"
]

MARKETING_WORDS = [
    r'\b5g\s+ai\s+smartphone\b', r'\bai\s+smartphone\b', r'\bsmartphone\b', r'\bmobile\s+phone\b',
    r'\bmobile\b', r'\bphone\b', r'\bflagship\b', r'\bultra\b\s+(?=camera|battery|display)',
    r'\bdual\s+sim\b', r'\bnew\s+launch\b', r'\b2025\s+edition\b', r'\b2024\s+edition\b',
    r'\bofficial\b', r'\boriginal\b', r'\bdeal\b', r'\bbest\s+seller\b', r'\blatest\b',
    r'\bwith\s+warranty\b', r'\boffers\b', r'\bspecial\s+edition\b', r'\blimited\s+edition\b',
    r'\bwith\s+other\s+offers\b', r'\bbuilt-in\s+privacy\s+display\b', r'\bphoto\s+assist\b',
    r'\bcreative\s+studio\b', r'\blong\s+battery\s+life\b', r'\bs\s+pen\s+included\b',
    r'\bsuper\s+amoled\b', r'\bamoled\b', r'\b50mp\b', r'\b108mp\b', r'\b200mp\b', r'\b7200mah\b',
    r'\b5000mah\b', r'\b6000mah\b', r'\bdimensity\s+\d{4}\b', r'\bsnapdragon\s+\d(?:\s*gen\s*\d)?\b'
]

class EntityExtractor:
    """Dedicated Entity Extraction Engine for Enterprise Cataloging."""

    def normalize_brand(self, title, brand=None):
        return brand_alias_engine.normalize_brand(brand, title)

    def extract_color(self, title, specs=None):
        specs = specs or {}
        spec_color = specs.get('color', '').lower().strip()
        if spec_color and spec_color not in ['n/a', 'none', 'unknown']:
            for col in COLOR_DICTIONARY:
                if col in spec_color:
                    return col
            return spec_color

        t_lower = (title or "").lower()
        for col in COLOR_DICTIONARY:
            if re.search(r'\b' + re.escape(col) + r'\b', t_lower):
                return col
        return None

    def clean_marketing_words(self, title):
        if not title:
            return ""
        t = title
        for pattern in MARKETING_WORDS:
            t = re.sub(pattern, ' ', t, flags=re.IGNORECASE)
        t = re.sub(r'\s+', ' ', t).strip()
        return t

    def extract_ram(self, title, specs=None):
        specs = specs or {}
        spec_ram = specs.get('ram', '').lower().replace(' ', '')
        if spec_ram and spec_ram not in ['n/a', 'none']:
            m = re.search(r'(\d+)\s*gb', spec_ram)
            if m:
                return f"{m.group(1)}gb"
            return spec_ram

        t_lower = (title or "").lower()
        ram_match = re.search(r'\b(\d+)\s*gb\s*(?:ram|memory)\b', t_lower)
        if ram_match:
            return f"{ram_match.group(1)}gb"

        ram_standalone = re.search(r'\b(4|6|8|12|16|24|32|64)\s*gb\b', t_lower)
        if ram_standalone:
            return f"{ram_standalone.group(1)}gb"
        return None

    def extract_storage(self, title, specs=None):
        specs = specs or {}
        spec_storage = (specs.get('storage', '') or specs.get('rom', '') or specs.get('ssd', '')).lower().replace(' ', '')
        if spec_storage and spec_storage not in ['n/a', 'none']:
            m = re.search(r'(\d+)\s*(gb|tb)', spec_storage)
            if m:
                return f"{m.group(1)}{m.group(2)}"
            return spec_storage

        t_lower = (title or "").lower()
        st_match = re.search(r'\b(\d+)\s*(gb|tb)\s*(?:storage|rom|ssd|hdd|internal)\b', t_lower)
        if st_match:
            return f"{st_match.group(1)}{st_match.group(2)}"

        tb_match = re.search(r'\b(1|2)\s*tb\b', t_lower)
        if tb_match:
            return f"{tb_match.group(1)}tb"

        gb_match = re.search(r'\b(64|128|256|512|1024)\s*gb\b', t_lower)
        if gb_match:
            return f"{gb_match.group(1)}gb"
        return None

    def extract_cpu_gpu(self, title, specs=None):
        specs = specs or {}
        cpu = (specs.get('processor', '') or specs.get('cpu', '')).lower().strip()
        gpu = specs.get('gpu', '').lower().strip()

        t_lower = (title or "").lower()
        if not cpu:
            intel = re.search(r'\b(i[3579])[\s-]*(\d{4,5}[hup]?|core\s+ultra\s+[579])\b', t_lower)
            ryzen = re.search(r'\b(ryzen\s+[3579])[\s-]*(\d{4}[hup]?)\b', t_lower)
            snap = re.search(r'\b(snapdragon\s+\d(?:\s*gen\s*\d)?)\b', t_lower)
            m_chip = re.search(r'\b(m[1234]\s*(?:pro|max|ultra)?)\b', t_lower)
            dimensity = re.search(r'\b(dimensity\s+\d{4})\b', t_lower)

            if intel: 
                cpu = f"{intel.group(1)}-{intel.group(2)}" if intel.group(1).startswith('i') else intel.group(0).replace(' ', '')
            elif ryzen: 
                cpu = f"{ryzen.group(1).replace(' ', '')}-{ryzen.group(2)}"
            elif snap: cpu = snap.group(1).replace(' ', '')
            elif m_chip: cpu = m_chip.group(1).replace(' ', '')
            elif dimensity: cpu = dimensity.group(1).replace(' ', '')

        if not gpu:
            rtx = re.search(r'\b(rtx\s*\d{4}\s*(?:ti)?|gtx\s*\d{4})\b', t_lower)
            radeon = re.search(r'\b(radeon\s+[rx]\s*\d{4})\b', t_lower)
            if rtx: gpu = rtx.group(1).replace(' ', '')
            elif radeon: gpu = radeon.group(1).replace(' ', '')

        return cpu or None, gpu or None

    def extract_display(self, title, specs=None):
        specs = specs or {}
        disp = (specs.get('display', '') or specs.get('screen_size', '')).lower().strip()
        if disp and disp not in ['n/a', 'none']:
            m = re.search(r'(\d{1,2}(?:\.\d)?)\s*(?:inch|\"|\')?', disp)
            if m:
                return f"{m.group(1)}inch"

        t_lower = (title or "").lower()
        disp_match = re.search(r'\b(\d{1,2}\.\d)\s*(?:inch|\"|\'|\s*display|\s*screen)\b', t_lower)
        if disp_match:
            return f"{disp_match.group(1)}inch"
        return None

    def extract_network(self, title, specs=None):
        t_lower = (title or "").lower()
        if '5g' in t_lower:
            return '5g'
        elif '4g' in t_lower or 'lte' in t_lower:
            return '4g'
        elif 'wifi' in t_lower or 'wi-fi' in t_lower:
            return 'wifi'
        return '4g/5g'

    def extract_model_and_series(self, title, category="Mobiles"):
        if not title:
            return "Standard", "Model"

        t = title.strip()
        t_lower = t.lower()

        # iPhone Series
        iphone = re.search(r'\biphone\s+(16\s*pro\s*max|16\s*pro|16\s*plus|16|15\s*pro\s*max|15\s*pro|15\s*plus|15|14\s*plus|14\s*pro\s*max|14\s*pro|14|13\s*mini|13|12|11|se)\b', t_lower)
        if iphone:
            return "iPhone", f"iPhone {iphone.group(1).title()}"

        # Samsung Series
        samsung = re.search(r'\bgalaxy\s+(s\d{2}\s*ultra|s\d{2}\s*plus|s\d{2}\s*fe|s\d{2}|a\d{2}\s*5g|a\d{2}|m\d{2}|f\d{2}|z\s*fold\s*\d|z\s*flip\s*\d)\b', t_lower)
        if samsung:
            return "Galaxy", f"Galaxy {samsung.group(1).upper()}"

        # Vivo Series (T5x 5G, V30, Y200, X100, etc.)
        vivo = re.search(r'\bvivo\s+([a-z0-9]+\s*(?:pro\s*\+|pro|5g|x|t)?)\b', t_lower)
        if vivo:
            return "Vivo", f"Vivo {vivo.group(1).title()}"


        # Realme Series
        realme = re.search(r'\brealme\s+([a-z0-9]+\s*(?:pro\s*\+|pro|5g|t)?)\b', t_lower)
        if realme:
            return "Realme", f"Realme {realme.group(1).title()}"

        # OnePlus Series
        oneplus = re.search(r'\boneplus\s+([a-z0-9\s]+(?:pro|r|nord\s*ce\s*\d|nord\s*\d)?)\b', t_lower)
        if oneplus:
            return "OnePlus", f"OnePlus {oneplus.group(1).title()}"

        # Laptop Series
        macbook = re.search(r'\bmacbook\s+(air|pro)\s*(m[1234])?\b', t_lower)
        if macbook:
            m_gen = macbook.group(2).upper() if macbook.group(2) else ""
            return "MacBook", f"MacBook {macbook.group(1).title()} {m_gen}".strip()

        victus = re.search(r'\bvictus\s*(\d{2})?\b', t_lower)
        if victus:
            return "Victus", f"Victus {victus.group(1) or '15'}"

        rog = re.search(r'\brog\s+(strix\s*[a-z0-9]+|zephyrus\s*[a-z0-9]+|flow)\b', t_lower)
        if rog:
            return "ROG", f"ROG {rog.group(1).title()}"

        legion = re.search(r'\blegion\s+(slim\s*\d|\d)\b', t_lower)
        if legion:
            return "Legion", f"Legion {legion.group(1).title()}"

        # Generic Model extraction
        tokens = [w for w in t.split() if len(w) > 1 and not any(re.search(p, w.lower()) for p in MARKETING_WORDS)]
        series = tokens[1] if len(tokens) > 1 else tokens[0] if tokens else "Series"
        model = " ".join(tokens[:3]) if tokens else "Model"
        return series, model


    def extract_all(self, title, specs=None, category="Mobiles", brand=None):
        specs = specs or {}
        norm_brand = self.normalize_brand(title, brand or specs.get('brand'))
        cleaned_title = self.clean_marketing_words(title)

        color = self.extract_color(title, specs)
        ram = self.extract_ram(title, specs)
        storage = self.extract_storage(title, specs)
        cpu, gpu = self.extract_cpu_gpu(title, specs)
        display = self.extract_display(title, specs)
        network = self.extract_network(title, specs)
        series, model = self.extract_model_and_series(title, category)

        model_number = (specs.get('model_number', '') or specs.get('part_number', '') or specs.get('sku', '')).strip()

        return {
            "brand": norm_brand,
            "series": series,
            "model": model,
            "color": color,
            "ram": ram,
            "storage": storage,
            "cpu": cpu,
            "gpu": gpu,
            "display": display,
            "network": network,
            "model_number": model_number,
            "cleaned_title": cleaned_title
        }

entity_extractor = EntityExtractor()
