import sys
import multiprocessing
import os
from app.pipeline import pipeline
from app.logger import get_logger

logger = get_logger("seed")

def main():
    queries = {
        'Mobiles': [
            'iphone 15', 'iphone 14', 'samsung s24', 'samsung s23',
            'oneplus 12', 'google pixel 8', 'redmi note 13', 
            'realme 12 pro', 'nothing phone 2', 'iqoo 12'
        ],
        'Laptops': [
            'macbook air m3', 'dell xps 13', 'hp spectre x360', 
            'lenovo legion 5', 'asus rog strix', 'acer predator', 
            'msi katana', 'hp pavilion', 'lenovo ideapad', 'dell inspiron'
        ],
        'Mobile Accessories': [
            'airpods pro', 'samsung buds 2', 'apple 20w charger', 
            'spigen iphone 15 case', 'boat airdopes 141', 'nothing ear 2', 
            'samsung 25w charger', 'realme buds', 'sony wf-1000xm5', 'type c cable'
        ],
        'Laptop Accessories': [
            'logitech mx master 3', 'razer deathadder', 'keychron k2', 
            'hp wireless mouse', 'sandisk 1tb ssd', 'samsung t7 1tb', 
            'anker usb c hub', 'laptop backpack', 'jbl flip 6', 'laptop cooling pad'
        ]
    }
    
    # Pre-setup ChromeDriver
    from app.utils import ensure_chromedriver
    try:
        logger.info("Setting up ChromeDriver...")
        ensure_chromedriver()
    except Exception as e:
        logger.error(f"ChromeDriver setup failed: {e}")

    for category, q_list in queries.items():
        logger.info(f"--- Starting scraping for {category} ---")
        for q in q_list:
            logger.info(f"Scraping query: {q} for category: {category}")
            pipeline.run_search(q, category=category)

if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
