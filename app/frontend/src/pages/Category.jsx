import React from "react";
import { useParams, Link } from "react-router-dom";
import GridProducts from "../components/products/GridProducts";
import SEO from "../components/SEO";
import { FiSmartphone, FiTv, FiMonitor, FiHeadphones, FiTablet, FiGrid } from "react-icons/fi";


const categories = [
  { name: "Mobiles", queryCategory: "Mobile", slug: "mobiles", icon: <FiSmartphone />, desc: "Top Smartphones, 5G Phones & Accessories", bg: "from-blue-600 to-indigo-700" },
  { name: "Laptops", queryCategory: "Laptop", slug: "laptops", icon: <FiMonitor />, desc: "Gaming Laptops, Ultrabooks & MacBooks", bg: "from-purple-600 to-violet-800" },
  { name: "Tablets", queryCategory: "Tablets", slug: "tablets", icon: <FiTablet />, desc: "iPads, Android Tablets & Stylus Devices", bg: "from-pink-600 to-rose-700" },
  { name: "TVs", queryCategory: "TVs", slug: "tvs", icon: <FiTv />, desc: "Smart 4K OLED, QLED & Android Televisions", bg: "from-amber-500 to-orange-700" },
  { name: "Accessories", queryCategory: "Mobile Accessories", slug: "accessories", icon: <FiHeadphones />, desc: "TWS Earbuds, Headphones, Chargers & Cases", bg: "from-emerald-600 to-teal-800" },
];

const Category = () => {
  const { categorySlug } = useParams();
  const activeCategory = categories.find(c => c.slug === categorySlug?.toLowerCase()) || categories[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 transition-colors duration-300">
      <SEO 
        title={`${activeCategory.name} Price Comparison - DaamDekho`}
        description={`Compare prices for ${activeCategory.name} across Amazon, Flipkart, Croma & JioMart. Find lowest price deals on DaamDekho.`}
      />

      <div className="maxscreen screen-margin">
        {/* Category Hero Banner */}
        <div className={`bg-gradient-to-r ${activeCategory.bg} text-white rounded-3xl p-8 sm:p-12 mb-10 shadow-lg relative overflow-hidden`}>
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-widest mb-3">
              {activeCategory.icon} {activeCategory.name} Category
            </span>
            <h1 className="text-3xl sm:text-5xl font-black mb-4">
              Compare {activeCategory.name} Prices
            </h1>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              {activeCategory.desc}. We scan Amazon, Flipkart, Croma, and JioMart every hour to guarantee you get the best deal.
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-10 text-[180px] pointer-events-none">
            {activeCategory.icon}
          </div>
        </div>

        {/* Category Selector Pills */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-6 mb-8">
          {categories.map((cat) => {
            const isActive = cat.slug === activeCategory.slug;
            return (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 shadow-sm ${
                  isActive
                    ? "bg-primary text-black scale-105 shadow-md"
                    : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800"
                }`}
              >
                {cat.icon}
                <span>{cat.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Category Product Grid */}
        <GridProducts category={activeCategory.queryCategory || activeCategory.name} />
      </div>
    </div>
  );
};

export default Category;
