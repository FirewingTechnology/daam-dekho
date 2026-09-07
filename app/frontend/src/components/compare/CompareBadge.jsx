import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import { useCompare } from "../../contexts/CompareContext";

const CompareBadge = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { compareList } = useCompare();

  if (compareList.length === 0 || location.pathname.startsWith("/compare")) return null;

  return (
    <button
      onClick={() => navigate("/compare-products")}
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-full shadow-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 z-40 min-touch-target"
      aria-label={`View ${compareList.length} compared products`}
    >
      <span className="bg-blue-800 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-bold">
        {compareList.length}
      </span>
      <span className="text-xs sm:text-sm">Compare</span>
      <FaChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
    </button>
  );
};

export default CompareBadge;

