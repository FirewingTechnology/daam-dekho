import re
import json
from typing import List, Dict, Any
from app.logger import get_logger
from app.database.manager import db_manager
from app.brand_alias import brand_alias_engine

logger = get_logger("v10_normalization")

class AttributeNormalizationEngine:
    """PHASE 3: DaamDekho v10.0 Attribute Normalization Engine.
    Cleans raw attributes and removes promotional noise while strictly preserving core hardware identity.
    Persists data into Layer 2 Normalized Schema tables (normalized_products, normalized_specs, normalized_images).
    """

    NOISE_PATTERNS = [
        r'\b(?:AI|Flagship|Official|Original|Authentic|Best Seller|Limited Offer|Without Charger|Lag Free Gaming|Free Delivery|No Cost EMI|Bank Offer|Coupon)\b',
        r'\b(?:Smartphone|Mobile Phone|Cellular|Dual SIM|Unlocked)\b',
        r'\b(?:Victus|Zapcase|Cover|Back Case|Pouch|Protector|Tempered Glass|Cover Case)\b',
        r'\b(?:awesome|navy|iceblue|black|silver|grey|gray|gold|white|green|purple|lavender|blue|red|lilac|moonlight)\b',
        r'\b(?:rom|ram|ssd|hdd|storage|gb|tb|mb|edition)\b'
    ]

    def _clean_model_name(self, title: str, brand: str, series: str, raw_model: str) -> str:
        clean = re.sub(r'\(.*?\)', '', title)
        if brand:
            clean = re.sub(r'\b' + re.escape(brand) + r'\b', '', clean, flags=re.IGNORECASE)
        if series:
            clean = re.sub(r'\b' + re.escape(series) + r'\b', '', clean, flags=re.IGNORECASE)

        for pat in self.NOISE_PATTERNS:
            clean = re.sub(pat, '', clean, flags=re.IGNORECASE)

        clean = re.sub(r'[^\w\s]', ' ', clean)
        clean = re.sub(r'\s+', ' ', clean).strip()

        # Extract model token like A35 5G, S24 Ultra, M17 5G, 15-fa0000
        m = re.search(r'\b([A-Z0-9]{1,5}(?:\s*5G|\s*4G|\s*Ultra|\s*Plus|\s*Pro|\s*FE)?)\b', clean, re.IGNORECASE)
        if m:
            return m.group(1).upper()

        return (raw_model or clean).upper()

    def _extract_cpu_processor(self, title: str, model: str = "", specs_json: str = "") -> str:
        text = f"{title} {model} {specs_json}".strip()
        
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

    def normalize_raw_products(self, raw_product_ids: List[int]) -> List[int]:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        normalized_ids = []

        for r_id in raw_product_ids:
            cursor.execute("""
                SELECT rp.raw_title, rps.brand, rps.series, rps.model, rps.model_number, rps.part_number, rps.mpn, rps.sku, rps.ean, rps.upc, rps.cpu, rps.gpu, rps.ram, rps.storage, rps.display_size, rps.color, rp.hero_image_url
                FROM raw_products rp
                LEFT JOIN raw_product_specs rps ON rp.id = rps.raw_product_id
                WHERE rp.id = ?
            """, (r_id,))
            row = cursor.fetchone()
            if not row:
                cursor.execute("""
                    SELECT rp.raw_title, rps.brand, rps.series, rps.model, rps.model_number, rps.part_number, rps.sku, rps.ean, rps.upc, rps.cpu, rps.gpu, rps.ram, rps.storage, rps.display, rps.color, rp.hero_image_url
                    FROM raw_products_v10 rp
                    LEFT JOIN raw_product_specs_v10 rps ON rp.id = rps.raw_product_id
                    WHERE rp.id = ?
                """, (r_id,))
                row = cursor.fetchone()
                if not row:
                    continue
                raw_title, brand, series, model, model_num, part_num, sku, ean, upc, cpu, gpu, ram, storage, display, color, hero_img = row
                mpn = model_num
            else:
                raw_title, brand, series, model, model_num, part_num, mpn, sku, ean, upc, cpu, gpu, ram, storage, display, color, hero_img = row

            c_brand = brand_alias_engine.normalize_brand(brand, raw_title)
            c_series = str(series or '').strip().title()
            c_model = self._clean_model_name(raw_title, c_brand, c_series, model)

            c_cpu = str(cpu or '').strip()
            if not c_cpu or c_cpu.upper() in ['N/A', 'NONE', 'NULL', '']:
                c_cpu = self._extract_cpu_processor(raw_title, c_model)
            c_cpu = c_cpu.strip()

            c_gpu = str(gpu or '').strip().upper()
            c_color = str(color or 'Default').strip().title()

            # Clean RAM (e.g., '8 GB' -> '8GB')
            c_ram = str(ram or '').strip().upper()
            m_ram = re.search(r'(\d+)\s*GB', c_ram)
            if m_ram: c_ram = f"{m_ram.group(1)}GB"

            # Clean Storage (e.g., '256 GB ROM' -> '256GB')
            c_storage = str(storage or '').strip().upper()
            m_st = re.search(r'(\d+)\s*(GB|TB)', c_storage)
            if m_st: c_storage = f"{m_st.group(1)}{m_st.group(2)}"

            # Clean Display (e.g., '6.7 inch' -> '6.7"')
            c_disp = str(display or '').strip()
            m_disp = re.search(r'(\d{1,2}(?:\.\d)?)\s*(?:inch|\"|\')?', c_disp, flags=re.IGNORECASE)
            if m_disp: c_disp = f"{m_disp.group(1)}\""

            norm_title = f"{c_brand} {c_series} {c_model} {c_ram} {c_storage}".strip()
            hw_fp = f"{c_brand.lower()}_{c_series.lower()}_{c_model.lower()}_{c_ram.lower()}_{c_storage.lower()}".strip("_")

            # 1. Save into Layer 2 normalized_products
            cursor.execute("""
                INSERT INTO normalized_products (
                    raw_product_id, canonical_brand, canonical_series, canonical_model, normalized_title, hardware_fingerprint, mpn, model_number, ean, upc, sku
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                r_id, c_brand, c_series, c_model, norm_title, hw_fp, mpn, model_num, ean, upc, sku
            ))
            norm_id = cursor.lastrowid

            # 2. Save into Layer 2 normalized_specs
            cursor.execute("""
                INSERT INTO normalized_specs (
                    normalized_product_id, clean_cpu, clean_gpu, clean_ram, clean_storage, clean_display, clean_color, clean_network, clean_os, spec_attributes_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                norm_id, c_cpu, c_gpu, c_ram, c_storage, c_disp, c_color, "5G", "Android", json.dumps({"brand": c_brand, "model": c_model})
            ))

            # 3. Save into Layer 2 normalized_images
            if hero_img:
                cursor.execute("""
                    INSERT INTO normalized_images (normalized_product_id, image_url, is_hero)
                    VALUES (?, ?, ?)
                """, (norm_id, hero_img, 1))

            # Mirror to normalized_entities_v10
            cursor.execute("""
                INSERT INTO normalized_entities_v10 (
                    raw_product_id, canonical_brand, canonical_series, canonical_model, clean_cpu, clean_gpu, clean_ram, clean_storage, clean_display, clean_color, normalized_title, hardware_fingerprint
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                r_id, c_brand, c_series, c_model, c_cpu, c_gpu, c_ram, c_storage, c_disp, c_color, norm_title, hw_fp
            ))

            normalized_ids.append(norm_id)

        conn.commit()
        conn.close()

        logger.info(f"✅ [PHASE 3 COMPLETED] Normalized {len(normalized_ids)} raw products into clean Layer 2 attributes.")
        return normalized_ids

attribute_normalization_engine = AttributeNormalizationEngine()
