import re
import uuid
import datetime
import random

def generate_product_id():
    """Generates a numeric ID based on UUID for schema compatibility."""
    return int(str(uuid.uuid4().int)[:9])

def get_timestamp():
    """Returns current timestamp in standard format."""
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def clean_price(price_str: str) -> float:
    """
    Extracts float price from strings. Handles concatenated prices like '₹11,999₹14,99920% off'
    by extracting only the first valid price.
    """
    if not price_str:
        return 0.0
    try:
        # Find the first sequence of digits and commas, optionally followed by a dot and decimals
        import re
        matches = re.findall(r'[\d,]+\.?\d*', str(price_str))
        if matches:
            clean_str = matches[0].replace(',', '')
            return float(clean_str) if clean_str else 0.0
        return 0.0
    except (ValueError, TypeError):
        return 0.0

def clean_rating(rating_str: str) -> float:
    """Extracts float rating from string like '4.4 out of 5'."""
    if not rating_str:
        return 0.0
    try:
        match = re.search(r'(\d+\.?\d*)', rating_str)
        return float(match.group(1)) if match else 0.0
    except (ValueError, AttributeError):
        return 0.0

def clean_reviews(reviews_str: str) -> int:
    """Extracts integer from reviews count string."""
    if not reviews_str:
        return 0
    try:
        clean_str = re.sub(r'[^\d]', '', reviews_str)
        return int(clean_str) if clean_str else 0
    except (ValueError, TypeError):
        return 0

def clean_title(title: str) -> str:
    """
    Cleans and minimizes product title.
    Removes common variant suffixes in parentheses/brackets and extra whitespace.
    """
    if not title:
        return ""
    
    # 1. Remove everything in parentheses and brackets at the end (often specs/colors)
    # BUT only if it doesn't contain the brand/model name itself
    # Example: "iPhone 13 (Blue, 128 GB)" -> "iPhone 13"
    cleaned = re.sub(r'\s*[([][^)\]]*?[)\]]$', '', title).strip()
    
    # 2. Remove common promotional strings
    cleaned = re.sub(r'(?i)\b(brand new|hot deal|best seller|limited time offer|deal of the day|lowest price)\b', '', cleaned)
    
    # 3. Clean up multiple pipes or separators
    cleaned = re.sub(r'\s*[|]\s*', ' ', cleaned)
    
    # 4. Remove multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    return cleaned


def get_random_user_agent():
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0"
    ]
    return random.choice(user_agents)

def ensure_chromedriver():
    """
    Installs ChromeDriver and returns the path. 
    Prefers cached drivers to avoid network connection errors.
    """
    from webdriver_manager.chrome import ChromeDriverManager
    from pathlib import Path
    import glob
    import sys
    import os

    # 1. Check local .wdm cache first to prevent "Could not reach host" network errors
    wdm_home = Path.home() / ".wdm"
    if wdm_home.exists():
        exe_name = "chromedriver.exe" if sys.platform == "win32" else "chromedriver"
        exes = list(wdm_home.glob(f"**/{exe_name}"))
        if exes:
            # Return latest mtime driver
            exes.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            return str(exes[0])

    try:
        raw_path = ChromeDriverManager().install()
        driver_dir = Path(raw_path).parent

        if sys.platform == "win32":
            candidates = glob.glob(str(driver_dir / "chromedriver.exe"))
            if not candidates:
                candidates = glob.glob(str(driver_dir.parent / "**" / "chromedriver.exe"), recursive=True)
            chromedriver_path = candidates[0] if candidates else raw_path
        else:
            candidates = glob.glob(str(driver_dir / "chromedriver"))
            chromedriver_path = candidates[0] if candidates else raw_path
        
        return chromedriver_path
    except Exception as e:
        if wdm_home.exists():
            exes = list(wdm_home.glob("**/*chromedriver*"))
            if exes:
                return str(exes[0])
        raise e

