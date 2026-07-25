import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Outlet } from "react-router-dom";
import ScrollToTop from "../components/ScrollToTop";
import CompareBadge from "../components/compare/CompareBadge";

const Layout = () => {
  return (
    <div>
      <ScrollToTop />
      <Header />
      <main className=" bg-gray-50 ">
        <Outlet />
      </main>
      <Footer />
      <CompareBadge />
    </div>
  );
};

export default Layout;
