import sqlite3
from pathlib import Path

# BUG-32 FIX (Stray script): Was hardcoded 'D:\shubham\...'
# Use a portable relative path so the script can run on any machine.
db_path = Path(__file__).parent.parent / 'daamdekho.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Remove known accessory brands and non-existent models
bad_keywords = ['TheGiftKart', 'amazon basics', 'S26', '14T', 'Back Panel', 'Case', 'Cover', 'Tempered', 'Panel']

for kw in bad_keywords:
    cur.execute("DELETE FROM products_master WHERE title LIKE ?", (f'%{kw}%',))
    print(f"Deleted items matching: {kw}")

conn.commit()
conn.close()
print("Database Cleaned!")
