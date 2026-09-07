import * as cheerio from 'cheerio';

export const name = 'JioMart';
export const domains = ['jiomart.com', 'www.jiomart.com'];

/**
 * Extracts price from JioMart product page HTML.
 * @param {string} html
 * @returns {{ success: boolean, price?: number, currency?: string, source?: string, confidence?: number, reason?: string }}
 */
export function extractPrice(html) {
  if (!html || typeof html !== 'string') {
    return { success: false, reason: 'EMPTY_HTML' };
  }

  // Anti-bot check
  if (html.includes('ShieldSquare Captcha') || html.includes('Access Denied')) {
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
    { sel: 'span.jm-heading-xxs', source: 'DOM_JM_HEADING_XXS' },
    { sel: 'div.product-price span.price', source: 'DOM_PRODUCT_PRICE' },
    { sel: 'span.final-price', source: 'DOM_FINAL_PRICE' },
    { sel: 'div.price-box span.sp', source: 'DOM_PRICE_BOX_SP' },
    { sel: 'span.sp', source: 'DOM_SP' }
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
