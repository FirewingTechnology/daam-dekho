import React from 'react';
import { FiTrendingDown, FiShield, FiZap, FiDatabase, FiCheckCircle } from 'react-icons/fi';
import SEO from '../components/SEO';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 transition-colors duration-300">
      <SEO 
        title="About Us - DaamDekho Price Comparison Platform"
        description="Learn how DaamDekho tracks, normalizes, and compares prices across Amazon, Flipkart, Croma, and JioMart in real-time."
      />
      
      <div className="maxscreen screen-margin">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-primary/20 text-primary-dark dark:text-primary uppercase tracking-widest mb-4">
            About DaamDekho
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
            Smartest Price Tracking for Indian Shoppers
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            DaamDekho is an AI-powered price comparison engine that aggregates, normalizes, and matches millions of product listings across India's top e-commerce vendors in real-time.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary-dark dark:text-primary text-2xl mb-6">
              <FiTrendingDown />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Live Price Comparison</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              We monitor price changes every hour across Amazon, Flipkart, Croma, JioMart, and Vijay Sales so you never overpay.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 text-2xl mb-6">
              <FiDatabase />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Fuzzy Entity Resolution</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Our intelligent matcher automatically groups identical product variants across diverse vendor listings cleanly without duplicates.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-500 text-2xl mb-6">
              <FiShield />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">100% Verified Vendors</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              We only index official, authorized store listings with verified seller feedback and legitimate product warranties.
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 sm:p-12 border border-gray-100 dark:border-gray-800 shadow-sm mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            How DaamDekho Delivers Best Deals
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-black font-black flex items-center justify-center text-xl mb-4">1</div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">1. Real-Time Scraping</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">High-speed scrapers fetch live prices, stock status & ratings.</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-black font-black flex items-center justify-center text-xl mb-4">2</div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">2. Data Normalization</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Clean titles, hardware specs (RAM, Storage, Color) & pricing.</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-black font-black flex items-center justify-center text-xl mb-4">3</div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">3. Product Matching</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Links cross-vendor offers to single Master Variant entities.</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-black font-black flex items-center justify-center text-xl mb-4">4</div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">4. Smart Savings</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Displays price comparison table & historical trend graphs.</p>
            </div>
          </div>
        </div>

        {/* Guarantee Banner */}
        <div className="bg-gradient-to-r from-gray-900 to-black text-white p-8 sm:p-12 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h3 className="text-2xl sm:text-3xl font-black mb-2">Never Overpay Again</h3>
            <p className="text-gray-400 text-sm">Join thousands of smart Indian shoppers who save money every day with DaamDekho.</p>
          </div>
          <a href="/products" className="btn-primary text-black font-bold whitespace-nowrap">
            Compare Prices Now
          </a>
        </div>
      </div>
    </div>
  );
};

export default About;
