import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import { apiEndpoints } from "../../services/api";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import Info from "./Info";
import Prices from "./Prices";
import Specs from "./Specs";
import PriceAlertModal from "./PriceAlertModal";
import PriceHistorySection from "./PriceHistorySection";

const formatPrice = (p) => (p ? `₹${Number(p).toLocaleString("en-IN")}` : "");

const renderStars = (r) => {
  if (!r || r < 0) return null;
  const full = Math.floor(r);
  const half = r % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex text-yellow-500 text-xs sm:text-sm">
      {Array(full)
        .fill()
        .map((_, i) => (
          <FaStar key={`f${i}`} />
        ))}
      {half && <FaStarHalfAlt />}
      {Array(empty)
        .fill()
        .map((_, i) => (
          <FaRegStar key={`e${i}`} />
        ))}
    </div>
  );
};

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Validate that product data is legitimate (not an error response)
  const isValidProduct = (data) => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's an error response (has description/code but no product fields)
    if ((data.description || data.code || data.error) && !data.title && !data.id && !data._id && !data.image && !data.image_url) {
      return false;
    }
    
    // Valid products should have at least a title or name
    return !!(data.title || data.name);
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiEndpoints.getProductDetail(id);
        
        if (isValidProduct(response.data)) {
          setProduct(response.data);
        } else {
          setError("Product not found or invalid data");
          setProduct(null);
          toast.error("Product not found");
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        setError("Failed to load product details");
        setProduct(null);
        toast.error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <ClipLoader color="#dcfe50" size={50} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary/80"
        >
          Try Again
        </button>
      </div>
    );
  }

  const lowestPrice = (() => {
    if (!product) return 0;
    if (product.vendors && typeof product.vendors === 'object') {
      const prices = Object.values(product.vendors)
        .map(v => parseFloat(String(v.discounted_price || v.discounted_Price || v.price || 0).replace(/[^\d.]/g, '')))
        .filter(p => p > 0);
      if (prices.length > 0) return Math.min(...prices);
    }
    return parseFloat(String(product.discounted_Price || product.price || 0).replace(/[^\d.]/g, '')) || 0;
  })();

  return (
    <div className="bg-[#f4f7f9] dark:bg-gray-950 min-h-screen pt-20 sm:pt-24 pb-32 lg:pb-12 font-['Inter',_sans-serif] transition-colors duration-300">
      {product && (
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6">
          {/* 1. TOP SECTION - Heading & Rating */}
          <div className="mb-6 sm:mb-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-2 min-w-0">
                <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight break-words">
                  {product.title || product.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1">
                  {product.rating > 0 && (
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-xs border border-gray-100">
                      <div className="flex items-center text-yellow-500">
                        {renderStars(product.rating)}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-gray-700">
                        {product.rating.toFixed(1)} / 5
                      </span>
                    </div>
                  )}
                  <div className="text-xs sm:text-sm font-bold text-blue-600 hover:underline cursor-pointer bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                    {product.brand || "Official Store"}
                  </div>
                </div>
              </div>

              {/* Price Drop Alert Trigger Button */}
              <button
                onClick={() => setIsAlertModalOpen(true)}
                className="self-start sm:self-center px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                🔔 Set Price Drop Alert
              </button>
            </div>
          </div>

          {/* MAIN 3-COLUMN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            
            {/* LEFT COLUMN: Product Media (3 cols) - Order 1 */}
            <div className="lg:col-span-3 space-y-6 order-1">
              <div className="bg-white rounded-2xl shadow-premium p-4 sm:p-6 lg:sticky lg:top-28">
                <Info
                  product={product}
                  renderStars={renderStars}
                  formatPrice={formatPrice}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Compare Prices (4 cols) - Order 2 on mobile, 3 on desktop */}
            <div id="prices-section" className="lg:col-span-4 lg:sticky lg:top-28 order-2 lg:order-3">
              <div className="bg-white rounded-2xl shadow-premium overflow-hidden border border-gray-100">
                <div className="bg-gray-50 px-5 sm:px-6 py-4 border-b border-gray-100">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-800">Compare Prices</h2>
                      <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        Updated recently
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-1">
                  <Prices
                    product={product}
                    renderStars={renderStars}
                    formatPrice={formatPrice}
                  />
                </div>
              </div>
            </div>

            {/* CENTER COLUMN: Specifications (5 cols) - Order 3 on mobile, 2 on desktop */}
            <div className="lg:col-span-5 order-3 lg:order-2">
              <div className="bg-white rounded-2xl shadow-premium overflow-hidden">
                <div className="bg-gray-50 px-5 sm:px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-blue-600">📊</span> Core Specifications
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  <Specs
                    product={product}
                    renderStars={renderStars}
                    formatPrice={formatPrice}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Full-width Price History & Tracking Section */}
          <PriceHistorySection priceHistory={product.priceHistory} currentPrice={lowestPrice} />
        </div>
      )}

      {/* Fixed Mobile Bottom CTA Bar */}
      {product && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 px-4 py-3 shadow-2xl flex items-center justify-between gap-3 lg:hidden pb-safe">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">Lowest Price</span>
            <span className="text-lg sm:text-xl font-black text-green-600 dark:text-green-400 leading-none truncate block">
              {lowestPrice > 0 ? `₹${lowestPrice.toLocaleString('en-IN')}` : 'Check Prices'}
            </span>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById("prices-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="btn-primary py-2.5 px-5 text-sm font-extrabold shadow-md flex items-center gap-1.5 active:scale-95"
          >
            View Deals
          </button>
        </div>
      )}
      {/* Price Alert Modal */}
      {product && (
        <PriceAlertModal
          isOpen={isAlertModalOpen}
          onClose={() => setIsAlertModalOpen(false)}
          productTitle={product.title || product.name}
          currentPrice={lowestPrice}
          productId={product.id || product._id || id}
        />
      )}
    </div>
  );
};

export default ProductDetails;
