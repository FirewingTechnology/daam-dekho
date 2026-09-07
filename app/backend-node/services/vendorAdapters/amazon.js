import * as cheerio from 'cheerio';

export const name = 'Amazon';
export const domains = ['amazon.in', 'www.amazon.in'];

/**
 * Extracts price from Amazon product page HTML.
 * @param {string} html
 * @returns {{ success: boolean, price?: number, currency?: string, source?: string, confidence?: number, reason?: string }}
 */
export function extractPrice(html) {
  if (!html || typeof html !== 'string') {
    return { success: false, reason: 'EMPTY_HTML' };
  }

  // Anti-bot check
  if (html.includes('api-services-support@amazon.com') || 
      html.includes('To discuss automated access to Amazon data please contact') ||
      html.includes('Type the characters you see in this image') ||
      html.includes('Robot Check')) {
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
    { sel: '#corePriceDisplay_desktop_feature_div .a-price-whole', source: 'DOM_CORE_PRICE' },
    { sel: '#corePrice_feature_div .a-price-whole', source: 'DOM_FEATURE_PRICE' },
    { sel: '.apexPriceToPay .a-offscreen', source: 'DOM_APEX_PRICE' },
    { sel: '#priceblock_dealprice', source: 'DOM_DEAL_PRICE' },
    { sel: '#priceblock_ourprice', source: 'DOM_OUR_PRICE' },
    { sel: '#price_inside_buybox', source: 'DOM_BUYBOX_PRICE' },
    { sel: '.priceToPay span.a-price-whole', source: 'DOM_PAY_PRICE' },
    { sel: 'span.a-price span.a-offscreen', source: 'DOM_OFFSCREEN_PRICE' }
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
