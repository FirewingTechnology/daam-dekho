import React from "react";
import { FaStar, FaTag, FaTruck, FaCreditCard, FaPercent } from "react-icons/fa";
import { safeRender } from "../../utils/renderUtils";
import { Amazon, Flipkart, Croma, VS } from "../../assets/ImportImages";

const vendorLogos = {
  amazon: Amazon,
  flipkart: Flipkart,
  croma: Croma,
  vijaysales: VS,
  "vijay sales": VS,
  "vijay_sales": VS,
  jiomart: "https://upload.wikimedia.org/wikipedia/commons/9/91/JioMart_logo.png",
};

const getVendorLogo = (name) => {
  if (!name) return Amazon;
  const clean = String(name).toLowerCase().trim();
  if (vendorLogos[clean]) return vendorLogos[clean];
  if (clean.includes("vijay")) return VS;
  if (clean.includes("flipkart")) return Flipkart;
  if (clean.includes("croma")) return Croma;
  if (clean.includes("jio")) return vendorLogos.jiomart;
  if (clean.includes("amazon")) return Amazon;
  return Amazon;
};

const Prices = ({ product }) => {
  // Parse price from database format - handles multiple field name variations
  const parsePriceValue = (priceStr) => {
    if (priceStr === 0 || priceStr === '0') return 0;
    if (!priceStr) return 0;
    const cleaned = String(priceStr).replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Get the discounted price from vendor data - try multiple field names
  const getDiscountedPrice = (vendorData) => {
    if (!vendorData) return 0;
    const price = 
      parsePriceValue(vendorData.discounted_price) ||  // Standard: discounted_price
      parsePriceValue(vendorData.discountprice) ||     // Alt: discountprice
      parsePriceValue(vendorData.discounted_Price) ||  // Alt: discounted_Price
      parsePriceValue(vendorData.final_price) ||       // Alt: final_price
      parsePriceValue(vendorData.price);               // Fallback: regular price
    return price;
  };

  // Handle both laptop and mobile data structures
  // Helper function to render offers cleanly
  const renderOfferContent = (offer) => {
    // Handle null/undefined
    if (!offer) return null;

    // Parse JSON string if needed
    let parsedOffer = offer;
    if (typeof offer === 'string') {
      // Check if it's a JSON string
      if (offer.trim().startsWith('{') || offer.trim().startsWith('[')) {
        try {
          parsedOffer = JSON.parse(offer);
        } catch (e) {
          // If it's just a regular string, render it as-is
          return (
            <div className="flex items-start gap-2">
              <FaTag className="text-yellow-600 mt-0.5 flex-shrink-0" size={12} />
              <span className="text-gray-700 text-xs">{offer}</span>
            </div>
          );
        }
        
        // If parsed successfully and it's an array, recursively render each item
        if (Array.isArray(parsedOffer)) {
          return (
            <>
              {parsedOffer.map((item, idx) => (
                <div key={idx}>{renderOfferContent(item)}</div>
              ))}
            </>
          );
        }
      }
    }

    // Handle object offers
    if (typeof parsedOffer === 'object' && parsedOffer !== null) {
      const { type = 'offer', description = '', code = '' } = parsedOffer;
      
      // Don't render if no description
      if (!description || description === 'N/A') return null;

      // Choose icon based on offer type
      let icon;
      switch (type?.toLowerCase()) {
        case 'shipping':
          icon = <FaTruck className="text-blue-600" size={12} />;
          break;
        case 'bank_offer':
        case 'bankoffers':
          icon = <FaCreditCard className="text-green-600" size={12} />;
          break;
        case 'discount':
          icon = <FaPercent className="text-red-600" size={12} />;
          break;
        default:
          icon = <FaTag className="text-yellow-600" size={12} />;
      }

      return (
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex-shrink-0">{icon}</div>
          <div className="flex-1">
            <p className="text-gray-700 text-xs leading-snug">{description}</p>
            {code && code !== 'N/A' && (
              <p className="text-gray-500 text-xs mt-1">
                Code: <span className="font-mono font-semibold text-gray-700">{code}</span>
              </p>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const getPricingData = () => {
    // Helper to clean and flatten offers
    const cleanOffersArray = (rawOffers) => {
      if (!rawOffers) return [];
      if (!Array.isArray(rawOffers)) {
        // If it's a JSON string, try to parse it
        if (typeof rawOffers === 'string') {
          try {
            const parsed = JSON.parse(rawOffers);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            return rawOffers.trim() ? [rawOffers] : [];
          }
        }
        return [];
      }

      // Flatten array and parse any JSON strings inside
      return rawOffers.flatMap(offer => {
        if (!offer) return [];
        if (typeof offer === 'string') {
          try {
            const parsed = JSON.parse(offer);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            return offer.trim() ? [offer] : [];
          }
        }
        return [offer];
      }).filter(Boolean);
    };

    const resolveLink = (data) => {
      if (!data) return null;
      const raw = data.url || data.product_url || data.product_link || data.link || data.affiliatelink;
      if (!raw || typeof raw !== 'string') return null;
      const trimmed = raw.trim();
      if (!trimmed || trimmed === '#' || trimmed === 'N/A') return null;
      return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    };

    // 1. Array of vendor listings / offers (from v10 ETL API, vendor_listings, or variants)
    const rawVendorList = Array.isArray(product?.vendors) 
      ? product.vendors 
      : Array.isArray(product?.vendor_listings)
      ? product.vendor_listings
      : Array.isArray(product?.vendorOffers)
      ? product.vendorOffers
      : (product?.variants && Array.isArray(product.variants))
      ? product.variants.flatMap(v => v.vendors || v.vendorOffers || [])
      : null;

    if (rawVendorList && rawVendorList.length > 0) {
      const vendorsArray = rawVendorList
        .filter(data => data && (data.price || data.discounted_price || data.discounted_Price || data.mrp))
        .map(data => {
          const rawName = data.vendor_name || data.vendor || data.name || data.seller || 'Online Store';
          const discountPrice = getDiscountedPrice(data);
          const rawMrp = parsePriceValue(data.mrp);
          const originalPrice = rawMrp > discountPrice ? rawMrp : discountPrice;
          const variantLabel = data.variant_label || data.storage || data.ram || '';
          return {
            name: String(rawName).charAt(0).toUpperCase() + String(rawName).slice(1),
            variantLabel: variantLabel,
            originalPrice: originalPrice,
            discountPrice: discountPrice > 0 ? discountPrice : originalPrice,
            rating: parseFloat(data.rating) || 4.5,
            offers: cleanOffersArray(data.offers),
            link: resolveLink(data)
          };
        });
      if (vendorsArray.length > 0) {
        // Deduplicate cards with identical vendor name and price
        const uniqueMap = new Map();
        vendorsArray.forEach(v => {
          const key = `${v.name.toLowerCase()}_${v.discountPrice}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, v);
          }
        });
        return { vendors: Array.from(uniqueMap.values()) };
      }
    }

    // 2. Object map: { amazon: {...}, flipkart: {...} }
    if (product?.vendors && typeof product.vendors === 'object' && !Array.isArray(product.vendors)) {
      const vendorsArray = Object.entries(product.vendors)
        .filter(([, data]) => data && (data.price || data.discounted_price || data.discountprice || data.discounted_Price))
        .map(([name, data]) => {
          const discountPrice = getDiscountedPrice(data);
          return {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            originalPrice: parsePriceValue(data.price),
            discountPrice: discountPrice > 0 ? discountPrice : parsePriceValue(data.price),
            rating: parseFloat(data.rating) || 4.5,
            offers: cleanOffersArray(data.offers),
            link: resolveLink(data)
          };
        });
      return { vendors: vendorsArray };
    }

    // 3. Single store product fallback
    if (product?.price || product?.discounted_Price) {
      const storeName = product.vendor_name || product.seller_name || 'Best Price';
      return {
        vendors: [{
          name: storeName,
          originalPrice: parsePriceValue(product.price),
          discountPrice: parsePriceValue(product.discounted_Price) || parsePriceValue(product.price),
          rating: parseFloat(product.rating) || 4.5,
          offers: cleanOffersArray(product.offers),
          link: resolveLink(product)
        }]
      };
    }
    
    return { vendors: [] };
  };

  const { vendors } = getPricingData();

  // BUG-27 FIX: Removed dead `renderVendorCard` helper (100 lines) that was
  // defined here but never called. The JSX below renders vendor cards inline.

  return (
    <div className="space-y-3 p-2 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
      {vendors.length === 0 ? (
        <div className="p-8 text-center text-gray-500 italic">
          No pricing information available for this product.
        </div>
      ) : (
        [...vendors]
          .sort((a, b) => a.discountPrice - b.discountPrice)
          .map((vendor, index) => {
            const isBest = index === 0;
            const vendorLogo = getVendorLogo(vendor.name);
            const discountPercent = vendor.originalPrice && vendor.discountPrice && vendor.originalPrice > vendor.discountPrice
              ? Math.round(((vendor.originalPrice - vendor.discountPrice) / vendor.originalPrice) * 100)
              : 0;

            return (
              <div 
                key={index}
                className={`group relative flex flex-col p-4 rounded-xl transition-all duration-300 border-2 ${
                  isBest 
                    ? 'border-green-500 bg-green-50/30' 
                    : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-md'
                }`}
              >
                {isBest && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                    Cheapest
                  </div>
                )}
                
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center p-1.5 border border-gray-100 flex-shrink-0 relative overflow-hidden">
                    <img 
                      src={vendorLogo} 
                      alt={vendor.name} 
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => { 
                        e.target.style.display = 'none'; 
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div style={{ display: 'none' }} className="w-full h-full items-center justify-center font-extrabold text-xs text-blue-600 bg-blue-50 rounded uppercase">
                      {vendor.name.substring(0, 2)}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">{vendor.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1 h-1 bg-green-600 rounded-full"></span> In Stock
                      </span>
                      {vendor.variantLabel && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {vendor.variantLabel}
                        </span>
                      )}
                      <span className="text-[10px] font-medium text-gray-400">Free Delivery</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-end justify-between mt-auto">
                  <div className="space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      {/* BUG-23 FIX: Guard against null/zero discountPrice before
                          calling .toLocaleString() to prevent a runtime crash. */}
                      <span className={`text-xl font-extrabold ${isBest ? 'text-green-600' : 'text-gray-900'}`}>
                        ₹{(vendor.discountPrice || vendor.originalPrice || 0).toLocaleString('en-IN')}
                      </span>
                      {discountPercent > 0 && (
                        <span className="text-[10px] font-bold text-red-500">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>
                    {vendor.originalPrice > vendor.discountPrice && (
                      <div className="text-[10px] text-gray-400 line-through font-medium">
                        ₹{vendor.originalPrice.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                  
                  {vendor.link && (
                    <a
                      href={vendor.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-5 py-2 rounded-lg font-bold text-xs transition-all shadow-sm active:scale-95 ${
                        isBest 
                          ? 'bg-green-500 text-white hover:bg-green-600' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Visit Store
                    </a>
                  )}
                </div>

                {/* Micro-offers if any */}
                {vendor.offers?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {vendor.offers.slice(0, 2).map((offer, idx) => (
                        <div key={idx} className="flex-shrink-0 text-[9px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {typeof offer === 'string' ? offer.substring(0, 25) + '...' : 'Special Offer'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
      )}
    </div>
  );
};

export default Prices;
