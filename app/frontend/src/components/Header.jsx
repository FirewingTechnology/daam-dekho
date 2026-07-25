import React, { useState, useRef, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { FiChevronDown, FiMenu, FiX, FiSearch, FiGlobe, FiSun, FiMoon, FiLayers } from "react-icons/fi";
import { FaInstagram, FaFacebookF, FaYoutube } from "react-icons/fa";
import { useTheme } from "../contexts/ThemeContext";
import { useCompare } from "../contexts/CompareContext";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Products", path: "/products" },
  { name: "Categories", path: "/category" },
  { name: "Compare", path: "/compare" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact-us" },
];

const socialLinks = [
  { name: "Instagram", icon: <FaInstagram size={18} />, path: "https://instagram.com" },
  { name: "Facebook", icon: <FaFacebookF size={18} />, path: "https://facebook.com" },
  { name: "Youtube", icon: <FaYoutube size={18} />, path: "https://youtube.com" },
];

const languages = [
  { name: "English", code: "en" },
  { name: "Marathi", code: "mr" },
  { name: "Hindi", code: "hi" },
  { name: "Kannada", code: "kn" },
];

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { compareList } = useCompare();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const langDropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={`glass-header transition-all duration-500 ${scrolled ? "py-3 shadow-lg" : "py-4"}`}>
      <div className="maxscreen screen-margin flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black text-black text-xl group-hover:rotate-12 transition-transform duration-300">
            D
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black tracking-tighter text-white">DAAM DEKHO</span>
            <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Price Tracker</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6">
          <ul className="flex items-center gap-6">
            {navLinks.map((link) => (
              <li key={link.path}>
                <NavLink
                  to={link.path}
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                >
                  {link.name}
                </NavLink>
              </li>
            ))}

            {/* Social Dropdown */}
            <li className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1 text-sm font-medium text-gray-300 hover:text-primary transition-colors cursor-pointer"
              >
                More <FiChevronDown className={`transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-4 w-48 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-slide-up z-50">
                  {socialLinks.map((item, index) => (
                    <a
                      key={index}
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:bg-white/5 hover:text-primary transition-all"
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </a>
                  ))}
                </div>
              )}
            </li>
          </ul>

          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <FiSun className="text-amber-400" size={18} /> : <FiMoon size={18} />}
          </button>

          {/* Compare Badge */}
          <Link 
            to="/compare" 
            className="relative p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300"
            title="View Comparison Drawer"
          >
            <FiLayers size={18} />
            {compareList.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-black font-black text-xs w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                {compareList.length}
              </span>
            )}
          </Link>

          <Link to="/products" className="btn-primary flex items-center gap-2 text-sm ml-2">
            <FiSearch size={16} />
            Track Prices
          </Link>
        </nav>

        {/* Mobile Action Controls */}
        <div className="flex items-center gap-3 lg:hidden">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-white/10 text-white"
          >
            {theme === 'dark' ? <FiSun className="text-amber-400" size={18} /> : <FiMoon size={18} />}
          </button>

          <Link to="/compare" className="relative p-2.5 rounded-full bg-white/10 text-white">
            <FiLayers size={18} />
            {compareList.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-black font-black text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {compareList.length}
              </span>
            )}
          </Link>

          <button 
            className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
          </button>
        </div>
      </div>


      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-[72px] bg-black/95 backdrop-blur-xl z-40 md:hidden animate-fade-in">
          <nav className="flex flex-col p-8 gap-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => `text-2xl font-bold ${isActive ? "text-primary" : "text-white"}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </NavLink>
            ))}
            
            <div className="h-px bg-white/10 my-4" />
            
            <div className="flex gap-6">
              {socialLinks.map((item, index) => (
                <a
                  key={index}
                  href={item.path}
                  className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all"
                >
                  {item.icon}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mt-2">
              {languages.map((lang, index) => (
                <button
                  key={index}
                  className="px-4 py-2 text-sm rounded-full bg-white/5 text-white hover:bg-primary hover:text-black transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {lang.name}
                </button>
              ))}
            </div>

            <Link 
              to="/products" 
              className="mt-8 btn-primary text-center py-4 text-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Start Searching
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
