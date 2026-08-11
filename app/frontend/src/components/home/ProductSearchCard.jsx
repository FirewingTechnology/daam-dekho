import React from "react";
import { useNavigate } from "react-router-dom";

const ProductSearchCard = ({ product }) => {
  const navigate = useNavigate();
  if (!product) return null;

  // Get image - support multiple formats (skip placeholder URLs)
  const getImageUrl = () => {
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
      } catch (_e) {
        console.log('Could not parse image_urls');
      }
    }
    
    return null;
  };

  // Get real product image from Unsplash
  const getGoogleImage = () => {
    const searchQuery = encodeURIComponent(product.title || product.brand || 'product');
    return `https://source.unsplash.com/200x200/?${searchQuery.replace(/%20/g, '+')}`;
  };

  const thumbnail = getImageUrl() || getGoogleImage();

  // Get title
  const title = product.title || product.name || "No title";

  // Get price - handle both formats
  let minPrice = null;
  
  // Format 1: Multi-vendor (has vendors object)
  if (product.vendors && typeof product.vendors === 'object') {
    const vendors = Object.values(product.vendors);
    if (vendors.length > 0) {
      minPrice = Math.min(...vendors.map((v) => v.discountprice || v.price || Infinity));
      if (minPrice === Infinity) minPrice = null;
    }
  }
  
  // Format 2: Single vendor from search (has direct price fields)
  if (!minPrice) {
    const discountedPrice = product.discounted_price || product.discounted_Price || product.discountprice;
    const regularPrice = product.price;
    
    if (discountedPrice) {
      minPrice = parseFloat(discountedPrice);
    } else if (regularPrice) {
      minPrice = parseFloat(regularPrice);
    }
  }

  // Availability check
  const isAvailable = minPrice !== null && minPrice > 0;

  const handleProductClick = () => {
    const productId = product.product_id || product.id || product._id;
    if (productId) {
      navigate(`/product/${productId}`);
    }
  };

  return (
    <div
      onClick={handleProductClick}
      className="flex items-center  gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
    >
      {/* Product Image */}
      {thumbnail && (
        <img
          src={thumbnail}
          alt={title}
          referrerPolicy="no-referrer"
          className="w-12 h-12 object-contain rounded"
        />
      )}

      {/* Product Info */}
      <div className="flex-1 text-start">
        <p className="font-medium text-black line-clamp-1">{title}</p>
        {isAvailable && minPrice ? (
          <p className="text-sm text-gray-600">
            From{" "}
            <span className="text-orange-600 font-semibold">
              ₹{minPrice.toLocaleString("en-IN")}
            </span>{" "}
            - Available
          </p>
        ) : (
          <p className="text-sm text-gray-500">Price not available</p>
        )}
      </div>
    </div>
  );
};

export default ProductSearchCard;
