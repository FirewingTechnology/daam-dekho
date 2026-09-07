import * as cheerio from 'cheerio';

export const name = 'Croma';
export const domains = ['croma.com', 'www.croma.com'];

/**
 * Extracts price from Croma product page HTML.
 * @param {string} html
 * @returns {{ success: boolean, price?: number, currency?: string, source?: string, confidence?: number, reason?: string }}
 */
export function extractPrice(html) {
  if (!html || typeof html !== 'string') {
    return { success: false, reason: 'EMPTY_HTML' };
  }

  // Anti-bot check
  if (html.includes('Access Denied') || html.includes('Cloudflare') && html.includes('Attention Required!')) {
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

  // 2. Embedded __NEXT_DATA__ or state
  try {
    const nextDataScript = $('#__NEXT_DATA__').html();
    if (nextDataScript) {
      const parsed = JSON.parse(nextDataScript);
      const product = parsed.props?.pageProps?.initialData?.product || parsed.props?.pageProps?.product;
      const rawPrice = product?.price?.value || product?.finalPrice || product?.discountPrice;
      const price = parseFloat(String(rawPrice).replace(/[^\d.]/g, ''));
      if (!isNaN(price) && price > 0) {
        return {
          success: true,
          price: Math.round(price),
          currency: 'INR',
          source: 'NEXT_DATA',
          confidence: 0.95
        };
      }
    }
  } catch (e) {
    // Continue
  }

  // 3. DOM Selectors
  const selectors = [
    { sel: 'span.amount[data-testid="new-price"]', source: 'DOM_TESTID_NEW_PRICE' },
    { sel: 'span.amount', source: 'DOM_AMOUNT' },
    { sel: 'span.main-product-price', source: 'DOM_MAIN_PRICE' },
    { sel: 'span.pdp-cp', source: 'DOM_PDP_CP' },
    { sel: '#pdp-product-price', source: 'DOM_PDP_ID_PRICE' }
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

  return { success: false, reason: 'PRICE_NOT_FOUND' };
}
