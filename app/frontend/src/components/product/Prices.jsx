import React, { useState } from "react";
import { FaTag, FaCreditCard, FaBolt, FaChevronRight } from "react-icons/fa";
import { Amazon, Flipkart, Croma, VS } from "../../assets/ImportImages";
import OffersAndEmiModal from "./OffersAndEmiModal";

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
  const [selectedVendorForModal, setSelectedVendorForModal] = useState(null);

  // Parse price from database format
  const parsePriceValue = (priceStr) => {
    if (priceStr === 0 || priceStr === '0') return 0;
    if (!priceStr) return 0;
    const cleaned = String(priceStr).replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const getDiscountedPrice = (vendorData) => {
    if (!vendorData) return 0;
    const price = 
      parsePriceValue(vendorData.discounted_price) ||
      parsePriceValue(vendorData.discountprice) ||
      parsePriceValue(vendorData.discounted_Price) ||
      parsePriceValue(vendorData.final_price) ||
      parsePriceValue(vendorData.price);
    return price;
  };

  const getPricingData = () => {
    const cleanOffersArray = (rawOffers) => {
      if (!rawOffers) return [];
      if (!Array.isArray(rawOffers)) {
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

    const rawVendorList = Array.isArray(product?.vendorOffers)
      ? product.vendorOffers
      : Array.isArray(product?.vendors) 
      ? product.vendors 
      : (product?.vendors && typeof product.vendors === 'object' && !Array.isArray(product.vendors))
      ? Object.values(product.vendors)
      : Array.isArray(product?.vendor_listings)
      ? product.vendor_listings
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
          
          // Construct fallback offers_detail if missing
          const priceVal = discountPrice > 0 ? discountPrice : originalPrice;
          const fallbackMinEmi = Math.ceil(priceVal / 24);
          const defaultOffersDetail = data.offers_detail || {
            emi: {
              has_emi: priceVal >= 2500,
              is_no_cost_emi: priceVal >= 5000,
              min_monthly_emi: fallbackMinEmi,
              starting_amount: `₹${fallbackMinEmi.toLocaleString('en-IN')}/month`,
              tenures: [
                { months: 3, monthly: Math.ceil(priceVal / 3), total_cost: Math.ceil(priceVal), interest_rate: 0, is_no_cost: true, bank: "HDFC / ICICI Bank" },
                { months: 6, monthly: Math.ceil(priceVal / 6), total_cost: Math.ceil(priceVal), interest_rate: 0, is_no_cost: true, bank: "SBI / Axis Bank" },
                { months: 9, monthly: Math.ceil((priceVal * 1.10) / 9), total_cost: Math.ceil(priceVal * 1.10), interest_rate: 13.5, is_no_cost: false, bank: "Kotak Bank" },
                { months: 12, monthly: Math.ceil((priceVal * 1.14) / 12), total_cost: Math.ceil(priceVal * 1.14), interest_rate: 14.5, is_no_cost: false, bank: "Bajaj Finserv" }
              ],
              eligible_banks: ["HDFC Bank", "ICICI Bank", "SBI Card", "Axis Bank", "Kotak Bank", "Bajaj Finserv"]
            },
            bank_offers: [
              { bank: "HDFC Bank", title: "10% Instant Discount up to ₹1,500", code: "HDFC10", description: "Get 10% Instant Discount on HDFC Bank Credit & Debit Cards." },
              { bank: "ICICI Bank", title: "Flat ₹1,000 Off on ICICI Cards", code: "ICICISAVE", description: "Flat ₹1,000 Instant Discount on ICICI Bank Cards." }
            ],
            exchange_offers: [
              { title: "Up to ₹15,000 Off on Exchange", description: "Get up to ₹15,000 exchange value on your old device + ₹2,000 bonus.", max_discount: 15000 }
            ],
            cashback_offers: [
              { title: "5% Unlimited Cashback", description: "5% Unlimited Cashback on co-branded Credit Cards." }
            ],
            coupons: [
              { title: "EXTRA ₹500 OFF", code: "DD500", description: "Apply coupon DD500 at checkout for extra savings." }
            ]
          };

          return {
            name: String(rawName).charAt(0).toUpperCase() + String(rawName).slice(1),
            variantLabel: variantLabel,
            originalPrice: originalPrice,
            discountPrice: priceVal,
            rating: parseFloat(data.rating) || 4.5,
            offers: cleanOffersArray(data.offers),
            offersDetail: defaultOffersDetail,
            link: resolveLink(data)
          };
        });

      if (vendorsArray.length > 0) {
        const uniqueMap = new Map();
        vendorsArray.forEach(v => {
          const key = v.name.toLowerCase().trim();
          if (!uniqueMap.has(key) || v.discountPrice < uniqueMap.get(key).discountPrice) {
            uniqueMap.set(key, v);
          }
        });
        return { vendors: Array.from(uniqueMap.values()).sort((a, b) => a.discountPrice - b.discountPrice) };
      }
    }

    if (product?.vendors && typeof product.vendors === 'object' && !Array.isArray(product.vendors)) {
      const vendorsArray = Object.entries(product.vendors)
        .filter(([, data]) => data && (data.price || data.discounted_price || data.discountprice || data.discounted_Price))
        .map(([name, data]) => {
          const discountPrice = getDiscountedPrice(data);
          const priceVal = discountPrice > 0 ? discountPrice : parsePriceValue(data.price);
          const fallbackMinEmi = Math.ceil(priceVal / 24);
          const defaultOffersDetail = data.offers_detail || {
            emi: {
              has_emi: true,
              is_no_cost_emi: true,
              min_monthly_emi: fallbackMinEmi,
              starting_amount: `₹${fallbackMinEmi.toLocaleString('en-IN')}/month`,
              tenures: [
                { months: 3, monthly: Math.ceil(priceVal / 3), total_cost: Math.ceil(priceVal), interest_rate: 0, is_no_cost: true, bank: "HDFC / ICICI Bank" },
                { months: 6, monthly: Math.ceil(priceVal / 6), total_cost: Math.ceil(priceVal), interest_rate: 0, is_no_cost: true, bank: "SBI / Axis Bank" },
                { months: 12, monthly: Math.ceil((priceVal * 1.14) / 12), total_cost: Math.ceil(priceVal * 1.14), interest_rate: 14.5, is_no_cost: false, bank: "Bajaj Finserv" }
              ],
              eligible_banks: ["HDFC Bank", "ICICI Bank", "SBI Card", "Axis Bank", "Kotak Bank", "Bajaj Finserv"]
            },
            bank_offers: [{ bank: "HDFC Bank", title: "10% Instant Discount", code: "HDFC10" }],
            exchange_offers: [{ title: "Up to ₹15,000 Off on Exchange" }],
            cashback_offers: [{ title: "5% Unlimited Cashback" }],
            coupons: [{ title: "EXTRA ₹500 OFF", code: "DD500" }]
          };

          return {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            originalPrice: parsePriceValue(data.price),
            discountPrice: priceVal,
            rating: parseFloat(data.rating) || 4.5,
            offers: cleanOffersArray(data.offers),
            offersDetail: defaultOffersDetail,
            link: resolveLink(data)
          };
        });
      return { vendors: vendorsArray };
    }

    return { vendors: [] };
  };

  const { vendors } = getPricingData();

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

            const offersDetail = vendor.offersDetail || {};
            const emiData = offersDetail.emi || {};
            const bankOffers = offersDetail.bank_offers || [];

            return (
              <div 
                key={index}
                className={`group relative flex flex-col p-4 rounded-2xl transition-all duration-300 border-2 ${
                  isBest 
                    ? 'border-green-500 bg-green-50/20 shadow-md' 
                    : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-md'
                }`}
              >
                {isBest && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    Cheapest Deal
                  </div>
                )}
                
                {/* Vendor Info Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-1.5 border border-gray-100 shadow-xs flex-shrink-0 overflow-hidden">
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
                    <h3 className="font-extrabold text-gray-900 leading-tight text-base">{vendor.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold text-green-700 bg-green-100/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span> In Stock
                      </span>
                      {vendor.variantLabel && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {vendor.variantLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Structured Highlights Badges */}
                <div className="grid grid-cols-1 gap-1.5 my-2">
                  {/* EMI Highlight */}
                  {emiData.has_emi && emiData.min_monthly_emi > 0 && (
                    <div className="flex items-center justify-between text-xs bg-amber-50 text-amber-900 border border-amber-200/70 px-2.5 py-1.5 rounded-lg">
                      <span className="font-bold flex items-center gap-1.5">
                        <FaBolt className="text-amber-500" size={11} />
                        EMI from <span className="text-amber-950 font-black">₹{emiData.min_monthly_emi.toLocaleString('en-IN')}/mo</span>
                      </span>
                      {emiData.is_no_cost_emi && (
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">
                          0% No Cost EMI
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bank Offer Highlight */}
                  {bankOffers.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-900 border border-blue-200/70 px-2.5 py-1.5 rounded-lg font-medium">
                      <FaCreditCard className="text-blue-600 flex-shrink-0" size={11} />
                      <span className="truncate font-semibold text-[11px]">
                        {typeof bankOffers[0] === 'object' ? bankOffers[0].title : bankOffers[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Price and CTA */}
                <div className="flex items-end justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black tracking-tight ${isBest ? 'text-green-600' : 'text-gray-900'}`}>
                        ₹{(vendor.discountPrice || vendor.originalPrice || 0).toLocaleString('en-IN')}
                      </span>
                      {discountPercent > 0 && (
                        <span className="text-xs font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>
                    {vendor.originalPrice > vendor.discountPrice && (
                      <div className="text-xs text-gray-400 line-through font-medium">
                        MRP ₹{vendor.originalPrice.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1.5 items-end">
                    {vendor.link && (
                      <a
                        href={vendor.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-5 py-2 rounded-xl font-extrabold text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1 ${
                          isBest 
                            ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-200' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                        }`}
                      >
                        Visit Store
                      </a>
                    )}
                  </div>
                </div>

                {/* View All Offers & EMI Modal Trigger Button */}
                <button
                  onClick={() => setSelectedVendorForModal(vendor)}
                  className="mt-3 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs group-hover:bg-blue-600"
                >
                  <FaTag className="text-amber-400" size={11} />
                  View All Offers & EMI Plans ({bankOffers.length + (emiData.tenures?.length || 0)} Offers)
                  <FaChevronRight size={10} className="ml-1 opacity-70" />
                </button>
              </div>
            );
          })
      )}

      {/* Render Interactive Offers & EMI Modal */}
      {selectedVendorForModal && (
        <OffersAndEmiModal
          isOpen={!!selectedVendorForModal}
          onClose={() => setSelectedVendorForModal(null)}
          vendorName={selectedVendorForModal.name}
          vendorLogo={getVendorLogo(selectedVendorForModal.name)}
          price={selectedVendorForModal.discountPrice}
          offersDetail={selectedVendorForModal.offersDetail}
        />
      )}
    </div>
  );
};

export default Prices;

