$base = 'http://localhost:8001/api'
$tests = @('/products?limit=3', '/products?q=Samsung&limit=2', '/products?category=Mobiles&limit=2', '/categories', '/brands')
foreach ($ep in $tests) {
    try {
        $r = Invoke-RestMethod -Uri "$base$ep" -Method GET -TimeoutSec 5
        $json = $r | ConvertTo-Json -Depth 1 -Compress
        Write-Host "OK  $ep"
    } catch {
        Write-Host "ERR $ep => $($_.Exception.Message)"
    }
}
