import React, { createContext, useContext, useState } from "react";
import { toast } from "react-toastify";

const CompareContext = createContext();

// Track which products are currently being added to prevent race conditions
const addingProductIds = new Set();

export const CompareProvider = ({ children }) => {
  // In-memory only - no localStorage persistence
  const [compareList, setCompareList] = useState([]);

  const getMasterId = (product) => {
    if (!product) return "";
    return String(product._id || product.id || product.product_id || product.slug || "").trim().toLowerCase();
  };

  const addToCompare = async (product) => {
    if (!product) return;

    const masterId = getMasterId(product);
    if (!masterId) return;

    if (addingProductIds.has(masterId)) return;
    addingProductIds.add(masterId);

    try {
      if (compareList.some((p) => getMasterId(p) === masterId)) {
        toast.info("This product is already in your comparison list.");
        return;
      }

      if (compareList.length >= 4) {
        toast.warning("Maximum 4 products allowed for comparison! Remove a product to add another.");
        return;
      }
      
      let fullProduct = { ...product, _id: masterId, id: masterId };
      
      if (!product.vendors || Array.isArray(product.vendors) || !product.specifications) {
        try {
          const slug = product.slug || product.id || masterId;
          if (slug) {
            const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_URL;
            const baseUrl = envUrl || (import.meta.env.DEV ? 'http://localhost:8001/api' : 'https://api.daamdekho.com/api');
            const cleanBaseUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api`;
            const res = await fetch(`${cleanBaseUrl}/products/${slug}`);
            if (res.ok) {
              const data = await res.json();
              const productData = Array.isArray(data) ? data[0] : data;
              if (productData) {
                fullProduct = {
                  ...fullProduct,
                  ...productData,
                  _id: masterId,
                  id: masterId,
                };
              }
            }
          }
        } catch (error) {
          console.error("Error fetching full product details for compare:", error);
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
      setTimeout(() => {
        addingProductIds.delete(masterId);
      }, 300);
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
