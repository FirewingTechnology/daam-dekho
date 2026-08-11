import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FiTrash2, FiPlus, FiShare2, FiChevronDown, FiChevronUp, 
  FiZap, FiCpu, FiCamera, FiBattery, FiWifi, FiTv, FiSliders, FiDollarSign, FiStar, FiCopy, FiExternalLink
} from "react-icons/fi";

import { toast } from "react-toastify";
import { useCompare } from "../../contexts/CompareContext";
import SEO from "../SEO";

const TAB_OPTIONS = [
  { id: "all", label: "All Specs", icon: <FiZap /> },
  { id: "winner", label: "Quick Decision", icon: <FiSliders /> },
  { id: "performance", label: "Performance", icon: <FiCpu /> },
  { id: "display", label: "Display & Design", icon: <FiTv /> },
  { id: "camera", label: "Camera Specs", icon: <FiCamera /> },
  { id: "battery", label: "Battery & Power", icon: <FiBattery /> },
  { id: "connectivity", label: "Connectivity", icon: <FiWifi /> },
  { id: "offers", label: "Vendor Prices", icon: <FiDollarSign /> },
];

const parseSpecs = (specs) => {
  if (!specs) return {};
  if (typeof specs === 'object') return specs;
  if (typeof specs === 'string') {
    try { return JSON.parse(specs); } catch { return {}; }
  }
  return {};
};

const getSpecVal = (product, keys) => {
  if (!product) return "N/A";

  const specs = parseSpecs(product.specifications || product.specs);
  for (const k of keys) {
    if (specs[k] && String(specs[k]).trim() !== "" && String(specs[k]) !== "N/A") {
      return String(specs[k]);
    }
  }

  for (const k of keys) {
    if (product[k] && String(product[k]).trim() !== "" && String(product[k]) !== "N/A") {
      return String(product[k]);
    }
  }

  if (product.variants && Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      if (!variant) continue;
      for (const k of keys) {
        if (variant[k] && String(variant[k]).trim() !== "" && String(variant[k]) !== "N/A") {
          return String(variant[k]);
        }
      }
      const vSpecs = parseSpecs(variant.specs || variant.specifications);
      for (const k of keys) {
        if (vSpecs[k] && String(vSpecs[k]).trim() !== "" && String(vSpecs[k]) !== "N/A") {
          return String(vSpecs[k]);
        }
      }
    }
  }

  return "N/A";
};

const getLowestPrice = (product) => {
  if (!product) return 0;
  if (product.vendors && typeof product.vendors === 'object') {
    const prices = Object.values(product.vendors)
      .map(v => parseFloat(String(v.discounted_price || v.discounted_Price || v.price || 0).replace(/[^\d.]/g, '')))
      .filter(p => p > 0);
    if (prices.length > 0) return Math.min(...prices);
  }
  const mainPrice = parseFloat(String(product.discounted_Price || product.price || 0).replace(/[^\d.]/g, ''));
  return mainPrice || 0;
};

const getMRP = (product) => {
  if (!product) return 0;
  const mrp = parseFloat(String(product.mrp || product.price || 0).replace(/[^\d.]/g, ''));
  return mrp || getLowestPrice(product);
};

