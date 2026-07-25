import React from "react";
import { useNavigate } from "react-router-dom";

const CategoryCard = ({ product }) => {
  const navigate = useNavigate();

  const handleCompare = () => {
    const slug = product?.name ? product.name.toLowerCase() : "mobiles";
    navigate(`/category/${slug}`, {
      state: { category: product?.name },
    });
  };

  return (
    <div className="bg-white border border-gray-100 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-6 transition-all duration-300 hover:shadow-lg hover:border-primary cursor-pointer w-full group">
      <div className="bg-gray-50 p-4 rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform">
        <img
          src={product?.image}
          alt={product?.name}
          className="w-16 h-16 object-contain"
        />
      </div>
      
      <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
        <div className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors">{product?.name}</div>
        <div className="text-sm text-gray-500 mt-1">Explore and compare products in {product?.name}</div>
      </div>
      
      <div className="flex-shrink-0 w-full sm:w-auto mt-4 sm:mt-0">
        <button 
          className="w-full sm:w-auto bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-primary hover:text-black transition-all shadow-md active:scale-95" 
          onClick={handleCompare}
        >
          Compare {product?.name}
        </button>
      </div>
    </div>
  );
};

export default CategoryCard;
