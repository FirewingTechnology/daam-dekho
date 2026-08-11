import React, { useState, useEffect } from "react";
import SidebarFilters from "./SidebarFilters";
import { useFooterVisible } from "../../constants/footerContext";
import { FiX, FiFilter, FiSliders } from "react-icons/fi";

const sortOptions = [
  { label: "Sort By", value: "default" },
  { label: "Price: Low to High", value: "priceLowToHigh" },
  { label: "Price: High to Low", value: "priceHighToLow" },
  { label: "Newest First", value: "newest" },
];

const MobileFilterSortBar = ({ onFiltersClick, onSortClick }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 flex justify-between items-center px-4 py-2.5 shadow-2xl sm:hidden pb-safe">
      <button
        onClick={onFiltersClick}
        className="flex-1 mr-2 bg-primary text-black font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 min-touch-target"
      >
        <FiFilter size={14} /> Filters
      </button>
      <button
        onClick={onSortClick}
        className="flex-1 bg-black text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 min-touch-target"
      >
        <FiSliders size={14} /> Sort By
      </button>
    </div>
  );
};

const ResponsiveSidebarWrapper = ({ onFiltersChange, initialFilters }) => {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState("default");

  const { isFooterVisible } = useFooterVisible();

  useEffect(() => {
    if (isMobileFilterOpen || isSortOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileFilterOpen, isSortOpen]);

  const handleSortChange = (option) => {
    setSortOption(option);
    setIsSortOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden sm:block">
        <SidebarFilters onFiltersChange={onFiltersChange} initialFilters={initialFilters} />
      </div>

      {/* Mobile Filters Slide-up Bottom Sheet */}
      {isMobileFilterOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 sm:hidden flex flex-col justify-end animate-fadeIn"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div 
            className="bg-white p-4 max-h-[85vh] flex flex-col rounded-t-3xl shadow-2xl overflow-hidden pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3 flex-shrink-0" />
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiFilter className="text-primary-dark" /> Filter Products
              </h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm min-touch-target"
                aria-label="Close filters"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar pb-6">
              <SidebarFilters onFiltersChange={onFiltersChange} initialFilters={initialFilters} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sort Slide-up Bottom Sheet */}
      {isSortOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 sm:hidden flex flex-col justify-end animate-fadeIn"
          onClick={() => setIsSortOpen(false)}
        >
          <div 
            className="bg-white p-5 max-h-[60vh] flex flex-col rounded-t-3xl shadow-2xl overflow-hidden pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3 flex-shrink-0" />
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiSliders className="text-blue-600" /> Sort Products
              </h3>
              <button
                onClick={() => setIsSortOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm min-touch-target"
                aria-label="Close sort menu"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="space-y-2 pb-6 overflow-y-auto flex-1">
              {sortOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-semibold transition-all min-touch-target cursor-pointer ${
                    sortOption === option.value
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-gray-50 border-gray-100 text-gray-700"
                  }`}
                >
                  <span>{option.label}</span>
                  <input
                    type="radio"
                    name="sort"
                    value={option.value}
                    checked={sortOption === option.value}
                    onChange={() => handleSortChange(option.value)}
                    className="accent-blue-600 w-4 h-4"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar on Mobile */}
      {!isFooterVisible && (
        <MobileFilterSortBar
          onFiltersClick={() => setIsMobileFilterOpen(true)}
          onSortClick={() => setIsSortOpen(true)}
        />
      )}
    </>
  );
};

export default ResponsiveSidebarWrapper;
