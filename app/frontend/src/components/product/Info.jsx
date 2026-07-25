import React, { useState } from "react";
import { safeRender } from "../../utils/renderUtils";

// BUG-26 FIX: Removed dead function `getDefaultVendorWithRating` — it was
// defined at the top of the file but never called anywhere in the component.

const Info = ({ product = {}, formatPrice }) => {
  const getImageUrl = () => {
    if (product.image_urls && Array.isArray(product.image_urls) && product.image_urls[0])
      return product.image_urls[0];
    if (product.image_url) return product.image_url;
    if (product.image?.thumbnail) return product.image.thumbnail;
    if (product.image?.urls?.[0]) return product.image.urls[0];
    return "";
  };

  const [displayIMG, setDisplayIMG] = useState(getImageUrl());

  const parsePrice = (priceStr) => {
    if (priceStr === 0 || priceStr === "0") return 0;
    if (!priceStr) return 0;
    const cleaned = String(priceStr).replace(/[^\d.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  const getDiscountedPrice = (vendorData) => {
    if (!vendorData) return 0;
    return (
      parsePrice(vendorData.discounted_price) ||
      parsePrice(vendorData.discountprice) ||
      parsePrice(vendorData.discounted_Price) ||
      parsePrice(vendorData.final_price) ||
      parsePrice(vendorData.price)
    );
  };

  // BUG-25 FIX: Removed all debug console.log statements that were logging
  // full product objects and price breakdowns on every render in production.
  const getPriceData = () => {
    const resolveLink = (data) => {
      if (!data) return null;
      const raw = data.url || data.product_url || data.product_link || data.link || data.affiliatelink;
      if (!raw || typeof raw !== "string") return null;
      const trimmed = raw.trim();
      if (!trimmed || trimmed === "#" || trimmed === "N/A") return null;
      return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    };

    // Laptops: direct price fields
    if ((product.price || product.discounted_Price) && !product?.vendors) {
      return {
        vendorName: "Available",
        originalPrice: parsePrice(product.price),
        discountPrice: parsePrice(product.discounted_Price),
        rating: parseFloat(product.rating) || 0,
        vendorLink: resolveLink(product),
      };
    }

    // Mobiles: vendors object — find cheapest vendor
    if (product?.vendors && typeof product.vendors === "object") {
      const vendorsArray = Object.entries(product.vendors);
      let bestVendorName = null;
      let bestPrice = Infinity;
      let bestVendorData = null;

      for (const [vendorName, vendorData] of vendorsArray) {
        if (!vendorData) continue;
        const currentPrice = getDiscountedPrice(vendorData);
        if (currentPrice > 0 && currentPrice < bestPrice) {
          bestPrice = currentPrice;
          bestVendorName = vendorName;
          bestVendorData = vendorData;
        }
      }

      if (bestVendorData && bestVendorName) {
        const displayName =
          bestVendorName.charAt(0).toUpperCase() + bestVendorName.slice(1);
        const bestDiscountPrice = getDiscountedPrice(bestVendorData);
        const bestOriginalPrice = parsePrice(bestVendorData.price);
        const finalPrice =
          bestDiscountPrice > 0 ? bestDiscountPrice : bestOriginalPrice;

        return {
          vendorName: displayName,
          originalPrice: bestOriginalPrice,
          discountPrice: finalPrice,
          rating: bestVendorData.rating || 0,
          vendorLink: resolveLink(bestVendorData) || resolveLink(product),
        };
      }
    }

    return { vendorName: "Check Prices", originalPrice: 0, discountPrice: 0, rating: 0, vendorLink: null };
  };

  const { vendorName, originalPrice, discountPrice, rating, vendorLink } = getPriceData();
  const { title = "" } = product;
  const images =
    product.image_urls ||
    product.image?.urls ||
    (product.image_url ? [product.image_url] : []);

  return (
    <div className="bg-white">
      <div className="space-y-6">
        <div className="relative group overflow-hidden rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center p-4 min-h-[300px]">
          {displayIMG || product?.image_url ? (
            <img
              src={displayIMG || product?.image_url}
              alt={title || "product"}
              className="max-w-full max-h-[400px] object-contain transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-64 flex items-center justify-center text-gray-400">
              <span className="text-4xl">🖼️</span>
              <p className="ml-2 font-medium">No Image Available</p>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {images.map((url, i) =>
              url ? (
                <div
                  key={i}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                    (displayIMG || product?.image_url) === url
                      ? "border-blue-500 shadow-md scale-105"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  onClick={() => setDisplayIMG(url)}
                >
                  <img
                    src={url}
                    alt={`thumbnail-${i}`}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
              ) : null
            )}
          </div>
        )}

        {discountPrice > 0 && (
          <div className="mt-8 border-2 border-green-500 bg-green-50/50 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-sm">
              Best Price
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-1">
                <span className="text-sm">🏆</span> Daam Dekho Pick
              </p>
              <p className="text-lg font-bold text-gray-800">{vendorName}</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-green-600">
                ₹{Number(discountPrice).toLocaleString("en-IN")}
              </span>
              {originalPrice > discountPrice && (
                <span className="text-sm text-gray-400 line-through font-medium">
                  ₹{Number(originalPrice).toLocaleString("en-IN")}
                </span>
              )}
            </div>
            {vendorLink && (
              <a
                href={vendorLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all shadow-md hover:shadow-lg active:scale-95 text-sm"
              >
                Buy Now at {vendorName}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Info;
