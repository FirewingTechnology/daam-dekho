import * as amazon from './amazon.js';
import * as flipkart from './flipkart.js';
import * as croma from './croma.js';
import * as jiomart from './jiomart.js';
import * as vijaysales from './vijaysales.js';
import * as generic from './generic.js';

const adapters = [amazon, flipkart, croma, jiomart, vijaysales];

/**
 * Resolves the appropriate vendor adapter based on URL hostname, vendor name, or vendor ID.
 * @param {{ url?: string, vendorName?: string, vendorId?: number }} criteria
 * @returns {object} Vendor adapter object
 */
export function getAdapter(criteria = {}) {
  const { url, vendorName, vendorId } = criteria;

  if (vendorId) {
    if (vendorId === 1) return amazon;
    if (vendorId === 2) return flipkart;
    if (vendorId === 3) return croma;
    if (vendorId === 4) return jiomart;
    if (vendorId === 5) return vijaysales;
  }

  if (vendorName) {
    const norm = String(vendorName).toLowerCase().trim();
    if (norm.includes('amazon')) return amazon;
    if (norm.includes('flipkart')) return flipkart;
    if (norm.includes('croma')) return croma;
    if (norm.includes('jiomart') || norm.includes('jio')) return jiomart;
    if (norm.includes('vijay')) return vijaysales;
  }

  if (url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      for (const adapter of adapters) {
        if (adapter.domains.some(d => hostname === d || hostname.endsWith('.' + d))) {
          return adapter;
        }
      }
    } catch (e) {
      // invalid URL, fallback to generic
    }
  }

  return generic;
}

export { amazon, flipkart, croma, jiomart, vijaysales, generic };