def extract_specs_from_title(title: str) -> dict:
    """
    Extracts common specifications like RAM, ROM, Camera, and Display from product titles.
    """
    specs = {
        "ram": "N/A",
        "rom": "N/A",
        "camera": "N/A",
        "display": "N/A",
        "battery": "N/A",
        "processor": "N/A"
    }
    
    if not title:
        return specs

    # Normalize title for easier extraction
    title_upper = title.upper()

    # 1. RAM extraction (e.g., 6GB RAM, 6 GB RAM, 6GB, 8 GB)
    # Check for specific "XGB RAM" first
    ram_match = re.search(r'(\d+)\s*GB\s*RAM', title_upper)
    if ram_match:
        specs["ram"] = f"{ram_match.group(1)} GB"
    else:
        # Check for "XGB / YGB" patterns (usually RAM / ROM)
        combined_match = re.search(r'(\d+)\s*(?:GB)?\s*/\s*(\d+)\s*GB', title_upper)
        if combined_match:
            specs["ram"] = f"{combined_match.group(1)} GB"
            specs["rom"] = f"{combined_match.group(2)} GB"
        else:
            # Check for standalone "XGB" if it's likely RAM (usually smaller numbers 2-24)
            # This is risky but often works for smartphones
            ram_standalone = re.search(r'\b(2|3|4|6|8|12|16|24)\s*GB\b', title_upper)
            if ram_standalone:
                specs["ram"] = f"{ram_standalone.group(1)} GB"

    # 2. ROM/Storage extraction (e.g., 128GB, 128 GB, 256GB ROM, 1TB)
    if specs["rom"] == "N/A":
        # Look for explicit Storage/ROM
        rom_match = re.search(r'(\d+)\s*GB\s*(ROM|Storage|Internal Storage|SSD|HDD)', title_upper)
        if rom_match:
            specs["rom"] = f"{rom_match.group(1)} GB"
        elif "TB" in title_upper:
            tb_match = re.search(r'(\d+)\s*TB', title_upper)
            if tb_match:
                specs["rom"] = f"{tb_match.group(1)} TB"
        else:
            # Look for large GB values that are likely ROM (32, 64, 128, 256, 512)
            rom_standalone = re.search(r'\b(32|64|128|256|512)\s*GB\b', title_upper)
            if rom_standalone:
                # Ensure it's not the same as RAM
                val = rom_standalone.group(1)
                ram_val_match = re.search(r'(\d+)', specs["ram"])
                ram_val = ram_val_match.group(1) if ram_val_match else None
                if ram_val is None or val != ram_val:
                    specs["rom"] = f"{val} GB"

    # 3. Camera extraction (e.g., 50MP, 48 + 8 MP, 50+2+2MP, 108 MP AI)
    camera_match = re.search(r'(\d+(\s*[\+\,]\s*\d+)*)\s*MP', title_upper)
    if camera_match:
        specs["camera"] = f"{camera_match.group(1)} MP"

    # 4. Display extraction (e.g., 6.5 inch, 6.7", 6.7″, 15.6", 16.51 cm, 120Hz 6.72" FHD+)
    display_match = re.search(r'(\d+\.?\d*)\s*(inch|\"|″|cm|mm)', title_upper)
    if display_match:
        specs["display"] = f"{display_match.group(1)} {display_match.group(2)}"


    # 5. Battery (e.g. 5000MAH, 5000 MAH)
    battery_match = re.search(r'(\d+)\s*MAH', title_upper)
    if battery_match:
        specs["battery"] = f"{battery_match.group(1)} mAh"


    # 6. Processor (e.g. Snapdragon 8 Gen 2, A15 Bionic, Dimensity 9000, Octa-Core)
    # Be careful not to match model names (like M15) as processors
    proc_match = re.search(r'(Snapdragon|Dimensity|A\d+\s*Bionic|Octa[- ]?Core|Exynos|M[123]\b|Intel|AMD|MediaTek|Helio|T606|Unisoc)', title_upper)
    if proc_match:
        specs["processor"] = proc_match.group(1).capitalize()

    return specs
