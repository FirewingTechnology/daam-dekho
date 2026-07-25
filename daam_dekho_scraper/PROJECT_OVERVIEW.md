# Daam Dekho Scraper: Project Overview

## 🚀 Introduction
**Daam Dekho Scraper** is a high-performance product data ingestion pipeline designed to aggregate, clean, and normalize product information from India's leading e-commerce platforms. It provides a unified database of products, specifically optimized for smartphones, including detailed technical specifications and real-time pricing.

---

## 🛠️ Technology Stack
- **Backend Core**: Python 3.11+
- **Scraping Engine**: Selenium (with ChromeDriver) & BeautifulSoup4
- **Data Processing**: Pandas & Regex
- **Database**: SQLite3
- **Admin UI**: Flask (Python), HTML5, CSS3, JavaScript
- **Logging**: Standard Python Logging with rotating file handlers

---

## 🏛️ Architecture & Project Structure

```text
daam_dekho_scraper/
├── admin_app/              # Admin Dashboard (Flask Application)
│   ├── static/             # UI Assets (CSS, JS, Images)
│   ├── templates/          # HTML Templates
│   └── app.py              # Dashboard Backend
├── app/                    # Core Logic
│   ├── scrapers/           # Vendor-specific Scraping Modules
│   │   ├── amazon.py       # Amazon.in Scraper
│   │   ├── flipkart.py     # Flipkart.com Scraper
│   │   └── ...             # Croma, JioMart, VijaySales
│   ├── cleaner.py          # Data Validation & Filtering
│   ├── database.py         # SQLite Persistence Layer
│   └── formatter.py        # Data Normalization
├── main.py                 # Main CLI Entry Point
├── products.db             # SQLite Database File
└── requirements.txt        # Project Dependencies
```

---

## ✨ Core Features

### 1. Multi-Vendor Support
Fully integrated scrapers for:
- **Amazon.in**: Handles complex technical tables and expandable sections.
- **Flipkart**: Navigates to Product Detail Pages (PDP) for deep specs.
- **Croma**: Extracts detailed attributes from JSON-LD and HTML tables.
- **JioMart**: Fast search-based extraction.
- **Vijay Sales**: Robust list-to-detail scraping.

### 2. Intelligent Specification Extraction
The pipeline goes beyond simple titles to extract:
- **RAM & Storage**: Precise matching for "128GB", "8GB RAM", etc.
- **Camera**: Primary sensor resolution detection.
- **Display**: Screen size and panel technology extraction.
- **Battery**: Capacity (mAh) parsing.

### 3. Data Ingestion & Cleaning
- **Strict Validation**: Rejects low-quality or irrelevant items (e.g., accessories when searching for phones).
- **Normalization**: Standardizes prices by removing currency symbols (₹) and commas.
- **Duplicate Prevention**: Ensures unique product links are maintained.

### 4. Admin Management Dashboard
A premium web interface for administrators:
- **One-Click Scrape**: Start searches across all vendors simultaneously.
- **Real-Time Monitoring**: Live-stream logs from the scraping engine.
- **Database Stats**: Visual overview of ingestion progress and product counts.
- **System Cleanup**: Tools to wipe data and reset the environment.

---

## 🚀 Getting Started

### Installation
```bash
pip install -r requirements.txt
```

### Running the Dashboard
```bash
python admin_app/app.py
```
*Access the UI at `http://localhost:5000`*

### CLI Execution
```bash
python main.py
```
*Follow the prompts to enter a search query.*

---

## 📊 Database Schema
The system uses a two-tier storage approach:
1.  **`products` Table**: Unified view of all scraped items with standardized fields.
2.  **Vendor Tables**: (e.g., `amazon_products`) Contains the raw, vendor-specific data for auditing.

---

## 🛡️ Anti-Scraping Compliance
The system implements several best practices to ensure reliable data collection:
- **Randomized Delays**: Mimics human behavior between requests.
- **User-Agent Rotation**: Varies browser identity.
- **Headless Mode Support**: Runs efficiently on servers without a GUI.
