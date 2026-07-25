import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import { apiEndpoints } from "../services/api";
import { toast } from "react-toastify";
import ComparePrices from "../components/home/ComparePrices";
import CompareNow from "../components/home/CompareNow";
import MacbookPage from "../components/home/Macbook";
import Xboxconsoles from "../components/home/Xboxconsoles";
import Latestnews from "../components/home/Latestnews";
import Card from "../components/home/Card";

const Home = () => {
  const [latestProducts, setLatestProducts] = useState([]);
  const [hotDeals, setHotDeals] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setError(null);
        const res = await apiEndpoints.getHomeData();
        const data = res.data;

        setLatestProducts(data?.latestProducts || []);
        setHotDeals(data?.hotPriceDrops || []);
        setBestSellers(data?.trendingDeals || []);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to load products. Please try again later.");
        toast.error("Failed to load products");
        
        // Fallback to empty arrays
        setLatestProducts([]);
        setHotDeals([]);
        setBestSellers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // ✅ Error state
  if (error && !loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-black gap-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-wider">
          Daam <span className="text-primary">Dekho</span>
        </h1>
        <p className="text-red-400 text-lg">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primary/80"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ✅ Loader while fetching products
 if (loading) {
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-black gap-6">
      {/* Brand Text */}
      <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-wider animate-pulse">
        Daam <span className="text-primary">Dekho</span>
      </h1>

      {/* Bouncing Dots */}
      <div className="flex space-x-2">
        <span className="w-4 h-4 bg-orange-500 rounded-full animate-bounce"></span>
        <span className="w-4 h-4 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-4 h-4 bg-green-500 rounded-full animate-bounce [animation-delay:-0.6s]"></span>
      </div>
    </div>
  );
}

  return (
    <section className="">
      <ComparePrices />
      <div className="maxscreen screen-margin overflow-hidden">
        <CompareNow />
        <Card
          title="Latest & Popular Products"
          products={latestProducts || []}
        />
        <MacbookPage />
        <Card title="Hot Deals" products={hotDeals || []} />
        <Card title="Best Sellers" products={bestSellers || []} />
        <Xboxconsoles />
      </div>
      <Latestnews />
    </section>
  );
};

export default Home;