const SpecRow = React.memo(({ label, keys, products, highlightDiff, highlightBest, icon: Icon }) => {
  const values = products.map(p => getSpecVal(p, keys));
  const validValues = values.filter(v => v !== "N/A");
  
  if (validValues.length === 0) return null;

  const isDifferent = validValues.length > 1 && new Set(validValues).size > 1;
  if (highlightDiff && !isDifferent) return null;

  return (
    <tr className={`border-b border-gray-200 dark:border-gray-800/80 transition-colors ${
      isDifferent ? "bg-blue-50/40 dark:bg-blue-950/20" : "hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
    }`}>
      <td className="py-3 px-4 text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-950 sticky left-0 z-20 border-r border-gray-200 dark:border-gray-800 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-1.5 truncate">
            {Icon && <Icon className="text-primary-dark dark:text-primary shrink-0 text-sm" />}
            <span className="truncate">{label}</span>
          </span>
          {isDifferent && (
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded shrink-0">
              Differs
            </span>
          )}
        </div>
      </td>
      {products.map((product, idx) => {
        const val = values[idx];
        const isBest = highlightBest && val !== "N/A" && (
          val.includes("12GB") || val.includes("16GB") || val.includes("24GB") || val.includes("512GB") || val.includes("1TB") || val.includes("2TB") || val.includes("5000mAh")
        );

        return (
          <td 
            key={product._id || product.id || idx} 
            className="py-3 px-4 text-xs text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-800 text-center font-medium"
          >
            <span className={`inline-block px-2.5 py-1 rounded-lg max-w-full break-words ${
              isBest 
                ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold border border-green-300 dark:border-green-800" 
                : val === "N/A" 
                ? "text-gray-400 dark:text-gray-600 italic" 
                : isDifferent 
                ? "text-gray-900 dark:text-white font-bold" 
                : "text-gray-700 dark:text-gray-300"
            }`}>
              {val}
            </span>
          </td>
        );
      })}
    </tr>
  );
});

