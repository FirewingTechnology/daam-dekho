Write-Host "=== DAAMDEKHO FULL SYSTEM STATUS REPORT ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend products
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:8001/api/products?limit=1' -TimeoutSec 5
    Write-Host ("[PASS] Backend API http://localhost:8001 - Total products: " + $r.pagination.total) -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Backend API: $_" -ForegroundColor Red
}

# Test 2: Categories
try {
    $cats = Invoke-RestMethod -Uri 'http://localhost:8001/api/categories' -TimeoutSec 5
    $cCount = if ($cats.categories) { $cats.categories.Count } elseif ($cats.Count) { $cats.Count } else { 0 }
    Write-Host ("[PASS] Categories API - " + $cCount + " categories") -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Categories: $_" -ForegroundColor Red
}

# Test 3: Brands
try {
    $brands = Invoke-RestMethod -Uri 'http://localhost:8001/api/brands' -TimeoutSec 5
    $bCount = if ($brands.brands) { $brands.brands.Count } elseif ($brands.Count) { $brands.Count } else { 0 }
    Write-Host ("[PASS] Brands API - " + $bCount + " brands") -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Brands: $_" -ForegroundColor Red
}

# Test 4: Samsung Search
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:8001/api/products?q=Samsung&limit=2' -TimeoutSec 5
    Write-Host ("[PASS] Search Samsung: " + $r.pagination.total + " products found") -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Samsung Search: $_" -ForegroundColor Red
}

# Test 5: Product Detail with Variants and Vendor Offers
try {
    $firstProd = Invoke-RestMethod -Uri 'http://localhost:8001/api/products?limit=1' -TimeoutSec 5
    $targetPid = ($firstProd.products | Select-Object -First 1).id
    $r = Invoke-RestMethod -Uri "http://localhost:8001/api/products/$targetPid" -TimeoutSec 5
    $pTitle = if ($r.title) { $r.title } elseif ($r.product.title) { $r.product.title } else { "Product $targetPid" }
    $variantCount = if ($r.variants) { $r.variants.Count } else { 0 }
    Write-Host ("[PASS] Product Detail #" + $targetPid + " - '" + $pTitle + "' - Variants: " + $variantCount) -ForegroundColor Green
    if ($variantCount -gt 0) {
        $offerCount = ($r.variants | ForEach-Object { if ($_.vendors) { $_.vendors.Count } else { 0 } } | Measure-Object -Sum).Sum
        Write-Host "       Vendor Offers across variants: $offerCount" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Product Detail: $_" -ForegroundColor Red
}

# Test 6: Scraper Admin Dashboard
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5000' -TimeoutSec 5 -UseBasicParsing
    Write-Host "[PASS] Scraper Admin Dashboard http://localhost:5000 - HTTP $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Scraper Admin: $_" -ForegroundColor Red
}

# Test 7: v10 ETL Telemetry API
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:5000/api/v10/etl-pipeline' -TimeoutSec 5
    Write-Host "[PASS] v10 ETL Telemetry API - Status: $($r.status)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] v10 ETL API: $_" -ForegroundColor Red
}

# Test 8: Frontend
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 5 -UseBasicParsing
    Write-Host "[PASS] Frontend http://localhost:5173 - HTTP $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Frontend: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
