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
        .map((res) =>
          res.status === "fulfilled" && res.value?.data ? res.value.data : null
        )
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

      setProducts(validProducts);

      if (validProducts.length === 0 && uniqueIds.length > 0) {
        toast.error("No products with pricing data found for comparison");
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Failed to load products for comparison");
    } finally {
      setLoading(false);
    }
  }, []);

  const comparisons = location.state || compareList;

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

  const visibleProducts = products.filter(
    (p) => p && !hiddenIds.includes(p._id || p.id)
  );

  const hasNoComparisons = 
    (!comparisons || (Array.isArray(comparisons) && comparisons.filter(Boolean).length === 0)) && 
    visibleProducts.length === 0;

  if (hasNoComparisons && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 py-16 text-center bg-slate-900 font-['Inter',_sans-serif]">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-800/80 backdrop-blur-md border border-slate-700/60 shadow-2xl space-y-6 animate-fadeIn">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-3xl shadow-inner">
            ⚖️
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              No Products Selected
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Compare prices, specs, and vendor deals side-by-side by selecting products from our catalog.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => navigate("/products")}
              className="w-full py-3.5 px-6 bg-[#dcfe50] hover:bg-lime-300 text-slate-950 font-black rounded-xl text-sm transition-all duration-300 shadow-lg shadow-lime-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              🔍 Browse Products to Compare
            </button>

            <button
              onClick={() => fetchProducts(["545", "544"])}
              className="w-full py-3 px-6 bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-all duration-300 border border-slate-600/50 hover:border-amber-500/50 active:scale-95 flex items-center justify-center gap-2"
            >
              ⚡ Quick Load Popular Laptops
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {loading ? (
        <div className="min-h-screen w-full flex items-center justify-center">
          <ClipLoader size={35} color="#dcfe50" />
          <span className="ml-3 font-bold text-sm">Loading Comparison Data...</span>
        </div>
      ) : (
        <ModernCompareView
          products={visibleProducts.length > 0 ? visibleProducts : (comparisons && comparisons.length > 0 ? compareList : [])}
          onRemove={handleRemoveProduct}
          onClear={handleClearAll}
        />
      )}
    </div>
  );
};

