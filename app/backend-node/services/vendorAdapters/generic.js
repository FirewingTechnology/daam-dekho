import * as cheerio from 'cheerio';

export const name = 'Generic';
export const domains = [];

/**
 * Fallback generic extractor using Schema.org, OpenGraph, microdata, and standard selectors.
 * @param {string} html
 * @returns {{ success: boolean, price?: number, currency?: string, source?: string, confidence?: number, reason?: string }}
 */
export function extractPrice(html) {
  if (!html || typeof html !== 'string') {
    return { success: false, reason: 'EMPTY_HTML' };
  }

  const $ = cheerio.load(html);

  // 1. JSON-LD Product
  try {
    const scripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i++) {
      const content = $(scripts[i]).html();
      if (!content) continue;
      const data = JSON.parse(content.trim());
      const items = Array.isArray(data) ? data : (data['@graph'] || [data]);
      for (const item of items) {
        if ((item['@type'] === 'Product' || item['@type'] === 'IndividualProduct') && item.offers) {
          const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
          for (const offer of offers) {
            const rawPrice = offer.price || offer.lowPrice;
            const price = parseFloat(String(rawPrice).replace(/[^\d.]/g, ''));
            if (!isNaN(price) && price > 0) {
              return {
                success: true,
                price: Math.round(price),
                currency: offer.priceCurrency || 'INR',
                source: 'GENERIC_JSON_LD',
                confidence: 0.95
              };
            }
          }
        }
      }
    }
  } catch (e) {
    // Continue
  }

  // 2. Microdata itemprop="price"
  const itemPropPrice = $('[itemprop="price"]').first();
  if (itemPropPrice.length > 0) {
    const raw = itemPropPrice.attr('content') || itemPropPrice.text();
    const price = parseFloat(String(raw).replace(/[^\d.]/g, ''));
    if (!isNaN(price) && price > 0) {
      return {
        success: true,
        price: Math.round(price),
        currency: 'INR',
        source: 'GENERIC_MICRODATA',
        confidence: 0.88
      };
    }
  }

  // 3. OpenGraph meta
  const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                    $('meta[property="og:price:amount"]').attr('content');
  if (metaPrice) {
    const price = parseFloat(String(metaPrice).replace(/[^\d.]/g, ''));
    if (!isNaN(price) && price > 0) {
      return {
        success: true,
        price: Math.round(price),
        currency: 'INR',
        source: 'GENERIC_META',
        confidence: 0.85
      };
    }
  }

  return { success: false, reason: 'PRICE_NOT_FOUND' };
}
