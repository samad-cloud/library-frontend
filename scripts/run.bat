@echo off
REM Image Dimensions Update Script Runner (Windows)
REM This script sets up and runs the image dimensions update

echo 🚀 Image Dimensions Update Script
echo ==================================

REM Check if we're in the right directory
if not exist "update-image-dimensions.js" (
    echo ❌ Error: Please run this script from the scripts\ directory
    echo    cd scripts && run.bat
    pause
    exit /b 1
)

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ Error: package.json not found
    pause
    exit /b 1
)

REM Check if node_modules exists, install if not
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check for environment variables
if not exist ".env" (
    echo ⚠️  Warning: .env file not found
    echo    Make sure you have set up your environment variables:
    echo    - NEXT_PUBLIC_SUPABASE_URL
    echo    - SUPABASE_SERVICE_ROLE_KEY
    echo.
    echo    You can create a .env file or set them in your shell
    echo.
    set /p continue="Continue anyway? (y/N): "
    if /i not "%continue%"=="y" exit /b 1
)

echo.
echo 🏃 Starting image dimensions update...
echo =====================================
echo.

REM Run the script
node update-image-dimensions.js

REM Check exit code
if errorlevel 1 (
    echo.
    echo ❌ Script failed. Check the error messages above.
    pause
    exit /b 1
) else (
    echo.
    echo ✅ Script completed successfully!
    pause
)
