import requests
from bs4 import BeautifulSoup

url = 'https://www.jiomart.com/search/iphone-15'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'}
res = requests.get(url, headers=headers)
soup = BeautifulSoup(res.text, 'html.parser')

print('Status Code:', res.status_code)
text = soup.get_text()
print('Error Message Found:', "We couldn't find the page" in text)
print('Products found:', len(soup.find_all(class_='plp-card-container')))
