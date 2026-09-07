import { URL } from 'url';

// Recognized e-commerce domains
const ALLOWED_VENDOR_DOMAINS = [
  'amazon.in',
  'www.amazon.in',
  'flipkart.com',
  'www.flipkart.com',
  'dl.flipkart.com',
  'croma.com',
  'www.croma.com',
  'jiomart.com',
  'www.jiomart.com',
  'vijaysales.com',
  'www.vijaysales.com',
  'vsprod.vijaysales.com',
  'reliancedigital.in',
  'www.reliancedigital.in'
];

// Private IP / dangerous host patterns (SSRF Protection)
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./, // Link-local / cloud metadata (AWS, GCP, Azure)
  /^0\./,
  /^::1$/,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i
];

/**
 * Validates a vendor product URL against security policies (SSRF prevention, scheme check, domain check).
 * @param {string} rawUrl
 * @param {object} options
 * @returns {{ isValid: boolean, error?: string, parsedUrl?: URL }}
 */
export function validateUrl(rawUrl, options = { allowAnyHttpsVendor: false }) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'EMPTY_OR_INVALID_URL' };
  }

  const trimmed = rawUrl.trim();
  if (trimmed === '' || trimmed === '#' || trimmed === 'N/A') {
    return { isValid: false, error: 'PLACEHOLDER_URL' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    return { isValid: false, error: 'MALFORMED_URL' };
  }

  // Enforce protocol
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: `UNSUPPORTED_PROTOCOL: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // SSRF check: Check against blocked IP / localhost patterns
  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      return { isValid: false, error: `FORBIDDEN_HOST_SSRF_DETECTED: ${hostname}` };
    }
  }

  // Check if port is specified and unusual (e.g. internal service ports)
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { isValid: false, error: `FORBIDDEN_PORT: ${parsed.port}` };
  }

  // Check vendor domain
  const isKnownVendor = ALLOWED_VENDOR_DOMAINS.some(allowed => 
    hostname === allowed || hostname.endsWith('.' + allowed)
  );

  if (!isKnownVendor && !options.allowAnyHttpsVendor) {
    return { isValid: false, error: `UNRECOGNIZED_VENDOR_DOMAIN: ${hostname}` };
  }

  return { isValid: true, parsedUrl: parsed };
}
