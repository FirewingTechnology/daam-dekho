import pytest
import sys
import os

# Add the parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.formatter import format_product

def test_format_product_basic():
    result = format_product(
        title="iPhone 15 Pro (128GB, Blue)",
        brand="Apple",
        category="Mobile",
        seller_name="Amazon",
        product_link="http://amazon.com/p1",
        vendor="amazon",
        price=79900.0,
        discounted_price=75000.0,
        rating=4.5,
        reviews=100,
        image_url="http://img.com/i1"
    )
    
    assert result["title"] == "iPhone 15 Pro"
    assert result["brand"] == "Apple"
    assert result["price"] == 79900.0
    assert result["discounted_price"] == 75000.0
    # The extractor adds a space: "128 GB"
    assert "128 GB" in result["specifications"]["rom"]

def test_format_product_missing_fields():
    # Test how it handles N/A or empty values
    result = format_product(
        title="Generic Laptop",
        brand=None,
        category="",
        seller_name="Unknown",
        product_link="http://link.com",
        vendor=None,
        price=1000,
        discounted_price=900,
        rating=0,
        reviews=0,
        image_url=""
    )
    
    assert result["brand"] == "Unknown"
    assert result["category"] == "General"
    assert result["vendor"] == "unknown"
    assert isinstance(result["price"], float)
    assert result["image_urls"] == []

def test_price_cleaning():
    from app.utils import clean_price
    assert clean_price("₹64,999.00") == 64999.0
    assert clean_price("Rs. 1,20,000") == 120000.0
    assert clean_price("Price: 500") == 500.0
    assert clean_price("Free") == 0.0

def test_format_product_bug_check():
    # Check for potential bugs in specs merging
    result = format_product(
        title="Galaxy S24 8GB RAM 256GB ROM",
        brand="Samsung",
        category="Mobile",
        seller_name="Flipkart",
        product_link="http://fk.com/p",
        vendor="flipkart",
        price=100000,
        discounted_price=90000,
        rating=4,
        reviews=10,
        image_url="http://img.com",
        specifications={"ram": "N/A", "rom": "N/A"}
    )
    
    # It should extract from title if provided is N/A
    assert result["specifications"]["ram"] == "8 GB"
    assert result["specifications"]["rom"] == "256 GB"
