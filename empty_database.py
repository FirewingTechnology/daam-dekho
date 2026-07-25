import sqlite3
import sys
from pathlib import Path

# Fix console encoding for Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

db_path = Path(__file__).parent / 'daamdekho.db'

def wipe_entire_database():
    print(f"🧹 Wiping ALL tables completely from database at: {db_path}")
    if not db_path.exists():
        print("❌ Error: Database file not found.")
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    cur.execute("PRAGMA foreign_keys = OFF;")
    
    # Get list of all user tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    all_tables = [row[0] for row in cur.fetchall()]
    
    for tbl in all_tables:
        cur.execute(f"DELETE FROM {tbl};")
        print(f"  ✓ Cleared table '{tbl}' (0 rows remaining)")
        
    try:
        cur.execute("DELETE FROM sqlite_sequence;")
    except Exception:
        pass

    conn.commit()
    cur.execute("PRAGMA foreign_keys = ON;")
    
    # Print Table Summaries
    print("\n" + "=" * 50)
    print("FINAL DATABASE ROW COUNTS FOR ALL TABLES:")
    print("=" * 50)
    for tbl in all_tables:
        cur.execute(f"SELECT COUNT(*) FROM {tbl};")
        count = cur.fetchone()[0]
        print(f"  {tbl:<25}: {count} rows")
        
    conn.close()
    print("\n✅ Database is now completely 100% empty across ALL tables!")

if __name__ == "__main__":
    wipe_entire_database()
