/**
 * realVendorVerify.js
 * -------------------
 * DRY-RUN real URL verification script.
 * Tests representative vendor URLs from each adapter.
 * NEVER writes to production database.
 *
 * Usage:
 *   node --experimental-vm-modules scripts/realVendorVerify.js
 */

import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { validateUrl } from '../services/safeUrlValidator.js';
import * as amazonAdapter from '../services/vendorAdapters/amazon.js';
import * as flipkartAdapter from '../services/vendorAdapters/flipkart.js';
import * as cromaAdapter from '../services/vendorAdapters/croma.js';
import * as jiomartAdapter from '../services/vendorAdapters/jiomart.js';
import * as vijaysalesAdapter from '../services/vendorAdapters/vijaysales.js';

const TIMEOUT_MS = 20000;
const DELAY_BETWEEN_REQUESTS_MS = 2500;

// Representative sample — 1–2 per vendor. DRY-RUN ONLY.
const TEST_CASES = [
  {
    vendor: 'Amazon',
    vendorProductId: 178,
    storedTitle: 'Galaxy S25 Ultra 5G AI Smartphone (Titanium Gray, 12GB RAM, 256GB Storage)',
    storedPrice: 129999,
    url: 'https://www.amazon.in/Samsung-Smartphone-Titanium-Snapdragon-ProVisual/dp/B0DSKMV3ZC',
    adapter: amazonAdapter,
  },
  {
    vendor: 'Amazon',
    vendorProductId: 180,
    storedTitle: 'Galaxy M07 Mobile (Black, 4GB RAM, 64GB Storage)',
    storedPrice: 11499,
    url: 'https://www.amazon.in/Samsung-Storage-MediaTek-Charging-Upgrades/dp/B0FN7QTRPY',
    adapter: amazonAdapter,
  },
  {
    vendor: 'Flipkart',
    vendorProductId: 202,
    storedTitle: 'Samsung Galaxy F70e 5G',
    storedPrice: 14999,
    url: 'https://www.flipkart.com/samsung-galaxy-f70e-5g-limelight-green-128-gb/p/itmf26a013c841a6',
    adapter: flipkartAdapter,
  },
  {
    vendor: 'Flipkart',
    vendorProductId: 203,
    storedTitle: 'Samsung Galaxy F07',
    storedPrice: 11499,
    url: 'https://www.flipkart.com/samsung-galaxy-f07-green-64-gb/p/itm294cbb65839e6',
    adapter: flipkartAdapter,
  },
  {
    vendor: 'Croma',
    vendorProductId: 217,
    storedTitle: 'SAMSUNG Galaxy S26 5G',
    storedPrice: 79999,
    url: 'https://www.croma.com/samsung-galaxy-s26-5g-12gb-ram-256gb-cobalt-violet-/p/321483',
    adapter: cromaAdapter,
  },
  {
    vendor: 'Croma',
    vendorProductId: 218,
    storedTitle: 'SAMSUNG Galaxy F17 5G',
    storedPrice: 20999,
    url: 'https://www.croma.com/samsung-galaxy-f17-5g-8gb-ram-128gb-violet-pop-/p/319129',
    adapter: cromaAdapter,
  },
  {
    vendor: 'JioMart',
    vendorProductId: 232,
    storedTitle: 'Samsung Galaxy S26 5G 256 GB, 12 GB RAM',
    storedPrice: 87999,
    url: 'https://www.jiomart.com/p/electronics/samsung-galaxy-s26-5g-256-gb-12-gb-ram-with-ai-phone-photo-assist-creative-studio-4300-mah-battery-black-mobile-phone-mm3con-73992500',
    adapter: jiomartAdapter,
  },
  {
    vendor: 'JioMart',
    vendorProductId: 234,
    storedTitle: 'Samsung Galaxy A07 5G',
    storedPrice: 20999,
    url: 'https://www.jiomart.com/p/electronics/a07-ekl-not-for-sale-ml10s2-72830096',
    adapter: jiomartAdapter,
  },
  {
    vendor: 'Vijay Sales',
    vendorProductId: 252,
    storedTitle: 'Samsung Galaxy S26 5G (12GB RAM, 256GB Storage)',
    storedPrice: 87999,
    url: 'https://www.vijaysales.com/p/P252427/252428/samsung-galaxy-s26-5g-12gb-ram-256gb-storage-exynos-2600-4300-mah-battery-ai-phone-cobalt-violet',
    adapter: vijaysalesAdapter,
  },
  {
    vendor: 'Vijay Sales',
    vendorProductId: 254,
    storedTitle: 'Samsung Galaxy S26 5G (12GB RAM, 256GB Storage)',
    storedPrice: 87999,
    url: 'https://www.vijaysales.com/p/P252427/252427/samsung-galaxy-s26-5g-12gb-ram-256gb-storage-exynos-2600-4300-mah-battery-ai-phone-black',
    adapter: vijaysalesAdapter,
  },
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Check title similarity — basic keyword overlap.
 * Returns: 'LIKELY_MATCH' | 'WEAK_MATCH' | 'LIKELY_MISMATCH' | 'TITLE_NOT_FOUND'
 */
function checkProductMatch(storedTitle, scrapedTitle) {
  if (!scrapedTitle || scrapedTitle.trim() === '') return 'TITLE_NOT_FOUND';
  const storedWords = storedTitle.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const scrapedLower = scrapedTitle.toLowerCase();
  const matchCount = storedWords.filter(w => scrapedLower.includes(w)).length;
  const ratio = matchCount / Math.max(storedWords.length, 1);
  if (ratio >= 0.5) return 'LIKELY_MATCH';
  if (ratio >= 0.25) return 'WEAK_MATCH';
  return 'LIKELY_MISMATCH';
}

/**
 * Extract page title using cheerio.
 */
function extractPageTitle(html) {
  try {
    const $ = cheerio.load(html);
    // Try JSON-LD first
    const scripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i++) {
      try {
        const content = $(scripts[i]).html();
        const data = JSON.parse(content || '{}');
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'Product' && item.name) return item.name;
        }
      } catch {}
    }
    // OG title
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) return ogTitle;
    // HTML title
    const htmlTitle = $('title').text().trim();
    if (htmlTitle) return htmlTitle;
  } catch {}
  return null;
}

