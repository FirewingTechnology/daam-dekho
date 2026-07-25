#!/bin/bash

# DaamDekho API Quick Start Guide
# This script helps you quickly set up and test the new comparison API endpoints

echo "🚀 DaamDekho API Quick Start"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Navigate to backend directory
cd backend-node || { echo "❌ Cannot find backend-node directory"; exit 1; }

echo ""
echo "📦 Installing dependencies (if needed)..."
npm install 2>/dev/null

echo ""
echo "✅ API Implementation Complete!"
echo ""
echo "📋 Available Endpoints:"
echo "  1. GET /api/v1/products/best-price?q=search&limit=10"
echo "  2. GET /api/v1/products/groups?limit=20"
echo "  3. GET /api/v1/products/matches/:id?vendor=amazon"
echo "  4. GET /api/v1/products/compare/:id?vendor=amazon"
echo ""

# Check if server is already running
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Backend server is already running on port 8001"
    AUTORUN=false
else
    echo "📡 Backend server is not running yet"
    read -p "Would you like to start it now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        AUTORUN=true
    fi
fi

if [ "$AUTORUN" = true ]; then
    echo ""
    echo "🚀 Starting backend server..."
    echo "Server will run on http://localhost:8001"
    echo ""
    npm start &
    sleep 3
    
    # Test the API
    echo ""
    echo "🧪 Testing API endpoints..."
    
    # Wait for server to be ready
    for i in {1..10}; do
        if curl -s http://localhost:8001/health > /dev/null; then
            echo "✅ Server is running!"
            break
        fi
        sleep 1
    done
    
    # Run test suite
    echo ""
    echo "🧪 Running API tests..."
    node test-comparison-api.js
    
    echo ""
    echo "================================"
    echo "✅ Setup Complete!"
    echo ""
    echo "📚 Next Steps:"
    echo "  1. Review API_COMPARISON_DOCS.md for endpoint details"
    echo "  2. Use test-comparison-api.js to test endpoints"
    echo "  3. Integrate endpoints into your frontend"
    echo ""
    echo "🌐 Try these in your browser or Postman:"
    echo "  • http://localhost:8001/api/v1/products/best-price?q=laptop"
    echo "  • http://localhost:8001/api/v1/products/groups"
    echo ""
    echo "Press Ctrl+C to stop the server"
    
else
    echo ""
    echo "📖 Quick Test Commands:"
    echo ""
    echo "# Start the server:"
    echo "  npm start"
    echo ""
    echo "# In another terminal, run tests:"
    echo "  node test-comparison-api.js"
    echo ""
    echo "# Or test manually with curl:"
    echo "  curl 'http://localhost:8001/api/v1/products/best-price?q=laptop&limit=5'"
    echo ""
fi
