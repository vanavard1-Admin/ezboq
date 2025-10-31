#!/bin/bash

# BOQ Pro - Clean Build Script
# Clears all build caches and rebuilds the project

echo "🧹 Cleaning build artifacts..."

# Remove build outputs
rm -rf dist/
rm -rf build/

# Remove cache directories
rm -rf .vite/
rm -rf node_modules/.vite/
rm -rf node_modules/.cache/

# Remove TypeScript cache
rm -rf *.tsbuildinfo

echo "✅ Clean complete!"
echo ""
echo "📦 Now run: npm run build"
echo "   or: npm install && npm run build"
