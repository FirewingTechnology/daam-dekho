import React from "react";

const ProductCompareShowCard = ({ product, onSelect }) => {
  if (!product) return null;

  // Get image - support multiple formats (skip placeholder URLs)
  const getThumbnail = () => {
    if (product.image?.thumbnail && !product.image.thumbnail.includes('placeholder')) return product.image.thumbnail;
    if (product.image_url && !product.image_url.includes('placeholder')) return product.image_url;
    if (product.image?.urls?.[0] && !product.image.urls[0].includes('placeholder')) return product.image.urls[0];
    
    // Try image_urls as JSON string
    if (product.image_urls) {
      try {
        const urls = typeof product.image_urls === 'string' 
          ? JSON.parse(product.image_urls) 
          : product.image_urls;
        if (Array.isArray(urls) && urls.length > 0 && urls[0] && !urls[0].includes('placeholder')) {
          return urls[0];
        }
      } catch (e) {
        console.log('Could not parse image_urls');
      }
    }
    
    return null;
  };

  // Get real product image from Unsplash as fallback
  const getGoogleImage = () => {
    const searchQuery = encodeURIComponent(product.title || product.brand || 'product');
    return `https://source.unsplash.com/200x200/?${searchQuery.replace(/%20/g, '+')}`;
  };

  const thumbnail = getThumbnail() || getGoogleImage();

  // Get title
  const title = product.title || "No title";

  // Get minimum price among vendors OR from direct price fields
  let minPrice = null;
  
  // Try multi-vendor format first
  if (product.vendors && typeof product.vendors === 'object') {
    const vendors = Object.values(product.vendors);
    if (vendors.length > 0) {
      minPrice = Math.min(...vendors.map((v) => Number(v.discountprice) || Number(v.price) || Infinity));
      if (minPrice === Infinity) minPrice = null;
    }
  }
  
  // Try single vendor format
  if (!minPrice) {
    const discountedPrice = product.discounted_price || product.discounted_Price;
    const regularPrice = product.price;
    
    if (discountedPrice) {
      minPrice = parseFloat(discountedPrice);
    } else if (regularPrice) {
      minPrice = parseFloat(regularPrice);
    }
  }

  const displayPrice = minPrice;
  const isAvailable = minPrice !== null && minPrice > 0;

  const handleProductClick = () => {
    const productId = product.product_id || product.id || product._id;
    if (productId) {
      onSelect(product);
    }
  };

  // console.log("Rendering ProductCompareShowCard for product:", minPrice);

  return (
    <div
      onClick={handleProductClick}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all cursor-pointer group shadow-sm hover:shadow-md"
    >
      {/* Product Image */}
      <div className="w-16 h-16 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-1 shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-full object-contain rounded"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No img</div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 text-start overflow-hidden">
        <p className="font-bold text-gray-900 truncate transition-colors">{title}</p>
        
        {displayPrice !== null ? (
          <p className="text-xs text-gray-500 mt-1">
            From{" "}
            <span className="text-green-600 font-extrabold text-sm">
              ₹{displayPrice.toLocaleString("en-IN")}
            </span>{" "}
            <span className="mx-1">•</span> {isAvailable ? "In Stock" : "Out of stock"}
          </p>
        ) : (
          <p className="text-xs text-gray-400 mt-1 italic">Price not available</p>
        )}
      </div>
      
      <div className="px-1 opacity-0 group-hover:opacity-100 transition-opacity">
         <span className="text-[10px] font-bold text-black bg-primary px-3 py-1.5 rounded-full shadow-sm">Select</span>
      </div>
    </div>
  );
};

export default ProductCompareShowCard;
