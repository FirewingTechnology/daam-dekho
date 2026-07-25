import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiEndpoints } from "../../services/api";
import { ClipLoader } from "react-spinners";
import { FiSearch, FiChevronDown } from "react-icons/fi";
import ProductSearchCard from "./ProductSearchCard";

const SearchBar = () => {
  const [localQuery, setLocalQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [category, setCategory] = useState("");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const searchCache = useRef(new Map());
  const wrapperRef = useRef(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiEndpoints.getCategories();
        setCategories(response.data.categories || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    loadCategories();
  }, []);

  const fetchProducts = useCallback(
    async (query) => {
      if (!query) return;
      const cacheKey = `${category || "all"}-${query}`;

      if (searchCache.current.has(cacheKey)) {
        setProducts(searchCache.current.get(cacheKey));
        setShowDropdown(true);
        return;
      }

      try {
        setLoading(true);
        const params = {
          category: category || undefined,
          q: query || undefined,
          page: 1,
          limit: 10
        };

        const response = await apiEndpoints.searchProducts(params);
        const results = response.data?.products || [];
        setProducts(results);
        setShowDropdown(true);
        searchCache.current.set(cacheKey, results);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [category]
  );

  const handleSearch = () => {
    if (localQuery.trim()) {
      fetchProducts(localQuery.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  useEffect(() => {
    if (!localQuery.trim()) {
      setShowDropdown(false);
    }
  }, [localQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full group">
      <div className="flex flex-col md:flex-row items-stretch bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden group-focus-within:border-primary/50 group-focus-within:ring-4 group-focus-within:ring-primary/10 transition-all duration-300">
        
        {/* Category Selector */}
        <div className="relative flex items-center bg-gray-50/50 md:w-56 border-b md:border-b-0 md:border-r border-gray-100">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-14 pl-5 pr-10 appearance-none bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <FiChevronDown className="absolute right-4 pointer-events-none text-gray-400" />
        </div>

        {/* Search Input */}
        <div className="flex-grow flex items-center px-4">
          <FiSearch className="text-gray-400 mr-3 text-lg" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search for iPhone 15, MacBooks, Sony WH-1000..."
            className="w-full h-14 bg-transparent text-sm md:text-base text-gray-800 placeholder-gray-400 focus:outline-none"
          />
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={loading}
          className="h-14 md:h-auto px-8 bg-black text-primary font-bold text-sm uppercase tracking-widest hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <ClipLoader color="#dcfe50" size={18} /> : "Search"}
        </button>
      </div>

      {/* Results Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-slide-up">
          <div className="p-2 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center px-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Search Results</span>
            <span className="text-[10px] font-medium text-gray-400">{products.length} items found</span>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {products.length > 0 ? (
              <div className="grid grid-cols-1 divide-y divide-gray-50">
                {products.map((p, idx) => (
                  <ProductSearchCard product={p} key={p.id || idx} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-gray-500 text-sm italic">No matching products found.</p>
              </div>
            )}
          </div>
          
          {products.length > 0 && (
            <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
              <button className="text-xs font-bold text-gray-400 hover:text-black transition-colors">
                View All Results
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
