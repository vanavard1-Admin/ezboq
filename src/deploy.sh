#!/bin/bash

# EZBOQ Production Deployment Script
# Run with: chmod +x deploy.sh && ./deploy.sh

set -e  # Exit on error

echo "🚀 EZBOQ Production Deployment Starting..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Step 1: Check if .env.production exists
echo ""
print_info "Step 1/6: Checking environment configuration..."
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    echo "Please create .env.production from .env.production.example"
    echo "Run: cp .env.production.example .env.production"
    echo "Then edit it with your production values"
    exit 1
fi
print_success "Environment configuration found"

# Step 2: Install dependencies
echo ""
print_info "Step 2/6: Installing dependencies..."
npm install
print_success "Dependencies installed"

# Step 3: Type check
echo ""
print_info "Step 3/6: Running type check..."
npm run type-check
print_success "Type check passed"

# Step 4: Build for production
echo ""
print_info "Step 4/6: Building for production..."
npm run build:prod
print_success "Production build complete"

# Step 5: Test production build locally
echo ""
print_info "Step 5/6: Testing production build..."
echo "Starting preview server..."
echo "Visit http://localhost:4173 to test"
echo "Press Ctrl+C when done testing"
read -p "Ready to preview? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run preview:prod &
    PREVIEW_PID=$!
    
    # Wait for user to finish testing
    read -p "Press Enter when you're done testing..."
    
    # Kill preview server
    kill $PREVIEW_PID 2>/dev/null || true
    print_success "Preview complete"
else
    print_info "Skipping preview"
fi

# Step 6: Deploy to Supabase
echo ""
print_info "Step 6/6: Deploy Supabase Edge Function..."
read -p "Deploy to Supabase? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI not found!"
        echo "Install with: npm install -g supabase"
        exit 1
    fi
    
    npm run deploy:supabase
    print_success "Supabase function deployed"
    
    echo ""
    print_info "Don't forget to set ENV=production in Supabase Dashboard:"
    echo "Project Settings → Edge Functions → Environment Variables"
else
    print_info "Skipping Supabase deployment"
fi

# Final instructions
echo ""
echo "================================================"
print_success "Deployment preparation complete! 🎉"
echo ""
echo "Next steps:"
echo "1. Deploy to hosting (Vercel/Netlify):"
echo "   - For Vercel: vercel --prod"
echo "   - For Netlify: netlify deploy --prod"
echo ""
echo "2. Configure your domain (EZBOQ.COM):"
echo "   - Add domain in hosting dashboard"
echo "   - Update DNS records as instructed"
echo ""
echo "3. Set environment variable in Supabase:"
echo "   - Go to Project Settings → Edge Functions"
echo "   - Add: ENV=production"
echo ""
echo "4. Test your production site:"
echo "   - Visit https://ezboq.com"
echo "   - Test demo mode"
echo "   - Test authentication"
echo "   - Create a BOQ and export PDF"
echo ""
echo "📚 For more details, see:"
echo "   - /QUICK_PRODUCTION_GUIDE.md"
echo "   - /PRODUCTION_CHECKLIST.md"
echo ""
print_success "Good luck with your launch! 🚀"
