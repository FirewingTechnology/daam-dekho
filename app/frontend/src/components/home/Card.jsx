import React from "react";
import ProductCard from "../products/ProductCard";
import { Link } from "react-router-dom";

const Card = ({ title = "Hot Deals", products = [] }) => {

  const filteredProducts = Array.isArray(products) ? products : [];

  return (
    <div className="w-full mt-10 p-4 border border-gray-200 rounded-md shadow-sm ">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
        <Link
          to="/products"
          className="text-xs sm:text-sm px-4 py-2 border border-lime-400 rounded text-black hover:bg-lime-50 transition"
        >
          Browse All Product →
        </Link>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-between">
        {filteredProducts.length === 0 ? (
          <p className="text-gray-400 col-span-full text-center">No products available</p>
        ) : (
          filteredProducts.slice(0, 4).map((product, index) => (
            <ProductCard key={index} product={product} />
          ))
        )}
      </div>
    </div>
  );
};


export default Card;
