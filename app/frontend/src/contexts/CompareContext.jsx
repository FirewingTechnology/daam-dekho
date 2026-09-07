import React, { createContext, useContext, useState, useRef } from "react";
import { toast } from "react-toastify";
import { apiService } from "../services/api";

const CompareContext = createContext();

export const CompareProvider = ({ children }) => {
  // In-memory only - no localStorage persistence
  const [compareList, setCompareList] = useState([]);
  const addingProductIdsRef = useRef(new Set());

  const getMasterId = (product) => {
    if (!product) return "";
    return String(product._id || product.id || product.product_id || product.slug || "").trim().toLowerCase();
  };

  const addToCompare = async (product) => {
    if (!product) return;

    const masterId = getMasterId(product);
    if (!masterId) return;

    if (addingProductIdsRef.current.has(masterId)) return;
    addingProductIdsRef.current.add(masterId);

    try {
      if (compareList.some((p) => getMasterId(p) === masterId)) {
        toast.info("This product is already in your comparison list.");
        return;
      }

      if (compareList.length >= 4) {
        toast.warning("Maximum 4 products can be compared at a time.");
        return;
      }

      let fullProduct = { ...product, _id: masterId, id: masterId };

      if (!product.vendors || Array.isArray(product.vendors) || !product.specifications) {
        try {
          const slug = product.slug || product.id || masterId;
          if (slug) {
            const res = await apiService.getProductById(slug);
            const raw = res?.data;
            const productData = raw?.product || (Array.isArray(raw) ? raw[0] : raw);
            if (productData) {
              fullProduct = {
                ...fullProduct,
                ...productData,
                vendors: productData.vendors || raw?.vendors || fullProduct.vendors,
                _id: masterId,
                id: masterId,
              };
            }
          }
        } catch (error) {
          console.warn("Error fetching full product details for compare:", error);
        }
      }

      setCompareList((currentList) => {
        if (currentList.some((p) => getMasterId(p) === masterId)) {
          return currentList;
        }

        if (currentList.length >= 4) {
          return currentList;
        }

        toast.success(`Added "${fullProduct.title || 'Product'}" to comparison!`);
        return [...currentList, fullProduct];
      });
    } finally {
      addingProductIdsRef.current?.delete(masterId);
    }
  };

  const removeFromCompare = (productId) => {
    const targetId = String(productId || "").trim().toLowerCase();
    setCompareList((currentList) => {
      const filtered = currentList.filter((p) => getMasterId(p) !== targetId);
      console.log(`[CompareContext] Removed ${targetId} (remaining: ${filtered.length})`);
      return filtered;
    });
  };

  const clearCompare = () => {
    setCompareList([]);
    console.log("[CompareContext] Cleared all comparisons");
  };

  const isInCompare = (productId) => {
    const targetId = String(productId || "").trim().toLowerCase();
    return compareList.some((p) => getMasterId(p) === targetId);
  };


  return (
    <CompareContext.Provider
      value={{
        compareList,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  return context;
};
