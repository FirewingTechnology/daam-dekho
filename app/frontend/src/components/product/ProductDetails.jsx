import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import { apiEndpoints } from "../../services/api";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import Info from "./Info";
import Prices from "./Prices";
import Specs from "./Specs";

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

  return (
    <div className="bg-[#f4f7f9] min-h-screen pt-24 pb-12 font-['Inter',_sans-serif]">
      {product && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          {/* 1. TOP SECTION - Heading & Rating */}
          <div className="mb-8 animate-fadeIn">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
                {product.title || product.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {product.rating > 0 && (
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                    <div className="flex items-center text-yellow-500">
                      {renderStars(product.rating)}
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      {product.rating.toFixed(1)} / 5
                    </span>
                  </div>
                )}
                <div className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                  {product.brand || "Official Store"}
                </div>
              </div>
            </div>
          </div>

          {/* MAIN 3-COLUMN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Product Media (3 cols) - Order 1 */}
            <div className="lg:col-span-3 space-y-6 order-1">
              <div className="bg-white rounded-2xl shadow-premium p-6 lg:sticky lg:top-28">
                <Info
                  product={product}
                  renderStars={renderStars}
                  formatPrice={formatPrice}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Compare Prices (4 cols) - Order 2 on mobile, 3 on desktop */}
            <div className="lg:col-span-4 lg:sticky lg:top-28 order-2 lg:order-3">
              <div className="bg-white rounded-2xl shadow-premium overflow-hidden border border-gray-100">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Compare Prices</h2>
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
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-blue-600">📊</span> Core Specifications
                  </h2>
                </div>
                <div className="p-6">
                  <Specs
                    product={product}
                    renderStars={renderStars}
                    formatPrice={formatPrice}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
