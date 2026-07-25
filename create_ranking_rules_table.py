"""
Daam Dekho - Dynamic Search Ranking Rules Table Creator & Seeder
Creates search_ranking_rules table in daamdekho.db and seeds dynamic category priority weights.
Removes all hardcoded scoring logic from code.
"""

import sqlite3
import sys
from pathlib import Path

db_path = Path(__file__).resolve().parent / "daamdekho.db"

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def setup_ranking_rules():
    print("=" * 80)
    print("CREATING DYNAMIC SEARCH RANKING RULES TABLE IN DATABASE")
    print("=" * 80)

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # 1. Create table search_ranking_rules
    c.execute("""
        CREATE TABLE IF NOT EXISTS search_ranking_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_pattern TEXT UNIQUE NOT NULL,
            priority_weight INTEGER NOT NULL DEFAULT 0,
            is_demoted BOOLEAN DEFAULT 0,
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 2. Seed dynamic rules
    rules = [
        ('mobiles', 1000, 0, 'High priority consumer smartphone category'),
        ('smartphones', 1000, 0, 'High priority smartphone category'),
        ('laptops', 900, 0, 'High priority computing laptop category'),
        ('tablets', 850, 0, 'Medium-high priority tablet category'),
        ('tvs', 500, 0, 'Medium priority television category'),
        ('electronics', 200, 0, 'General consumer electronics category'),
        ('mobile accessories', -1000, 1, 'Demoted mobile accessories category'),
        ('laptop accessories', -1000, 1, 'Demoted laptop accessories category'),
        ('accessories', -1000, 1, 'Demoted generic accessories category')
    ]

    c.executemany("""
        INSERT INTO search_ranking_rules (category_pattern, priority_weight, is_demoted, description)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(category_pattern) DO UPDATE SET
            priority_weight = excluded.priority_weight,
            is_demoted = excluded.is_demoted,
            description = excluded.description,
            updated_at = CURRENT_TIMESTAMP
    """, rules)

    conn.commit()

    # 3. Print seeded rules
    c.execute("SELECT id, category_pattern, priority_weight, is_demoted, description FROM search_ranking_rules ORDER BY priority_weight DESC")
    rows = c.fetchall()

    print("\n--- SEEDED DYNAMIC SEARCH RANKING RULES (DATABASE STORED) ---")
    print(f"{'ID':<4} | {'Category Pattern':<22} | {'Weight':<8} | {'Demoted':<8} | {'Description'}")
    print("-" * 80)
    for r in rows:
        print(f"{r[0]:<4} | {r[1]:<22} | {r[2]:<8} | {r[3]:<8} | {r[4]}")
    print("-" * 80)

    conn.close()
    print("✅ Dynamic Search Ranking Rules table successfully created & populated!")

if __name__ == "__main__":
    setup_ranking_rules()
