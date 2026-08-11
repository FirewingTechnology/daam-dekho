import re
from typing import Dict, Any, List, Optional
from app.brand_alias import brand_alias_engine

class MasterProductEntity:
    """DaamDekho Master Product Entity Representation.
    Treats every product as a rich 25-attribute structured hardware identity.
    """

    SERIES_DICTIONARY = [
        "ideapad pro", "ideapad flex", "ideapad slim", "ideapad", "thinkpad", "thinkbook", "legion", "yoga", "loq",
        "galaxy s", "galaxy z", "galaxy a", "galaxy m", "galaxy f", "galaxy book",
        "rog strix", "rog zephyrus", "rog flow", "tuf gaming", "zenbook", "vivobook", "expertbook",
        "macbook pro", "macbook air", "macbook", "imac", "mac mini", "mac studio",
        "iphone", "ipad pro", "ipad air", "ipad mini", "ipad",
        "alienware", "xps", "inspiron", "vostro", "g15", "g16",
        "omen", "victus", "pavilion", "envy", "spectre", "probook", "elitebook", "omnibook", "zbook",
        "predator", "nitro", "aspire", "swift", "spin",
        "redmi note", "redmi", "poco", "mi",
        "realme gt", "realme narzo", "realme",
        "vivo x", "vivo v", "vivo t", "vivo y", "iqoo",
        "oppo reno", "oppo find", "oppo a", "oppo f",
        "oneplus nord", "oneplus",
        "pixel pro", "pixel a", "pixel"
    ]

    def __init__(self, raw_data: Optional[Dict[str, Any]] = None, title: str = "", specs: Optional[Dict[str, Any]] = None, category: str = "Laptops", brand: str = ""):
        specs = specs or {}
        if isinstance(raw_data, dict):
            title = raw_data.get('title') or title
            specs = raw_data.get('specifications') or raw_data.get('specs') or specs
            category = raw_data.get('category') or category
            brand = raw_data.get('brand') or brand

        self.original_title = title or ""
        self.category = category or "Laptops"
        self.specs = specs or {}

        # Core 25 attributes
        self.brand = brand_alias_engine.normalize_brand(brand, self.original_title)
        self.series = self._extract_series(self.original_title, self.specs)
        self.part_number = self._extract_part_number(self.original_title, self.specs)
        self.model_number = self._extract_model_number(self.original_title, self.specs)
        self.model = self._extract_model(self.original_title, self.specs, self.brand, self.series)
        self.generation = self._extract_generation(self.original_title, self.specs)
        self.cpu = self._extract_cpu(self.original_title, self.specs)
        self.gpu = self._extract_gpu(self.original_title, self.specs)
        self.ram = self._extract_ram(self.original_title, self.specs)
        self.storage = self._extract_storage(self.original_title, self.specs)
        self.display_size = self._extract_display_size(self.original_title, self.specs)
        self.display_resolution = self._extract_display_resolution(self.original_title, self.specs)
        self.panel_type = self._extract_panel_type(self.original_title, self.specs)
        self.refresh_rate = self._extract_refresh_rate(self.original_title, self.specs)
        self.operating_system = self._extract_operating_system(self.original_title, self.specs)
        self.battery = self._extract_battery(self.original_title, self.specs)
        self.camera = self._extract_spec_field(['camera', 'rear_camera', 'front_camera', 'primary_camera'])
        self.color = self._extract_color(self.original_title, self.specs)
        self.sku = self._extract_spec_field(['sku', 'product_sku', 'item_sku'])
        self.ean = self._extract_spec_field(['ean', 'ean_code', 'barcode'])
        self.upc = self._extract_spec_field(['upc', 'upc_code'])
        self.network = self._extract_network(self.original_title, self.specs)
        self.subcategory = self._extract_subcategory(self.category, self.original_title)

        self.display = self.display_size

    def _extract_spec_field(self, keys: List[str]) -> str:
        for k in keys:
            val = self.specs.get(k)
            if val and str(val).strip().lower() not in ['n/a', 'none', 'unknown', '']:
                return str(val).strip()
        return ""

    def _extract_series(self, title: str, specs: Dict[str, Any]) -> str:
        spec_series = specs.get('series') or specs.get('product_series') or specs.get('line')
        if spec_series and str(spec_series).strip().lower() not in ['n/a', 'none', '']:
            return str(spec_series).strip().title()

        t_lower = title.lower()
        for series_name in self.SERIES_DICTIONARY:
            pattern = r'\b' + re.escape(series_name) + r'(?:\b|\d|\s)'
            if re.search(pattern, t_lower):
                return series_name.title()
        return ""

    def _extract_part_number(self, title: str, specs: Dict[str, Any]) -> str:
        mpn_spec = specs.get('part_number') or specs.get('mpn') or specs.get('item_model_number') or specs.get('article_number')
        if mpn_spec and len(str(mpn_spec).strip()) >= 5:
            return str(mpn_spec).strip().upper()

        mpn_match = re.search(r'\b([0-9]{2}[A-Z0-9]{6,10}[A-Z]{2,3})\b', title)
        if mpn_match:
            return mpn_match.group(1).upper()
        return ""

    def _extract_model_number(self, title: str, specs: Dict[str, Any]) -> str:
        mn_spec = specs.get('model_number') or specs.get('model_name') or specs.get('model_code')
        if mn_spec and len(str(mn_spec).strip()) >= 3 and str(mn_spec).strip().lower() not in ['n/a', 'none']:
            return str(mn_spec).strip().upper()

        mn_match = re.search(r'\b([A-Z0-9]{2,6}-[A-Z0-9]{3,8}|[0-9]{2}[A-Z]{3}[0-9]|[A-Z]{1,2}[0-9]{3,4}[A-Z]?)\b', title)
        if mn_match:
            return mn_match.group(1).upper()
        return ""

    def _extract_model(self, title: str, specs: Dict[str, Any], brand: str, series: str) -> str:
        model_spec = specs.get('model') or specs.get('model_name')
        if model_spec and str(model_spec).strip().lower() not in ['n/a', 'none', '']:
            return str(model_spec).strip()

        clean = title
        if brand:
            clean = re.sub(r'\b' + re.escape(brand) + r'\b', '', clean, flags=re.IGNORECASE)
        if series:
            clean = re.sub(r'\b' + re.escape(series) + r'\b', '', clean, flags=re.IGNORECASE)

        clean = re.sub(r'\(.*?\)', '', clean)
        clean = re.sub(r'\b\d+\s*(?:gb|tb)\b', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\b(?:victus|zapcase|awesome|smartphone|mobile|phone|5g|4g|lte|dual sim|unlocked|ram|ssd|hdd|storage|intel|amd|core|ryzen|i[3579]|ultra|rtx|gtx|laptops?|mobiles?|phones?|notebooks?|computers?)\b', '', clean, flags=re.IGNORECASE)

        clean = re.sub(r'\s+', ' ', clean).strip()
        tokens = [t for t in clean.split() if t.lower() not in ['laptops', 'laptop', 'mobiles', 'mobile', 'phone', 'phones', 'notebook', 'notebooks']]
        if tokens:
            res_m = " ".join(tokens[:3]).strip().title()
            if res_m.lower() not in ['laptops', 'laptop', 'mobiles', 'mobile', 'generic model']:
                return res_m
        return ""

    def _extract_generation(self, title: str, specs: Dict[str, Any]) -> str:
        gen_spec = specs.get('generation') or specs.get('gen')
        if gen_spec: return str(gen_spec).strip()
        m = re.search(r'\b(\d{1,2})(?:th|st|nd|rd)\s*Gen\b', title, re.IGNORECASE)
        return f"{m.group(1)}th Gen" if m else ""

    def _extract_cpu(self, title: str, specs: Dict[str, Any]) -> str:
        cpu_spec = specs.get('cpu') or specs.get('processor') or specs.get('chipset') or specs.get('processor_name')
        if cpu_spec:
            candidate = str(cpu_spec).strip()
            # Strict rejection: Never allow CPU to be title, brand, or generic model
            if candidate.lower() in [title.lower(), self.brand.lower(), self.model.lower(), 'n/a', 'none', 'unknown', '']:
                pass
            elif re.search(r'\b(Snapdragon|Exynos|Dimensity|Helio|Core|Ryzen|Apple|A\d+|M\d+)\b', candidate, re.IGNORECASE):
                return candidate.upper()

        m_cpu = re.search(r'\b(Snapdragon\s*(?:8\s*Elite|[0-9A-Z\s]+)?|Exynos\s*\d+|Dimensity\s*\d+[A-Z]?|Helio\s*[A-Z0-9]+|Intel\s*Core\s*(?:Ultra\s*)?[iI][3579]-?\w*|Core\s*Ultra\s*\d+|Ryzen\s*[3579]\s*\d{4}|Apple\s*A\d+\s*Pro|Apple\s*A\d+|M[1234]\s*(?:Pro|Max|Ultra)?)\b', title, re.IGNORECASE)
        return m_cpu.group(1).strip().upper() if m_cpu else "UNKNOWN"

    def _extract_gpu(self, title: str, specs: Dict[str, Any]) -> str:
        gpu_spec = specs.get('gpu') or specs.get('graphics')
        if gpu_spec and str(gpu_spec).strip().lower() not in ['n/a', 'none', 'unknown', '']:
            return str(gpu_spec).strip().upper()
        m_gpu = re.search(r'\b(RTX\s*\d{4}|GTX\s*\d{4}|Radeon\s*[A-Z0-9]+|Intel\s*Iris|Apple\s*GPU)\b', title, re.IGNORECASE)
        return m_gpu.group(1).upper() if m_gpu else "UNKNOWN"

    def _extract_ram(self, title: str, specs: Dict[str, Any]) -> str:
        ram_spec = specs.get('ram') or specs.get('memory')
        if ram_spec:
            m = re.search(r'(\d+)\s*GB', str(ram_spec), re.IGNORECASE)
            if m: return f"{m.group(1)}GB"
        m_ram = re.search(r'\b(\d{1,2})\s*GB\s*(?:RAM|DDR[45]|LPDDR[45])?\b', title, re.IGNORECASE)
        return f"{m_ram.group(1)}GB" if m_ram else "UNKNOWN"

    def _extract_storage(self, title: str, specs: Dict[str, Any]) -> str:
        st_spec = specs.get('storage') or specs.get('ssd') or specs.get('rom') or specs.get('hdd')
        if st_spec:
            m = re.search(r'(\d+)\s*(GB|TB)', str(st_spec), re.IGNORECASE)
            if m: return f"{m.group(1)}{m.group(2).upper()}"
        m_st = re.search(r'\b(\d{2,4})\s*(GB|TB)\s*(?:SSD|ROM|NVMe|Storage)\b', title, re.IGNORECASE)
        if m_st: return f"{m_st.group(1)}{m_st.group(2).upper()}"
        m_st2 = re.search(r'\b(64|128|256|512|1024|1TB|2TB)\s*(GB|TB)?\b', title, re.IGNORECASE)
        if m_st2:
            val = m_st2.group(1).upper()
            unit = m_st2.group(2).upper() if m_st2.group(2) else ("TB" if "TB" in val else "GB")
            return f"{val.replace('TB', '')}{unit}"
        return "UNKNOWN"

    def _extract_display_size(self, title: str, specs: Dict[str, Any]) -> str:
        d_spec = specs.get('display') or specs.get('screen_size')
        if d_spec:
            m = re.search(r'(\d{1,2}(?:\.\d)?)\s*(?:inch|\"|\')?', str(d_spec), re.IGNORECASE)
            if m: return f"{m.group(1)}\""
        m_d = re.search(r'\b(\d{1,2}(?:\.\d)?)\s*(?:inch|\"|\')\b', title, re.IGNORECASE)
        return f"{m_d.group(1)}\"" if m_d else "UNKNOWN"

    def _extract_display_resolution(self, title: str, specs: Dict[str, Any]) -> str:
        res_spec = specs.get('resolution')
        if res_spec: return str(res_spec).strip()
        m_res = re.search(r'\b(4K|FHD\+|FHD|QHD|HD\+|1920x1080|2560x1440|3840x2160)\b', title, re.IGNORECASE)
        return m_res.group(1).upper() if m_res else "UNKNOWN"

    def _extract_panel_type(self, title: str, specs: Dict[str, Any]) -> str:
        p_spec = specs.get('panel') or specs.get('display_type')
        if p_spec: return str(p_spec).strip()
        m_p = re.search(r'\b(AMOLED|OLED|IPS|LCD|Retina|Super AMOLED)\b', title, re.IGNORECASE)
        return m_p.group(1).title() if m_p else "UNKNOWN"

    def _extract_refresh_rate(self, title: str, specs: Dict[str, Any]) -> str:
        r_spec = specs.get('refresh_rate')
        if r_spec: return str(r_spec).strip()
        m_r = re.search(r'\b(\d{2,3})\s*Hz\b', title, re.IGNORECASE)
        return f"{m_r.group(1)}Hz" if m_r else "UNKNOWN"

    def _extract_operating_system(self, title: str, specs: Dict[str, Any]) -> str:
        os_spec = specs.get('os') or specs.get('operating_system')
        if os_spec: return str(os_spec).strip()
        m_os = re.search(r'\b(Windows\s*11|Windows\s*10|macOS|Android\s*\d*|iOS\s*\d*|ChromeOS)\b', title, re.IGNORECASE)
        return m_os.group(1).title() if m_os else "UNKNOWN"

    def _extract_battery(self, title: str, specs: Dict[str, Any]) -> str:
        b_spec = specs.get('battery') or specs.get('battery_capacity')
        if b_spec: return str(b_spec).strip()
        m_b = re.search(r'\b(\d{4,5})\s*mAh\b', title, re.IGNORECASE)
        return f"{m_b.group(1)} mAh" if m_b else "UNKNOWN"

    def _extract_color(self, title: str, specs: Dict[str, Any]) -> str:
        c_spec = specs.get('color') or specs.get('colour')
        if c_spec and str(c_spec).strip().lower() not in ['default', 'unspecified', 'n/a', 'none', '']:
            return str(c_spec).strip().title()
        m_c = re.search(r'\b(Awesome Black|Awesome Navy|Awesome Iceblue|Awesome Olive|Awesome Violet|Titanium Gray|Titanium Black|Titanium Yellow|Natural Titanium|Desert Titanium|White Titanium|Black Titanium|Phantomb Black|Cream|Green|Lavender|Graphite|Moonlight Silver|Black|Silver|Grey|Gray|Blue|Red|Gold|White|Purple)\b', title, re.IGNORECASE)
        return m_c.group(1).title() if m_c else "UNKNOWN"

    def _extract_network(self, title: str, specs: Dict[str, Any]) -> str:
        n_spec = specs.get('network') or specs.get('connectivity')
        if n_spec: return str(n_spec).strip()
        m_n = re.search(r'\b(5G|4G LTE|WiFi|Wi-Fi)\b', title, re.IGNORECASE)
        return m_n.group(1).upper() if m_n else "5G"

    def _extract_subcategory(self, category: str, title: str) -> str:
        t_lower = title.lower()
        if 'gaming' in t_lower: return 'Gaming Laptops' if category == 'Laptops' else 'Gaming Phones'
        return category

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.original_title,
            "category": self.category,
            "brand": self.brand,
            "series": self.series,
            "model": self.model,
            "part_number": self.part_number,
            "model_number": self.model_number,
            "cpu": self.cpu,
            "gpu": self.gpu,
            "ram": self.ram,
            "storage": self.storage,
            "display": self.display_size,
            "color": self.color,
            "camera": self.camera
        }
