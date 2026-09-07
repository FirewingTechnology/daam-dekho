/**
 * Validates an extracted price against zero-trust business and anti-anomaly rules.
 * @param {{
 *   extractedPrice: any,
 *   storedPrice?: number,
 *   currency?: string,
 *   confidence?: number,
 *   reason?: string
 * }} context
 * @returns {{ isValid: boolean, error?: string, sanitizedPrice?: number }}
 */
export function validatePrice(context) {
  const { extractedPrice, storedPrice, currency = 'INR', confidence = 1.0, reason } = context;

  if (reason) {
    return { isValid: false, error: reason };
  }

  if (extractedPrice === null || extractedPrice === undefined || extractedPrice === '') {
    return { isValid: false, error: 'PRICE_MISSING' };
  }

  const num = typeof extractedPrice === 'number' ? extractedPrice : parseFloat(String(extractedPrice).replace(/[^\d.]/g, ''));

  if (isNaN(num)) {
    return { isValid: false, error: 'PRICE_NOT_A_NUMBER' };
  }

  if (num <= 0) {
    return { isValid: false, error: 'PRICE_NON_POSITIVE' };
  }

  if (currency && currency.toUpperCase() !== 'INR' && currency.toUpperCase() !== 'RS' && currency.toUpperCase() !== '₹') {
    return { isValid: false, error: `INVALID_CURRENCY_${currency}` };
  }

  if (num > 10000000) { // ₹1 Crore sanity threshold
    return { isValid: false, error: 'PRICE_EXCEEDS_SANITY_LIMIT' };
  }

  const rounded = Math.round(num);

  // Anomaly Detection against stored price (if previous valid price exists)
  if (storedPrice && storedPrice > 500) {
    // Drop of > 85% (e.g., ₹54,999 -> ₹5, which is likely EMI, accessory, or parsed rating)
    const dropRatio = rounded / storedPrice;
    if (dropRatio < 0.15) {
      return {
        isValid: false,
        error: `SUSPICIOUS_PRICE_DROP: Scraped ₹${rounded} is ${(dropRatio * 100).toFixed(1)}% of stored ₹${storedPrice}`,
        sanitizedPrice: rounded
      };
    }

    // Spike of > 10x
    const spikeRatio = rounded / storedPrice;
    if (spikeRatio > 10) {
      return {
        isValid: false,
        error: `SUSPICIOUS_PRICE_SPIKE: Scraped ₹${rounded} is ${spikeRatio.toFixed(1)}x of stored ₹${storedPrice}`,
        sanitizedPrice: rounded
      };
    }
  }

  if (confidence < 0.5) {
    return { isValid: false, error: 'EXTRACTION_CONFIDENCE_TOO_LOW' };
  }

  return {
    isValid: true,
    sanitizedPrice: rounded
  };
}
