import React from "react";
import RatingStars from "./RatingStars";
import { Link } from "react-router-dom";
import CompareButton from "../compare/CompareButton";

const ProductCard = ({ product }) => {
  const [imgError, setImgError] = React.useState(false);
  
  // Parse price strings (remove currency symbols and convert to number)
  const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    // Remove all non-numeric characters except decimal point
    const cleaned = String(priceStr).replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Get image URL - try multiple field names
  const getImageUrl = () => {
    const valid = (url) => typeof url === 'string' && url.trim() !== '' && (url.startsWith('http') || url.startsWith('/'));
    
    if (valid(product.base_image)) return product.base_image;
    if (valid(product.image) && typeof product.image === 'string') return product.image;
    if (valid(product.image_url)) return product.image_url;
    if (valid(product.mainImage)) return product.mainImage;
    if (valid(product.image?.thumbnail)) return product.image.thumbnail;
    
    if (Array.isArray(product.image_urls) && product.image_urls.length > 0 && valid(product.image_urls[0])) {
      return product.image_urls[0];
    }

    if (Array.isArray(product.images) && product.images.length > 0 && valid(product.images[0])) {
      return product.images[0];
    }

    if (Array.isArray(product.image?.urls) && product.image.urls.length > 0 && valid(product.image.urls[0])) {
      return product.image.urls[0];
    }
    
    return null;
  };

  // Escape XML special characters
  const escapeXml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Generate a proper SVG placeholder image with product info
  const generatePlaceholderImage = () => {
    const title = escapeXml((product.title || product.brand || 'Product').substring(0, 30));
    const brandText = escapeXml((product.brand || '').substring(0, 15));
    
    // Create SVG with product info
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="280" viewBox="0 0 300 280">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="300" height="280" fill="url(#grad)"/>
        <circle cx="150" cy="100" r="50" fill="#d1d5db" opacity="0.5"/>
        <path d="M130,120 Q150,90 170,120 L170,160 Q150,180 130,160 Z" fill="#9ca3af" opacity="0.7"/>
        <text x="150" y="210" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#374151">${title}</text>
        ${brandText ? `<text x="150" y="230" font-family="Arial, sans-serif" font-size="11" text-anchor="middle" fill="#6b7280">${brandText}</text>` : ''}
        <text x="150" y="250" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#9ca3af">Product Image</text>
      </svg>
    `;
    
    try {
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    } catch {
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjgwIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjI4MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTQwIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiBzdHlsZT0idGV4dC1hbmNob3I6bWlkZGxlIj5Qcm9kdWN0IEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    }
  };

  const imageUrl = getImageUrl();

  // Get prices from product data
  const originalPrice = parsePrice(product.price || product.actual_Price);
  const discountPrice = parsePrice(product.discounted_Price || product.discountprice);
  const finalPrice = discountPrice || originalPrice;
  
  // Calculate discount percentage
  const discountPercent =
    originalPrice && discountPrice && originalPrice > discountPrice
      ? Math.floor(((originalPrice - discountPrice) / originalPrice) * 100)
      : 0;

  // Get rating - try multiple field names
  const productRating = parseFloat(product.rating) || 0;

  return (
    <div className="w-full flex flex-col justify-between border border-gray-200/80 rounded-2xl p-3 sm:p-4 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-300 group">
      <div>
        <div className="relative mb-3 aspect-square max-h-40 sm:max-h-44 w-full flex items-center justify-center overflow-hidden bg-gray-50 rounded-xl p-2">
          {product.label && (
            <span
              className={`absolute top-2 left-2 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full text-white font-bold uppercase z-10 shadow-xs ${
                product?.label === "HOT"
                  ? "bg-red-500"
                  : product?.label === "BEST DEALS"
                  ? "bg-blue-600"
                  : "bg-gray-700"
              }`}
            >
              {product.label}
            </span>
          )}
          <img
            src={
              imgError 
                ? generatePlaceholderImage()
                : (imageUrl || generatePlaceholderImage())
            }
            alt={product.title || 'Product'}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            onError={() => {
              if (!imgError) setImgError(true);
            }}
            loading="lazy"
          />
        </div>

        <RatingStars rating={productRating} reviews={product.reviews || 0} />
        <Link to={`/product/${product.product_id || product.id || product._id}`} className="block mt-1.5">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 min-h-[2.25rem] group-hover:text-blue-600 transition-colors">
            {product.title}
          </h3>
        </Link>
      </div>

      <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-sm sm:text-base text-blue-600 font-extrabold tracking-tight">
            {finalPrice > 0 ? `₹${finalPrice.toLocaleString('en-IN')}` : 'N/A'}
          </span>
          {discountPercent > 0 && (
            <span className="text-[10px] sm:text-xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {originalPrice > 0 && discountPrice > 0 && originalPrice !== discountPrice && (
          <div className="text-[11px] text-gray-400 line-through font-medium">
            MRP ₹{originalPrice.toLocaleString('en-IN')}
          </div>
        )}

        <div className="mt-1">
          <CompareButton product={product} />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
