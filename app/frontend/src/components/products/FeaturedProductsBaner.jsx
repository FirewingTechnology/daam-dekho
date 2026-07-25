import React from "react";
import { watchImg } from "../../assets/ImportImages";

const FeaturedProductBaner = () => {
  return (
    <div className="hidden lg:block w-80 border-2 border-lime-300 rounded-md p-4 text-center">
      <img
        src={watchImg}
        alt="Apple Watch"
        className="w-48 h-48 mx-auto object-contain"
      />
      <div className="mt-4">
        <h2 className="text-black font-bold text-lg flex items-center justify-center gap-1">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
            alt="Apple"
            className="w-4 h-4"
          />
          WATCH
        </h2>
        <p className="text-red-500 tracking-wider text-sm font-semibold">
          SERIES 7
        </p>
        <p className="mt-2 font-medium text-gray-800">
          Heavy on Features. <br /> Light on Price.
        </p>
        <div className="flex gap-2 ml-10">
          <p className="mt-3 text-sm text-gray-600">Only for:</p>
          <p className="inline-block bg-yellow-300 text-black font-semibold px-3 py-1 rounded mt-1">
            Rs. 299 USD
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <button className="w-full bg-lime-300 hover:bg-lime-400 text-black font-bold py-2 px-4 rounded flex items-center justify-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m13-9l2 9M9 21h6"
              />
            </svg>
            ADD TO CART
          </button>

          <button className="w-full border-2 border-black text-black font-medium py-2 px-4 rounded flex items-center justify-center gap-2 hover:bg-gray-100">
            VIEW DETAILS
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeaturedProductBaner;
