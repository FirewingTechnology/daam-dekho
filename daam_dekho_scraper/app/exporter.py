import json
from pathlib import Path
import datetime
from app.config import RAW_DATA_DIR, FINAL_DATA_DIR

def save_json(data: list, filepath: Path):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def save_raw_results(query: str, data: list):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_query = query.replace(" ", "_").replace("+", "_").lower()
    filename = f"{clean_query}_{timestamp}.json"
    filepath = RAW_DATA_DIR / filename
    
    save_json(data, filepath)
    return filepath

def save_final_results(query: str, data: list):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_query = query.replace(" ", "_").replace("+", "_").lower()
    filename = f"{clean_query}_{timestamp}.json"
    filepath = FINAL_DATA_DIR / filename
    
    save_json(data, filepath)
    return filepath

def save_merged_results(query: str, data: list):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_query = query.replace(" ", "_").replace("+", "_").lower()
    filename = f"{clean_query}_{timestamp}_merged.json"
    filepath = FINAL_DATA_DIR / filename
    
    save_json(data, filepath)
    return filepath
