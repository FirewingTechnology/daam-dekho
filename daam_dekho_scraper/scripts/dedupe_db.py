import sqlite3
import os
from rapidfuzz import fuzz

db_path = r'd:\shubham\daam_dekho_final\daamdekho.db'

def dedupe():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Fetching all products...")
    cursor.execute("SELECT id, title, brand, category FROM products_master")
    products = cursor.fetchall()
    
    processed = set()
    
    for i, (p1_id, p1_title, p1_brand, p1_cat) in enumerate(products):
        if p1_id in processed: continue
        
        for j, (p2_id, p2_title, p2_brand, p2_cat) in enumerate(products[i+1:]):
            if p2_id in processed: continue
            
            # Match logic: Same brand AND (Titles very similar OR titles match after normalization)
            # We ignore category here to fix the category mismatch issue
            if p1_brand == p2_brand:
                similarity = fuzz.token_set_ratio(p1_title.lower(), p2_title.lower())
                
                if similarity > 90:
                    print(f"Found Match: [{p1_id}] {p1_title}  <==>  [{p2_id}] {p2_title}")
                    
                    # Merge P2 into P1
                    # 1. Update product_variants
                    cursor.execute("UPDATE product_variants SET product_id = ? WHERE product_id = ?", (p1_id, p2_id))
                    
                    # 2. Delete P2 from products_master
                    cursor.execute("DELETE FROM products_master WHERE id = ?", (p2_id,))
                    
                    processed.add(p2_id)
        
        processed.add(p1_id)
    
    # 2nd Pass: Deduplicate Variants (same RAM/ROM under same product)
    print("\nDeduplicating variants...")
    cursor.execute("SELECT id, product_id, ram, storage FROM product_variants")
    variants = cursor.fetchall()
    v_processed = set()
    
    for i, (v1_id, v1_pid, v1_ram, v1_storage) in enumerate(variants):
        if v1_id in v_processed: continue
        
        for v2_id, v2_pid, v2_ram, v2_storage in variants[i+1:]:
            if v2_id in v_processed: continue
            
            if v1_pid == v2_pid and v1_ram == v2_ram and v1_storage == v2_storage:
                print(f"Merging Duplicate Variant: [{v1_id}] and [{v2_id}] for Product {v1_pid}")
                
                # Merge V2 into V1
                # Move specs
                cursor.execute("UPDATE OR IGNORE product_specifications SET variant_id = ? WHERE variant_id = ?", (v1_id, v2_id))
                # Move vendor products
                cursor.execute("UPDATE OR IGNORE vendor_products SET variant_id = ? WHERE variant_id = ?", (v1_id, v2_id))
                # Delete V2
                cursor.execute("DELETE FROM product_variants WHERE id = ?", (v2_id,))
                v_processed.add(v2_id)
        
        v_processed.add(v1_id)

    conn.commit()
    conn.close()
    print("\nDeduplication and Merge complete.")

if __name__ == "__main__":
    dedupe()
