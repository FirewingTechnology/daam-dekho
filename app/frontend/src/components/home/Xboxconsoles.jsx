import React from "react";
import { FaArrowRight } from "react-icons/fa";
import {
  cpuGamingIMG as cpugaming,
  mobileRightIMg as mobileright,
  earbudsIMG as earbuds,
} from "../../assets/ImportImages";
import { Link } from "react-router-dom";

const Xboxconsoles = () => {
  return (
    <div className="flex flex-col lg:flex-row justify-between gap-6 py-8 w-full">
      {/* Left Section */}
      <div className="flex flex-col md:flex-row w-full lg:w-[60%] bg-gray-200 border border-gray-200 rounded p-4">
        {/* Text Content */}
        <div className="mt-4 md:mt-8 md:ml-8 flex flex-col justify-center w-full md:w-1/2">
          <h1 className="text-[#2484C2] font-semibold text-sm md:text-base mb-2">
            ----- THE BEST PLACE TO PLAY
          </h1>
          <p className="text-2xl md:text-4xl font-bold mb-2">Xbox Consoles</p>
          <p className="text-base md:text-xl text-gray-800 mt-3 mb-4">
            Save up to 50% on select Xbox games. Get 3 months of PC Game Pass
            for Rs.2 USD.
          </p>
          <Link to="/products"
  className="mt-6 bg-[#dcfe50] w-41 hover:bg-lime-300 text-black font-semibold px-6 py-2 rounded flex items-center gap-2 text-sm sm:text-base transition"
>
  SHOP NOW <FaArrowRight size={16} />
</Link>
        </div>

        {/* Image */}
        <div className="relative flex justify-center items-center mt-6 md:mt-0 w-full md:w-1/2">
          <img
            src={cpugaming}
            alt="Xbox Console"
            className="w-56 sm:w-64 md:w-72 lg:w-80"
          />
          <div className="absolute top-[10vw] left-[10vw] bg-[#dcfe50] font-semibold rounded-full px-3 py-1 text-xs shadow border-4 border-white">
            Rs. 200
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-col gap-4 w-full lg:w-[40%]">
        {/* Google Pixel Box */}
        <div className="bg-[#191C1F] rounded overflow-hidden p-4 flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left w-full md:w-1/2">
            <h1 className="text-[#EBC80C] text-lg md:text-2xl">SUMMER SALES</h1>
            <p className="text-white text-xl md:text-3xl mt-3">
              New Google <br /> Pixel 6 Pro
            </p>
            <Link to="/products"
             className="mt-6 bg-[#dcfe50] w-41 hover:bg-lime-300 text-black font-semibold px-6 py-2 rounded flex items-center gap-2 text-sm sm:text-base transition"
           >
             SHOP NOW <FaArrowRight size={16} />
           </Link>
          </div>
          <div className="relative mt-4 md:mt-0 w-full md:w-1/2 flex justify-center">
            <div className="absolute top-[5%]  sm:left-[5%] bg-[#EFD33D] text-xs font-bold px-3 py-1 rounded">
              29% OFF
            </div>
            <img
              src={mobileright}
              alt="Pixel"
              className="w-32 sm:w-40 md:w-48"
            />
          </div>
        </div>

        {/* Earbuds Box */}
        <div className="bg-[#f2f4f5] rounded p-4 flex flex-col md:flex-row items-center justify-between shadow">
          <div className="w-full md:w-1/2 mb-4 md:mb-0">
            <img
              src={earbuds}
              alt="Xiaomi FlipBuds Pro"
              className="w-full object-contain"
            />
          </div>
          <div className="w-full md:w-1/2 pl-0 md:pl-6 text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
              Xiaomi
            </h2>
            <h3 className="text-xl md:text-2xl font-semibold text-gray-900">
              FlipBuds Pro
            </h3>
            <p className="text-[#2da5f3] font-semibold mt-2">Rs. 299 USD</p>
             <Link to="/products"
              className="mt-6 bg-[#dcfe50] w-41 hover:bg-lime-300 text-black font-semibold px-6 py-2 rounded flex items-center gap-2 text-sm sm:text-base transition"
            >
              SHOP NOW <FaArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Xboxconsoles;
