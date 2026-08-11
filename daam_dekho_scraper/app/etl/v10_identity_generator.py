import hashlib
from typing import Dict, Any, Optional
from app.logger import get_logger

logger = get_logger("v10_identity_generator")

class DeterministicIdentityGenerator:
    """PHASE 7: DaamDekho v10.0 Deterministic SHA-256 Identity Generator.
    Computes immutable SHA-256 identity hashes based strictly on deterministic matching priority:
    1. MPN
    2. Model Number
    3. EAN
    4. UPC
    5. SKU
    6. Hardware Fingerprint (Brand + Series + Model + RAM + Storage + CPU + GPU + Display + Network + Color)
    7. Title similarity (last fallback only)
    
    NEVER uses AI, LLM, or Embeddings.
    """

    def generate_master_identity_hash(self, brand: str, series: str, model: str, mpn: Optional[str] = None, model_number: Optional[str] = None) -> str:
        if mpn and str(mpn).strip():
            raw_str = f"MASTER_MPN_{str(mpn).strip().lower()}"
        elif model_number and str(model_number).strip():
            raw_str = f"MASTER_MN_{str(model_number).strip().lower()}"
        else:
            b = str(brand or '').strip().lower()
            s = str(series or '').strip().lower()
            m = str(model or '').strip().lower()
            raw_str = f"MASTER_{b}_{s}_{m}"

        return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()

    def generate_variant_identity_hash(
        self,
        master_hash: str,
        brand: str,
        series: str,
        model: str,
        ram: str,
        storage: str,
        cpu: str = "",
        gpu: str = "",
        display: str = "",
        network: str = "",
        color: str = "",
        mpn: Optional[str] = None,
        model_number: Optional[str] = None,
        ean: Optional[str] = None,
        upc: Optional[str] = None,
        sku: Optional[str] = None
    ) -> str:
        # Strict matching priority check
        if mpn and str(mpn).strip():
            raw_str = f"VARIANT_MPN_{str(mpn).strip().lower()}"
        elif model_number and str(model_number).strip():
            raw_str = f"VARIANT_MODELNUM_{str(model_number).strip().lower()}_{str(color or 'default').strip().lower()}"
        elif ean and str(ean).strip():
            raw_str = f"VARIANT_EAN_{str(ean).strip().lower()}"
        elif upc and str(upc).strip():
            raw_str = f"VARIANT_UPC_{str(upc).strip().lower()}"
        elif sku and str(sku).strip():
            raw_str = f"VARIANT_SKU_{str(sku).strip().lower()}"
        else:
            # Priority 6: Hardware Fingerprint
            b = str(brand or '').strip().lower()
            s = str(series or '').strip().lower()
            m = str(model or '').strip().lower()
            c = str(cpu or '').strip().lower()
            g = str(gpu or '').strip().lower()
            r = str(ram or '').strip().lower()
            st = str(storage or '').strip().lower()
            d = str(display or '').strip().lower()
            net = str(network or '').strip().lower()
            col = str(color or 'unknown').strip().lower()

            raw_str = f"VARIANT_HW_{master_hash}_{b}_{s}_{m}_{c}_{g}_{r}_{st}_{d}_{net}_{col}"

        return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()

identity_generator_engine = DeterministicIdentityGenerator()
