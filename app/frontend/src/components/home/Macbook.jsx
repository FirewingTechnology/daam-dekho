import React from "react";
import { FaArrowRight } from "react-icons/fa";
import { macbookImg } from "../../assets/ImportImages";
import { Link } from "react-router-dom";


const MacbookPage = () => {
  return (
    <div className="bg-[#F4FFC8]  py-8 flex flex-col xs:flex-row items-center justify-between  my-10 gap-10 md:gap-16">
      {/* Text Content */}
      <div className="flex-1 w-full max-w-md md:max-w-none pl-8 sm:pl-8">
        <div className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 w-fit mb-3 rounded">
          SAVE UP TO Rs. 200.00
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
          Macbook Pro
        </h1>
        <p className="text-sm sm:text-base text-gray-700 mt-2">
          Apple M1 Max Chip. 32GB Unified <br className="hidden sm:block" />
          Memory, 1TB SSD Storage
        </p>
        {/* <button className="mt-6 bg-[#dcfe50] hover:bg-lime-300 text-black font-semibold px-6 py-2 rounded flex items-center gap-2 text-sm sm:text-base transition">
          SHOP NOW <FaArrowRight size={16} />
        </button> */}
        <Link to="/products"
  className="mt-6 bg-[#dcfe50] w-41 hover:bg-lime-300 text-black font-semibold px-6 py-2 rounded flex items-center gap-2 text-sm sm:text-base transition"
>
  SHOP NOW <FaArrowRight size={16} />
</Link>
      </div>

      {/* Image Section */}
      <div className="flex-1 w-full relative flex justify-center">
        <div className="absolute top-[2%] left-[2%] sm:top-[4%] sm:left-[4%] bg-[#dcfe50] font-semibold rounded-full w-20 lg:w-28 h-10 lg:h-20 flex items-center justify-center shadow-lg text-sm border-4 border-white">
          Rs. 1999
        </div>
        <img
          src={macbookImg}
          alt="Macbook Pro"
          className="w-full object-contain"
        />
      </div>
    </div>
  );
};

export default MacbookPage;
