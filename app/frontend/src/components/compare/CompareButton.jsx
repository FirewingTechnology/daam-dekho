import React, { useRef, useEffect } from "react";
import { useCompare } from "../../contexts/CompareContext";

// Global lock - prevents ANY concurrent clicks across ALL buttons
let globalLock = false;
const recentlyAddedProducts = new Set();

const CompareButton = ({ product }) => {
  const { addToCompare, removeFromCompare, isInCompare, compareList } = useCompare();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const baseProductId = product?._id || product?.id || product?.product_id;
  const seller = product?.seller || product?.source || product?.vendor || "";
  // Create unique ID combining product ID + seller to handle multi-seller same products
  const productId = seller ? `${baseProductId}__${seller}` : baseProductId;
  
  // DEBUG: Log product details
  useEffect(() => {
    if (!productId) {
      console.error("[CompareButton] Product has no ID:", product);
    } else {
      const inComp = isInCompare(productId);
      console.log(`[CompareButton] Product ${productId} (base: ${baseProductId}, seller: "${seller}") - In Compare: ${inComp}, List: ${compareList.length}`);
    }
  }, [productId, compareList.length]);

  const inCompare = isInCompare(productId);

  if (!productId) {
    console.error("[CompareButton] Cannot render - no product ID");
    return null;
  }

  const handleClick = (e) => {
    // CRITICAL: Stop everything immediately
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) {
      e.nativeEvent.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }

    // Global lock - block if ANY operation is in progress
    if (globalLock) {
      console.warn(`[CompareButton] Global lock active, blocking click on ${productId}`);
      return;
    }

    // Check if this product was just added (prevent re-adding)
    if (recentlyAddedProducts.has(productId)) {
      console.warn(`[CompareButton] Product ${productId} was just added, ignoring duplicate`);
      return;
    }

    // Only process if component is still mounted
    if (!isMountedRef.current) {
      console.warn(`[CompareButton] Component unmounted, ignoring click`);
      return;
    }

    // Set global lock immediately
    globalLock = true;

    try {
      console.log(`[CompareButton] CLICK on product ${productId}, inCompare=${inCompare}`);

      if (inCompare) {
        console.log(`[CompareButton] Removing ${productId}`);
        removeFromCompare(productId);
      } else {
        if (compareList.length >= 4) {
          console.log(`[CompareButton] List full (${compareList.length}), cannot add ${productId}`);
          alert("You can compare maximum 4 products at a time");
          return;
        }

        console.log(`[CompareButton] Adding ${productId} to compare list`);
        recentlyAddedProducts.add(productId);
        addToCompare(product);
      }
    } finally {
      // Release global lock after a safe delay
      setTimeout(() => {
        globalLock = false;
        recentlyAddedProducts.delete(productId);
        console.log(`[CompareButton] Lock released for ${productId}`);
      }, 500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
        inCompare
          ? "bg-blue-600 hover:bg-blue-700 text-white"
          : "bg-gray-200 hover:bg-gray-300 text-gray-800"
      }`}
    >
      {inCompare ? "✓ In Compare" : "Compare"}
    </button>
  );
};

export default CompareButton;
