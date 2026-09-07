import * as cheerio from 'cheerio';

export const name = 'Vijay Sales';
export const domains = ['vijaysales.com', 'www.vijaysales.com', 'vsprod.vijaysales.com'];

/**
 * Extracts price from Vijay Sales product page HTML.
 * @param {string} html
 * @returns {{ success: boolean, price?: number, currency?: string, source?: string, confidence?: number, reason?: string }}
 */
export function extractPrice(html) {
  if (!html || typeof html !== 'string') {
    return { success: false, reason: 'EMPTY_HTML' };
  }

  // Anti-bot check
  if (html.includes('Access Denied') || html.includes('Cloudflare Ray ID')) {
    return { success: false, reason: 'BOT_DETECTION_CHALLENGE' };
  }

  const $ = cheerio.load(html);

  // 1. JSON-LD structured data
  try {
    const scripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i++) {
      const content = $(scripts[i]).html();
      if (!content) continue;
      const data = JSON.parse(content.trim());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Product' && item.offers) {
          const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
          for (const offer of offers) {
            const rawPrice = offer.price || offer.lowPrice;
            const price = parseFloat(String(rawPrice).replace(/[^\d.]/g, ''));
            if (!isNaN(price) && price > 0) {
              return {
                success: true,
                price: Math.round(price),
                currency: offer.priceCurrency || 'INR',
                source: 'JSON-LD',
                confidence: 0.98
              };
            }
          }
        }
      }
    }
  } catch (e) {
    // Continue
  }

  // 2. DOM Selectors
  const selectors = [
    { sel: '#spnPrice', source: 'DOM_SPN_PRICE' },
    { sel: '#spnFinalPrice', source: 'DOM_SPN_FINAL_PRICE' },
    { sel: 'span.final-price', source: 'DOM_FINAL_PRICE' },
    { sel: 'div.price-box span.price', source: 'DOM_PRICE_BOX' },
    { sel: 'span.special-price span.price', source: 'DOM_SPECIAL_PRICE' }
  ];

  for (const { sel, source } of selectors) {
    const el = $(sel).first();
    if (el.length > 0) {
      const rawText = el.text().trim();
      const cleanPrice = parseFloat(rawText.replace(/[^\d.]/g, ''));
      if (!isNaN(cleanPrice) && cleanPrice > 0) {
        return {
          success: true,
          price: Math.round(cleanPrice),
          currency: 'INR',
          source,
          confidence: 0.90
        };
      }
    }
  }

  // 3. Meta Tags
  const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                    $('meta[property="og:price:amount"]').attr('content');
  if (metaPrice) {
    const cleanPrice = parseFloat(metaPrice.replace(/[^\d.]/g, ''));
    if (!isNaN(cleanPrice) && cleanPrice > 0) {
      return {
        success: true,
        price: Math.round(cleanPrice),
        currency: 'INR',
        source: 'META_TAG',
        confidence: 0.85
      };
    }
  }

  return { success: false, reason: 'PRICE_NOT_FOUND' };
}
