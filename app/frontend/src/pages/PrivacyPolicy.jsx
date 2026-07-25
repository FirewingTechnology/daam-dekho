import React from 'react';
import SEO from '../components/SEO';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 transition-colors duration-300">
      <SEO 
        title="Privacy Policy - DaamDekho"
        description="Privacy Policy for DaamDekho price comparison platform detailing data usage, cookies, and privacy rights."
      />
      
      <div className="maxscreen screen-margin max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 sm:p-12 border border-gray-100 dark:border-gray-800 shadow-sm">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-6">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: July 2026</p>

          <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Information We Collect</h2>
              <p>
                DaamDekho does not require users to create an account to perform price comparisons. We collect minimal telemetry such as IP address, browser user-agent, and search query keywords solely to prevent rate-limit abuse and improve search accuracy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Use of Cookies</h2>
              <p>
                We use local storage and essential cookies to store your UI preferences (such as Dark/Light mode theme choice and items added to your comparison drawer). We do not store personal identification tracking cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Third-Party Links & Affiliate Disclosure</h2>
              <p>
                DaamDekho provides direct links to third-party vendor stores (Amazon, Flipkart, Croma, JioMart, Vijay Sales). Clicking "Buy Now" or "Go to Deal" redirects you to the respective vendor website. We may earn an affiliate commission when purchases are completed on partner sites.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Security</h2>
              <p>
                We implement industry-standard encryption, rate-limiting, and security headers (CORS, Helmet, XSS sanitization) to protect all API traffic and infrastructure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Contact Information</h2>
              <p>
                If you have any questions regarding this Privacy Policy, please contact us at <a href="mailto:support@daamdekho.com" className="text-primary font-bold">support@daamdekho.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
