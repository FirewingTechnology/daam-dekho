import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
// BUG-33 FIX: Use react-toastify consistently instead of react-hot-toast
import { toast } from "react-toastify";

import DeviceComparisonHeader from "../components/compare/DeviceComparisonHeader";
import DeviceCards from "../components/compare/DeviceCards";
import { fallbackDevices } from "../constants/deviceConstants";
import DesignSection from "../components/compare/DesignSection";
import DisplaySection from "../components/compare/DisplaySection";
import NetworkSection from "../components/compare/NetworkSection";
import PerformanceSection from "../components/compare/PerformanceSection";
import CameraSection from "../components/compare/CameraSection";
import PriceSection from "../components/compare/PriceSection";
import { apiService } from "../services/api";

import ModernCompareView from "../components/compare/ModernCompareView";
import { useCompare } from "../contexts/CompareContext";

export const Compare = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { compareList, removeFromCompare } = useCompare();
  const comparisons = location.state || compareList;

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


  useEffect(() => {
    if (comparisons?.length) {
      const ids = comparisons
        .filter(Boolean)
        .map((p) => p._id || p.id)
        .filter(Boolean);
      if (ids.length) {
        fetchProducts(ids);
      }
    }
  }, [comparisons, fetchProducts]);

  if (!comparisons && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
        <h2 className="text-2xl font-bold text-gray-800">No products selected</h2>
        <p className="text-gray-500">
          Please browse products and add them to the comparison list first.
        </p>
        <button
          onClick={() => navigate("/products")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Browse Products
        </button>
      </div>
    );
  }

  let visibleProducts = products.filter(
    (p) => p && !hiddenIds.includes(p._id || p.id)
  );

  return (
    <div>
      {loading ? (
        <div className="min-h-screen w-full flex items-center justify-center">
          <ClipLoader size={35} color="#dcfe50" />
          <span className="ml-3 font-bold text-sm">Loading Comparison Data...</span>
        </div>
      ) : (
        <ModernCompareView products={visibleProducts.length > 0 ? visibleProducts : compareList} onRemove={handleRemoveProduct} />
      )}
    </div>
  );
};

