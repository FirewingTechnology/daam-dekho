import React from 'react';
import SEO from '../components/SEO';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 transition-colors duration-300">
      <SEO 
        title="Terms of Service - DaamDekho"
        description="Terms of Service and Conditions of Use for DaamDekho price comparison website."
      />
      
      <div className="maxscreen screen-margin max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 sm:p-12 border border-gray-100 dark:border-gray-800 shadow-sm">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-6">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: July 2026</p>

          <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using DaamDekho, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Pricing & Availability Disclaimer</h2>
              <p>
                Prices, product availability, MRP, ratings, and promotional offers displayed on DaamDekho are fetched in real-time or aggregated from public store listings. Final price and stock status are determined exclusively at checkout on the destination seller site (Amazon, Flipkart, Croma, JioMart).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Intellectual Property</h2>
              <p>
                Product trademarks, brand names, vendor logos, and product imagery belong to their respective owners. DaamDekho claims no ownership over third-party brand assets.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Limitation of Liability</h2>
              <p>
                DaamDekho shall not be liable for direct or indirect damages arising out of vendor fulfillment delays, merchant product defects, or pricing discrepancies on external e-commerce platforms.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
