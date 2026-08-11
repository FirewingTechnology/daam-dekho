import React from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { useCompare } from "../../contexts/CompareContext";

// Helper function to parse specifications
const parseSpecs = (specs) => {
  if (!specs) return {};
  
  // If it's already an object, return it
  if (typeof specs === 'object') {
    return specs;
  }
  
  // If it's a string, try to parse it
  if (typeof specs === 'string') {
    try {
      return JSON.parse(specs);
    } catch {
      return {};
    }
  }
  
  return {};
};

// Helper to get value with fallbacks for different spec keys
const _getSpecValue = (specs, keynames) => {
  if (!specs) return "N/A";
  
  const parsedSpecs = parseSpecs(specs);
  
  // Try each key name
  for (const key of keynames) {
    if (parsedSpecs[key]) {
      return parsedSpecs[key];
    }
  }
  return "N/A";
};

const ComparisonPage = () => {
  const navigate = useNavigate();
  const { compareList, removeFromCompare, clearCompare } = useCompare();

  if (compareList.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center py-32">
            <div className="text-6xl mb-4">📊</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              No Products to Compare
            </h1>
            <p className="text-gray-600 mb-8 text-lg">
              Add up to 4 products to compare specifications and prices side by side
            </p>
            <button
              onClick={() => navigate("/products")}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-10 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Browse Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4">
        {/* Spacer */}
        <div className="h-8"></div>

        {/* Header Section - Simple and Clean */}
        <div className="mb-12">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Product Comparison
              </h1>
              <p className="text-gray-600 text-lg">
                Compare <span className="font-bold text-orange-600">{compareList.length}</span> products to find the best option for you
              </p>
            </div>
            {compareList.length > 0 && (
              <button
                onClick={clearCompare}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-all transform hover:scale-105 shadow-md"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Products Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {compareList.map((product) => {
            const vendors = product.vendors || {};
            const minPrice = Math.min(
              ...Object.values(vendors)
                .map((v) => {
                  const price = v.discounted_price || v.discountprice || v.price || 0;
                  return typeof price === "string"
                    ? parseFloat(price.replace(/,/g, ""))
                    : price;
                })
                .filter((p) => p > 0),
              Infinity
            );

            const avgRating =
              Object.values(vendors)
                .reduce((sum, v) => sum + (parseFloat(v.rating) || 0), 0) /
                Object.keys(vendors).length || 0;

            return (
              <div
                key={product._id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-orange-300"
              >
                {/* Product Image */}
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  <img
                    src={product.base_image || product.image || product.image_url || product.image_urls?.[0] || product.image?.thumbnail || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80'}
                    alt={product.title || product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-4"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80';
                    }}
                  />
                </div>

                {/* Product Info */}
                <div className="p-5">
                  {/* Name */}
                  <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-3 h-10">
                    {product.title || product.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-4 pb-4 border-b-2 border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Best Price</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{minPrice === Infinity ? "N/A" : minPrice.toLocaleString("en-IN")}
                    </p>
                  </div>

                  {/* Rating */}
                  <div className="mb-4 pb-4 border-b-2 border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Avg Rating</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⭐</span>
                      <span className="font-bold text-gray-800">
                        {avgRating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Vendors */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Available On</p>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(vendors) 
                        ? vendors.map(v => v.vendor_name || v.vendor || "Unknown") 
                        : Object.keys(vendors)
                      ).slice(0, 3).map((vendor) => (
                        <span
                          key={vendor}
                          className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-lg capitalize"
                        >
                          {vendor}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate(`/product/${product.product_id || product.id || product._id}`)}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => removeFromCompare(product._id)}
                      className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <FaTimes className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Specifications Comparison Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-10 border-2 border-gray-100">
          {/* Table Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 font-bold text-lg">
              Specifications
            </div>
            {compareList.map((product) => (
              <div
                key={product._id}
                className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 border-l border-gray-200 text-center"
              >
                <p className="text-sm font-semibold text-gray-700 line-clamp-2">
                  {product.title || product.name}
                </p>
              </div>
            ))}
          </div>

          {/* Price Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0 border-t-2 border-gray-200">
            <div className="bg-gray-100 p-5 font-bold text-gray-800">💰 Price</div>
            {compareList.map((product) => {
              const vendors = product.vendors || {};
              const minPrice = Math.min(
                ...Object.values(vendors)
                  .map((v) => {
                    const price = v.discounted_price || v.discountprice || v.price || 0;
                    return typeof price === "string"
                      ? parseFloat(price.replace(/,/g, ""))
                      : price;
                  })
                  .filter((p) => p > 0),
                Infinity
              );
              return (
                <div
                  key={product._id}
                  className="p-5 text-center border-l border-gray-200 bg-green-50"
                >
                  <p className="text-2xl font-bold text-green-600">
                    ₹{minPrice === Infinity ? "N/A" : minPrice.toLocaleString("en-IN")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Rating Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0 border-t-2 border-gray-200">
            <div className="bg-gray-100 p-5 font-bold text-gray-800">⭐ Rating</div>
            {compareList.map((product) => {
              const avgRating =
                Object.values(product.vendors || {})
                  .reduce((sum, v) => sum + (parseFloat(v.rating) || 0), 0) /
                  Object.keys(product.vendors || {}).length || 0;
              return (
                <div
                  key={product._id}
                  className="p-5 text-center border-l border-gray-200 bg-yellow-50"
                >
                  <p className="text-xl font-bold text-yellow-600">
                    {avgRating.toFixed(1)} ⭐
                  </p>
                </div>
              );
            })}
          </div>

          {/* RAM Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0 border-t-2 border-gray-200">
            <div className="bg-gray-100 p-5 font-bold text-gray-800">🧠 RAM / Memory</div>
            {compareList.map((product) => {
              const specs = parseSpecs(product.specifications);
              const ram = specs['RAM_Memory_Installed_Size'] || specs['RAM'] || specs['Memory'] || 'N/A';
              return (
                <div
                  key={product._id}
                  className="p-5 text-center border-l border-gray-200 text-gray-800"
                >
                  <p className="font-semibold text-sm">{ram}</p>
                </div>
              );
            })}
          </div>

          {/* Storage Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0 border-t-2 border-gray-200 bg-gray-50">
            <div className="bg-gray-100 p-5 font-bold text-gray-800">💾 Storage / Disk</div>
            {compareList.map((product) => {
              const specs = parseSpecs(product.specifications);
              const storage = specs['Hard_Disk_Size'] || specs['Storage'] || specs['SSD'] || specs['Capacity'] || 'N/A';
              return (
                <div
                  key={product._id}
                  className="p-5 text-center border-l border-gray-200 text-gray-800"
                >
                  <p className="font-semibold text-sm">{storage}</p>
                </div>
              );
            })}
          </div>

          {/* Display Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0 border-t-2 border-gray-200">
            <div className="bg-gray-100 p-5 font-bold text-gray-800">📱 Screen / Display</div>
            {compareList.map((product) => {
              const specs = parseSpecs(product.specifications);
              const display = specs['Screen_Size'] || specs['Display'] || specs['Screen'] || specs['Size'] || 'N/A';
              return (
                <div
                  key={product._id}
                  className="p-5 text-center border-l border-gray-200 text-gray-800 text-sm"
                >
                  <p className="font-semibold">{display}</p>
                </div>
              );
            })}
          </div>

          {/* Camera Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0 border-t-2 border-gray-200 bg-gray-50">
            <div className="bg-gray-100 p-5 font-bold text-gray-800">📷 Camera / Lens</div>
            {compareList.map((product) => {
              const specs = parseSpecs(product.specifications);
              const camera = specs['Primary_Camera'] || specs['Camera'] || specs['Rear_Camera'] || specs['Front_Camera'] || 'N/A';
              return (
                <div
                  key={product._id}
                  className="p-5 text-center border-l border-gray-200 text-gray-800 text-sm"
                >
                  <p className="font-semibold">{camera}</p>
                </div>
              );
            })}
          </div>

          {/* Battery Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0 border-t-2 border-gray-200">
            <div className="bg-gray-100 p-5 font-bold text-gray-800">🔋 Battery / Power</div>
            {compareList.map((product) => {
              const specs = parseSpecs(product.specifications);
              const battery = specs['Battery_Capacity'] || specs['Battery'] || specs['Mobile_Battery_Type'] || specs['Power'] || 'N/A';
              return (
                <div
                  key={product._id}
                  className="p-5 text-center border-l border-gray-200 text-gray-800 text-sm"
                >
                  <p className="font-semibold">{battery}</p>
                </div>
              );
            })}
          </div>

          {/* Available On Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0 border-t-2 border-gray-200 bg-blue-50">
            <div className="bg-gray-100 p-5 font-bold text-gray-800">🏪 Available On</div>
            {compareList.map((product) => {
              const vendorNames = Array.isArray(product.vendors) 
                ? product.vendors.map(v => v.vendor_name || v.vendor || "Unknown") 
                : Object.keys(product.vendors || {});
              return (
                <div key={product._id} className="p-5 border-l border-gray-200">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {vendorNames.map((vendor) => (
                      <span
                        key={vendor}
                        className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded capitalize"
                      >
                        {vendor}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* All Specifications Section */}
          <div className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-100">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 font-bold text-lg">
              📋 All Specifications
            </div>

            {compareList.map((product, productIdx) => (
              <div key={product._id}>
                {productIdx > 0 && <div className="border-t-2 border-gray-200"></div>}
                <div className="p-6">
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">
                    {product.title || product.name}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(parseSpecs(product.specifications)).slice(0, 12).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-start border-b border-gray-200 pb-2">
                        <span className="font-semibold text-gray-700 flex-1">{key}:</span>
                        <span className="text-gray-600 text-right flex-1 ml-2 truncate">
                          {String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mb-10">
          <button
            onClick={() => navigate("/products")}
            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            Add More Products
          </button>
          <button
            onClick={clearCompare}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            Clear Comparison
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonPage;
