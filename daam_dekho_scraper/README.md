# DaamDekho – Admin Multi-Vendor Product Ingestion System

An internal admin-only CLI tool that scrapes product data from **5 major Indian e-commerce platforms simultaneously** using Selenium multiprocessing, then saves structured JSON output in a standardised DaamDekho schema.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Multi-vendor** | Amazon, Flipkart, Croma, JioMart, Vijay Sales |
| **True parallelism** | `ProcessPoolExecutor` — one OS process per vendor |
| **Real Selenium** | Headless Chrome, lazy-scroll, dynamic content |
| **Standardised schema** | All scrapers output identical JSON fields |
| **Data cleaning** | Price/rating normalisation, URL dedup, blank removal |
| **Cross-vendor matching** | RapidFuzz title similarity → merged product groups |
| **3-tier export** | Raw → Final combined → Optional merged comparison |
| **Graceful failures** | One scraper crash never stops others |
| **Configurable** | Toggle headless, adjust `MAX_PRODUCTS_PER_VENDOR` |

---

## 📁 Project Structure

```
daam_dekho_scraper/
│── main.py                  ← CLI entry point + orchestrator
│── requirements.txt
│── README.md
│── scraper.log              ← auto-created on first run
│
├── app/
│   ├── config.py            ← paths, timeouts, vendor constants
│   ├── logger.py            ← shared logging setup
│   ├── utils.py             ← ID gen, price/rating cleaners, UA rotator
│   ├── query_parser.py      ← normalise admin query
│   ├── cleaner.py           ← remove dupes & invalid products
│   ├── formatter.py         ← build standardised product dict
│   ├── matcher.py           ← RapidFuzz cross-vendor grouping
│   ├── exporter.py          ← JSON file writers (raw / final / merged)
│   │
│   ├── scrapers/
│   │   ├── base.py          ← abstract BaseScraper (Selenium setup)
│   │   ├── amazon.py
│   │   ├── flipkart.py
│   │   ├── croma.py
│   │   ├── jiomart.py
│   │   └── vijaysales.py
│   │
│   └── data/
│       ├── raw/             ← raw per-query dumps
│       └── final/           ← cleaned + merged files
```

---

## ⚙️ Setup & Install

### 1. Python 3.12+

```bash
python --version   # must be 3.12 or higher
```

### 2. Create & activate virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

> Chrome/ChromeDriver is managed automatically by `webdriver-manager`.

---

## 🚀 Run

```bash
python main.py
```

You will see:

```
==================================================
   DaamDekho – Admin Product Ingestion Tool
==================================================
Enter search query: samsung mobile
```

Type any product query and press Enter.

---

## 📦 Output Files

| File | Location | Description |
|---|---|---|
| Raw combined | `app/data/raw/<query>_<ts>.json` | All scraped products, all vendors |
| Final cleaned | `app/data/final/<query>_<ts>.json` | Deduped & normalised |
| Merged groups | `app/data/final/<query>_<ts>_merged.json` | Cross-vendor matched products |

### Sample product record

```json
{
  "id": 812346709,
  "title": "Samsung Galaxy S24 5G",
  "brand": "Samsung",
  "category": "General",
  "seller_name": "Amazon",
  "availability": "In Stock",
  "product_link": "https://www.amazon.in/dp/...",
  "vendor": "amazon",
  "scraped_at": "2026-04-17 14:00:00",
  "created_at": "2026-04-17 14:00:00",
  "updated_at": "2026-04-17 14:00:00",
  "price": 74999.0,
  "discounted_price": 64999.0,
  "rating": 4.4,
  "reviews": 3812,
  "specifications": {},
  "image_urls": ["https://m.media-amazon.com/images/..."],
  "offers": []
}
```

---

## ⚡ Multiprocessing Flow

```
Admin CLI Input
      │
      ▼
 parse_query()
      │
      ▼
ProcessPoolExecutor (max_workers = num_vendors)
  ┌───────────────────────────────────────────┐
  │  Process 1: AmazonScraper.scrape()        │
  │  Process 2: FlipkartScraper.scrape()      │
  │  Process 3: CromaScraper.scrape()         │
  │  Process 4: JioMartScraper.scrape()       │
  │  Process 5: VijaysSalesScraper.scrape()   │
  └───────────────────────────────────────────┘
      │  (all run simultaneously)
      ▼
 as_completed() — collect as each finishes
      │
      ▼
 clean_product_list()  →  dedupe & validate
      │
      ├─► save_raw_results()    → app/data/raw/
      ├─► save_final_results()  → app/data/final/
      └─► match_products()
              │
              └─► save_merged_results() → app/data/final/
```

---

## 🔧 Configuration

Edit **`app/config.py`** to tune:

| Setting | Default | Purpose |
|---|---|---|
| `HEADLESS` | `True` | Show / hide browser window |
| `MAX_PRODUCTS_PER_VENDOR` | `10` | Products fetched per site |
| `BROWSER_TIMEOUT` | `20` | Selenium implicit wait (s) |
| `PAGE_LOAD_WAIT` | `5` | Sleep after page load (s) |

---

## ➕ Adding a New Vendor

1. Create `app/scrapers/newvendor.py` extending `BaseScraper`.
2. Implement `scrape(self, query: str) -> list` returning `format_product(...)` dicts.
3. Add `"newvendor": "New Vendor"` to `VENDORS` in `app/config.py`.
4. Add the `elif vendor_key == "newvendor":` branch in `main.py → _run_scraper()`.

No other files need to change.

---

## 🛡️ Error Handling

- Each scraper is isolated in its own process — a crash never affects sibling scrapers.
- All exceptions are caught, logged to `scraper.log`, and return `[]`.
- Selector failures use try/except with `None` fallback values.
- Empty results still produce valid JSON files (`[]`).

---

## 📋 Requirements Summary

```
selenium            4.20.0
webdriver-manager   4.0.1
beautifulsoup4      4.12.3
lxml                5.2.1
rapidfuzz           3.8.1
requests            2.31.0
python-dotenv       1.0.1
```
