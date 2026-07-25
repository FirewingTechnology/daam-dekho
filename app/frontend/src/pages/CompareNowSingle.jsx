import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { z } from "zod";
import CompareModal from "../components/home/compare/CompareModal";
import CompareBox from "../components/home/compare/CompareBox";

const schema = z
  .array(
    z
      .object({
        _id: z.any(),
        name: z.string().optional(),
        price: z.any().optional(),
        image: z.string().optional().nullable(),
      })
      .nullable()
  )
  .refine((arr) => arr.filter(Boolean).length >= 2, {
    message: "Select at least 2 products to compare",
  });

// Category name mapping for display
const CATEGORY_DISPLAY_MAP = {
  "Laptop": "Laptops",
  "Mobile": "Mobile Phones",
  "Laptop Accessories": "Laptop Accessories",
  "Mobile Accessories": "Mobile Accessories",
};

const CompareNowSingle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedCategory = location.state?.category || "Select a Category";
  const displayCategory = CATEGORY_DISPLAY_MAP[selectedCategory] || selectedCategory;

  const [comparisons, setComparisons] = useState([null, null, null, null]);
  const [modalIndex, setModalIndex] = useState(null);

  // useEffect(() => {
  //   // Pre-fill first box with clicked product if passed
  //   if (location.state && location.state.product) {
  //     setComparisons((prev) => {
  //       const updated = [...prev];
  //       updated[0] = location.state.product;
  //       return updated;
  //     });
  //   }
  // }, [location.state]);

  const handleSelectProduct = (product) => {
    if (modalIndex !== null) {
      const updated = [...comparisons];
      
      const vendorKeys = product.vendors ? Object.keys(product.vendors) : [];
      let displayPrice = 0;
      if (vendorKeys.length > 0) {
        displayPrice = product.vendors[vendorKeys[0]].discounted_Price || product.vendors[vendorKeys[0]].price || 0;
      }

      const imageUrl = (product.image_urls && product.image_urls[0]) || product.base_image || product.image?.thumbnail || "";

      updated[modalIndex] = {
        _id: product._id || product.id,
        name: product.title || "Unknown Product",
        price: `Rs. ${displayPrice}/-`,
        image: imageUrl,
      };
      setComparisons(updated);
      setModalIndex(null);
    }
  };

  const handleRemove = (index) => {
    const updated = [...comparisons];
    updated[index] = null;
    setComparisons(updated);
  };

  const handleCompare = () => {
    try {
      schema.parse(comparisons);
      toast.success("Comparison started ");
      navigate("/compare", { state: comparisons });
    } catch (err) {
      toast.error(err.errors[0].message);
    }
  };

  return (
    <div className="flex flex-col items-center w-full px-4 pt-16 pb-10 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col items-center w-full mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
          Compare Products
        </h1>
        <div className="bg-[#DCFE50] px-8 py-3 rounded-full shadow-md">
          <h2 className="text-xl md:text-2xl font-semibold text-black">
            {displayCategory}
          </h2>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 w-full max-w-7xl bg-white p-6 rounded-lg shadow-md">
        {comparisons.map((item, index) => (
          <React.Fragment key={index}>
            <CompareBox
              item={item}
              onAdd={() => setModalIndex(index)}
              onRemove={() => handleRemove(index)}
            />
            {index < comparisons.length - 1 && (
              <div className="text-xs font-bold bg-black text-white rounded-full w-6 h-6 flex items-center justify-center hidden md:flex">
                VS
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Compare Now Button */}
      <div className="mt-10">
        <button
          onClick={handleCompare}
          className="bg-[#DCFE50] px-8 py-3 rounded-lg font-bold text-black text-base hover:bg-lime-300 transition shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          COMPARE NOW
        </button>
      </div>

      {/* Modal */}
      {modalIndex !== null && (
        <CompareModal
          activeTab={selectedCategory}
          onClose={() => setModalIndex(null)}
          onSelect={handleSelectProduct}
        />
      )}
    </div>
  );
};

export default CompareNowSingle;
