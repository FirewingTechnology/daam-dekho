import pytest
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.matchers.product_matcher import matcher

def test_same_phone_same_ram_storage_different_color_matches():
    prod_a = {
        "title": "Galaxy Z Fold8 5G Smartphone with Galaxy AI (Graphite, 12GB RAM, 256GB Storage)",
        "category": "Mobiles",
        "brand": "Samsung",
        "specifications": {"color": "Graphite", "ram": "12 GB", "storage": "256 GB"}
    }
    prod_b = {
        "title": "Samsung Galaxy Z Fold8 5G (Lavender, 12GB RAM, 256GB Storage)",
        "category": "Mobiles",
        "brand": "Samsung",
        "specifications": {"color": "Lavender", "ram": "12 GB", "storage": "256 GB"}
    }
    score, reason = matcher.calculate_score_detailed(prod_a, prod_b)
    assert score >= 70
    assert reason == "Match OK"

def test_same_phone_different_storage_does_not_match():
    prod_a = {
        "title": "Galaxy Z Fold8 5G (Graphite, 12GB RAM, 256GB Storage)",
        "category": "Mobiles",
        "brand": "Samsung",
        "specifications": {"color": "Graphite", "ram": "12 GB", "storage": "256 GB"}
    }
    prod_b = {
        "title": "Galaxy Z Fold8 5G (Graphite, 12GB RAM, 512GB Storage)",
        "category": "Mobiles",
        "brand": "Samsung",
        "specifications": {"color": "Graphite", "ram": "12 GB", "storage": "512 GB"}
    }
    score, reason = matcher.calculate_score_detailed(prod_a, prod_b)
    assert score == 0
    assert "Storage Mismatch" in reason

def test_same_phone_missing_cpu_matches():
    prod_a = {
        "title": "Galaxy S25 Ultra 5G AI Smartphone (Titanium Silverblue, 12GB RAM, 256GB Storage)",
        "category": "Mobiles",
        "brand": "Samsung",
        "specifications": {"color": "Titanium Silverblue", "ram": "12 GB", "storage": "256 GB", "processor": "Snapdragon 8 Gen 3"}
    }
    prod_b = {
        "title": "SAMSUNG Galaxy S25 Ultra 5G",
        "category": "Mobiles",
        "brand": "Samsung",
        "specifications": {}
    }
    score, reason = matcher.calculate_score_detailed(prod_a, prod_b)
    assert score >= 70
    assert reason == "Match OK"

def test_same_phone_different_cpu_does_not_match():
    prod_a = {
        "title": "Galaxy A56 5G (8GB RAM, 256GB Storage)",
        "category": "Mobiles",
        "brand": "Samsung",
        "specifications": {"color": "Awesome Black", "ram": "8 GB", "storage": "256 GB", "processor": "Snapdragon 8 Gen 3"}
    }
    prod_b = {
        "title": "Galaxy A56 5G (8GB RAM, 256GB Storage)",
        "category": "Mobiles",
        "brand": "Samsung",
        "specifications": {"color": "Awesome Black", "ram": "8 GB", "storage": "256 GB", "processor": "Dimensity 9300"}
    }
    score, reason = matcher.calculate_score_detailed(prod_a, prod_b)
    assert score == 0
    assert "CPU Mismatch" in reason

def test_empty_ram_merges_with_known_ram_variant():
    prod_a = {
        "title": "Galaxy Z Fold8 5G (Graphite, 512GB Storage)",
        "category": "Mobiles",
        "brand": "Samsung",
        "specifications": {"color": "Graphite", "ram": "", "storage": "512 GB"}
    }
    prod_b = {
        "title": "Galaxy Z Fold8 5G (Graphite, 12GB RAM, 512GB Storage)",
        "category": "Mobiles",
        "brand": "Samsung",
        "specifications": {"color": "Graphite", "ram": "12 GB", "storage": "512 GB"}
    }
    score, reason = matcher.calculate_score_detailed(prod_a, prod_b)
    assert score >= 70
    assert reason == "Match OK"

