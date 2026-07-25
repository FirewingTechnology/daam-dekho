import re
from app.logger import get_logger

logger = get_logger("spec_extractor")

class SpecExtractor:
    @staticmethod
    def extract_from_title(title, category="mobiles"):
        """Extracts specs from title based on category."""
        specs = {
            "ram": "N/A", "rom": "N/A", "camera": "N/A", 
            "display": "N/A", "battery": "N/A", "processor": "N/A"
        }
        if not title: return specs
        t = title.upper()

        if category == "mobiles":
            # RAM/ROM: 8/128, 8GB/256GB
            mem_match = re.search(r'(\d+)\s*GB\s*/\s*(\d+)\s*GB', t)
            if mem_match:
                specs["ram"], specs["rom"] = f"{mem_match.group(1)} GB", f"{mem_match.group(2)} GB"
            
            if specs["ram"] == "N/A":
                ram_match = re.search(r'(\d+)\s*GB\s*RAM', t)
                if ram_match: specs["ram"] = f"{ram_match.group(1)} GB"
            
            if specs["rom"] == "N/A":
                rom_match = re.search(r'(\d+)\s*GB\s*(?:ROM|STORAGE|INTERNAL)', t)
                if rom_match: specs["rom"] = f"{rom_match.group(1)} GB"

        elif category == "laptops":
            # RAM
            ram_match = re.search(r'(\d+)\s*GB\s*RAM', t)
            if ram_match: specs["ram"] = f"{ram_match.group(1)} GB"
            
            # Storage (SSD/HDD)
            storage_match = re.search(r'(\d+)\s*(?:GB|TB)\s*(?:SSD|HDD)', t)
            if storage_match: specs["rom"] = storage_match.group(0)
            
            # Processor
            proc_match = re.search(r'(INTEL CORE I[3579]|RYZEN [3579]|APPLE M[123])', t)
            if proc_match: specs["processor"] = proc_match.group(0)

        return specs

    @staticmethod
    def extract_from_pdp_table(table_rows, category="mobiles"):
        """Extracts specs from a list of (key, value) pairs from PDP tables."""
        specs = {}
        for key, val in table_rows:
            k = key.lower().strip()
            v = val.strip()
            
            if "ram" in k and "type" not in k: specs["ram"] = v
            elif any(x in k for x in ["storage", "rom", "internal memory", "hard drive", "ssd"]): specs["rom"] = v
            elif "processor" in k or "chipset" in k: specs["processor"] = v
            elif "display" in k or "screen size" in k: specs["display"] = v
            elif "battery" in k: specs["battery"] = v
            elif "camera" in k and "front" not in k: specs["camera"] = v
            elif "front camera" in k or "selfie" in k: specs["front_camera"] = v
            
        return specs

extractor = SpecExtractor()
