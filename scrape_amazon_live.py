import urllib.request, re, json
from bs4 import BeautifulSoup

url = 'https://www.amazon.in/Samsung-Smartphone-Storage-Customised-Processor/dp/B0H6WWPNYX'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        soup = BeautifulSoup(html, 'html.parser')
        
        # 1. Price elements
        price_whole = soup.select_one('.a-price-whole')
        offscreen_prices = soup.select('.a-offscreen')
        savings = soup.select_one('.savingsPercentage')
        mrp_span = soup.select_one('.a-text-price .a-offscreen')
        
        print("Price whole:", price_whole.get_text() if price_whole else "None")
        print("Savings percentage:", savings.get_text() if savings else "None")
        print("MRP span:", mrp_span.get_text() if mrp_span else "None")
        
        print("\nAll offscreen prices:")
        for p in offscreen_prices[:10]:
            print("  -", p.get_text().strip())

except Exception as e:
    print("Error scraping Amazon live:", e)
