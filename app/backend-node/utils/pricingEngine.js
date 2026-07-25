/**
 * 🧠 SMART PRICING ENGINE
 * Advanced offer-aware best deal calculation system
 * Considers: discounts, coupons, bank offers, cashback, exchange, delivery
 */

/**
 * Apply platform-specific discount
 * @param {number} basePrice - Base price of product
 * @param {object} discountData - Discount information
 * @returns {number} Discount amount
 */
export const applyPlatformDiscount = (basePrice, discountData = {}) => {
  if (!discountData || typeof discountData !== 'object') return 0;

  const { percentage = 0, flatAmount = 0, maxDiscount = Infinity } = discountData;

  let discount = 0;

  // Calculate percentage-based discount
  if (percentage > 0) {
    discount = (basePrice * percentage) / 100;
  }
  // Use flat amount if higher
  if (flatAmount > discount) {
    discount = flatAmount;
  }

  // Respect max discount cap
  return Math.min(discount, maxDiscount);
};

/**
 * Apply coupon/promo code discount
 * @param {number} priceAfterDiscount - Price after platform discount
 * @param {object} couponData - Coupon offer details
 * @returns {number} Coupon discount amount
 */
export const applyCouponDiscount = (priceAfterDiscount, couponData = {}) => {
  if (!couponData || typeof couponData !== 'object') return 0;

  const {
    code = '',
    percentage = 0,
    flatAmount = 0,
    minTransaction = 0,
    maxDiscount = Infinity,
    applicable = true
  } = couponData;

  // Check if coupon is applicable
  if (!applicable || !code) return 0;

  // Check minimum transaction requirement
  if (priceAfterDiscount < minTransaction) return 0;

  let discount = 0;

  if (percentage > 0) {
    discount = (priceAfterDiscount * percentage) / 100;
  } else if (flatAmount > 0) {
    discount = flatAmount;
  }

  return Math.min(discount, maxDiscount);
};

/**
 * Apply best bank offer from available offers
 * @param {number} priceAfterCoupon - Price after coupon discount
 * @param {array} bankOffers - Array of bank offer objects
 * @param {array} preferredBanks - User's preferred banks (optional)
 * @returns {object} Best bank offer details { discount: number, offer: object, bankName: string }
 */
export const applyBestBankOffer = (priceAfterCoupon, bankOffers = [], preferredBanks = []) => {
  if (!Array.isArray(bankOffers) || bankOffers.length === 0) {
    return { discount: 0, offer: null, bankName: '' };
  }

  let bestOffer = null;
  let maxDiscount = 0;
  let selectedBankName = '';

  bankOffers.forEach((offer) => {
    // Skip if bank not in preferred list (if list provided)
    if (preferredBanks.length > 0 && !preferredBanks.includes(offer.bank)) {
      return;
    }

    // Check minimum transaction requirement
    if (priceAfterCoupon < (offer.minTransaction || 0)) {
      return;
    }

    let currentDiscount = 0;

    if (offer.percentage) {
      currentDiscount = (priceAfterCoupon * offer.percentage) / 100;
    } else if (offer.flatAmount) {
      currentDiscount = offer.flatAmount;
    }

    // Apply max discount cap
    if (offer.maxDiscount) {
      currentDiscount = Math.min(currentDiscount, offer.maxDiscount);
    }

    // Select best offer (highest discount)
    if (currentDiscount > maxDiscount) {
      maxDiscount = currentDiscount;
      bestOffer = offer;
      selectedBankName = offer.bank;
    }
  });

  return {
    discount: maxDiscount,
    offer: bestOffer,
    bankName: selectedBankName
  };
};

/**
 * Apply cashback offer
 * @param {number} priceAfterBank - Price after bank discount
 * @param {object} cashbackData - Cashback offer details
 * @param {boolean} includeCashback - User preference to include cashback
 * @returns {number} Cashback amount
 */
export const applyCashback = (priceAfterBank, cashbackData = {}, includeCashback = true) => {
  if (!includeCashback || !cashbackData || typeof cashbackData !== 'object') return 0;

  const {
    percentage = 0,
    flatAmount = 0,
    maxCashback = Infinity,
    minTransaction = 0,
    applicable = true
  } = cashbackData;

  if (!applicable) return 0;

  // Check minimum transaction requirement
  if (priceAfterBank < minTransaction) return 0;

  let cashback = 0;

  if (percentage > 0) {
    cashback = (priceAfterBank * percentage) / 100;
  } else if (flatAmount > 0) {
    cashback = flatAmount;
  }

  return Math.min(cashback, maxCashback);
};

/**
 * Apply exchange bonus (trade-in value)
 * @param {object} exchangeData - Exchange offer details
 * @param {boolean} includeExchange - User preference to include exchange
 * @returns {number} Exchange bonus amount
 */
export const applyExchangeBonus = (exchangeData = {}, includeExchange = true) => {
  if (!includeExchange || !exchangeData || typeof exchangeData !== 'object') return 0;

  const { bonus = 0, maxBonus = Infinity, applicable = true } = exchangeData;

  if (!applicable) return 0;

  return Math.min(bonus, maxBonus);
};

/**
 * Calculate delivery charges
 * @param {object} deliveryData - Delivery charge details
 * @param {number} priceAfterAll - Price after all discounts
 * @returns {number} Delivery charge amount
 */
