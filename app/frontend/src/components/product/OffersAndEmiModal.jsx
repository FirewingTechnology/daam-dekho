import React, { useState } from "react";
import { 
  FaTimes, FaCreditCard, FaBolt, FaExchangeAlt, 
  FaGift, FaCheck, FaCopy, FaTag, FaShieldAlt, 
  FaTruck, FaCalculator, FaChevronRight 
} from "react-icons/fa";
import { toast } from "react-toastify";

const OffersAndEmiModal = ({ isOpen, onClose, vendorName, vendorLogo, price, offersDetail }) => {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [selectedTenureMonths, setSelectedTenureMonths] = useState(3);
  const [copiedCode, setCopiedCode] = useState(null);

  if (!isOpen || !offersDetail) return null;

  const numericPrice = Number(price || 0);

  // EMI & Offers data extraction
  const emiData = offersDetail.emi || {};
  const bankOffers = offersDetail.bank_offers || [];
  const exchangeOffers = offersDetail.exchange_offers || [];
  const cashbackOffers = offersDetail.cashback_offers || [];
  const coupons = offersDetail.coupons || [];
  const tenures = emiData.tenures || [];
  const eligibleBanks = Array.isArray(emiData.eligible_banks) ? emiData.eligible_banks : [];

  // Handle coupon copy
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code '${code}' copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  // Find tenure calculation for calculator
  const activeTenure = tenures.find(t => t.months === Number(selectedTenureMonths)) || tenures[0] || {
    months: 3,
    monthly: Math.ceil(numericPrice / 3),
    total_cost: Math.ceil(numericPrice),
    interest_rate: 0,
    is_no_cost: true
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="bg-white w-full max-w-4xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[90vh] border border-gray-100 transform transition-all duration-300 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-2 sm:hidden flex-shrink-0" />

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 text-white px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {vendorLogo && (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white p-1 flex items-center justify-center shadow-md flex-shrink-0">
                <img src={vendorLogo} alt={vendorName} className="max-h-full max-w-full object-contain" />
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-xl font-bold tracking-tight">
                {vendorName} Offers & EMI Plans
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-300 font-medium">
                Live price: <span className="text-green-400 font-bold text-xs sm:text-sm ml-1">₹{numericPrice.toLocaleString('en-IN')}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors flex-shrink-0 min-touch-target"
            aria-label="Close modal"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto no-scrollbar bg-gray-50 border-b border-gray-200 px-3 sm:px-4 pt-2.5 gap-1.5 sm:gap-2 flex-shrink-0">
          {[
            { id: "all", label: "All Offers", icon: <FaTag size={12} /> },
            { id: "emi", label: "⚡ EMI Plans", icon: <FaBolt size={12} /> },
            { id: "bank", label: "💳 Bank Offers", icon: <FaCreditCard size={12} /> },
            { id: "exchange", label: "🔄 Exchange", icon: <FaExchangeAlt size={12} /> },
            { id: "cashback", label: "🎁 Cashback", icon: <FaGift size={12} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-t-xl font-semibold text-xs whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 border-blue-600 shadow-sm"
                  : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 custom-scrollbar">
          
          {/* TAB 1: EMI & NO COST EMI */}
          {(activeTab === "all" || activeTab === "emi") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-amber-500">⚡</span> Monthly EMI Plans & Calculator
                </h3>
                {emiData.is_no_cost_emi && (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping"></span>
                    0% No-Cost EMI Available
                  </span>
                )}
              </div>

              {/* Interactive EMI Calculator Card */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-indigo-900/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-indigo-800/50">
                  <div className="flex items-center gap-2">
                    <FaCalculator className="text-amber-400" size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider text-indigo-200">Interactive EMI Calculator</span>
                  </div>

                  {/* Bank Selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-indigo-300 font-medium">Select Bank:</label>
                    <select 
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="bg-indigo-900/80 text-white border border-indigo-700 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {eligibleBanks.map(b => (
                        <option key={b} value={b} className="bg-slate-900 text-white">{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tenure Selector Tabs */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 my-4">
                  {tenures.map(t => (
                    <button
                      key={t.months}
                      onClick={() => setSelectedTenureMonths(t.months)}
                      className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${
                        selectedTenureMonths === t.months
                          ? "bg-amber-400 text-slate-950 font-black shadow-lg scale-105"
                          : "bg-indigo-900/40 text-indigo-200 hover:bg-indigo-900/80 border border-indigo-800/40"
                      }`}
                    >
                      <span className="text-xs uppercase font-extrabold">{t.months} Months</span>
                      <span className="text-[10px] opacity-80 mt-0.5">
                        {t.is_no_cost ? "0% Interest" : `${t.interest_rate}% p.a.`}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Calculation Summary Box */}
                <div className="bg-indigo-900/50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-700/50">
                  <div>
                    <span className="text-xs text-indigo-300 font-medium">Monthly Installment ({selectedBank})</span>
                    <div className="text-3xl font-black text-amber-400">
                      ₹{activeTenure.monthly.toLocaleString('en-IN')}<span className="text-sm font-semibold text-indigo-200">/mo</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right sm:border-l sm:border-indigo-800 sm:pl-6">
                    <div>
                      <span className="text-[10px] text-indigo-300 block">Total Amount Paid</span>
                      <span className="text-sm font-bold text-white">₹{activeTenure.total_cost.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-300 block">Interest Charge</span>
                      <span className={`text-sm font-bold ${activeTenure.is_no_cost ? 'text-emerald-400' : 'text-amber-300'}`}>
                        {activeTenure.is_no_cost ? "₹0 (NO COST)" : `+₹${(activeTenure.total_cost - numericPrice).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tenure Table View */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 font-bold uppercase">
                    <tr>
                      <th className="px-4 py-3">Tenure</th>
                      <th className="px-4 py-3">Monthly Payment</th>
                      <th className="px-4 py-3">Interest Rate</th>
                      <th className="px-4 py-3">Total Payable</th>
                      <th className="px-4 py-3">Offer Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white font-medium">
                    {tenures.map((t, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-900">{t.months} Months</td>
                        <td className="px-4 py-3 font-extrabold text-blue-700">₹{t.monthly.toLocaleString('en-IN')}/mo</td>
                        <td className="px-4 py-3 text-gray-600">{t.is_no_cost ? "0% (No Interest)" : `${t.interest_rate}% p.a.`}</td>
                        <td className="px-4 py-3 text-gray-900">₹{t.total_cost.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">
                          {t.is_no_cost ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              No Cost EMI
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-700 text-[10px] font-medium px-2 py-0.5 rounded">
                              Standard EMI
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: BANK OFFERS */}
          {(activeTab === "all" || activeTab === "bank") && bankOffers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="text-blue-600">💳</span> Instant Bank & Card Discounts
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bankOffers.map((offer, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 hover:border-blue-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <FaCreditCard size={10} />
                          {offer.bank}
                        </span>
                        {offer.badge && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            {offer.badge}
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-gray-900 text-sm mb-1">{offer.title}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed mb-3">{offer.description}</p>
                    </div>

                    {offer.code && (
                      <div className="pt-3 border-t border-blue-100 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-gray-500">
                          Use Code: <span className="font-mono font-bold text-gray-800">{offer.code}</span>
                        </span>
                        <button 
                          onClick={() => handleCopyCode(offer.code)}
                          className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-blue-200 shadow-xs"
                        >
                          {copiedCode === offer.code ? <FaCheck className="text-green-600" /> : <FaCopy />}
                          {copiedCode === offer.code ? "Copied" : "Copy Code"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: EXCHANGE OFFERS */}
          {(activeTab === "all" || activeTab === "exchange") && exchangeOffers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">🔄</span> Exchange Bonus & Trade-In
              </h3>

              {exchangeOffers.map((ex, idx) => (
                <div key={idx} className="p-5 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      {ex.badge || "Exchange Offer"}
                    </span>
                    <h4 className="text-base font-extrabold text-gray-900">{ex.title}</h4>
                    <p className="text-xs text-gray-600 max-w-xl">{ex.description}</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-purple-200 text-center flex-shrink-0 min-w-[140px]">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Max Savings</span>
                    <span className="text-lg font-black text-purple-700">₹{Number(ex.max_discount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: CASHBACK & COUPONS */}
          {(activeTab === "all" || activeTab === "cashback") && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="text-emerald-600">🎁</span> Cashback, Wallet & Extra Checkout Coupons
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cashback */}
                {cashbackOffers.map((cb, idx) => (
                  <div key={`cb_${idx}`} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded uppercase">Cashback</span>
                    <h4 className="font-bold text-gray-900 text-sm mt-1">{cb.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{cb.description}</p>
                  </div>
                ))}

                {/* Coupons */}
                {coupons.map((cp, idx) => (
                  <div key={`cp_${idx}`} className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded uppercase">Instant Coupon</span>
                      <h4 className="font-bold text-gray-900 text-sm mt-1">{cp.title}</h4>
                      <p className="text-xs text-gray-600">{cp.description}</p>
                    </div>

                    <button
                      onClick={() => handleCopyCode(cp.code)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all flex-shrink-0"
                    >
                      {copiedCode === cp.code ? <FaCheck /> : <FaCopy />}
                      {copiedCode === cp.code ? "COPIED" : cp.code}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1"><FaShieldAlt className="text-green-600" /> Verified Vendor Rates</span>
            <span className="flex items-center gap-1"><FaTruck className="text-blue-600" /> Free Delivery Eligible</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};

export default OffersAndEmiModal;
