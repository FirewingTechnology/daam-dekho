import React, { useState, useEffect } from "react";
import { apiEndpoints } from "../../services/api";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import {
  LaptopIcon,
  CellphoneIcon,
  HeadphoneIcon,
} from "../../assets/ImportImages";
import CategoryCard from "../category/CategoryCard";

const GridProduct = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category icon mapping
  const getCategoryIcon = (categoryName) => {
    const name = categoryName.toLowerCase();
    if (name.includes('laptop') || name.includes('computer')) return LaptopIcon;
    if (name.includes('phone') || name.includes('mobile')) return CellphoneIcon;
    if (name.includes('headphone') || name.includes('audio') || name.includes('accessory')) return HeadphoneIcon;
    return CellphoneIcon; // default
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await apiEndpoints.getCategories();
        const categoryData = response.data.categories || [];
        
        // Map categories to display format
        const mappedCategories = categoryData.map(cat => ({
          image: getCategoryIcon(cat),
          name: cat,
          category: cat
        }));
        
        setCategories(mappedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <ClipLoader color="#dcfe50" size={50} />
      </div>
    );
  }

  return (
    <div className="section-container font-poppins py-8">
      <div className="flex flex-col items-center mb-8">
         <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
         <p className="text-gray-500 mt-2">Select a category to compare products</p>
      </div>
      {/* Product List */}
      <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full px-4">
        {categories.length === 0 ? (
          <p className="text-center text-gray-500">
            No categories available
          </p>
        ) : (
          categories.map((product, index) => (
            <CategoryCard key={index} product={product} />
          ))
        )}
      </div>
    </div>
  );
};

export default GridProduct;