export const calculateDeliveryCharge = (deliveryData = {}, priceAfterAll = 0) => {
  if (!deliveryData || typeof deliveryData !== 'object') return 0;

  const { charge = 0, freeAbove = 0, applicable = true } = deliveryData;

  if (!applicable) return 0;

  // Free delivery above certain amount
  if (freeAbove > 0 && priceAfterAll >= freeAbove) return 0;

  return Math.max(charge, 0);
};

/**
 * Calculate EMI monthly installment
 * @param {number} finalPrice - Final effective price
 * @param {object} emiData - EMI offer details
 * @returns {object} EMI details { monthlyAmount: number, months: number, totalAmount: number, interestRate: number }
 */
export const calculateEMI = (finalPrice, emiData = {}) => {
  if (!emiData || typeof emiData !== 'object' || !emiData.months) {
    return null;
  }

  const { months = 0, interestRate = 0 } = emiData;

  if (months <= 0) return null;

  const monthlyRate = interestRate / 100 / 12;
  const monthlyAmount = monthlyRate === 0
    ? finalPrice / months
    : (finalPrice * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);

  return {
    monthlyAmount: Math.round(monthlyAmount),
    months,
    totalAmount: finalPrice,
    interestRate
  };
};

/**
 * Calculate effective price with all discounts and offers
 * @param {object} priceData - Complete pricing data
 * @returns {object} Detailed breakdown with effective price
 */
export const calculateEffectivePrice = (priceData = {}) => {
  const {
    basePrice = 0,
    platformDiscount = {},
    couponOffer = {},
    bankOffers = [],
    cashbackOffer = {},
    exchangeBonus = {},
    deliveryCharge = {},
    userPreferences = {}
  } = priceData;

  // User preferences with defaults
  const {
    preferredBanks = [],
    includeCashback = true,
    includeExchange = true,
    wantEMI = false
  } = userPreferences;

  // Validate base price
  if (basePrice <= 0) {
    throw new Error('Invalid base price');
  }

  // Calculate step by step
  const platformDisc = applyPlatformDiscount(basePrice, platformDiscount);
  const priceAfterPlatform = Math.max(basePrice - platformDisc, 0);

  const couponDisc = applyCouponDiscount(priceAfterPlatform, couponOffer);
  const priceAfterCoupon = Math.max(priceAfterPlatform - couponDisc, 0);

  const bankData = applyBestBankOffer(priceAfterCoupon, bankOffers, preferredBanks);
  const priceAfterBank = Math.max(priceAfterCoupon - bankData.discount, 0);

  const cashback = applyCashback(priceAfterBank, cashbackOffer, includeCashback);
  const priceAfterCashback = Math.max(priceAfterBank - cashback, 0);

  const exchange = applyExchangeBonus(exchangeBonus, includeExchange);
  const priceAfterExchange = Math.max(priceAfterCashback - exchange, 0);

  const delivery = calculateDeliveryCharge(deliveryCharge, priceAfterExchange);
  const effectivePrice = Math.max(priceAfterExchange + delivery, 0);

  // Calculate EMI if requested
  const emiDetails = wantEMI ? calculateEMI(effectivePrice, { months: 3, interestRate: 0 }) : null;

  return {
    basePrice,
    platformDiscount: platformDisc,
    couponDiscount: couponDisc,
    bankDiscount: bankData.discount,
    bankName: bankData.bankName,
    bankOffer: bankData.offer,
    cashback,
    exchangeBonus: exchange,
    deliveryCharge: delivery,
    effectivePrice: Math.round(effectivePrice),
    totalSavings: Math.round(basePrice - effectivePrice),
    savingsPercentage: Math.round(((basePrice - effectivePrice) / basePrice) * 100),
    emiDetails
  };
};

/**
 * Parse offers from database string format
 * @param {string|object} offersData - JSON string or object of offers
 * @returns {object} Parsed offers structure
 */
export const parseOffersFromDB = (offersData = null) => {
  if (!offersData) return {};

  try {
    const parsed = typeof offersData === 'string' ? JSON.parse(offersData) : offersData;
    return Array.isArray(parsed) ? { list: parsed } : parsed;
  } catch (e) {
    console.error('Error parsing offers:', e);
    return {};
  }
};

/**
 * Extract offer highlights for UI
 * @param {object} breakdown - Price breakdown from calculateEffectivePrice
 * @returns {array} Array of human-readable offer highlight strings
 */
export const generateOfferHighlights = (breakdown = {}) => {
  const highlights = [];

  if (breakdown.platformDiscount > 0) {
    const percentage = ((breakdown.platformDiscount / breakdown.basePrice) * 100).toFixed(0);
    highlights.push(`${percentage}% Platform Discount`);
  }

  if (breakdown.couponDiscount > 0) {
    highlights.push(`₹${Math.round(breakdown.couponDiscount)} Coupon`);
  }

  if (breakdown.bankDiscount > 0) {
    const bankText = breakdown.bankName ? `${breakdown.bankName} Bank` : 'Bank';
    highlights.push(`₹${Math.round(breakdown.bankDiscount)} ${bankText} Offer`);
  }

  if (breakdown.cashback > 0) {
    highlights.push(`₹${Math.round(breakdown.cashback)} Cashback`);
  }

  if (breakdown.exchangeBonus > 0) {
    highlights.push(`₹${Math.round(breakdown.exchangeBonus)} Exchange Bonus`);
  }

  return highlights;
};

export default {
  applyPlatformDiscount,
  applyCouponDiscount,
  applyBestBankOffer,
  applyCashback,
  applyExchangeBonus,
  calculateDeliveryCharge,
  calculateEMI,
  calculateEffectivePrice,
  parseOffersFromDB,
  generateOfferHighlights
};
