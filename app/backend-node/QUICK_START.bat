@echo off
REM DaamDekho API Quick Start - Windows Batch Version

echo.
echo 🚀 DaamDekho API Quick Start
echo ================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js found: %NODE_VERSION%

REM Navigate to backend directory
cd /d backend-node
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Cannot find backend-node directory
    exit /b 1
)

echo.
echo 📦 Installing dependencies ^(if needed^)...
call npm install >nul 2>&1

echo.
echo ✅ API Implementation Complete!
echo.
echo 📋 Available Endpoints:
echo   1. GET /api/v1/products/best-price?q=search^&limit=10
echo   2. GET /api/v1/products/groups?limit=20
echo   3. GET /api/v1/products/matches/:id?vendor=amazon
echo   4. GET /api/v1/products/compare/:id?vendor=amazon
echo.

REM Check if server is running
timeout /t 1 /nobreak >nul
echo 📡 Checking if backend server is running...

REM Try to connect to health endpoint
powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:8001/health' -ErrorAction SilentlyContinue; if ($?) { exit 0 } } catch { exit 1 }" 2>nul

if %ERRORLEVEL% EQU 0 (
    echo ✅ Backend server is already running on port 8001
    echo.
    echo 🧪 Testing API endpoints...
    call node test-comparison-api.js
) else (
    echo ⚠️  Backend server is not running
    echo.
    echo 📖 Quick Test Commands:
    echo.
    echo # Start the server:
    echo   npm start
    echo.
    echo # In another terminal, run tests:
    echo   node test-comparison-api.js
    echo.
    echo # Or test manually with PowerShell:
    echo   Invoke-WebRequest 'http://localhost:8001/api/v1/products/best-price?q=laptop'
    echo.
    echo Press any key to exit...
    pause >nul
)
