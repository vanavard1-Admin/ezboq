#!/bin/bash
# 🚀 Deploy Supabase Edge Function Server
# This script deploys the server with nuclear mode enabled

echo "🚨 DEPLOYING NUCLEAR MODE SERVER..."
echo ""
echo "Nuclear Mode Features:"
echo "  ✅ Cache-only GET endpoints (<5ms)"
echo "  ✅ No database queries on cache miss"
echo "  ✅ Returns empty data instantly"
echo "  ✅ Prevents Cloudflare 500 errors"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ ERROR: Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo "  or"
    echo "  brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

# Deploy the server function
echo "📦 Deploying server function..."
cd "$(dirname "$0")"

supabase functions deploy server \
  --project-ref ${SUPABASE_PROJECT_ID:-auto} \
  --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Server deployed with Nuclear Mode"
    echo ""
    echo "Next steps:"
    echo "  1. Refresh your browser (Cmd+Shift+R or Ctrl+F5)"
    echo "  2. Check console for: '🚨 NUCLEAR MODE: No cache'"
    echo "  3. Create test data to populate cache"
    echo "  4. Reload page to see: '⚡ CACHE HIT: ... in 3ms'"
    echo ""
    echo "Expected performance:"
    echo "  • Cache Hit:  <5ms  ✅"
    echo "  • Cache Miss: <5ms  ✅ (returns empty)"
    echo "  • Database:   Never queried! ⚡"
else
    echo ""
    echo "❌ DEPLOY FAILED!"
    echo ""
    echo "Troubleshooting:"
    echo "  • Check if you're logged in: supabase login"
    echo "  • Check if project is linked: supabase link"
    echo "  • Try manual deploy via Supabase Dashboard"
fi
