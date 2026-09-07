import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";

import { apiService } from "../services/api";
import ModernCompareView from "../components/compare/ModernCompareView";
import { useCompare } from "../contexts/CompareContext";

export const Compare = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { compareList, clearCompare } = useCompare();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hiddenIds, setHiddenIds] = useState([]);

  const comparisons = location.state || compareList;

  const hiddenIdsRef = useRef(hiddenIds);
  useEffect(() => { hiddenIdsRef.current = hiddenIds; }, [hiddenIds]);

  const handleRemoveProduct = (selectedProduct) => {
    if (!selectedProduct) return;
    const id = selectedProduct._id || selectedProduct.id;
    setHiddenIds((prev) => [...prev, id]);
    setProducts((prev) => prev.filter((p) => p && (p._id || p.id) !== id));
  };

  const handleClearAll = () => {
    clearCompare();
    setProducts([]);
    setHiddenIds([]);
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null });
    }
  };

  const fetchProducts = useCallback(async (ids) => {
    try {
      setLoading(true);
      const uniqueIds = [...new Set(ids.map((id) => String(id).trim().toLowerCase()).filter(Boolean))];

      const responses = await Promise.allSettled(
        uniqueIds.map(async (id) => {
          try {
            return await apiService.getProductById(id);
          } catch (error) {
            console.warn(`Failed to fetch product ${id}:`, error);
            return null;
          }
        })
      );

      const fetchedProducts = responses
        .map((res) => {
          if (res.status !== "fulfilled" || !res.value?.data) return null;
          const data = res.value.data;
          const prod = data.product || (Array.isArray(data) ? data[0] : data);
          if (!prod) return null;
          return {
            ...prod,
            _id: prod._id || prod.id,
            vendors: prod.vendors || data.vendors || {}
          };
        })
        .filter(Boolean)
        .map((p) => ({ ...p, _id: p._id || p.id }));

      const seenMasterIds = new Set();
      const validProducts = [];

      for (const p of fetchedProducts) {
        const masterId = String(p._id || p.id || "").trim().toLowerCase();
        if (
          masterId &&
          !seenMasterIds.has(masterId) &&
          !hiddenIdsRef.current.includes(masterId)
        ) {
          seenMasterIds.add(masterId);
          validProducts.push(p);
        }
      }

      if (validProducts.length > 0) {
        setProducts(validProducts);
      } else if (comparisons && comparisons.length > 0) {
        setProducts(comparisons.filter(Boolean).map((p) => ({ ...p, _id: p._id || p.id })));
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      if (comparisons && comparisons.length > 0) {
        setProducts(comparisons.filter(Boolean).map((p) => ({ ...p, _id: p._id || p.id })));
      } else {
        toast.error("Failed to load products for comparison");
      }
    } finally {
      setLoading(false);
    }
  }, [comparisons]);

  useEffect(() => {
    if (comparisons && comparisons.length > 0) {
      const ids = comparisons
        .filter(Boolean)
        .map((p) => p._id || p.id)
        .filter(Boolean);
      if (ids.length) {
        fetchProducts(ids);
      } else {
        setProducts([]);
      }
    } else {
      setProducts([]);
    }
  }, [comparisons, fetchProducts]);

  const activeProducts = products.length > 0 
    ? products 
    : (Array.isArray(comparisons) ? comparisons : []);

  const visibleProducts = activeProducts.filter(
    (p) => p && !hiddenIds.includes(p._id || p.id)
  );

  return (
    <div>
      {loading && visibleProducts.length === 0 ? (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          <ClipLoader size={35} color="#dcfe50" />
          <span className="ml-3 font-bold text-sm">Loading Comparison Data...</span>
        </div>
      ) : (
        <ModernCompareView
          products={visibleProducts}
          onRemove={handleRemoveProduct}
          onClear={handleClearAll}
        />
      )}
    </div>
  );
};

export default Compare;

