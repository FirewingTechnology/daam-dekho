import React from "react";
import { useCompare } from "../../contexts/CompareContext";

const CompareButton = ({ product }) => {
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();

  const baseProductId = product?._id || product?.id || product?.product_id || product?.slug;
  const seller = product?.seller || product?.source || product?.vendor || "";
  const productId = seller ? `${baseProductId}__${seller}` : baseProductId;

  if (!productId) {
    return null;
  }

  const inCompare = isInCompare(productId);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (inCompare) {
      removeFromCompare(productId);
    } else {
      addToCompare(product);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={inCompare ? "Remove from comparison" : "Add to comparison"}
      className={`w-full py-2 px-3 rounded-lg font-semibold text-sm transition-all min-touch-target flex items-center justify-center ${
        inCompare
          ? "bg-blue-600 hover:bg-blue-700 text-white"
          : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
      }`}
    >
      {inCompare ? "✓ In Compare" : "Compare"}
    </button>
  );
};

export default CompareButton;
