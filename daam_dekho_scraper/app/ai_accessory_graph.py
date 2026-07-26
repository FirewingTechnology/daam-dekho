class AIAccessoryGraphEngine:
    """Module 5: AI Accessory Graph Engine."""

    def discover_accessories(self, product, accessory_candidates=None):
        accessory_candidates = accessory_candidates or []
        cat = (product.get('category') or "Mobiles").lower()
        title = (product.get('canonical_title') or product.get('title') or "").lower()

        accessories = {
            "compatible_chargers": [],
            "cases_and_covers": [],
            "styluses_and_pens": [],
            "keyboards_and_mice": [],
            "docks_and_hubs": [],
            "storage_and_memory": []
        }

        # Mock standard category accessory discovery
        if "mobile" in cat or "phone" in cat:
            accessories["compatible_chargers"].append({"name": "65W GaN Fast Charger Dual Port", "type": "Charger", "price": 1499})
            accessories["cases_and_covers"].append({"name": "Armor Shockproof Clear Case", "type": "Case", "price": 499})
        elif "laptop" in cat:
            accessories["keyboards_and_mice"].append({"name": "Wireless Ergonomic Precision Mouse", "type": "Mouse", "price": 1299})
            accessories["docks_and_hubs"].append({"name": "7-in-1 USB-C Multiport Dock", "type": "Dock", "price": 2499})
            accessories["storage_and_memory"].append({"name": "1TB NVMe M.2 PCIe Gen4 SSD", "type": "SSD", "price": 6499})

        return {
            "product_id": product.get('id'),
            "accessory_graph": accessories,
            "confidence": 94.0,
            "version": "v2.5"
        }

ai_accessory_graph = AIAccessoryGraphEngine()
