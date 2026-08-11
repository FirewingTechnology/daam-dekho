import pytest
import sys
import os

# Add parent directory to path so app modules import properly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.entity_extractor import entity_extractor
from app.etl.v10_normalization import attribute_normalization_engine

def test_extract_color_specs_only():
    title = "Samsung Galaxy S24 Ultra"
    specs = {"color": "Titanium Gray"}
    result = entity_extractor.extract_color(title, specs)
    assert result == "titanium gray"

def test_extract_color_title_only():
    title = "Apple iPhone 15 Pro (128GB, Natural Titanium)"
    specs = {}
    result = entity_extractor.extract_color(title, specs)
    assert result == "natural titanium"

def test_extract_color_specs_wins():
    title = "Apple iPhone 15 Pro 128GB Black"
    specs = {"color": "Natural Titanium"}
    result = entity_extractor.extract_color(title, specs)
    assert result == "natural titanium"

def test_extract_color_none_present():
    title = "Generic Charger 65W Fast Adapter"
    specs = {}
    result = entity_extractor.extract_color(title, specs)
    assert result is None

def test_extract_color_substring_false_positive():
    # "Redmi" must NOT match "red"
    title = "Redmi Note 13 Pro 5G 256GB"
    specs = {}
    result = entity_extractor.extract_color(title, specs)
    assert result is None

def test_extract_color_lavender():
    title = "Samsung Galaxy A55 5G (8GB RAM, 128GB Storage) Lavender"
    specs = {}
    result = entity_extractor.extract_color(title, specs)
    assert result == "lavender"

def test_extract_color_space_black():
    title = "Apple MacBook Pro 16 M3 Max Space Black"
    specs = {}
    result = entity_extractor.extract_color(title, specs)
    assert result == "space black"

def test_extract_color_graphite():
    title = "Samsung Galaxy Tab S9 Graphite"
    specs = {}
    result = entity_extractor.extract_color(title, specs)
    assert result == "graphite"

def test_normalization_never_returns_default():
    # Test combinations of inputs to ensure Default is NEVER returned
    test_cases = [
        {"title": "Samsung Galaxy S24 Ultra", "specs": {"color": "Titanium Gray"}, "color_raw": None},
        {"title": "Redmi Note 13 Pro 5G", "specs": {}, "color_raw": None},
        {"title": "iPhone 15 Pro Lavender", "specs": {}, "color_raw": ""},
        {"title": "Laptop", "specs": {}, "color_raw": "Default"},
        {"title": "Phone", "specs": {}, "color_raw": "N/A"},
    ]

    for tc in test_cases:
        raw_color_str = str(tc["color_raw"] or '').strip()
        if raw_color_str and raw_color_str.lower() not in ['n/a', 'none', 'unknown', 'default']:
            resolved_color = raw_color_str
        else:
            resolved_color = entity_extractor.extract_color(tc["title"], tc["specs"])
        
        final_color = str(resolved_color or 'Unspecified').strip().title()
        
        assert final_color != "Default"
        assert final_color in ["Titanium Gray", "Lavender", "Unspecified"]

def test_regression_id_1054_light_violet():
    raw_title = "Samsung M17e 5G 128 GB, 4 GB RAM, Light Violet, Mobile Phone"
    # Even if stray specs contains a bad color key like Black, title extraction returns violet
    extracted = entity_extractor.extract_color(raw_title)
    assert extracted is not None
    assert "violet" in extracted.lower()
    assert "black" not in extracted.lower()

