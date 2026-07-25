import React, { useState } from "react";
import SidebarFilters from "./SidebarFilters";
import { useFooterVisible } from "../../constants/footerContext";

const sortOptions = [
  { label: "Sort By", value: "default" },
  { label: "Price: Low to High", value: "priceLowToHigh" },
  { label: "Price: High to Low", value: "priceHighToLow" },
  { label: "Newest First", value: "newest" },
];

const MobileFilterSortBar = ({ onFiltersClick, onSortClick }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t flex justify-between items-center px-4 py-2 shadow-md sm:hidden">
      <button
        onClick={onFiltersClick}
        className="flex-1 mr-2 bg-primary text-black font-medium py-2 rounded text-sm"
      >
        Filters
      </button>
      <button
        onClick={onSortClick}
        className="flex-1 bg-primary text-black font-medium py-2 rounded text-sm"
      >
        Sort By
      </button>
    </div>
  );
};

const ResponsiveSidebarWrapper = ({ onFiltersChange, initialFilters }) => {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState("default");

  const { isFooterVisible } = useFooterVisible();

  const handleSortChange = (option) => {
    setSortOption(option);
    setIsSortOpen(false);
    // Apply sort logic as needed
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden sm:block">
        <SidebarFilters onFiltersChange={onFiltersChange} initialFilters={initialFilters} />
      </div>

      {/* Mobile Filters Slide-up */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 bg-gray-200/45  z-50 sm:hidden">
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 max-h-[80vh] overflow-y-auto rounded-t-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-sm text-gray-600"
              >
                Close
              </button>
            </div>
            <SidebarFilters onFiltersChange={onFiltersChange} initialFilters={initialFilters} />
          </div>
        </div>
      )}

      {/* Mobile Sort Slide-up */}
      {isSortOpen && (
        <div className="fixed inset-0 bg-gray-600/45 z-50 sm:hidden">
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 max-h-[60vh] overflow-y-auto rounded-t-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Sort Options</h3>
              <button
                onClick={() => setIsSortOpen(false)}
                className="text-sm text-gray-600"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 pb-20">
              {sortOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="sort"
                    value={option.value}
                    checked={sortOption === option.value}
                    onChange={() => handleSortChange(option.value)}
                    className="accent-black"
                  />
                  {option.label}
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
