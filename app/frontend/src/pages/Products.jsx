import { useState, useMemo, useEffect } from "react";
import SearchSortBar from "../components/products/SearchSortBar";
import ProductGrid from "../components/products/ProductGrid";
import ResponsiveSidebarWrapper from "../components/products/ResponsiveSideBar";
import { useLocation, useSearchParams } from "react-router-dom";
export const Products = () => {

const location = useLocation();
const [searchParams, setSearchParams] = useSearchParams();

// Get initial category from URL params or location state
const urlCategory = searchParams.get('category');
const initialCategory = urlCategory || location.state?.category || "";

const [filters, setFilters] = useState({
  category: initialCategory,
  price: "All Price",
  minPrice: "",
  maxPrice: "",
  brands: [],
  features: {},
});

// Update URL when category filter changes (debounced to prevent excessive updates)
  useEffect(() => {
    const updateParams = () => {
      if (filters.category) {
        setSearchParams({ category: filters.category });
      } else {
        setSearchParams({});
      }
    };
    
    // Small delay to batch URL updates
    const timer = setTimeout(updateParams, 100);
    return () => clearTimeout(timer);
  }, [filters.category, setSearchParams]);


  // const [filters, setFilters] = useState({
  //   category: "",
  //   price: "All Price",
  //   minPrice: "",
  //   maxPrice: "",
  //   brands: [],
  //   features: {},
  // });
  const urlSearch = searchParams.get('q') || "";
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [sortOption, setSortOption] = useState("relevance");

  useEffect(() => {
    const qFromUrl = searchParams.get('q');
    if (qFromUrl !== null && qFromUrl !== searchQuery) {
      setSearchQuery(qFromUrl);
    }
  }, [searchParams]);


  const sortOptions = [
    { label: "Price: Low to High", value: "1" },
    { label: "Price: High to Low", value: "-1" },
  ];

  // Utility function to clean filters
  const cleanFilters = (filters) => {
    const cleaned = { ...filters };

    // Remove empty arrays from features
    if (cleaned.features) {
      const cleanedFeatures = {};
      for (const [key, value] of Object.entries(cleaned.features)) {
        if (Array.isArray(value) && value.length > 0) {
          cleanedFeatures[key] = value;
        }
      }
      cleaned.features = cleanedFeatures;
    }

    if (Array.isArray(cleaned.brands) && cleaned.brands.length === 0) {
      delete cleaned.brands;
    }
    if (!cleaned.category || cleaned.category === "") delete cleaned.category;
    if (cleaned.minPrice === "" || cleaned.minPrice === undefined) delete cleaned.minPrice;
    if (cleaned.maxPrice === "" || cleaned.maxPrice === undefined) delete cleaned.maxPrice;

    return cleaned;
  };

  // ✅ Memoize cleaned filters
  const cleanedFilters = useMemo(() => cleanFilters(filters), [filters]);

  return (
    <section className="relative maxscreen screen-margin overflow-hidden py-20">
      <div className="flex py-8 gap-4 w-full ">
        <ResponsiveSidebarWrapper onFiltersChange={setFilters} initialFilters={filters} />
        <section className="min-h-screen w-full ">
          <SearchSortBar
            searchPlaceholder="Search for anything..."
            sortLabel="Sort by:"
            sortOptions={sortOptions}
            selectedSort={sortOption}
            onSearchChange={setSearchQuery}
            onSortChange={setSortOption}
          />
          <ProductGrid
            filters={cleanedFilters}
            query={searchQuery}
            sortby={sortOption}
          />
        </section>
      </div>
    </section>
  );
};
