#!/bin/bash
echo "🧪 Testing DaamDekho Backend..."
echo ""

# Test 1: Check Node.js version
echo "✓ Node.js version:"
node --version

# Test 2: Check npm
echo "✓ npm version:"
npm --version

# Test 3: Check if dependencies are installed
echo "✓ Checking dependencies..."
if [ -d "node_modules" ]; then
  echo "  ✅ node_modules exists"
else
  echo "  ⚠️  Installing dependencies..."
  npm install
fi

# Test 4: Check database
echo "✓ Checking database..."
if [ -f "products.db" ]; then
  echo "  ✅ products.db exists"
  TABLES=$(sqlite3 products.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
  echo "  📊 Tables in database: $TABLES"
else
  echo "  ⚠️  Database not found, setting up..."
  npm run setup-db
fi

echo ""
echo "✅ Pre-flight checks complete!"
echo ""
echo "To start the server:"
echo "  node server.js"
echo ""
echo "To test the API:"
echo "  curl http://localhost:8001/categories"
echo "  curl http://localhost:8001/products/search?limit=5"
