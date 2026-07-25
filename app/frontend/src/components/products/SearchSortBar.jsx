import React, { useState } from "react";
import { FiSearch, FiChevronDown, FiChevronUp } from "react-icons/fi";

const SearchSortBar = ({
  searchPlaceholder = "Search for anything...",
  sortLabel = "Sort by:",
  sortOptions = [],
  selectedSort,
  onSearchChange,
  onSortChange,
}) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const selectedLabel =
    sortOptions.find((opt) => opt.value === selectedSort)?.label || "Select";

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full ">
      {/* Search Bar */}
      <div className="flex items-center w-full sm:w-1/2 md:1/3 border border-gray-300 rounded px-3 py-2 bg-white shadow-sm">
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="cursor-pointer w-full outline-none text-sm text-gray-700 placeholder-gray-400"
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <FiSearch className="text-gray-600 text-lg" />
      </div>

      {/* Custom Sort Dropdown */}
      <div className="hidden sm:flex relative w-full sm:w-1/2 md:1/3  items-center gap-2 whitespace-nowrap">
        {/* Label */}
        <span className="text-black text-sm font-medium whitespace-nowrap">
          {sortLabel}
        </span>

        {/* Dropdown Button */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="cursor-pointer w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-700 text-sm shadow-sm flex items-center justify-between whitespace-nowrap"
          >
            <span className="truncate">{selectedLabel}</span>
            {isDropdownOpen ? <FiChevronUp /> : <FiChevronDown />}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <ul className="absolute top-11 z-10 w-full bg-white border rounded shadow-lg text-sm text-gray-700">
              {sortOptions.map((option) => (
                <li
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value);
                    setDropdownOpen(false);
                  }}
                  className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                    selectedSort === option.value
                      ? "bg-gray-100 font-semibold"
                      : ""
                  }`}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchSortBar;
