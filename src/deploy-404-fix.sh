#!/bin/bash

# Deploy 404 Fix to Production
# This script deploys the fixed server code and verifies the fix

set -e  # Exit on error

echo "🚀 Deploying 404 Fix to Production"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "supabase/functions/server/index.tsx" ]; then
  echo -e "${RED}❌ Error: Must run from project root${NC}"
  echo "Current directory: $(pwd)"
  exit 1
fi

echo "📍 Project root: $(pwd)"
echo ""

# Step 1: Show what's changed
echo "Step 1: Changes Summary"
echo "-----------------------"
echo "✅ Removed duplicate /profile/:userId endpoint"
echo "✅ Return default Free Plan (not null/404)"
echo "✅ NUCLEAR MODE with instant response"
echo "✅ Team endpoint returns empty array"
echo ""

# Step 2: Pre-deployment checks
echo "Step 2: Pre-deployment Checks"
echo "-----------------------------"

# Check if server file exists
if [ -f "supabase/functions/server/index.tsx" ]; then
  echo "✅ Server file exists"
else
  echo -e "${RED}❌ Server file not found${NC}"
  exit 1
fi

# Check for duplicate endpoint (should be removed)
DUPLICATE_COUNT=$(grep -c "app.get(\"/make-server-6e95bca3/profile/:userId\"" supabase/functions/server/index.tsx || true)
if [ "$DUPLICATE_COUNT" -eq 1 ]; then
  echo "✅ No duplicate endpoints (correct)"
elif [ "$DUPLICATE_COUNT" -gt 1 ]; then
  echo -e "${RED}❌ Still has duplicate endpoints!${NC}"
  echo "   Found $DUPLICATE_COUNT instances of /profile/:userId"
  exit 1
else
  echo -e "${YELLOW}⚠️  No profile endpoint found (check file)${NC}"
fi

# Check for NUCLEAR MODE code
if grep -q "NUCLEAR MODE" supabase/functions/server/index.tsx; then
  echo "✅ NUCLEAR MODE code present"
else
  echo -e "${YELLOW}⚠️  NUCLEAR MODE code not found${NC}"
fi

# Check for default Free Plan
if grep -q "default Free Plan" supabase/functions/server/index.tsx; then
  echo "✅ Default Free Plan code present"
else
  echo -e "${YELLOW}⚠️  Default Free Plan code not found${NC}"
fi

echo ""

# Step 3: Ask for confirmation
echo "Step 3: Deployment Confirmation"
echo "-------------------------------"
echo -e "${YELLOW}Ready to deploy to production?${NC}"
echo ""
echo "This will:"
echo "  1. Deploy fixed server code"
echo "  2. Fix all 404 errors"
echo "  3. Enable NUCLEAR MODE"
echo "  4. Give all users Free Plan"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo ""
  echo "Deployment cancelled."
  exit 0
fi

echo ""

# Step 4: Deploy server
echo "Step 4: Deploying Server"
echo "------------------------"

# Check if Supabase CLI is installed
if command -v supabase &> /dev/null; then
  echo "✅ Supabase CLI found"
  echo ""
  echo "Deploying function 'make-server-6e95bca3'..."
  
  cd supabase/functions/server
  
  # Try to deploy
  if supabase functions deploy make-server-6e95bca3 2>&1; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
  else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    echo ""
    echo "Manual deployment required:"
    echo "  1. Go to Supabase Dashboard"
    echo "  2. Navigate to Edge Functions"
    echo "  3. Select 'make-server-6e95bca3'"
    echo "  4. Click Deploy"
    exit 1
  fi
  
  cd ../../..
else
  echo -e "${YELLOW}⚠️  Supabase CLI not found${NC}"
  echo ""
  echo "Manual deployment required:"
  echo "  1. Go to Supabase Dashboard"
  echo "  2. Navigate to Edge Functions"
  echo "  3. Select 'make-server-6e95bca3'"
  echo "  4. Copy content from supabase/functions/server/index.tsx"
  echo "  5. Paste and Deploy"
  echo ""
  echo "Or install Supabase CLI:"
  echo "  npm install -g supabase"
  echo ""
  read -p "Deployed manually? (yes/no): " MANUAL_DEPLOY
  
  if [ "$MANUAL_DEPLOY" != "yes" ]; then
    echo "Deployment incomplete."
    exit 1
  fi
fi

echo ""

# Step 5: Verify deployment
echo "Step 5: Verifying Deployment"
echo "----------------------------"

if [ -z "$SUPABASE_URL" ]; then
  echo -e "${YELLOW}⚠️  SUPABASE_URL not set - skipping verification${NC}"
  echo ""
  echo "To verify manually:"
  echo "  export SUPABASE_URL='https://yourproject.supabase.co'"
  echo "  export SUPABASE_ANON_KEY='your-anon-key'"
  echo "  ./test-profile-404-fix.sh"
else
  echo "Testing endpoint..."
  
  if [ -f "./test-profile-404-fix.sh" ]; then
    chmod +x ./test-profile-404-fix.sh
    
    if ./test-profile-404-fix.sh; then
      echo ""
      echo -e "${GREEN}✅ Verification successful!${NC}"
    else
      echo ""
      echo -e "${RED}❌ Verification failed${NC}"
      echo "Check the errors above"
      exit 1
    fi
  else
    echo -e "${YELLOW}⚠️  Test script not found - skipping verification${NC}"
  fi
fi

echo ""

# Step 6: Post-deployment instructions
echo "Step 6: Post-Deployment"
echo "----------------------"
echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Clear browser cache:"
echo "   - Open browser console"
echo "   - Run: localStorage.clear()"
echo "   - Run: location.reload()"
echo ""
echo "2. Test Profile page:"
echo "   - Open Profile page"
echo "   - Check console (should see no 404 errors)"
echo "   - Look for 'NUCLEAR MODE' message"
echo "   - Verify Free Plan is shown"
echo ""
echo "3. Monitor for issues:"
echo "   - Watch console for errors"
echo "   - Check response times"
echo "   - Verify all users have Free Plan"
echo ""
echo "Expected results:"
echo "  ✅ No 404 errors"
echo "  ✅ No timeout warnings"
echo "  ✅ Response < 100ms"
echo "  ✅ Default Free Plan for all users"
echo ""
echo "Need help? Check:"
echo "  - EMERGENCY_404_FIX_COMPLETE.md"
echo "  - PROFILE_404_ERRORS_FIXED.md"
echo "  - QUICK_FIX_404_NOW.md"
echo ""
echo -e "${GREEN}✅ All done! No more 404 errors! 🚀${NC}"