const ModernCompareView = ({ products: initialProducts, onRemove }) => {
  const navigate = useNavigate();
  const { compareList, removeFromCompare, clearCompare } = useCompare();

  const products = useMemo(() => {
    const rawList = initialProducts && initialProducts.length > 0 ? initialProducts : compareList;
    const seenMasterIds = new Set();
    const uniqueList = [];
    for (const p of rawList) {
      if (!p) continue;
      const masterId = String(p._id || p.id || p.product_id || p.slug || "").trim().toLowerCase();
      if (masterId && !seenMasterIds.has(masterId)) {
        seenMasterIds.add(masterId);
        uniqueList.push(p);
      }
    }
    return uniqueList;
  }, [initialProducts, compareList]);

  const [activeTab, setActiveTab] = useState("all");
  const [highlightDiff, setHighlightDiff] = useState(false);
  const highlightBest = true;
  const [expandedSections, setExpandedSections] = useState({
    winner: true,
    overview: true,
    performance: true,
    display: true,
    camera: true,
    battery: true,
    connectivity: true,
    offers: true,
  });

  const toggleSection = (sec) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Comparison link copied to clipboard!");
    }
  };

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-28 sm:pt-32 pb-24 flex flex-col items-center justify-center text-center px-4">
        <SEO title="Compare Products - DaamDekho" description="Side by side product specifications & live price comparison." />
        <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center text-primary-dark dark:text-primary text-3xl mb-6 shadow-md border border-primary/30">
          <FiSliders />
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">No Products Selected for Comparison</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md text-xs sm:text-sm mb-8 leading-relaxed">
          Add up to 4 products to compare detailed specifications, display quality, performance, camera specs & live prices side-by-side across India's top vendors.
        </p>
        <Link to="/products" className="btn-primary text-black font-extrabold px-8 py-3.5 text-sm sm:text-base rounded-full shadow-lg active:scale-95 transition-all">
          Browse & Add Products →
        </Link>
      </div>
    );
  }

  const cheapestPriceInGroup = Math.min(...products.map(p => getLowestPrice(p)).filter(p => p > 0));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-24 sm:pt-28 pb-28 transition-colors duration-300">
      <SEO title={`Comparing ${products.length} Products - DaamDekho`} description="Side-by-side specification comparison and live price matrix." />

      <div className="maxscreen screen-margin">
        {/* 1 Product Prompt Banner */}
        {products.length === 1 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-amber-600 dark:text-amber-400 text-xl font-bold">💡</span>
              <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                You have selected <span className="font-extrabold">{products[0].title || '1 product'}</span>. Add at least 1 more product to unlock side-by-side spec comparison.
              </p>
            </div>
            <Link to="/products" className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shrink-0 active:scale-95 transition-all shadow-sm">
              + Add More Products
            </Link>
          </div>
        )}
        
        {/* Breadcrumb Navigation & Controls */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 font-bold">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-primary-dark transition"
            >
              ← Back
            </button>
            <span>/</span>
            <Link to="/" className="hover:text-primary-dark transition">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-primary-dark transition">Products</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-extrabold">Compare</span>
          </div>

          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition font-bold"
          >
            🏠 Home
          </button>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary-dark dark:text-primary text-xs font-black uppercase tracking-wider">
                Compare Matrix
              </span>
              <span className="text-xs text-gray-500 font-bold">{products.length} of 4 Products Selected</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              Side-by-Side Product Comparison
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setHighlightDiff(!highlightDiff)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                highlightDiff
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-primary"
              }`}
            >
              <span>{highlightDiff ? "✓ Showing Differences Only" : "Highlight Differences"}</span>
            </button>

            <button
              onClick={clearCompare}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all"
            >
              <FiTrash2 /> Clear All
            </button>
          </div>
        </div>


        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-6 border-b border-gray-200 dark:border-gray-800">
          {TAB_OPTIONS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary text-black shadow-md scale-105"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Mobile Swipe Hint */}
        <div className="md:hidden flex items-center justify-between text-xs text-blue-700 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-4 py-2.5 rounded-2xl mb-4 font-bold">
          <span>👈 Swipe horizontally to compare products</span>
          <span className="text-[10px] bg-blue-200 dark:bg-blue-900 px-2 py-0.5 rounded-full uppercase">Scroll</span>
        </div>

        {/* UNIFIED COMPARISON MATRIX TABLE */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <colgroup>
                {/* Left Column: Spec Label Column */}
                <col className="w-56 min-w-[220px]" />
                {/* Product Columns */}
                {products.map((_, idx) => (
                  <col key={idx} className="w-64 min-w-[240px]" />
                ))}
              </colgroup>

              {/* TABLE HEADER: Product Cards Row */}
              <thead>
                <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                  {/* Top-Left Corner Header Cell */}
                  <th className="p-4 bg-gray-100 dark:bg-gray-950 sticky left-0 z-30 border-r border-b border-gray-200 dark:border-gray-800 align-top shadow-[4px_0_12px_-3px_rgba(0,0,0,0.15)]">
                    <div className="flex flex-col justify-between h-full min-h-[220px]">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary-dark dark:text-primary font-black shadow-sm">
                            <FiSliders className="text-base" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white tracking-wider">
                              Compare Specs
                            </h4>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold block">
                              {products.length} Products
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-normal mt-2 hidden sm:block">
                          Full specification matrix & vendor live pricing.
                        </p>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-800 mt-auto">
                        <button
                          onClick={() => setHighlightDiff(!highlightDiff)}
                          className={`w-full py-2 px-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
                            highlightDiff
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-primary"
                          }`}
                        >
                          <span>{highlightDiff ? "✓ Showing Diff" : "Highlight Differences"}</span>
                        </button>
                      </div>
                    </div>
                  </th>

                  {/* Product Cards Columns */}
                  {products.map((product, idx) => {
                    const lowestPrice = getLowestPrice(product);
                    const mrp = getMRP(product);
                    const discount = mrp > lowestPrice ? Math.round(((mrp - lowestPrice) / mrp) * 100) : 0;
                    const isBestValue = lowestPrice > 0 && lowestPrice === cheapestPriceInGroup;

                    return (
                      <th key={product._id || product.id || idx} className="p-4 border-r border-gray-200 dark:border-gray-800 align-top">
                        <div className="relative group flex flex-col items-center text-center h-full min-h-[220px]">
                          
                          <button
                            onClick={() => {
                              if (onRemove) onRemove(product);
                              removeFromCompare(product._id || product.id);
                            }}
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs font-bold transition-all"
                            title="Remove product"
                          >
                            ✕
                          </button>

                          {isBestValue && (
                            <span className="mb-2 bg-green-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                              Best Value
                            </span>
                          )}

                          <img
                            src={product.base_image || product.image || product.image_url || product.image?.thumbnail || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80"}
                            alt={product.title}
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 object-contain mb-2 hover:scale-105 transition-transform"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80';
                            }}
                          />

                          <Link to={`/product/${product.product_id || product.id || product._id}`} title={product.title || product.name}>
                            <h3 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-2 hover:text-primary transition-colors leading-snug mb-1.5">
                              {product.title || product.name}
                            </h3>
                          </Link>

                          <div className="flex items-center justify-center gap-1 text-xs text-amber-500 font-bold mb-2">
                            <FiStar className="fill-amber-400" />
                            <span>{product.rating || 4.5}</span>
                            <span className="text-gray-400 font-normal">({product.review_count || 120})</span>
                          </div>

                          <div className="mt-auto pt-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="text-sm sm:text-base font-black text-green-600 dark:text-green-400">
                                ₹{lowestPrice > 0 ? lowestPrice.toLocaleString("en-IN") : "N/A"}
                              </span>
                              {discount > 0 && (
                                <span className="text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-950/50 px-1.5 py-0.5 rounded">
                                  {discount}% OFF
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody>

                {/* 10-SECOND QUICK DECISION MATRIX SECTION */}
                {(activeTab === "all" || activeTab === "winner") && (
                  <>
                    <tr className="bg-gradient-to-r from-blue-50/80 via-purple-50/80 to-pink-50/80 dark:from-blue-950/40 dark:via-purple-950/40 dark:to-pink-950/40 border-y border-gray-200 dark:border-gray-800">
                      <td colSpan={products.length + 1} className="py-3 px-4">
                        <button onClick={() => toggleSection("winner")} className="flex items-center justify-between w-full font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                            ⚡ Quick Buying Decision Matrix (10-Second Winner Summary)
                          </span>
                          {expandedSections.winner ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {expandedSections.winner && (
                      <>
                        <SpecRow label="Lowest Price" keys={["discounted_Price", "price"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiDollarSign} />
                        <SpecRow label="Rating Score" keys={["rating", "Rating"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiStar} />
                        <SpecRow label="Processor Chipset" keys={["processor", "Processor", "Cpu"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiCpu} />
                        <SpecRow label="RAM Capacity" keys={["ram", "RAM", "Ram"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiCpu} />
                        <SpecRow label="Internal Storage" keys={["storage", "Storage", "rom", "ROM"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiZap} />
                        <SpecRow label="Display Resolution" keys={["display", "Display", "screen_size"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiTv} />
                        <SpecRow label="Battery Capacity" keys={["battery", "Battery"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiBattery} />
                      </>
                    )}
                  </>
                )}

                {/* OVERVIEW ACCORDION */}
                {(activeTab === "all" || activeTab === "overview") && (
                  <>
                    <tr className="bg-gray-100 dark:bg-gray-800/80 border-y border-gray-200 dark:border-gray-800">
                      <td colSpan={products.length + 1} className="py-3 px-4">
                        <button onClick={() => toggleSection("overview")} className="flex items-center justify-between w-full font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                          <span className="flex items-center gap-2"><FiZap className="text-primary-dark dark:text-primary" /> Key Overview & Identification</span>
                          {expandedSections.overview ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {expandedSections.overview && (
                      <>
                        <SpecRow label="Brand Name" keys={["brand", "Brand"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} />
                        <SpecRow label="Category" keys={["category", "Category", "subcategory"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} />
                        <SpecRow label="RAM Memory" keys={["ram", "RAM", "Ram"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} />
                        <SpecRow label="Internal Storage" keys={["storage", "Storage", "rom", "ROM"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} />
                        <SpecRow label="Processor Model" keys={["processor", "Processor", "Cpu"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} />
                        <SpecRow label="Battery Capacity" keys={["battery", "Battery"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} />
                      </>
                    )}
                  </>
                )}

                {/* PERFORMANCE ACCORDION */}
                {(activeTab === "all" || activeTab === "performance") && (
                  <>
                    <tr className="bg-gray-100 dark:bg-gray-800/80 border-y border-gray-200 dark:border-gray-800">
                      <td colSpan={products.length + 1} className="py-3 px-4">
                        <button onClick={() => toggleSection("performance")} className="flex items-center justify-between w-full font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                          <span className="flex items-center gap-2"><FiCpu className="text-blue-500" /> Performance & Hardware Specs</span>
                          {expandedSections.performance ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {expandedSections.performance && (
                      <>
                        <SpecRow label="RAM Capacity" keys={["ram", "RAM", "Ram"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiCpu} />
                        <SpecRow label="Storage Capacity" keys={["storage", "Storage", "rom", "ROM"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiZap} />
                        <SpecRow label="Processor Chipset" keys={["processor", "Processor", "Cpu"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiCpu} />
                        <SpecRow label="Operating System" keys={["os", "Operating System", "OS"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} />
                      </>
                    )}
                  </>
                )}

                {/* DISPLAY ACCORDION */}
                {(activeTab === "all" || activeTab === "display") && (
                  <>
                    <tr className="bg-gray-100 dark:bg-gray-800/80 border-y border-gray-200 dark:border-gray-800">
                      <td colSpan={products.length + 1} className="py-3 px-4">
                        <button onClick={() => toggleSection("display")} className="flex items-center justify-between w-full font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                          <span className="flex items-center gap-2"><FiTv className="text-purple-500" /> Display Quality & Form Factor</span>
                          {expandedSections.display ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {expandedSections.display && (
                      <>
                        <SpecRow label="Display Resolution" keys={["display", "Display", "screen_size"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiTv} />
                        <SpecRow label="Color Variant" keys={["color", "Color"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} />
                      </>
                    )}
                  </>
                )}

                {/* CAMERA ACCORDION */}
                {(activeTab === "all" || activeTab === "camera") && (
                  <>
                    <tr className="bg-gray-100 dark:bg-gray-800/80 border-y border-gray-200 dark:border-gray-800">
                      <td colSpan={products.length + 1} className="py-3 px-4">
                        <button onClick={() => toggleSection("camera")} className="flex items-center justify-between w-full font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                          <span className="flex items-center gap-2"><FiCamera className="text-emerald-500" /> Camera Setup</span>
                          {expandedSections.camera ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {expandedSections.camera && (
                      <>
                        <SpecRow label="Main Camera Specs" keys={["camera", "Camera", "rear_camera"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiCamera} />
                      </>
                    )}
                  </>
                )}

                {/* BATTERY ACCORDION */}
                {(activeTab === "all" || activeTab === "battery") && (
                  <>
                    <tr className="bg-gray-100 dark:bg-gray-800/80 border-y border-gray-200 dark:border-gray-800">
                      <td colSpan={products.length + 1} className="py-3 px-4">
                        <button onClick={() => toggleSection("battery")} className="flex items-center justify-between w-full font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                          <span className="flex items-center gap-2"><FiBattery className="text-amber-500" /> Battery & Power Management</span>
                          {expandedSections.battery ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {expandedSections.battery && (
                      <>
                        <SpecRow label="Battery Capacity" keys={["battery", "Battery"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiBattery} />
                      </>
                    )}
                  </>
                )}

                {/* CONNECTIVITY ACCORDION */}
                {(activeTab === "all" || activeTab === "connectivity") && (
                  <>
                    <tr className="bg-gray-100 dark:bg-gray-800/80 border-y border-gray-200 dark:border-gray-800">
                      <td colSpan={products.length + 1} className="py-3 px-4">
                        <button onClick={() => toggleSection("connectivity")} className="flex items-center justify-between w-full font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                          <span className="flex items-center gap-2"><FiWifi className="text-cyan-500" /> Connectivity & Ports</span>
                          {expandedSections.connectivity ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {expandedSections.connectivity && (
                      <>
                        <SpecRow label="Network & 5G" keys={["network", "5G", "connectivity"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} icon={FiWifi} />
                        <SpecRow label="Wi-Fi / Bluetooth" keys={["wifi", "bluetooth"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} />
                        <SpecRow label="USB Ports" keys={["usb", "ports", "USB"]} products={products} highlightDiff={highlightDiff} highlightBest={highlightBest} />
                      </>
                    )}
                  </>
                )}

                {/* VENDOR PRICES MATRIX ACCORDION */}
                {(activeTab === "all" || activeTab === "offers") && (
                  <>
                    <tr className="bg-gray-100 dark:bg-gray-800/80 border-y border-gray-200 dark:border-gray-800">
                      <td colSpan={products.length + 1} className="py-3 px-4">
                        <button onClick={() => toggleSection("offers")} className="flex items-center justify-between w-full font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                          <span className="flex items-center gap-2"><FiDollarSign className="text-green-500" /> Live Vendor Price Matrix</span>
                          {expandedSections.offers ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {expandedSections.offers && (
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <td className="py-3 px-4 text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-950 sticky left-0 z-20 border-r border-gray-200 dark:border-gray-800 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.12)]">
                          <div className="flex items-center gap-1.5">
                            <FiDollarSign className="text-green-500 text-sm" />
                            <span>Vendor Store Links</span>
                          </div>
                        </td>
                        {products.map((product, idx) => {
                          const getVendorLink = (v) => {
                            if (!v) return null;
                            const raw = v.url || v.product_url || v.product_link || v.link || v.affiliatelink;
                            if (!raw || typeof raw !== 'string') return null;
                            const trimmed = raw.trim();
                            if (!trimmed || trimmed === '#' || trimmed === 'N/A') return null;
                            return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
                          };

                          const vendors = product.vendors && typeof product.vendors === 'object'
                            ? Object.entries(product.vendors).map(([name, vData]) => ({
                                name: name.charAt(0).toUpperCase() + name.slice(1),
                                price: vData.discounted_price || vData.discounted_Price || vData.price || 0,
                                link: getVendorLink(vData)
                              })).filter(v => v.price > 0 || v.link)
                            : [];

                          return (
                            <td key={product._id || product.id || idx} className="p-3 border-r border-gray-200 dark:border-gray-800 text-center align-top">
                              <div className="flex flex-col items-center gap-2">
                                {vendors.length > 0 ? (
                                  vendors.map((v, vIdx) => (
                                    v.link ? (
                                      <a
                                        key={vIdx}
                                        href={v.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-1 px-2 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500 hover:text-white border border-green-500/20 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between gap-1"
                                      >
                                        <span>{v.name}</span>
                                        <FiExternalLink className="text-[10px] shrink-0" />
                                      </a>
                                    ) : (
                                      <div key={vIdx} className="w-full py-1 px-2 text-[10px] text-gray-500 border border-gray-200 dark:border-gray-800 rounded-lg">
                                        {v.name}: ₹{Number(v.price).toLocaleString("en-IN")}
                                      </div>

                                    )
                                  ))
                                ) : (
                                  <Link
                                    to={`/product/${product.product_id || product.id || product._id}`}
                                    className="w-full py-1.5 px-3 bg-primary text-black font-bold text-xs rounded-xl hover:bg-primary-dark transition-colors flex items-center justify-center gap-1 shadow-sm"
                                  >
                                    <span>View Product</span>
                                    <FiExternalLink className="text-xs" />
                                  </Link>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </>
                )}

              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating Bottom Toolbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/90 dark:bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl flex items-center gap-4 text-white">
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span>{products.length} Products Compared</span>
        </div>

        <div className="h-4 w-px bg-white/20" />

        <Link to="/products" className="btn-primary text-black font-bold py-1.5 px-4 text-xs flex items-center gap-1.5">
          <FiPlus /> Add Product
        </Link>

        <button onClick={handleShare} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" title="Share Comparison Link">
          <FiShare2 size={14} />
        </button>

        <button onClick={handleShare} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" title="Copy Link">
          <FiCopy size={14} />
        </button>
      </div>
    </div>
  );
};

export default ModernCompareView;
