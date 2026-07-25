/**
 * Offer Matching Service
 * Matches bank offers, card offers, EMI options, and promotional offers
 */

// Sample offer data - in production, this would come from a database
const OFFER_DATABASE = {
  cards: {
    'hdfc': {
      name: 'HDFC Bank',
      type: 'credit',
      offers: [
        { description: '10% Off up to ₹1500', categories: ['electronics', 'mobiles', 'laptops'] },
        { description: '5% Off on first purchase', categories: ['all'] },
        { description: 'Flat ₹1000 Off on min ₹10,000', categories: ['electronics'] }
      ]
    },
    'icici': {
      name: 'ICICI Bank',
      type: 'credit',
      offers: [
        { description: 'No Cost EMI for 6 Months', categories: ['electronics', 'mobiles', 'laptops'] },
        { description: '7% Cashback up to ₹500', categories: ['all'] },
        { description: 'Extra 5% Off with code ICICI5', categories: ['electronics'] }
      ]
    },
    'sbi': {
      name: 'SBI Bank',
      type: 'credit',
      offers: [
        { description: 'No Cost EMI for 3-12 Months', categories: ['electronics', 'mobiles', 'laptops'] },
        { description: '8% Off on minimum purchase ₹5,000', categories: ['all'] },
        { description: 'Free Delivery + Installation', categories: ['electronics'] }
      ]
    },
    'axis': {
      name: 'Axis Bank',
      type: 'credit',
      offers: [
        { description: 'Instant 10% Discount', categories: ['electronics'] },
        { description: 'No Cost EMI available', categories: ['mobiles', 'laptops'] },
        { description: '₹500 Cashback Min ₹3,000', categories: ['all'] }
      ]
    }
  },
  
  debitCards: {
    'all': [
      { description: '5% Off (min ₹2000)', bank: 'All Banks', frequency: 'Daily' }
    ]
  },

  emi: {
    'options': [
      { months: 3, keyword: 'No Cost EMI' },
      { months: 6, keyword: 'No Cost EMI' },
      { months: 9, keyword: 'No Cost EMI' },
      { months: 12, keyword: 'No Cost EMI' }
    ]
  },

  festivalOffers: {
    'diwali': {
      name: 'Diwali Mega Sale',
      discount: 15,
      description: 'Flat 15% Off + Extra 5% with Banks'
    },
    'new-year': {
      name: 'New Year Sale',
      discount: 10,
      description: 'Flat 10% Off on selected items'
    },
    'christmas': {
      name: 'Christmas Special',
      discount: 20,
      description: 'Flat 20% Off + Free Shipping'
    },
    'black-friday': {
      name: 'Black Friday',
      discount: 25,
      description: 'Mega Discounts across all categories'
    }
  },

  cashback: {
    'points': {
      description: 'Earn reward points on every purchase',
      multiplier: 1
    },
    'wallet': {
      description: 'Instant cashback to wallet',
      percentage: 2
    }
  }
};

/**
 * Get bank offers for a specific bank
 */
export function getBankOffers(bankName, category = null) {
  const bankKey = bankName.toLowerCase();
  const bankData = OFFER_DATABASE.cards[bankKey];

  if (!bankData) {
    return {
      bank: bankName,
      found: false,
      offers: []
    };
  }

  let offers = bankData.offers;
  if (category) {
    offers = offers.filter(offer =>
      offer.categories.includes('all') || offer.categories.includes(category.toLowerCase())
    );
  }

  return {
    bank: bankData.name,
    type: bankData.type,
    found: true,
    offers,
    offerCount: offers.length
  };
}

/**
 * Get EMI options available
 */
export function getEmiOptions() {
  return OFFER_DATABASE.emi.options.map(opt => ({
    months: opt.months,
    description: `${opt.keyword} for ${opt.months} months`,
    zeroInterest: true
  }));
}

/**
 * Get festival offers
 */
export function getFestivalOffers() {
  return Object.entries(OFFER_DATABASE.festivalOffers).map(([key, offer]) => ({
    id: key,
    ...offer,
    active: isCurrentFestival(key)
  }));
}

