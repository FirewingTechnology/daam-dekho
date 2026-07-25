import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaInstagram, FaFacebookF, FaYoutube } from "react-icons/fa";
import { useFooterVisible } from "../constants/footerContext";
import { toast } from "react-toastify";

const Footer = () => {
  const { footerRef } = useFooterVisible();
  const [email, setEmail] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    toast.success("Subscribed to DaamDekho price drop alerts!");
    setEmail("");
  };

  return (
    <footer className="footer bg-[#111] dark:bg-black pt-12 pb-6 border-t border-white/10" ref={footerRef}>
      <div className="maxscreen screen-margin grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand Info */}
        <div className="md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-black text-base">
              D
            </div>
            <span className="text-white text-lg font-black tracking-tight">DaamDekho</span>
          </Link>
          <p className="text-gray-400 text-xs leading-relaxed">
            Compare Prices. Track Price History. Save Big on Every Purchase across India's top vendors.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white font-bold text-sm mb-3">Explore</h4>
          <ul className="flex flex-col gap-2 text-xs text-gray-400">
            <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li><Link to="/products" className="hover:text-primary transition-colors">All Products</Link></li>
            <li><Link to="/category" className="hover:text-primary transition-colors">Categories</Link></li>
            <li><Link to="/compare" className="hover:text-primary transition-colors">Compare Deals</Link></li>
          </ul>
        </div>

        {/* Company Links */}
        <div>
          <h4 className="text-white font-bold text-sm mb-3">Company</h4>
          <ul className="flex flex-col gap-2 text-xs text-gray-400">
            <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            <li><Link to="/contact-us" className="hover:text-primary transition-colors">Contact Us</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Use</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="sm:col-span-2 md:col-span-2">
          <h3 className="text-white font-bold text-sm mb-2">Price Drop Alerts Newsletter</h3>
          <p className="text-gray-400 text-xs mb-3">Get instant notifications when prices drop on your favorite gadgets.</p>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 w-full">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 text-white border border-white/10 focus:outline-none focus:border-primary"
            />
            <button type="submit" className="btn-primary py-2 px-5 text-xs whitespace-nowrap shrink-0">
              Subscribe
            </button>
          </form>

          <p className="text-[11px] mt-2 text-gray-500">
            By subscribing you agree to our{" "}
            <Link to="/terms" className="underline hover:text-primary">
              Terms and Conditions
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="maxscreen screen-margin mt-10 border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
        <p>© 2026 DaamDekho. All rights reserved across Amazon, Flipkart, Croma, JioMart & Vijay Sales.</p>
        <div className="flex gap-4 items-center">
          <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors"><FaInstagram size={16} /></a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors"><FaFacebookF size={16} /></a>
          <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors"><FaYoutube size={16} /></a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

