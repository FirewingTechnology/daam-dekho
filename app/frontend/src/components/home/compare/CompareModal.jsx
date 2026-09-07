import React, { useState } from "react";
import { ClipLoader } from "react-spinners";
import { apiEndpoints } from "../../../services/api";
import ProductCompareShowCard from "./CompareProductShowCard";

const CATEGORY_MAP = {
  "Mobile": "Mobiles",
  "Laptop": "Laptops",
  "Mobile Accessories": "Mobile Accessories",
  "Laptop Accessories": "Laptop Accessories",
};

const CompareModal = ({ activeTab, onClose, onSelect }) => {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const category = CATEGORY_MAP[activeTab] || activeTab;
      
      const { data } = await apiEndpoints.searchProducts({
        category,
        query: query || undefined,
        limit: 12
      });
      
      setProducts(data?.products || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl p-4 sm:p-6 relative overflow-hidden border border-gray-100">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-green-400"></div>
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6 pt-1">
          <h3 className="text-lg sm:text-2xl font-bold text-gray-800 tracking-tight">Select Product to Compare</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 transition-all text-sm font-bold shadow-sm shrink-0 min-touch-target"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 px-1">
          <div className="relative flex-grow">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by brand or product name..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
            />
          </div>
          <button
            onClick={fetchProducts}
            className="bg-black text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-800 transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            Search
          </button>
        </div>

        {/* Results */}
        <div className="px-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <ClipLoader size={30} color="#dcfe50" />
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
              {products.map((p) => (
                <ProductCompareShowCard
                  key={p._id}
                  product={p}
                  onSelect={() => onSelect(p)}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3 border border-gray-100">
                <span className="text-2xl opacity-50">🔍</span>
              </div>
              <p className="text-gray-500 font-medium">No products found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompareModal;
