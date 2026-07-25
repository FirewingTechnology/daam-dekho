#!/usr/bin/env node

/**
 * API Comparison Endpoints Test
 * Tests the new price comparison and matching endpoints
 */

const BASE_URL = 'http://localhost:8001';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function makeRequest(endpoint, description) {
  try {
    log(`\n📡 ${description}`, 'cyan');
    log(`   GET ${BASE_URL}${endpoint}`, 'blue');
    
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    
    if (response.ok) {
      log(`   ✅ Status: ${response.status}`, 'green');
      return data;
    } else {
      log(`   ❌ Status: ${response.status}`, 'red');
      log(`   Error: ${data.error || 'Unknown error'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function runTests() {
  log('\n' + '='.repeat(70), 'yellow');
  log('  DaamDekho API Comparison Endpoints Test', 'yellow');
  log('='.repeat(70), 'yellow');
  
  // 1. Test Best Price Deals
  log('\n[1] TESTING BEST PRICE DEALS', 'yellow');
  const bestPriceResponse = await makeRequest(
    '/api/v1/products/best-price?q=laptop&limit=5',
    'Find best price deals for "laptop"'
  );
  
  if (bestPriceResponse?.allResults?.length > 0) {
    log(`\n   📊 Found ${bestPriceResponse.allResults.length} results:`, 'green');
    bestPriceResponse.allResults.slice(0, 3).forEach((deal, i) => {
      log(`   ${i + 1}. ${deal.title.substring(0, 60)}...`, 'cyan');
      log(`      Vendor: ${deal.vendor} | Price: ₹${deal.discountedPrice || deal.price} | Rating: ${deal.rating || 'N/A'}`, 'cyan');
    });
  }
  
  // 2. Test Product Groups
  log('\n[2] TESTING PRODUCT GROUPS', 'yellow');
  const groupsResponse = await makeRequest(
    '/api/v1/products/groups?limit=5',
    'Get product groups (same product across vendors)'
  );
  
  if (groupsResponse?.groups?.length > 0) {
    log(`\n   📊 Found ${groupsResponse.groups.length} product groups:`, 'green');
    groupsResponse.groups.slice(0, 3).forEach((group, i) => {
      log(`   ${i + 1}. ${group.title_group.trim()} (${group.brand})`, 'cyan');
      log(`      Products: ${group.product_count} | Vendors: ${group.vendors} | Price: ₹${group.min_discounted_price || group.min_price}`, 'cyan');
    });
  }
  
  // 3. Test Get Product Matches (requires valid product ID)
  if (groupsResponse?.groups?.length > 0 && bestPriceResponse?.allResults?.length > 0) {
    log('\n[3] TESTING CROSS-VENDOR MATCHES', 'yellow');
    const product = bestPriceResponse.allResults[0];
    
    const matchesResponse = await makeRequest(
      `/api/v1/products/matches/${product.id}?vendor=${product.vendor}`,
      `Find matches for product ID ${product.id} from ${product.vendor}`
    );
    
    if (matchesResponse?.matches?.length > 0) {
      log(`\n   📊 Found ${matchesResponse.matches.length} matches:`, 'green');
      matchesResponse.matches.slice(0, 3).forEach((match, i) => {
        log(`   ${i + 1}. ${match.title.substring(0, 60)}...`, 'cyan');
        log(`      Vendor: ${match.vendor} | Price: ₹${match.discountedPrice || match.price} | Confidence: ${(match.confidence * 100).toFixed(1)}%`, 'cyan');
      });
    } else {
      log(`   ⚠️  No matches found for this product`, 'yellow');
    }
    
    // 4. Test Price Comparison
    log('\n[4] TESTING PRICE COMPARISON', 'yellow');
    const comparisonResponse = await makeRequest(
      `/api/v1/products/compare/${product.id}?vendor=${product.vendor}`,
      `Get price comparison for product ID ${product.id}`
    );
    
    if (comparisonResponse?.data?.priceAnalysis) {
      const analysis = comparisonResponse.data.priceAnalysis;
      log(`\n   💰 Price Analysis:`, 'green');
      log(`      Min Price: ₹${analysis.minPrice}`, 'cyan');
      log(`      Max Price: ₹${analysis.maxPrice}`, 'cyan');
      log(`      Difference: ₹${analysis.priceDifference} (${analysis.priceDifferencePercent}%)`, 'cyan');
      log(`      Best Deal: ${analysis.bestDealVendor.toUpperCase()}`, 'cyan');
      log(`      Available in ${analysis.vendorCount} vendor(s)`, 'cyan');
    }
  }
  
  // Summary
  log('\n' + '='.repeat(70), 'yellow');
  log('  ✅ API Tests Complete!', 'green');
  log('='.repeat(70), 'yellow');
  
  log('\n📚 API Endpoints Summary:', 'cyan');
  log('  1. GET /api/v1/products/best-price?q=search&limit=10', 'cyan');
  log('     → Find best prices for a product search', 'blue');
  log('  2. GET /api/v1/products/groups?limit=20', 'cyan');
  log('     → Get product groups across vendors', 'blue');
  log('  3. GET /api/v1/products/matches/:id?vendor=amazon', 'cyan');
  log('     → Find matches in other vendors', 'blue');
  log('  4. GET /api/v1/products/compare/:id?vendor=amazon', 'cyan');
  log('     → Get price comparison across vendors', 'blue');
  
  log('\n✅ Next Steps:', 'yellow');
  log('  • Integrate these endpoints into frontend', 'blue');
  log('  • Create price comparison widget', 'blue');
  log('  • Add best-deal indicators', 'blue');
  log('  • Implement caching for performance', 'blue');
  
  log('\n');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`, { timeout: 5000 });
    return response.ok;
  } catch {
    return false;
  }
}

// Main
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    log('\n❌ Error: Backend server is not running', 'red');
    log(`   Please start the server: npm start (in backend-node directory)`, 'yellow');
    process.exit(1);
  }
  
  await runTests();
})();
