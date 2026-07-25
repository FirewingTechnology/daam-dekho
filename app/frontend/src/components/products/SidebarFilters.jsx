import React, { useState, useEffect, useMemo } from "react";
import { FiChevronDown, FiChevronUp, FiRotateCw } from "react-icons/fi";
import { useLocation } from "react-router-dom";
import PriceRangeSelector from "./PriceRangeSelector.jsx";
import FeaturedProductBaner from "./FeaturedProductsBaner.jsx";
import { apiEndpoints } from "../../services/api.js";
import { debounce } from "lodash";
import { BeatLoader } from "react-spinners"; // Import spinner

// Category display names mapping (for better display text)
const CATEGORY_DISPLAY_NAMES = {
  "Mobile": "Mobile Phones",
  "Laptop": "Laptops",
  "Mobile Accessories": "Mobile Accessories",
  "Laptop Accessories": "Laptop Accessories",
};

const prices = [
  "All Price",
  "Under ₹5,000",
  "₹5,000 to ₹20,000",
  "₹20,000 to ₹50,000",
  "₹50,000 to ₹1,00,000",
  "₹1,00,000 to ₹1,50,000",
  "Above ₹1,50,000",
];

const brands = [
  "Apple",
  "Samsung",
  "Google",
  "OnePlus",
  "Xiaomi",
  "Realme",
  "Nothing",
  "Dell",
  "HP",
  "Lenovo",
  "Asus",
  "Anker",
  "Sony",
  "Logitech",
  "Spigen",
];

const features = {
  Display: [
    "6.1 inches",
    "6.2 inches",
    "6.3 inches",
    "6.4 inches",
    "6.5 inches",
    "6.6 inches",
  ],
  "Processor & Performance": [
    "Intel",
    "Silicon",
    "Apple M1",
    "Apple M2",
    "Apple M3",
    "Apple M4",
  ],
  Storage: ["128 SSD", "256 SSD", "512 SSD", "1 TB SSD"],
  Camera: ["50 MP", "200 MP", "200 + 200 MP", "50 + 50 MP"],
  Battery: ["2580 MAh", "4000 MAh", "5000 MAh", "8000 MAh"],
};

const defaultFilters = {
  category: "",
  price: "All Price",
  minPrice: 0,
  maxPrice: 500000,
  brands: [],
  features: {},
  rating: 0,
};

const FilterSection = ({ title, isOpen, toggleOpen, children }) => (
  <div className="mb-2 rounded-sm">
    <button
      onClick={toggleOpen}
      className="w-full bg-primary px-4 py-2 font-semibold uppercase text-sm text-black flex justify-between items-center cursor-pointer"
    >
      {title}
      {isOpen ? <FiChevronUp /> : <FiChevronDown />}
    </button>
    {isOpen && <div className="mt-4 px-2 space-y-2">{children}</div>}
  </div>
);

