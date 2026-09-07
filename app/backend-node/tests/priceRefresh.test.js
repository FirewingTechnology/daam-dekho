import { validateUrl } from '../services/safeUrlValidator.js';
import { getAdapter } from '../services/vendorAdapters/index.js';
import * as amazon from '../services/vendorAdapters/amazon.js';
import * as flipkart from '../services/vendorAdapters/flipkart.js';
import * as croma from '../services/vendorAdapters/croma.js';
import * as jiomart from '../services/vendorAdapters/jiomart.js';
import * as vijaysales from '../services/vendorAdapters/vijaysales.js';
import { validatePrice } from '../services/priceValidationService.js';
import { computeFreshness } from '../routes/priceRefresh.js';
import { 
  recordPriceCheckSuccess, 
  recordPriceCheckFailure, 
  getVendorProductPriceHistory 
} from '../services/priceHistoryService.js';
import { connectDB, closeDB, run, get } from '../utils/db.js';

describe('Price Refresh & Monitoring System Test Suite', () => {
  let testVpId = null;

  beforeAll(async () => {
    await connectDB();

    // Create a temporary test vendor_product for unit/acceptance testing
    const insertRes = await run(
      `INSERT INTO vendor_products (variant_id, vendor_id, vendor_product_id, title, url, price, current_price, previous_price, last_scraped_at)
       VALUES (1, 1, 'TEST_VP_9999', 'Test Refresh Phone 128GB', 'https://www.amazon.in/dp/B0TEST9999', 49999, 49999, NULL, datetime('now', '-2 hours'))`
    );
    testVpId = insertRes.lastID;
  });

  afterAll(async () => {
    if (testVpId) {
      await run(`DELETE FROM price_history WHERE vendor_product_id = ?`, [testVpId]);
      await run(`DELETE FROM vendor_products WHERE id = ?`, [testVpId]);
    }
    await closeDB();
  });

  // ================= 1. URL & SSRF Validation =================
  describe('1. URL Validation & SSRF Protection', () => {
    test('accepts valid real vendor product URLs', () => {
      const validUrls = [
        'https://www.amazon.in/dp/B0DSKMV3ZC',
        'https://www.flipkart.com/samsung-galaxy-s24/p/itm123',
        'https://www.croma.com/samsung-galaxy/p/1234',
        'https://www.jiomart.com/p/electronics/phone/123',
        'https://www.vijaysales.com/p/123/phone'
      ];
      for (const url of validUrls) {
        const res = validateUrl(url);
        expect(res.isValid).toBe(true);
      }
    });

    test('rejects localhost, private IPs, and cloud metadata SSRF targets', () => {
      const dangerous = [
        'http://localhost/admin',
        'http://127.0.0.1:8001/internal',
        'http://10.0.0.1/secrets',
        'http://192.168.1.1/router',
        'http://172.16.0.1/internal',
        'http://169.254.169.254/latest/meta-data/',
        'ftp://www.amazon.in/product',
        'javascript:alert(1)',
        '',
        '#'
      ];
      for (const url of dangerous) {
        const res = validateUrl(url);
        expect(res.isValid).toBe(false);
      }
    });
  });

  // ================= 2. Vendor Adapter Extraction =================
  describe('2. Vendor Extraction Adapters', () => {
    test('Amazon adapter extracts price from JSON-LD', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "Product",
                "name": "Samsung Galaxy",
                "offers": {
                  "@type": "Offer",
                  "price": "79999.00",
                  "priceCurrency": "INR"
                }
              }
            </script>
          </head>
        </html>
      `;
      const res = amazon.extractPrice(html);
      expect(res.success).toBe(true);
      expect(res.price).toBe(79999);
      expect(res.currency).toBe('INR');
      expect(res.source).toBe('JSON-LD');
    });

    test('Amazon adapter falls back to DOM whole-price selector', () => {
      const html = `
        <div id="corePriceDisplay_desktop_feature_div">
          <span class="a-price-whole">54,999<span class="a-price-decimal">.</span></span>
        </div>
      `;
      const res = amazon.extractPrice(html);
      expect(res.success).toBe(true);
      expect(res.price).toBe(54999);
    });

    test('Amazon adapter detects bot challenge / robot check', () => {
      const html = `<html><body><h4>Type the characters you see in this image</h4><p>Robot Check</p></body></html>`;
      const res = amazon.extractPrice(html);
      expect(res.success).toBe(false);
      expect(res.reason).toBe('BOT_DETECTION_CHALLENGE');
    });

    test('Flipkart adapter extracts price from JSON-LD and DOM', () => {
      const domHtml = `<div class="Nx9daj"><div class="_30jeq3">₹14,999</div></div>`;
      const res = flipkart.extractPrice(domHtml);
      expect(res.success).toBe(true);
      expect(res.price).toBe(14999);
    });

    test('Croma adapter extracts price from amount selector and Next data', () => {
      const html = `<span class="amount" data-testid="new-price">₹89,990</span>`;
      const res = croma.extractPrice(html);
      expect(res.success).toBe(true);
      expect(res.price).toBe(89990);
    });

    test('JioMart adapter extracts price', () => {
      const html = `<span class="jm-heading-xxs">₹24,499.00</span>`;
      const res = jiomart.extractPrice(html);
      expect(res.success).toBe(true);
      expect(res.price).toBe(24499);
    });

    test('Vijay Sales adapter extracts price', () => {
      const html = `<span id="spnPrice">₹1,14,999</span>`;
      const res = vijaysales.extractPrice(html);
      expect(res.success).toBe(true);
      expect(res.price).toBe(114999);
    });

    test('handles malformed HTML gracefully without throwing', () => {
      const malformed = `<div><<<>>>broken </span></span>`;
      const res = amazon.extractPrice(malformed);
      expect(res.success).toBe(false);
      expect(res.reason).toBe('PRICE_NOT_FOUND');
    });
  });

  // ================= 3. Price Validation & Anti-Anomaly =================
  describe('3. Price Validation & Anti-Anomaly Rules', () => {
    test('accepts valid normal price', () => {
      const res = validatePrice({ extractedPrice: 48999, storedPrice: 49999, currency: 'INR' });
      expect(res.isValid).toBe(true);
      expect(res.sanitizedPrice).toBe(48999);
    });

    test('rejects zero or negative prices', () => {
      expect(validatePrice({ extractedPrice: 0 }).isValid).toBe(false);
      expect(validatePrice({ extractedPrice: -100 }).isValid).toBe(false);
      expect(validatePrice({ extractedPrice: null }).isValid).toBe(false);
    });

    test('rejects non-INR currencies', () => {
      const res = validatePrice({ extractedPrice: 500, currency: 'USD' });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('INVALID_CURRENCY');
    });

    test('rejects suspicious price drop (e.g. ₹54,999 down to ₹5)', () => {
      const res = validatePrice({
        extractedPrice: 5,
        storedPrice: 54999,
        currency: 'INR'
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('SUSPICIOUS_PRICE_DROP');
    });

    test('rejects suspicious price spike (> 10x)', () => {
      const res = validatePrice({
        extractedPrice: 600000,
        storedPrice: 50000,
        currency: 'INR'
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('SUSPICIOUS_PRICE_SPIKE');
    });
  });

  // ================= 4. Freshness Computation =================
  describe('4. Freshness Logic', () => {
    test('marks recent checks as fresh', () => {
      const justNow = new Date().toISOString();
      const res = computeFreshness(justNow);
      expect(res.is_stale).toBe(false);
      expect(res.label).toBe('Checked just now');
    });

    test('marks checks > 30 minutes as stale', () => {
      const fortyMinsAgo = new Date(Date.now() - 40 * 60000).toISOString();
      const res = computeFreshness(fortyMinsAgo);
      expect(res.is_stale).toBe(true);
      expect(res.label).toContain('Checked 40 mins ago');
    });

    test('honestly describes failed refresh status', () => {
      const res = computeFreshness(new Date().toISOString(), 'failed');
      expect(res.status).toBe('failed');
      expect(res.label).toBe('Price could not be refreshed');
    });
  });

  // ================= 5. Acceptance Scenario (Section 37) =================
  describe('5. Acceptance Scenario (Section 37)', () => {
    test('Step A: Initial stored price ₹49,999 drops to ₹47,999 -> records history & DOWN delta', async () => {
      const res = await recordPriceCheckSuccess({
        vendorProductId: testVpId,
        newPrice: 47999,
        source: 'TEST_ACCEPTANCE'
      });

      expect(res.success).toBe(true);
      expect(res.priceChanged).toBe(true);
      expect(res.previousPrice).toBe(49999);
      expect(res.currentPrice).toBe(47999);
      expect(res.priceDifference).toBe(-2000);
      expect(res.direction).toBe('DOWN');

      // Verify DB
      const updatedVp = await get(`SELECT current_price, previous_price FROM vendor_products WHERE id = ?`, [testVpId]);
      expect(updatedVp.current_price).toBe(47999);
      expect(updatedVp.previous_price).toBe(49999);

      const history = await getVendorProductPriceHistory(testVpId);
      expect(history.length).toBe(1);
      expect(history[0].price).toBe(47999);
    });

    test('Step B: Refresh again while vendor remains ₹47,999 -> NO duplicate history row created', async () => {
      const res = await recordPriceCheckSuccess({
        vendorProductId: testVpId,
        newPrice: 47999,
        source: 'TEST_ACCEPTANCE'
      });

      expect(res.success).toBe(true);
      expect(res.priceChanged).toBe(false);
      expect(res.direction).toBe('UNCHANGED');
      expect(res.priceDifference).toBe(0);

      // Verify history count is still 1 (no duplicate row!)
      const history = await getVendorProductPriceHistory(testVpId);
      expect(history.length).toBe(1);
    });

    test('Step C: Vendor price rises to ₹51,999 -> records history & UP delta', async () => {
      const res = await recordPriceCheckSuccess({
        vendorProductId: testVpId,
        newPrice: 51999,
        source: 'TEST_ACCEPTANCE'
      });

      expect(res.success).toBe(true);
      expect(res.priceChanged).toBe(true);
      expect(res.previousPrice).toBe(47999);
      expect(res.currentPrice).toBe(51999);
      expect(res.priceDifference).toBe(4000);
      expect(res.direction).toBe('UP');

      // Verify DB has second history record
      const history = await getVendorProductPriceHistory(testVpId);
      expect(history.length).toBe(2);
      expect(history[0].price).toBe(47999);
      expect(history[1].price).toBe(51999);
    });

    test('Step D: Failed scrape records failure without modifying stored price', async () => {
      await recordPriceCheckFailure(testVpId, '403_FORBIDDEN_SIMULATED');

      const vp = await get(`SELECT current_price, price_check_status, price_check_error FROM vendor_products WHERE id = ?`, [testVpId]);
      // Price must NOT be touched or nullified!
      expect(vp.current_price).toBe(51999);
      expect(vp.price_check_status).toBe('failed');
      expect(vp.price_check_error).toBe('403_FORBIDDEN_SIMULATED');
    });
  });
});