async function verifyUrl(testCase) {
  const { vendor, vendorProductId, storedTitle, storedPrice, url, adapter } = testCase;
  const startTime = Date.now();
  const result = {
    vendor,
    vendor_product_id: vendorProductId,
    url,
    stored_title: storedTitle,
    stored_price: storedPrice,
    http_status: null,
    final_url: null,
    redirect_detected: false,
    product_match: null,
    scraped_title: null,
    price_found: false,
    extracted_price: null,
    currency: null,
    extraction_method: null,
    confidence: null,
    validation: null,
    status: null,
    failure_reason: null,
    duration_ms: null,
    database_write: 'NO (DRY RUN)',
  };

  // 1. SSRF / URL validation
  const urlCheck = validateUrl(url);
  if (!urlCheck.isValid) {
    result.status = 'URL_INVALID';
    result.failure_reason = urlCheck.error;
    result.duration_ms = Date.now() - startTime;
    return result;
  }

  // 2. HTTP fetch
  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT_MS,
      maxRedirects: 5,
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
      },
      validateStatus: () => true, // never throw on status codes
    });

    result.http_status = response.status;
    result.final_url = response.request?.res?.responseUrl || url;
    result.redirect_detected = result.final_url !== url;

    // 3. Bot / block detection via status
    if (response.status === 403) {
      result.status = 'BLOCKED';
      result.failure_reason = 'ACCESS_FORBIDDEN (HTTP 403)';
      result.duration_ms = Date.now() - startTime;
      return result;
    }
    if (response.status === 429) {
      result.status = 'BLOCKED';
      result.failure_reason = 'RATE_LIMITED (HTTP 429)';
      result.duration_ms = Date.now() - startTime;
      return result;
    }
    if (response.status === 503) {
      result.status = 'BLOCKED';
      result.failure_reason = 'SERVICE_UNAVAILABLE (HTTP 503)';
      result.duration_ms = Date.now() - startTime;
      return result;
    }
    if (response.status >= 400) {
      result.status = 'FAILED';
      result.failure_reason = `HTTP_STATUS_${response.status}`;
      result.duration_ms = Date.now() - startTime;
      return result;
    }

    const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

    // 4. Extract page title & check product identity
    const scrapedTitle = extractPageTitle(html);
    result.scraped_title = scrapedTitle;
    result.product_match = checkProductMatch(storedTitle, scrapedTitle);

    // 5. Run adapter extraction
    const extraction = adapter.extractPrice(html);

    if (!extraction.success) {
      result.status = extraction.reason === 'BOT_DETECTION_CHALLENGE' ? 'BLOCKED' : 'PRICE_NOT_FOUND';
      result.failure_reason = extraction.reason || 'ADAPTER_EXTRACTION_FAILED';
      result.duration_ms = Date.now() - startTime;
      return result;
    }

    result.price_found = true;
    result.extracted_price = extraction.price;
    result.currency = extraction.currency || 'INR';
    result.extraction_method = extraction.source;
    result.confidence = extraction.confidence;

    // 6. Zero-trust price validation
    const price = extraction.price;
    if (!price || typeof price !== 'number' || !isFinite(price) || price <= 0) {
      result.validation = 'FAIL: price not finite/positive';
      result.status = 'PRICE_INVALID';
      result.failure_reason = 'NON_POSITIVE_PRICE';
      result.duration_ms = Date.now() - startTime;
      return result;
    }
    if (price > 1000000) {
      result.validation = 'FAIL: exceeds max ceiling';
      result.status = 'PRICE_INVALID';
      result.failure_reason = 'EXCEEDS_MAX_CEILING';
      result.duration_ms = Date.now() - startTime;
      return result;
    }
    // Anti-anomaly: >85% drop vs stored
    if (storedPrice > 0 && price < storedPrice * 0.15) {
      result.validation = 'FAIL: anomaly drop >85%';
      result.status = 'ANOMALY_REJECTED';
      result.failure_reason = `ANOMALY_DROP: stored=${storedPrice} extracted=${price}`;
      result.duration_ms = Date.now() - startTime;
      return result;
    }
    // Anti-anomaly: >10x spike vs stored
    if (storedPrice > 0 && price > storedPrice * 10) {
      result.validation = 'FAIL: anomaly spike >10x';
      result.status = 'ANOMALY_REJECTED';
      result.failure_reason = `ANOMALY_SPIKE: stored=${storedPrice} extracted=${price}`;
      result.duration_ms = Date.now() - startTime;
      return result;
    }

    result.validation = 'PASS';
    result.status = result.product_match === 'LIKELY_MISMATCH' ? 'PRODUCT_MISMATCH' : 'SUCCESS';
    result.duration_ms = Date.now() - startTime;
    return result;

  } catch (err) {
    result.status = 'FAILED';
    result.failure_reason = err.code || err.message || 'NETWORK_ERROR';
    result.duration_ms = Date.now() - startTime;
    return result;
  }
}

