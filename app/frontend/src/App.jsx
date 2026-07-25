import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layouts/Layout";
import Home from "./pages/Home";
import ContactUs from "./pages/ContactUs";
import { Compare } from "./pages/Compare";
import { Products } from "./pages/Products";
import Category from "./pages/Category";
import NotFound from "./components/NotFound";
import ProductDetails from "./components/product/ProductDetails";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import { CompareProvider } from "./contexts/CompareContext";
import "./App.css";

const App = () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      children: [
        {
          index: true,
          element: <Home />,
        },
        {
          path: "category",
          element: <Category />,
        },
        {
          path: "category/:categorySlug",
          element: <Category />,
        },
        {
          path: "products",
          element: <Products />,
        },
        {
          path: "product/:id",
          element: <ProductDetails />,
        },
        {
          path: "compare",
          element: <Compare />,
        },
        {
          path: "compare-products",
          element: <Compare />,
        },
        {
          path: "CompareNowSingle",
          element: <Compare />,
        },
        {
          path: "compare-single",
          element: <Compare />,
        },


        {
          path: "about",
          element: <About />,
        },
        {
          path: "contact-us",
          element: <ContactUs />,
        },
        {
          path: "privacy-policy",
          element: <PrivacyPolicy />,
        },
        {
          path: "terms",
          element: <Terms />,
        },
        {
          path: "*",
          element: <NotFound />,
        },
      ],
    },
  ]);

  return (
    <CompareProvider>
      <RouterProvider router={router} />
    </CompareProvider>
  );
};

export default App;

