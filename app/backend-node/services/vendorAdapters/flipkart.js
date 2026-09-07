

import * as cheerio from 'cheerio';

export const name = 'Flipkart';
export const domains = ['flipkart.com', 'www.flipkart.com', 'dl.flipkart.com'];

/**
 * Extracts price from Flipkart product page HTML.
 * @param {string} html
 * @returns {{ success: boolean, price?: number, currency?: string, source?: string, confidence?: number, reason?: string }}
 */
export function extractPrice(html) {
  if (!html || typeof html !== 'string') {
    return { success: false, reason: 'EMPTY_HTML' };
  }

  // Anti-bot check
  if (html.includes('Enter the characters you see below') || 
      html.includes('Flipkart is temporarily unavailable') ||
      html.includes('px-captcha')) {
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
            const rawPrice = offer.price || offer.lowPrice || offer.highPrice;
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
    // Continue to DOM selectors
  }

  // 2. DOM Selectors priority
  const selectors = [
    { sel: 'div.Nx9daj', source: 'DOM_NX9DAJ' },
    { sel: 'div._30jeq3._16Jk6d', source: 'DOM_30JEQ3_16JK6D' },
    { sel: 'div._30jeq3', source: 'DOM_30JEQ3' },
    { sel: 'div._1vC4OE._3qQ9m1', source: 'DOM_1VC4OE' },
    { sel: 'div.hl05eU div._16Jk6d', source: 'DOM_HL05EU' },
    { sel: 'div.CxhGGd', source: 'DOM_CXHGGD' }
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
          confidence: 0.92
        };
      }
    }
  }

  // 3. Meta tags
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
