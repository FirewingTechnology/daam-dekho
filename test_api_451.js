import { connectDB } from './app/backend-node/utils/db.js';
import { getProductBySlug } from './app/backend-node/services/productService.js';

async function run() {
  await connectDB();
  console.log("=== TESTING API RESPONSE FOR PRODUCT 451 (Samsung Galaxy Z Fold8 5G) ===");
  const product = await getProductBySlug("451");
  console.log(JSON.stringify(product, null, 2));
}

run().catch(console.error);
