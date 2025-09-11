#!/bin/bash

# Image Dimensions Update Script Runner
# This script sets up and runs the image dimensions update

echo "🚀 Image Dimensions Update Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "update-image-dimensions.js" ]; then
    echo "❌ Error: Please run this script from the scripts/ directory"
    echo "   cd scripts && ./run.sh"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    exit 1
fi

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check for environment variables
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Make sure you have set up your environment variables:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "   You can create a .env file or set them in your shell"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🏃 Starting image dimensions update..."
echo "=====================================

echo ""

# Run the script
node update-image-dimensions.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Script completed successfully!"
else
    echo ""
    echo "❌ Script failed. Check the error messages above."
    exit 1
fi
