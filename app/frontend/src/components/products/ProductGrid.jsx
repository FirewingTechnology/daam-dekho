import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiEndpoints } from "../../services/api";
import { toast } from "react-toastify";
import Pagination from "./Pagination";
import ProductCard from "./ProductCard";
import { BeatLoader } from "react-spinners";

const PRODUCTS_PER_PAGE = 24;

const override = {
  display: "block",
  margin: "auto auto",
  borderColor: "blue",
};

const ProductGrid = ({ filters, query = "", sortby = "1" }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loader, setLoader] = useState(false);

  // BUG-28 FIX: removed unused cancelTokenRef
  const lastFiltersRef = useRef(filters);
  const lastQueryRef = useRef(query);
  const lastSortByRef = useRef(sortby);

  // BUG-14 FIX: Use a timeout ref instead of creating a new lodash debounce
  // instance inside the effect on every render (which meant debounce never worked).
  const fetchTimeoutRef = useRef(null);

  // Reset to page 1 when filters/query/sort change
  useEffect(() => {
    const filtersChanged =
      JSON.stringify(filters) !== JSON.stringify(lastFiltersRef.current);
    const queryChanged = query !== lastQueryRef.current;
    const sortChanged = sortby !== lastSortByRef.current;

    if (filtersChanged || queryChanged || sortChanged) {
      setCurrentPage(1);
      lastFiltersRef.current = filters;
      lastQueryRef.current = query;
      lastSortByRef.current = sortby;
    }
  }, [filters, query, sortby]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoader(true);

      const {
        category = "",
        minPrice = "",
        maxPrice = "",
        brands = [],
      } = filters || {};

      const normalizeCategory = (cat) => {
        if (!cat) return undefined;
        const clean = String(cat).trim().toLowerCase();
        if (clean === "laptops" || clean === "laptop") return "Laptop";
        if (clean === "mobiles" || clean === "mobile" || clean === "smartphones") return "Mobile";
        if (clean === "tablets" || clean === "tablet") return "Tablets";
        if (clean === "tvs" || clean === "tv") return "TVs";
        if (clean === "accessories") return "Mobile Accessories";
        return cat;
      };

      const params = {
        query: query || undefined,
        category: normalizeCategory(category) || undefined,
        brands: brands?.length > 0 ? brands.join(",") : undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        sort_by: sortby || "-1",
        page: currentPage,
        limit: PRODUCTS_PER_PAGE,
      };

      // Remove undefined / empty values
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      const response = await apiEndpoints.searchProducts(params);

      if (response.data && Array.isArray(response.data.products)) {
        setProducts(response.data.products);
        setTotalProducts(response.data.pagination?.total || 0);
      } else {
        setProducts([]);
        setTotalProducts(0);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setLoader(false);
    }
  }, [filters, query, sortby, currentPage]);

  useEffect(() => {
    const isFilterChange =
      JSON.stringify(filters) !== JSON.stringify(lastFiltersRef.current) ||
      query !== lastQueryRef.current ||
      sortby !== lastSortByRef.current;

    if (isFilterChange) {
      // BUG-14 FIX: Use a plain setTimeout via ref so the same timer is
      // always cancelled before the next call — unlike the old pattern of
      // creating a new lodash debounce() on every render.
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        fetchProducts();
      }, 300);
    } else {
      // Pagination — fetch immediately (no debounce needed)
      fetchProducts();
    }

    return () => clearTimeout(fetchTimeoutRef.current);
  }, [filters, query, sortby, currentPage, fetchProducts]);

  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  return (
    <div className="p-2 sm:p-6 w-full max-w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {!loader &&
          products.map((product) => (
            <ProductCard key={product.id || product._id} product={product} />
          ))}
      </div>

      {!loader && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {loader ? (
        <div className="h-[50vh] flex items-center justify-center">
          <BeatLoader
            color="#dcfe50"
            loading={true}
            cssOverride={override}
            size={50}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
        </div>
      ) : (
        products.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            No products found.
          </div>
        )
      )}
    </div>
  );
};

export default ProductGrid;
