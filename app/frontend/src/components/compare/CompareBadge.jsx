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
      className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-110 z-40"
    >
      <span className="bg-blue-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
        {compareList.length}
      </span>
      <span>Compare</span>
      <FaChevronRight className="w-4 h-4" />
    </button>
  );
};

export default CompareBadge;