/**
 * Check if a festival is currently active
 */
function isCurrentFestival(festival) {
  const month = new Date().getMonth() + 1;
  const festivals = {
    'diwali': [10, 11],      // Oct-Nov
    'christmas': [12],        // Dec
    'new-year': [1],          // Jan
    'black-friday': [11]      // Nov
  };

  return festivals[festival]?.includes(month) || false;
}

/**
 * Get cashback offers
 */
export function getCashbackOffers() {
  return OFFER_DATABASE.cashback;
}

/**
 * Get all available offers for a product
 */
export function getAllOffersForProduct(productData = {}) {
  const offers = {
    bankOffers: [],
    debitCardOffers: [],
    emiOptions: getEmiOptions(),
    festivalOffers: getFestivalOffers().filter(f => f.active),
    cashbackOffers: getCashbackOffers(),
    specialOffers: productData.offers || []
  };

  // Add default bank offers
  const popularBanks = ['hdfc', 'icici', 'sbi', 'axis'];
  popularBanks.forEach(bank => {
    const bankOffer = getBankOffers(bank, productData.category);
    if (bankOffer.found) {
      offers.bankOffers.push(bankOffer);
    }
  });

  // Add debit card offers
  offers.debitCardOffers = OFFER_DATABASE.debitCards.all;

  return offers;
}

/**
 * Format offers for display with priority
 */
export function formatOffersForDisplay(offers) {
  const formatted = {
    topOffers: [],
    allOffers: []
  };

  // Top 3-5 offers based on value and relevance
  const topOfferList = [];

  if (offers.festivalOffers.length > 0) {
    topOfferList.push({
      type: 'festival',
      priority: 1,
      ...offers.festivalOffers[0]
    });
  }

  if (offers.bankOffers.length > 0) {
    topOfferList.push({
      type: 'bank',
      priority: 2,
      ...offers.bankOffers[0],
      displayText: `${offers.bankOffers[0].bank}: ${offers.bankOffers[0].offers[0]?.description}`
    });
  }

  if (offers.emiOptions.length > 0) {
    topOfferList.push({
      type: 'emi',
      priority: 3,
      displayText: offers.emiOptions[0].description
    });
  }

  if (offers.debitCardOffers.length > 0) {
    topOfferList.push({
      type: 'debit',
      priority: 4,
      ...offers.debitCardOffers[0]
    });
  }

  // All offers with details
  formatted.topOffers = topOfferList.slice(0, 5);
  formatted.allOffers = offers;
  formatted.totalOfferCount = 
    (offers.bankOffers.length || 0) +
    (offers.debitCardOffers.length || 0) +
    (offers.emiOptions.length || 0) +
    (offers.festivalOffers.length || 0);

  return formatted;
}

/**
 * Apply offers to calculate final price
 */
export function calculateFinalPrice(basePrice, offers = {}) {
  let finalPrice = basePrice;
  let appliedOffers = [];

  // Apply best festival offer
  if (offers.festivalOffers && offers.festivalOffers.length > 0) {
    const festivalDiscount = offers.festivalOffers[0].discount;
    const discountAmount = (basePrice * festivalDiscount) / 100;
    finalPrice -= discountAmount;
    appliedOffers.push(`${festivalDiscount}% Off (${offers.festivalOffers[0].name})`);
  }

  // Apply bank offer if available
  if (offers.bankOffers && offers.bankOffers.length > 0) {
    const bankOffer = offers.bankOffers[0];
    // For simplicity, extract percentage from description if available
    const offerText = bankOffer.offers[0]?.description || '';
    const percentMatch = offerText.match(/(\d+)%/);
    if (percentMatch) {
      const percentage = parseInt(percentMatch[1]);
      const discountAmount = (basePrice * percentage) / 100;
      finalPrice -= discountAmount;
      appliedOffers.push(`${percentage}% Off (${bankOffer.bank})`);
    }
  }

  return {
    basePrice: Math.round(basePrice),
    finalPrice: Math.round(finalPrice),
    totalSavings: Math.round(basePrice - finalPrice),
    appliedOffers,
    savings: Math.round(basePrice - finalPrice)
  };
}
