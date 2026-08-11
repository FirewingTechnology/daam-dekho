import React from "react";
import { useNavigate } from "react-router-dom";

const CategoryCard = ({ product }) => {
  const navigate = useNavigate();

  const getCategorySlug = (nameStr) => {
    if (!nameStr) return "mobiles";
    const clean = String(nameStr).toLowerCase().trim();
    if (clean.includes("laptop")) return "laptops";
    if (clean.includes("mobile") || clean.includes("phone")) return "mobiles";
    if (clean.includes("tablet") || clean.includes("ipad")) return "tablets";
    if (clean.includes("tv")) return "tvs";
    if (clean.includes("accessory") || clean.includes("accessories")) return "accessories";
    return clean;
  };

  const handleCompare = () => {
    const slug = getCategorySlug(product?.name);
    navigate(`/category/${slug}`, {
      state: { category: product?.name },
    });
  };

  return (
    <div className="bg-white border border-gray-100 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-5 transition-all duration-300 hover:shadow-xl hover:border-primary/50 cursor-pointer w-full group">
      <div className="bg-gray-50 p-4 rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform">
        <img
          src={product?.image}
          alt={product?.name}
          className="w-14 h-14 object-contain"
        />
      </div>
      
      <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
        <div className="text-xl font-black text-gray-900 group-hover:text-primary-dark transition-colors">{product?.name}</div>
        <div className="text-xs text-gray-500 mt-1">Explore and compare live prices across top Indian stores in {product?.name}</div>
      </div>
      
      <div className="flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
        <button 
          className="w-full sm:w-auto bg-black text-primary px-6 py-2.5 rounded-full font-extrabold text-xs sm:text-sm hover:bg-primary hover:text-black transition-all shadow-md active:scale-95 min-touch-target" 
          onClick={handleCompare}
        >
          Compare {product?.name} →
        </button>
      </div>
    </div>
  );
};

export default CategoryCard;
