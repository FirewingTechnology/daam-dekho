from app.logger import get_logger

logger = get_logger("spec_cross_validator")

class SpecificationCrossValidator:
    """Specification Cross-Validator — Surfaces vendor spec conflicts across 5 vendors."""

    SPEC_KEYS = ['ram', 'storage', 'cpu', 'gpu', 'display', 'network', 'model_number', 'color']

    def validate_specs(self, vendor_specs_list: list[dict]) -> dict:
        results = {}
        for key in self.SPEC_KEYS:
            values = {}
            for item in vendor_specs_list:
                vendor = item.get('vendor', 'unknown')
                val = item.get('specs', {}).get(key) or item.get(key)
                if val:
                    values[vendor] = str(val).strip().lower()

            if not values:
                results[key] = {"status": "MISSING", "values": {}, "confidence": 0.0}
            elif len(set(values.values())) == 1:
                results[key] = {"status": "VERIFIED", "values": values, "confidence": 100.0}
            else:
                results[key] = {"status": "CONFLICT", "values": values, "confidence": 50.0}

        return results

spec_cross_validator = SpecificationCrossValidator()
