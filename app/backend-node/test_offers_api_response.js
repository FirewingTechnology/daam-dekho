import { connectDB } from './utils/db.js';
import { getProductBySlug, getHomeData } from './services/productService.js';

async function testOffersAPI() {
  console.log("=========================================");
  console.log("🧪 TESTING BACKEND NODE.JS OFFERS & EMI API");
  console.log("=========================================");

  try {
    await connectDB();
    const homeData = await getHomeData();
    console.log(`✅ Home data loaded: ${homeData.trendingDeals.length} trending deals.`);

    if (homeData.trendingDeals.length > 0) {
      const slug = homeData.trendingDeals[0].slug;
      console.log(`🔍 Fetching product detail for slug: ${slug}...`);
      const detail = await getProductBySlug(slug);

      if (detail && detail.variants && detail.variants.length > 0) {
        const variant = detail.variants[0];
        console.log(`✅ Variant found: ${variant.sku_code || variant.id}`);
        console.log(`✅ Number of vendors: ${variant.vendors.length}`);

        if (variant.vendors.length > 0) {
          const v = variant.vendors[0];
          console.log(`📌 Vendor Name: ${v.vendor_name}`);
          console.log(`📌 Discounted Price: ₹${v.discounted_Price}`);
          console.log(`📌 Offers Detail Structure:`, JSON.stringify(v.offers_detail, null, 2));

          if (v.offers_detail && v.offers_detail.emi && v.offers_detail.bank_offers) {
            console.log("\n🎉 SUCCESS: Backend API correctly extracts & computes structured EMI plans and Bank offers!");
          } else {
            console.error("❌ FAILURE: offers_detail missing expected emi or bank_offers fields!");
          }
        }
      }
    }
  } catch (err) {
    console.error("❌ API Test Error:", err);
  }
}

testOffersAPI();
