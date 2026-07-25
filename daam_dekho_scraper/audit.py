"""
Full pipeline audit for DaamDekho scraper.
Run: python audit.py
"""
import json
import os
import sys

from app.formatter import format_product
from app.cleaner import clean_product_list
from app.matcher import match_products
from app.exporter import save_raw_results, save_final_results, save_merged_results
from app.utils import clean_price, clean_rating, clean_reviews, generate_product_id

results = []

def check(label, condition, detail=""):
    status = "[PASS]" if condition else "[FAIL]"
    line = "  " + status + " " + label
    if detail:
        line += " -- " + detail
    print(line)
    results.append((label, condition))

# ── 1. UTILS ─────────────────────────────────────────────────────────────────
print("\n-- 1. Utils --")

price_cases = [
    ("",               0.0),
    ("0",              0.0),
    ("abc",            0.0),
    ("64999",          64999.0),
    ("64,999",         64999.0),
    ("64,999.00",      64999.0),
    ("Rs. 64,999.00",  64999.0),
    ("Rs.1,08,990",    108990.0),
]
for inp, expected in price_cases:
    got = clean_price(inp)
    check(
        "clean_price(" + repr(inp) + ")",
        got == expected,
        "got=" + str(got) + " expected=" + str(expected)
    )

check("clean_rating('4.4 out of 5 stars')", clean_rating("4.4 out of 5 stars") == 4.4)
check("clean_rating('')",                   clean_rating("") == 0.0)
check("clean_reviews('(3,812 ratings)')",   clean_reviews("(3,812 ratings)") == 3812)
check("clean_reviews('')",                  clean_reviews("") == 0)
check("generate_product_id() is int",       isinstance(generate_product_id(), int))

# ── 2. FORMATTER (schema) ────────────────────────────────────────────────────
print("\n-- 2. Formatter -- Schema (18-key DaamDekho standard) --")

REQUIRED_KEYS = [
    "id", "title", "brand", "category", "seller_name", "availability",
    "product_link", "vendor", "scraped_at", "created_at", "updated_at",
    "price", "discounted_price", "rating", "reviews",
    "specifications", "image_urls", "offers"
]

VENDORS = [
    ("amazon",     "Amazon"),
    ("flipkart",   "Flipkart"),
    ("croma",      "Croma"),
    ("jiomart",    "JioMart"),
    ("vijaysales", "Vijay Sales"),
]

mock_products = []
for i, (v_key, v_name) in enumerate(VENDORS):
    p = format_product(
        title="Samsung Galaxy S24",
        brand="Samsung",
        category="Mobile",
        seller_name=v_name,
        product_link="https://" + v_key + ".com/s24-" + str(i),
        vendor=v_key,
        price=74999.0 + i * 100,
        discounted_price=64999.0 + i * 100,
        rating=4.4,
        reviews=3812 + i * 10,
        image_url="https://cdn." + v_key + ".com/" + str(i) + ".jpg",
    )
    mock_products.append(p)

for p in mock_products:
    v = p["vendor"]
    # Derive expected seller_name from VENDORS list by matching vendor key
    expected_seller = next((vn for vk, vn in VENDORS if vk == v), "")
    missing = [k for k in REQUIRED_KEYS if k not in p]
    check("Schema 18 keys      [" + v + "]",  len(missing) == 0, str(missing))
    check("id is int           [" + v + "]",  isinstance(p["id"], int))
    check("price is float      [" + v + "]",  isinstance(p["price"], float))
    check("disc_price float    [" + v + "]",  isinstance(p["discounted_price"], float))
    check("rating is float     [" + v + "]",  isinstance(p["rating"], float))
    check("reviews is int      [" + v + "]",  isinstance(p["reviews"], int))
    check("image_urls list     [" + v + "]",  isinstance(p["image_urls"], list))
    check("offers list         [" + v + "]",  isinstance(p["offers"], list))
    check("specifications dict [" + v + "]",  isinstance(p["specifications"], dict))
    check("vendor value OK     [" + v + "]",  p["vendor"] == v)
    actual_seller = p["seller_name"]
    seller_ok     = actual_seller == expected_seller
    check("seller_name OK      [" + v + "]",  seller_ok, "actual=" + repr(actual_seller) + " expected=" + repr(expected_seller))

# ── 3. CLEANER ───────────────────────────────────────────────────────────────
print("\n-- 3. Cleaner -- dedup and blank removal --")

dup   = dict(mock_products[0])
bad1  = {"title": "", "product_link": "x"}
bad2  = {"title": "No Link product"}
extra = dict(mock_products[1])
extra["product_link"] = "https://unique-extra.com"

before  = mock_products + [dup, bad1, bad2, extra]
cleaned = clean_product_list(before)

check("Kept correct count",     len(cleaned) == 6, "kept=" + str(len(cleaned)) + " of " + str(len(before)) + " (expected 6)")
check("No blank titles",        all(p.get("title") for p in cleaned))
check("All have product_link",  all(p.get("product_link") for p in cleaned))

# ── 4. MATCHER ───────────────────────────────────────────────────────────────
print("\n-- 4. Matcher -- RapidFuzz cross-vendor grouping --")

p_a = format_product("Samsung Galaxy S24 5G 256GB","Samsung","Mobile","Amazon","https://a.com/1","amazon",74999.0,64999.0,4.4,3812,"")
p_f = format_product("Samsung Galaxy S24 256GB 5G","Samsung","Mobile","Flipkart","https://f.com/1","flipkart",73999.0,63999.0,4.3,2100,"")
p_u = format_product("Apple iPhone 15 Pro Max","Apple","Mobile","Croma","https://c.com/2","croma",134999.0,129999.0,4.7,900,"")

groups = match_products([p_a, p_f, p_u], threshold=75)
check("Groups count == 2",          len(groups) == 2, "got=" + str(len(groups)))
check("All groups have vendors",    all("vendors" in g for g in groups))
check("All groups have master_title", all("master_title" in g for g in groups))

sam = next((g for g in groups if "Samsung" in g["master_title"]), None)
n = len(sam["vendors"]) if sam else 0
check("Samsung group has 2 vendors", n == 2, "count=" + str(n))

# ── 5. EXPORTER ──────────────────────────────────────────────────────────────
print("\n-- 5. Exporter -- file I/O and JSON validity --")

rp = save_raw_results("audit_test",   cleaned)
fp = save_final_results("audit_test", cleaned)
mp = save_merged_results("audit_test", groups)

for label, path in [("Raw", rp), ("Final", fp), ("Merged", mp)]:
    exists = os.path.exists(path)
    check("File created: " + label, exists, str(path.name))
    if exists:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        check("Valid JSON: " + label, isinstance(data, list), str(len(data)) + " records")

# ── SUMMARY ──────────────────────────────────────────────────────────────────
total  = len(results)
passed = sum(1 for _, ok in results if ok)
failed = total - passed

print()
print("=" * 52)
print("  AUDIT SUMMARY: " + str(passed) + "/" + str(total) + " checks passed")
if failed:
    print("  FAILED (" + str(failed) + "):")
    for label, ok in results:
        if not ok:
            print("    x " + label)
else:
    print("  ALL CHECKS PASSED")
print("=" * 52)

sys.exit(0 if failed == 0 else 1)
