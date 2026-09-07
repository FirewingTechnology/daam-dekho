import axios from 'axios';
import { validateUrl } from './safeUrlValidator.js';
import { getAdapter } from './vendorAdapters/index.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const DEFAULT_TIMEOUT_MS = parseInt(process.env.PRICE_REFRESH_TIMEOUT_MS, 10) || 15000;
const MAX_RETRIES = parseInt(process.env.PRICE_REFRESH_MAX_RETRIES, 10) || 2;
const BACKOFF_BASE_MS = parseInt(process.env.PRICE_REFRESH_BACKOFF_MS, 10) || 1000;

/**
 * Fetches vendor HTML and extracts price using the vendor adapter.
 * @param {{ url: string, vendorId?: number, vendorName?: string }} item
 * @param {object} options
 * @returns {Promise<{ success: boolean, price?: number, currency?: string, source?: string, confidence?: number, reason?: string, httpStatus?: number, durationMs?: number }>}
 */
export async function fetchAndExtractPrice(item, options = {}) {
  const { url, vendorId, vendorName } = item;
  const timeout = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries !== undefined ? options.maxRetries : MAX_RETRIES;

  // 1. URL and SSRF validation
  const urlValidation = validateUrl(url);
  if (!urlValidation.isValid) {
    return { success: false, reason: urlValidation.error };
  }

  const adapter = getAdapter({ url, vendorId, vendorName });
  const startTime = Date.now();

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const response = await axios.get(url, {
        timeout,
        maxRedirects: 5,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        validateStatus: (status) => status < 500 // Don't throw on 4xx so we can inspect status
      });

      const durationMs = Date.now() - startTime;
      const status = response.status;

      if (status === 403 || status === 429) {
        return {
          success: false,
          reason: status === 429 ? 'RATE_LIMITED' : 'ACCESS_FORBIDDEN',
          httpStatus: status,
          durationMs
        };
      }

      if (status >= 400) {
        return {
          success: false,
          reason: `HTTP_STATUS_${status}`,
          httpStatus: status,
          durationMs
        };
      }

      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/json') && !contentType.includes('application/xhtml+xml')) {
        return {
          success: false,
          reason: `INVALID_CONTENT_TYPE: ${contentType}`,
          httpStatus: status,
          durationMs
        };
      }

      const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      const extraction = adapter.extractPrice(html);

      return {
        ...extraction,
        httpStatus: status,
        durationMs,
        adapterName: adapter.name
      };
    } catch (err) {
      lastError = err;
      // If timed out or network glitch and retries remain, back off
      if (attempt <= maxRetries && (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET')) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      break;
    }
  }

  const durationMs = Date.now() - startTime;
  const reason = lastError?.code === 'ECONNABORTED' || lastError?.code === 'ETIMEDOUT'
    ? 'TIMEOUT'
    : (lastError?.message || 'NETWORK_ERROR');

  return {
    success: false,
    reason,
    durationMs
  };
}
