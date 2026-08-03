$base = 'http://localhost:5000/api'
$tests = @('/products?page=1&limit=5', '/dashboard', '/status', '/v10/etl-pipeline')
foreach ($ep in $tests) {
    try {
        $r = Invoke-RestMethod -Uri "$base$ep" -Method GET -TimeoutSec 5
        Write-Host "OK  $ep" -ForegroundColor Green
    } catch {
        Write-Host "ERR $ep => $_" -ForegroundColor Red
    }
}
