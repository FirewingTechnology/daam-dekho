import React from "react";
import { FaChartLine, FaHistory, FaArrowDown, FaArrowUp, FaCheckCircle, FaInfoCircle } from "react-icons/fa";

const PriceHistorySection = ({ priceHistory = [], currentPrice = 0 }) => {
  const hasHistory = Array.isArray(priceHistory) && priceHistory.length > 1;

  // Calculate statistics if enough real data exists
  const prices = hasHistory ? priceHistory.map(h => Number(h.price)).filter(p => !isNaN(p) && p > 0) : [];
  const lowestPrice = prices.length ? Math.min(...prices) : currentPrice;
  const highestPrice = prices.length ? Math.max(...prices) : currentPrice;
  const latestPrice = prices.length ? prices[prices.length - 1] : currentPrice;

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mt-8">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FaChartLine size={16} />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 leading-tight">Price History & Monitoring</h2>
            <p className="text-xs text-gray-500 font-medium">Verified historical observations from real vendor pages</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          <FaCheckCircle size={12} />
          <span>Live Tracking Active</span>
        </div>
      </div>

      {!hasHistory ? (
        /* Empty / Single Observation Honest State */
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs text-slate-400">
            <FaHistory size={20} />
          </div>
          <h3 className="text-sm font-bold text-gray-800 mb-1">Building Historical Records</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            Price history will appear as more real price observations are collected. We only record verified price changes directly from vendor product pages.
          </p>
          {priceHistory.length === 1 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-700">
              <span className="text-gray-400">First Observation:</span>
              <span className="font-extrabold text-gray-900">₹{Number(priceHistory[0].price).toLocaleString('en-IN')}</span>
              <span className="text-gray-400">({new Date(priceHistory[0].recorded_at).toLocaleDateString('en-IN')})</span>
            </div>
          )}
        </div>
      ) : (
        /* Multi-Observation Timeline & Stats */
        <div className="space-y-6">
          {/* Key Metric Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Lowest Observed</span>
              <span className="text-xl font-black text-emerald-950 mt-0.5 block">₹{lowestPrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Current Price</span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">₹{latestPrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-rose-50/70 border border-rose-200/60 rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">Highest Observed</span>
              <span className="text-xl font-black text-rose-950 mt-0.5 block">₹{highestPrice.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Chronological Observation List */}
          <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-x-auto custom-scrollbar">
            <div className="min-w-[420px]">
              <div className="bg-gray-50 dark:bg-gray-800/80 px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider grid grid-cols-12">
                <span className="col-span-4">Date & Time</span>
                <span className="col-span-3">Vendor</span>
                <span className="col-span-3 text-right">Observed Price</span>
                <span className="col-span-2 text-right">Trend</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {priceHistory.map((entry, idx) => {
                  const prev = idx > 0 ? Number(priceHistory[idx - 1].price) : null;
                  const curr = Number(entry.price);
                  const diff = prev !== null ? curr - prev : 0;

                  return (
                    <div key={entry.id || idx} className="px-4 py-3 text-xs grid grid-cols-12 items-center hover:bg-slate-50/80 dark:hover:bg-gray-800/50 transition-colors">
                      <span className="col-span-4 text-gray-600 dark:text-gray-300 font-medium">
                        {new Date(entry.recorded_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="col-span-3 font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {entry.vendor_name || 'Vendor Offer'}
                      </span>
                      <span className="col-span-3 text-right font-black text-gray-900 dark:text-gray-100">
                        ₹{curr.toLocaleString('en-IN')}
                      </span>
                      <span className="col-span-2 text-right font-bold">
                        {diff < 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                            <FaArrowDown size={10} /> ₹{Math.abs(diff).toLocaleString('en-IN')}
                          </span>
                        ) : diff > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center justify-end gap-0.5">
                            <FaArrowUp size={10} /> ₹{diff.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceHistorySection;
