import React from "react";
import { useNavigate } from "react-router-dom";
import { LuSmartphone, LuLaptop, LuHeadphones, LuArrowRight } from "react-icons/lu";
import {
  Amazon,
  Flipkart,
  Croma,
  VS,
  SamsungLogo,
  moreImg,
} from "../../assets/ImportImages";
import SearchBar from "./SearchBar";

const ComparePrices = () => {
  const navigate = useNavigate();

  const categories = [
    { icon: <LuSmartphone />, label: "Smartphones", route: "Mobile", color: "from-blue-500 to-indigo-600" },
    { icon: <LuLaptop />, label: "Laptops", route: "Laptop", color: "from-emerald-500 to-teal-600" },
    { icon: <LuHeadphones />, label: "Accessories", route: "Mobile Accessories", color: "from-orange-500 to-red-600" },
  ];

  const brands = [
    { src: Amazon, label: "Amazon" },
    { src: Flipkart, label: "Flipkart" },
    { src: Croma, label: "Croma" },
    { src: VS, label: "Vijay Sales" },
    { src: SamsungLogo, label: "Samsung" },
  ];

  return (
    <div className="relative z-30 bg-white pt-16 pb-24 md:pt-24 md:pb-32">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="maxscreen screen-margin flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-primary text-xs font-bold uppercase tracking-wider mb-8 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          Smart Price Comparison
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-gray-900 tracking-tight leading-[1.1] mb-6 animate-slide-up">
          Compare Prices. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500">
            Save Big.
          </span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-gray-600 mb-10 animate-slide-up [animation-delay:200ms]">
          Real-time price tracking across India's top retailers. 
          Find the absolute best deals on the latest tech in seconds.
        </p>

        {/* Search Component */}
        <div className="relative z-20 w-full max-w-3xl mb-16 animate-slide-up [animation-delay:400ms]">
          <SearchBar />
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-5xl animate-slide-up [animation-delay:600ms]">
          {categories.map(({ icon, label, route, color }, idx) => (
            <div
              key={idx}
              onClick={() => navigate("/products", { state: { category: route } })}
              className="group relative overflow-hidden rounded-3xl bg-gray-50 p-8 cursor-pointer border border-gray-100 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                {icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{label}</h3>
              <p className="text-sm text-gray-500 mb-4">Track prices from all major stores for {label.toLowerCase()}.</p>
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                Browse All <LuArrowRight className="group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* Trusted By Section */}
        <div className="mt-20 w-full animate-fade-in [animation-delay:800ms]">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] mb-8">Tracking Live Prices From</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 hover:opacity-100 transition-opacity duration-500">
            {brands.map(({ src, label }, index) => (
              <img 
                key={index}
                src={src} 
                alt={label} 
                className="h-6 md:h-8 w-auto grayscale hover:grayscale-0 transition-all duration-300 cursor-pointer"
                title={label}
              />
            ))}
            <div className="text-sm font-bold text-gray-400 flex items-center gap-1 cursor-pointer hover:text-black">
              & {moreImg ? "Many More" : "15+ More"} <LuArrowRight />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparePrices;