function printRow(r) {
  const statusIcon = {
    SUCCESS: '✅',
    BLOCKED: '🚫',
    PRICE_NOT_FOUND: '❌',
    PRICE_INVALID: '⚠️',
    ANOMALY_REJECTED: '⚠️',
    PRODUCT_MISMATCH: '⚠️',
    FAILED: '❌',
    URL_INVALID: '❌',
  }[r.status] || '❓';

  console.log('\n' + '─'.repeat(80));
  console.log(`${statusIcon}  Vendor:           ${r.vendor}`);
  console.log(`   Vendor Prod ID:  ${r.vendor_product_id}`);
  console.log(`   URL:             ${r.url}`);
  console.log(`   HTTP Status:     ${r.http_status ?? 'N/A'}`);
  console.log(`   Redirect:        ${r.redirect_detected ? `YES → ${r.final_url}` : 'NO'}`);
  console.log(`   Stored Title:    ${r.stored_title}`);
  console.log(`   Scraped Title:   ${r.scraped_title ?? 'NOT FOUND'}`);
  console.log(`   Product Match:   ${r.product_match ?? 'N/A'}`);
  console.log(`   Price Found:     ${r.price_found ? 'YES' : 'NO'}`);
  if (r.price_found) {
    console.log(`   Extracted Price: ₹${r.extracted_price?.toLocaleString('en-IN') ?? 'N/A'}`);
    console.log(`   Stored Price:    ₹${r.stored_price?.toLocaleString('en-IN') ?? 'N/A'}`);
    const diff = r.extracted_price - r.stored_price;
    const direction = diff < 0 ? 'DOWN' : diff > 0 ? 'UP' : 'UNCHANGED';
    console.log(`   Price Movement:  ${direction} (Δ ${diff >= 0 ? '+' : ''}₹${Math.abs(diff).toLocaleString('en-IN')})`);
    console.log(`   Currency:        ${r.currency}`);
    console.log(`   Extraction:      ${r.extraction_method}`);
    console.log(`   Confidence:      ${r.confidence}`);
    console.log(`   Validation:      ${r.validation}`);
  }
  console.log(`   Status:          ${r.status}`);
  if (r.failure_reason) console.log(`   Failure Reason:  ${r.failure_reason}`);
  console.log(`   Database Write:  ${r.database_write}`);
  console.log(`   Duration:        ${r.duration_ms}ms`);
}

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('  DAAMDEKHO — REAL VENDOR URL VERIFICATION (DRY-RUN, NO DB WRITES)');
  console.log('  Mode: DRY-RUN | Products tested: ' + TEST_CASES.length);
  console.log('  Time: ' + new Date().toISOString());
  console.log('═'.repeat(80));

  const allResults = [];
  const vendorGroups = {};

  for (const [i, tc] of TEST_CASES.entries()) {
    if (i > 0) {
      const ms = DELAY_BETWEEN_REQUESTS_MS;
      console.log(`\n[RATE LIMIT] Waiting ${ms}ms before next request...`);
      await delay(ms);
    }
    console.log(`\n[${i + 1}/${TEST_CASES.length}] Testing: ${tc.vendor} — vp_id=${tc.vendorProductId}`);
    const result = await verifyUrl(tc);
    allResults.push(result);
    printRow(result);

    if (!vendorGroups[tc.vendor]) {
      vendorGroups[tc.vendor] = { tested: 0, success: 0, blocked: 0, failed: 0 };
    }
    vendorGroups[tc.vendor].tested++;
    if (result.status === 'SUCCESS') vendorGroups[tc.vendor].success++;
    else if (result.status === 'BLOCKED') vendorGroups[tc.vendor].blocked++;
    else vendorGroups[tc.vendor].failed++;
  }

  // Summary table
  console.log('\n\n' + '═'.repeat(80));
  console.log('  FINAL SUMMARY TABLE');
  console.log('═'.repeat(80));
  console.log(
    'Vendor'.padEnd(16) +
    'Tested'.padEnd(10) +
    'Success'.padEnd(12) +
    'Blocked'.padEnd(12) +
    'Failed'.padEnd(10) +
    'Success%'
  );
  console.log('─'.repeat(80));

  let totalTested = 0, totalSuccess = 0, totalBlocked = 0, totalFailed = 0;
  for (const [vendor, stats] of Object.entries(vendorGroups)) {
    const pct = ((stats.success / stats.tested) * 100).toFixed(0);
    console.log(
      vendor.padEnd(16) +
      String(stats.tested).padEnd(10) +
      String(stats.success).padEnd(12) +
      String(stats.blocked).padEnd(12) +
      String(stats.failed).padEnd(10) +
      `${pct}%`
    );
    totalTested += stats.tested;
    totalSuccess += stats.success;
    totalBlocked += stats.blocked;
    totalFailed += stats.failed;
  }
  console.log('─'.repeat(80));
  const totalPct = ((totalSuccess / totalTested) * 100).toFixed(0);
  console.log(
    'TOTAL'.padEnd(16) +
    String(totalTested).padEnd(10) +
    String(totalSuccess).padEnd(12) +
    String(totalBlocked).padEnd(12) +
    String(totalFailed).padEnd(10) +
    `${totalPct}%`
  );

  console.log('\n  KEY FINDINGS:');
  const priceExtractionResults = allResults.filter(r => r.price_found);
  console.log(`  Real prices successfully extracted: ${priceExtractionResults.length}/${totalTested}`);
  const blocked = allResults.filter(r => r.status === 'BLOCKED');
  console.log(`  Blocked by vendor anti-bot: ${blocked.length} (vendors: ${[...new Set(blocked.map(r => r.vendor))].join(', ') || 'none'})`);
  const mismatches = allResults.filter(r => r.product_match === 'LIKELY_MISMATCH');
  console.log(`  Product mismatches detected: ${mismatches.length}`);
  const anomalies = allResults.filter(r => r.status === 'ANOMALY_REJECTED');
  console.log(`  Anomalies rejected (price guard): ${anomalies.length}`);
  console.log(`  Average duration: ${Math.round(allResults.reduce((s,r) => s + (r.duration_ms||0), 0) / allResults.length)}ms`);
  console.log('\n  NOTE: DRY-RUN — NO PRICES WERE WRITTEN TO THE DATABASE.');
  console.log('═'.repeat(80) + '\n');
}

main().catch(err => {
  console.error('\n[FATAL] Script error:', err);
  process.exit(1);
});
