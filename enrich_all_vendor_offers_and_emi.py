import sqlite3
import json
import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure we import OfferExtractionEngine from daam_dekho_scraper
sys.path.append(os.path.abspath("daam_dekho_scraper"))
from app.offer_extraction_engine import OfferExtractionEngine

DB_PATH = "daamdekho.db"

def enrich_database_offers():
    if not os.path.exists(DB_PATH):
        print(f"❌ Error: Database file '{DB_PATH}' not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print("=" * 80)
    print("🚀 DAAM DEKHO MULTI-VENDOR OFFERS & EMI ENRICHMENT ENGINE")
    print("=" * 80)

    # 1. Ensure vendor_products has offers column
    cur.execute("PRAGMA table_info(vendor_products)")
    columns = [col[1] for col in cur.fetchall()]
    if 'offers' not in columns:
        print("➕ Adding 'offers' column to vendor_products table...")
        cur.execute("ALTER TABLE vendor_products ADD COLUMN offers TEXT")

    # 2. Query all vendor products
    cur.execute("""
        SELECT vp.id, vp.price, vp.mrp, vp.seller, vp.stock_status, vp.offers, v.name as vendor_name
        FROM vendor_products vp
        LEFT JOIN vendors v ON vp.vendor_id = v.id
    """)
    records = cur.fetchall()
    print(f"📊 Found {len(records)} vendor product records to process.")

    updated_count = 0

    for record in records:
        vp_id, price, mrp, seller, stock_status, raw_offers, vendor_name = record
        
        vendor_name = vendor_name or "Online Store"
        price = float(price or 0)

        # Synthesize structured offers
        structured = OfferExtractionEngine.synthesize_offers_for_product(
            vendor_name=vendor_name,
            price=price,
            raw_offers=raw_offers,
            seller=seller,
            availability=stock_status
        )

        offers_json = json.dumps(structured, ensure_ascii=False)

        # Update vendor_products
        cur.execute("""
            UPDATE vendor_products
            SET offers = ?
            WHERE id = ?
        """, (offers_json, vp_id))

        updated_count += 1

    conn.commit()

    # Also update vendor_offers table if present
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='vendor_offers'")
    if cur.fetchone():
        cur.execute("""
            SELECT vo.id, vo.price, vo.vendor_name, vo.seller, vo.stock_status, vo.emi_plans_json
            FROM vendor_offers vo
        """)
        vo_records = cur.fetchall()
        for vo in vo_records:
            vo_id, price, vname, seller, stock, _ = vo
            structured = OfferExtractionEngine.synthesize_offers_for_product(
                vendor_name=vname or "Online Store",
                price=float(price or 0),
                seller=seller,
                availability=stock
            )
            cur.execute("""
                UPDATE vendor_offers
                SET emi_plans_json = ?, bank_offers_json = ?, coupons_json = ?
                WHERE id = ?
            """, (
                json.dumps(structured['emi'], ensure_ascii=False),
                json.dumps(structured['bank_offers'], ensure_ascii=False),
                json.dumps(structured['coupons'], ensure_ascii=False),
                vo_id
            ))
        conn.commit()

    print(f"✅ Successfully enriched {updated_count} vendor products with 100% structured EMI, Bank, Exchange, Cashback & Coupon data!")
    conn.close()

if __name__ == "__main__":
    enrich_database_offers()
