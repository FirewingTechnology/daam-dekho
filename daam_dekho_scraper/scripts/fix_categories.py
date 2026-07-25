import sqlite3

db_path = r'd:\shubham\daam_dekho_final\daamdekho.db'

def fix_categories():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Updating categories...")
    
    # Update products that are clearly phones but marked as Electronics
    keywords = ['phone', 'mobile', 'smartphone', 'iphone', 'samsung galaxy', 'pixel', 'oneplus', 'ultra 5g']
    
    for kw in keywords:
        cursor.execute("""
            UPDATE products_master 
            SET category = 'Mobiles' 
            WHERE category = 'Electronics' 
            AND title LIKE ?
        """, (f'%{kw}%',))
        print(f"Updated records for keyword: {kw}")
    
    conn.commit()
    conn.close()
    print("Category fix complete.")

if __name__ == "__main__":
    fix_categories()