const SidebarFilters = ({ onFiltersChange, initialFilters }) => {
  const location = useLocation();
  const initialCategory = location.state?.category || "";
  
  const [filters, setFilters] = useState({});
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState({
    ...defaultFilters,
    category: initialCategory,
    price: initialFilters?.price || "All Price",
    minPrice: initialFilters?.minPrice || "",
    maxPrice: initialFilters?.maxPrice || "",
    brands: initialFilters?.brands || [],
  });

  const [openSections, setOpenSections] = useState({
    category: false,
    price: false,
    brand: false,
    features: false,
  });

  // BUG-20 FIX: Only depend on selectedFilters.category (not initialCategory).
  // initialCategory comes from location.state which never changes after mount,
  // so including it created a possible loop where:
  //   category change → onFiltersChange → initialFilters update → effect re-runs.
  useEffect(() => {
    const fetchDynamicFilters = async () => {
      setLoadingFilters(true);
      try {
        const allCategories = ["Mobile", "Laptop", "Mobile Accessories", "Laptop Accessories"];
        let brandsList = brands;
        let dynamicFeatures = features;
        try {
          const [brandsRes, filtersRes] = await Promise.all([
            apiEndpoints.getBrands({}),
            apiEndpoints.getFilterOptions(selectedFilters.category || initialCategory)
          ]);
          if (brandsRes.data?.brands && Array.isArray(brandsRes.data.brands)) {
            brandsList = brandsRes.data.brands;
          }
          if (filtersRes.data && Object.keys(filtersRes.data).length > 0) {
            dynamicFeatures = filtersRes.data;
          }
        } catch (error) {
          console.warn("Could not fetch dynamic filters, using fallback", error.message);
        }
        setFilters({
          categories: allCategories,
          brand: brandsList,
          pricerange: { min: 0, max: 250000 },
          specificfilters: {},
          features: dynamicFeatures,
        });
      } catch (error) {
        console.error("Error fetching filters:", error);
        setFilters({
          categories: ["Mobile", "Laptop", "Mobile Accessories", "Laptop Accessories"],
          brand: brands,
          pricerange: { min: 0, max: 200000 },
          specificfilters: {},
          features: features,
        });
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchDynamicFilters();
  }, [selectedFilters.category]); // BUG-20 FIX: removed initialCategory from deps

  // Sync with parent filters when they change
  useEffect(() => {
    if (initialFilters) {
      setSelectedFilters(prev => ({
        ...prev,
        price: initialFilters.price || "All Price",
        minPrice: initialFilters.minPrice || "",
        maxPrice: initialFilters.maxPrice || "",
        category: initialFilters.category || prev.category,
        brands: initialFilters.brands || [],
      }));
    }
  }, [initialFilters?.price, initialFilters?.minPrice, initialFilters?.maxPrice]);

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCategoryChange = (value) => {
    setSelectedFilters((prev) => ({ ...prev, category: value }));
  };

  const handleBrandToggle = (brand) => {
    setSelectedFilters((prev) => {
      const current = new Set(prev.brands);

      current.has(brand.toLowerCase())
        ? current.delete(brand.toLowerCase())
        : current.add(brand.toLowerCase());

      return { ...prev, brands: Array.from(current) };
    });
  };

  const handleFeatureToggle = (featureGroup, value) => {
    setSelectedFilters((prev) => {
      const group = new Set(prev.features[featureGroup] || []);
      group.has(value) ? group.delete(value) : group.add(value);
      return {
        ...prev,
        features: {
          ...prev.features,
          [featureGroup]: Array.from(group),
        },
      };
    });
  };

  const handlePriceChange = (selected) => {
    const priceMap = {
      "Under ₹5,000":             [0, 5000],
      "₹5,000 to ₹20,000":       [5000, 20000],
      "₹20,000 to ₹50,000":      [20000, 50000],
      "₹50,000 to ₹1,00,000":    [50000, 100000],
      "₹1,00,000 to ₹1,50,000":  [100000, 150000],
      "Above ₹1,50,000":          [150000, 10000000],
    };
    
    // If "All Price" is selected, clear price filters
    if (selected === "All Price") {
      setSelectedFilters((prev) => ({
        ...prev,
        price: "All Price",
        minPrice: "",
        maxPrice: "",
      }));
    } else {
      const [min, max] = priceMap[selected] || [0, 10000000];
      setSelectedFilters((prev) => ({
        ...prev,
        price: selected,
        minPrice: min,
        maxPrice: max,
      }));
    }
  };

  // Category Based Brands - Always show available brands
  const categoryBasedBrands = useMemo(() => {
    // If category is selected and has specific brands, show those
    if (selectedFilters.category && filters.specificfilters?.[selectedFilters.category]?.brand) {
      return filters.specificfilters[selectedFilters.category].brand;
    }
    // Otherwise, always show all available brands
    return filters.brand ?? [];
  }, [selectedFilters.category, filters.brand, filters.specificfilters]);

  // Category based Features - show features for selected category
  const categoryBasedFeatures = useMemo(() => {
    // If no category selected, show all available features
    if (!selectedFilters.category) {
      // Show the main features array (RAM, ROM, OS, etc.)
      return Object.entries(filters.features || {});
    }
    
    // If category selected, try to get category-specific features
    const specific = filters?.specificfilters?.[selectedFilters.category];
    if (!specific) {
      // Fallback to general features
      return Object.entries(filters.features || {});
    }

    // Filter out 'brand' and return entries
    return Object.entries(specific).filter(([key]) => key !== "brand");
  }, [selectedFilters.category, filters.features, filters.specificfilters]);

  const handleResetFilters = () => {
    setSelectedFilters(defaultFilters);
  };

  // Create a stable debounced callback that updates parent with selected filters
  const debouncedFilterUpdate = useMemo(
    () =>
      debounce((filtersToSend) => {
        console.log("🔄 Sending filters update:", filtersToSend);
        onFiltersChange(filtersToSend);
      }, 300), // 300ms delay to batch filter changes
    [onFiltersChange]
  );

  // BUG-13 FIX: Added JSON.stringify(selectedFilters.features) to deps.
  // Previously, clicking a feature checkbox updated selectedFilters.features
  // but this effect never fired — so feature filters were silently ignored.
  useEffect(() => {
    debouncedFilterUpdate(selectedFilters);
    return () => {
      debouncedFilterUpdate.cancel();
    };
  }, [
    selectedFilters.category,
    selectedFilters.price,
    selectedFilters.minPrice,
    selectedFilters.maxPrice,
    JSON.stringify(selectedFilters.brands),
    JSON.stringify(selectedFilters.features), // BUG-13 FIX
    debouncedFilterUpdate
  ]);

  return (
    <aside className="w-full  pb-8">
      {/* 🔄 Reset Button */}
      <div className="flex justify-end mb-2 pr-2">
        <button
          onClick={handleResetFilters}
          title="Reset Filters"
          className="cursor-pointer flex items-center gap-1 text-sm text-gray-600 hover:text-black transition"
        >
          <FiRotateCw className="w-4 h-4" />
          <span className="text-xs">Reset</span>
        </button>
      </div>

      {/* Category */}
      <FilterSection
        title="Category"
        isOpen={openSections.category}
        toggleOpen={() => toggleSection("category")}
      >
        {loadingFilters ? (
          <div className="flex justify-center py-4">
            <BeatLoader size={10} color="gray" />
          </div>
        ) : (
          <>
            {/* Four Fixed Categories */}
            {filters.categories?.map((item) => (
              <label
                key={item}
                className="cursor-pointer flex items-center gap-2 text-sm text-gray-800"
              >
                <input
                  type="radio"
                  name="category"
                  checked={selectedFilters.category === item}
                  onChange={() => handleCategoryChange(item)}
                  className="radio-custom cursor-pointer"
                />
                {CATEGORY_DISPLAY_NAMES[item] || item}
              </label>
            ))}
          </>
        )}
      </FilterSection>

      <FilterSection
        title="Price"
        isOpen={openSections.price}
        toggleOpen={() => toggleSection("price")}
      >
        {/* Displayed Range Knobs with custom style */}

        <PriceRangeSelector
          minPrice={selectedFilters.minPrice}
          maxPrice={selectedFilters.maxPrice}
          min={filters.pricerange?.min || 0}
          max={filters.pricerange?.max || 250000}
          onChange={({ minPrice, maxPrice }) => {
            setSelectedFilters((prev) => ({
              ...prev,
              minPrice,
              maxPrice,
            }))
          }}
        />

        {/* Predefined Ranges */}
        <div className="mt-4 space-y-2">
          {prices.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80 transition"
            >
              <input
                type="radio"
                name="price"
                value={item}
                checked={selectedFilters.price === item}
                onChange={() => handlePriceChange(item)}
                className="w-4 h-4 cursor-pointer accent-yellow-400"
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Brands */}
      <FilterSection
        title="Brand"
        isOpen={openSections.brand}
        toggleOpen={() => toggleSection("brand")}
      >
        {loadingFilters ? (
          <div className="flex justify-center py-4">
            <BeatLoader size={10} color="gray" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(categoryBasedBrands || []).map((item) => (
              <label
                key={item}
                className="cursor-pointer flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedFilters?.brands?.includes(
                    item.toLowerCase()
                  )}
                  onChange={() => handleBrandToggle(item)}
                  className="accent-black cursor-pointer"
                />
                {item}
              </label>
            ))}
          </div>
        )}
      </FilterSection>

      {/* Features */}
      <FilterSection
        title="Features"
        isOpen={openSections.features}
        toggleOpen={() => toggleSection("features")}
      >
        {loadingFilters ? (
          <div className="flex justify-center py-4">
            <BeatLoader size={10} color="gray" />
          </div>
        ) : (
          categoryBasedFeatures?.map(([feature, values]) => (
            <div key={feature} className="mb-4">
              <h4 className="font-semibold text-sm mb-2 capitalize">
                {feature}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {values.map((item) => (
                  <label
                    key={item}
                    className="cursor-pointer flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedFilters.features[feature]?.includes(item) ||
                        false
                      }
                      onChange={() => handleFeatureToggle(feature, item)}
                      className="accent-black cursor-pointer"
                    />
                    {item}
                  </label>
                ))}
              </div>
              <hr className="my-2 border-gray-300" />
            </div>
          ))
        )}
      </FilterSection>

      <div className="hidden sm:block">
        <FeaturedProductBaner />
      </div>
    </aside>
  );
};

export default SidebarFilters;
