import sqlite3
import os
import sys
from pathlib import Path

# Prevent UnicodeEncodeError on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

db_path = Path(__file__).parent / 'daamdekho.db'

def reset_database():
    print(f"[*] Resetting database at: {db_path}")
    if db_path.exists():
        try:
            os.remove(db_path)
            print("[SUCCESS] Successfully deleted existing database file.")
        except Exception as e:
            print(f"[ERROR] Error deleting database file: {e}")
            sys.exit(1)
            
    # Now import scraper database manager to recreate it cleanly
    sys.path.insert(0, str(Path(__file__).parent / 'daam_dekho_scraper'))
    from app.database.manager import db_manager
    print("[SUCCESS] Clean database schema initialized successfully with all seeded vendors.")

if __name__ == "__main__":
    reset_database()
