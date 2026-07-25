from app.utils import clean_title, extract_specs_from_title, generate_product_id, get_timestamp
import datetime

def format_product(
    title: str,
    brand: str,
    category: str,
    seller_name: str,
    product_link: str,
    vendor: str,
    price: float,
    discounted_price: float,
    rating: float,
    reviews: int,
    image_url: str,
    availability: str = "In Stock",
    specifications: dict = None,
    offers: list = None
) -> dict:
    cleaned_title = clean_title(title)
    
    # Base specification object
    specs = specifications or {}
    
    # Auto-extract from title if specific fields are missing
    extracted = extract_specs_from_title(title)
    
    # Merge extracted with provided (provided takes priority, but "N/A" is ignored)
    def merge_spec(provided, extracted):
        if provided and str(provided).strip().upper() not in ["N/A", "NONE", "NULL", ""]:
            return provided
        return extracted or "N/A"

    # Merge everything from specs into final_specs
    final_specs = specs.copy()
    
    # Ensure primary fields are populated/cleaned
    final_specs["ram"] = merge_spec(specs.get("ram"), extracted.get("ram"))
    final_specs["rom"] = merge_spec(specs.get("rom"), extracted.get("rom"))
    final_specs["camera"] = merge_spec(specs.get("camera"), extracted.get("camera"))
    final_specs["display"] = merge_spec(specs.get("display"), extracted.get("display"))
    final_specs["battery"] = merge_spec(specs.get("battery"), extracted.get("battery"))
    final_specs["processor"] = merge_spec(specs.get("processor"), extracted.get("processor"))
    
    # Remove "other" if it's just a duplicate of the dict or empty
    if "other" in final_specs and (not final_specs["other"] or final_specs["other"] == specs):
        del final_specs["other"]

    return {
        "id": generate_product_id(),
        "title": cleaned_title,
        "brand": brand or "Unknown",
        "category": category or "General",
        "price": float(price),
        "discounted_price": float(discounted_price),
        "rating": float(rating),
        "reviews": int(reviews),
        "seller_name": seller_name,
        "availability": availability,
        "specifications": final_specs,
        "image_urls": [image_url] if image_url else [],
        "product_link": product_link,
        "offers": offers or [],
        "vendor": vendor.lower() if vendor else "unknown",
        "scraped_at": get_timestamp(),
        "created_at": get_timestamp(),
        "updated_at": get_timestamp()
    }
