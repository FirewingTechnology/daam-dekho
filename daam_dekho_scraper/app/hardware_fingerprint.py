import hashlib
import re
from app.entity_extractor import entity_extractor

class HardwareFingerprintEngine:
    """Enterprise Hardware Fingerprint Generator for 100% Hardware Uniqueness."""

    def generate_fingerprint(self, title, specs=None, category="Mobiles", brand=None):
        specs = specs or {}
        entities = entity_extractor.extract_all(title, specs, category=category, brand=brand)

        # Standardize hardware spec attributes
        cpu = (entities.get('cpu') or specs.get('processor') or specs.get('cpu') or 'nocpu').lower().strip().replace(" ", "")
        gpu = (entities.get('gpu') or specs.get('gpu') or 'nogpu').lower().strip().replace(" ", "")
        chipset = (specs.get('chipset') or specs.get('chip') or cpu).lower().strip().replace(" ", "")
        ram = (entities.get('ram') or specs.get('ram') or 'noram').lower().strip().replace(" ", "")
        storage = (entities.get('storage') or specs.get('storage') or specs.get('rom') or 'nostorage').lower().strip().replace(" ", "")
        display = (entities.get('display') or specs.get('display') or specs.get('screen_size') or 'nodisplay').lower().strip().replace(" ", "")
        battery = (specs.get('battery') or specs.get('battery_capacity') or 'nobattery').lower().strip().replace(" ", "")
        camera = (specs.get('camera') or specs.get('rear_camera') or 'nocamera').lower().strip().replace(" ", "")

        # Format Canonical Hardware String
        hw_string = f"cat:{category.lower()}|b:{entities['brand'].lower()}|c:{chipset}|cpu:{cpu}|gpu:{gpu}|ram:{ram}|st:{storage}|d:{display}|bat:{battery}|cam:{camera}"
        
        fingerprint_hash = hashlib.sha256(hw_string.encode('utf-8')).hexdigest()

        return {
            "hardware_string": hw_string,
            "hardware_fingerprint": fingerprint_hash,
            "cpu": cpu,
            "gpu": gpu,
            "chipset": chipset,
            "ram": ram,
            "storage": storage,
            "display": display,
            "battery": battery,
            "camera": camera
        }

hardware_fingerprint_engine = HardwareFingerprintEngine()
