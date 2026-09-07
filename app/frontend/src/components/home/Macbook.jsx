import React from "react";
import { FaArrowRight } from "react-icons/fa";
import { macbookImg } from "../../assets/ImportImages";
import { Link } from "react-router-dom";


const MacbookPage = () => {
  return (
    <div className="bg-[#F4FFC8] dark:bg-gray-900 rounded-3xl py-8 px-4 sm:px-8 flex flex-col xs:flex-row items-center justify-between my-10 gap-8 md:gap-16 border border-lime-200 dark:border-gray-800 transition-colors">
      {/* Text Content */}
      <div className="flex-1 w-full max-w-md md:max-w-none">
        <div className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 w-fit mb-3 rounded-lg">
          SAVE UP TO Rs. 200.00
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Macbook Pro
        </h1>
        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mt-2">
          Apple M1 Max Chip. 32GB Unified <br className="hidden sm:block" />
          Memory, 1TB SSD Storage
        </p>
        <Link to="/products"
          className="mt-6 bg-[#dcfe50] w-fit hover:bg-lime-300 text-black font-bold px-6 py-2.5 rounded-xl inline-flex items-center gap-2 text-sm sm:text-base transition-all shadow-sm"
        >
          SHOP NOW <FaArrowRight size={16} />
        </Link>
      </div>

      {/* Image Section */}
      <div className="flex-1 w-full relative flex justify-center">
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-[#dcfe50] font-bold rounded-full px-3 py-1 text-xs shadow-md border-2 border-white">
          Rs. 1999
        </div>
        <img
          src={macbookImg}
          alt="Macbook Pro"
          className="w-full object-contain max-h-64 sm:max-h-80"
        />
      </div>
    </div>
  );
};

export default MacbookPage;
