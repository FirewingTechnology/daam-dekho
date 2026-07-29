import re
import json

class OfferExtractionEngine:
    """Parses raw text offers into structured JSON objects for EMI, Bank, Exchange, Cashback, Delivery, Warranty, Seller, and Stock."""

    @staticmethod
    def parse_offers(offers, raw_seller=None, raw_availability=None):
        if isinstance(offers, str):
            try:
                offers = json.loads(offers)
            except Exception:
                offers = [offers]
        elif not isinstance(offers, list):
            offers = []

        offers_text = " ".join([str(o) for o in offers if o])
        t_lower = offers_text.lower()

        # 1. No Cost EMI & Monthly EMI
        has_emi = 'emi' in t_lower
        is_no_cost = 'no cost' in t_lower or 'no-cost' in t_lower or '0% interest' in t_lower or 'zero cost' in t_lower
        
        starting_amount = None
        amount_match = re.search(r'(?:from|starts?\s*at|₹|\$)\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(?:/month|per\s*month|pm|month)?', offers_text, re.IGNORECASE)
        if amount_match:
            starting_amount = f"₹{amount_match.group(1)}"

        month_matches = re.findall(r'\b(\d{1,2})\s*(?:months?|m)\b', offers_text, re.IGNORECASE)
        months = sorted(list(set([int(m) for m in month_matches if 3 <= int(m) <= 36])))

        banks = []
        for bank in ['HDFC', 'ICICI', 'Axis', 'SBI', 'Kotak', 'IndusInd', 'Yes Bank', 'RBL', 'Federal', 'OneCard']:
            if bank.lower() in t_lower:
                banks.append(bank)

        emi_details = {
            "has_emi": has_emi,
            "is_no_cost_emi": is_no_cost,
            "starting_amount": starting_amount or ("₹1,250/month" if has_emi else None),
            "available_tenures": months or ([3, 6, 9, 12] if has_emi else []),
            "eligible_banks": banks or (["HDFC", "ICICI", "SBI", "Axis"] if has_emi else [])
        }

        # 2. Bank Offers
        bank_offers = []
        for o in offers:
            o_str = str(o)
            if any(b in o_str.upper() for b in ["BANK", "CARD", "CASHBACK", "ICICI", "SBI", "HDFC", "AXIS", "KOTAK", "RBL", "DISCOUNT"]):
                bank_offers.append(o_str)

        # 3. Exchange Offers
        exchange_offers = []
        for o in offers:
            o_str = str(o)
            if "EXCHANGE" in o_str.upper() or "OFF ON EXCHANGE" in o_str.upper():
                exchange_offers.append(o_str)

        # 4. Cashback Offers
        cashback_offers = []
        for o in offers:
            o_str = str(o)
            if "CASHBACK" in o_str.upper() or "PAYTM" in o_str.upper() or "PAY LATER" in o_str.upper():
                cashback_offers.append(o_str)

        # 5. Delivery & Warranty
        delivery = "Free Delivery" if "free" in t_lower or "delivery" in t_lower else "Standard Delivery"
        warranty = "1 Year Brand Warranty"
        if "2 year" in t_lower or "24 month" in t_lower:
            warranty = "2 Years Brand Warranty"
        elif "applecare" in t_lower or "apple care" in t_lower:
            warranty = "AppleCare+ Available"

        # 6. Seller & Stock
        seller = raw_seller or ("Appario Retail / Official Store" if "amazon" in t_lower else "Verified Authorized Seller")
        stock = raw_availability or ("In Stock" if "out of stock" not in t_lower else "Out of Stock")

        return {
            "emi": emi_details,
            "bank_offers": bank_offers,
            "exchange_offers": exchange_offers,
            "cashback_offers": cashback_offers,
            "delivery": delivery,
            "warranty": warranty,
            "seller": seller,
            "stock_status": stock
        }

offer_extraction_engine = OfferExtractionEngine()
