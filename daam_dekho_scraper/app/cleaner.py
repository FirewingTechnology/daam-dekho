def clean_product_list(products: list) -> list:
    """
    Removes invalid products (e.g., no title or no link).
    """
    valid_products = []
    seen_links = set()

    for p in products:
        title = p.get("title")
        link = p.get("product_link")
        
        if not title:
            # Maybe add a logger here if available, but for now just print or use common logger
            from app.logger import get_logger
            get_logger("cleaner").warning(f"Product rejected: title is missing or empty. Raw title: {title}")
            continue
            
        if not link:
            from app.logger import get_logger
            get_logger("cleaner").warning(f"Product rejected: link is missing or empty. Title: {title}")
            continue
            
        # Image is mandatory as per user request
        image_urls = p.get("image_urls", [])
        if not image_urls or (isinstance(image_urls, list) and len(image_urls) == 0):
             from app.logger import get_logger
             get_logger("cleaner").warning(f"Product rejected: image is mandatory but missing. Title: {title}")
             continue

        # Offers is no longer mandatory to allow more products
        offers = p.get("offers", [])
        
        # Specifications: If all major specs are N/A, we still keep it but log a warning
        # This prevents the massive rejection count the user complained about
        if p.get("category") == "Smartphones" or "phone" in title.lower() or "iphone" in title.lower():
            specs = p.get("specifications", {})
            important_specs = [specs.get("ram"), specs.get("rom"), specs.get("camera"), specs.get("display")]
            if all(s == "N/A" or not s for s in important_specs):
                from app.logger import get_logger
                get_logger("cleaner").info(f"Product kept but lacks specs. Title: {title}")
                # We still keep it, but it might have N/A values in DB

            
        if link in seen_links:
            continue
            
        seen_links.add(link)
        valid_products.append(p)

    return valid_products
