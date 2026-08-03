$headers = @{ 'Origin' = 'http://localhost:5174' }
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:8001/api/products?sort_by=relevance&page=1&limit=24' -Headers $headers -Method GET -UseBasicParsing
    Write-Host "OK GET /api/products from port 5174 => HTTP $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "ERR products => $_" -ForegroundColor Red
}

try {
    $r2 = Invoke-WebRequest -Uri 'http://localhost:8001/api/filter_options?category=' -Headers $headers -Method GET -UseBasicParsing
    Write-Host "OK GET /api/filter_options from port 5174 => HTTP $($r2.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "ERR filter_options => $_" -ForegroundColor Red
}

try {
    $r3 = Invoke-WebRequest -Uri 'http://localhost:8001/api/brands' -Headers $headers -Method GET -UseBasicParsing
    Write-Host "OK GET /api/brands from port 5174 => HTTP $($r3.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "ERR brands => $_" -ForegroundColor Red
}
