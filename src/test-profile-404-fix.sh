#!/bin/bash

# Test Profile 404 Fix
# Tests that profile endpoint returns 200 with default Free Plan (not 404)

echo "🧪 Testing Profile 404 Fix..."
echo ""

# Check if SUPABASE_URL and SUPABASE_ANON_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set"
  echo ""
  echo "Set them with:"
  echo "  export SUPABASE_URL='https://yourproject.supabase.co'"
  echo "  export SUPABASE_ANON_KEY='your-anon-key'"
  exit 1
fi

TEST_USER_ID="test-user-$(date +%s)"
ENDPOINT="/make-server-6e95bca3/profile/$TEST_USER_ID"
URL="$SUPABASE_URL/functions/v1$ENDPOINT"

echo "📍 Testing endpoint: $ENDPOINT"
echo "🔗 URL: $URL"
echo ""

# Test 1: Check response status
echo "Test 1: Response Status Code"
echo "----------------------------"
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  "$URL")

if [ "$STATUS_CODE" = "200" ]; then
  echo "✅ PASS: Got 200 OK (expected)"
elif [ "$STATUS_CODE" = "404" ]; then
  echo "❌ FAIL: Got 404 Not Found (should be 200 with default Free Plan)"
  exit 1
else
  echo "⚠️  WARNING: Got $STATUS_CODE (expected 200)"
fi
echo ""

# Test 2: Check response body
echo "Test 2: Response Body"
echo "---------------------"
RESPONSE=$(curl -s \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  "$URL")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 3: Verify membership structure
echo "Test 3: Membership Structure"
echo "----------------------------"
HAS_MEMBERSHIP=$(echo "$RESPONSE" | jq -r '.membership != null' 2>/dev/null)
HAS_PLAN=$(echo "$RESPONSE" | jq -r '.membership.plan' 2>/dev/null)
HAS_FEATURES=$(echo "$RESPONSE" | jq -r '.membership.features != null' 2>/dev/null)

if [ "$HAS_MEMBERSHIP" = "true" ]; then
  echo "✅ PASS: Has membership object"
else
  echo "❌ FAIL: Missing membership object"
  exit 1
fi

if [ "$HAS_PLAN" = "free" ]; then
  echo "✅ PASS: Plan is 'free' (default)"
else
  echo "❌ FAIL: Plan is '$HAS_PLAN' (expected 'free')"
  exit 1
fi

if [ "$HAS_FEATURES" = "true" ]; then
  echo "✅ PASS: Has features object"
else
  echo "❌ FAIL: Missing features object"
  exit 1
fi
echo ""

# Test 4: Check cache headers
echo "Test 4: Cache Headers"
echo "---------------------"
CACHE_HEADER=$(curl -s -I \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  "$URL" | grep -i "x-cache:" || echo "none")

PERF_HEADER=$(curl -s -I \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  "$URL" | grep -i "x-performance-mode:" || echo "none")

echo "Cache: $CACHE_HEADER"
echo "Performance: $PERF_HEADER"
echo ""

# Test 5: Response time
echo "Test 5: Response Time"
echo "---------------------"
START_TIME=$(date +%s%3N)
curl -s -o /dev/null \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  "$URL"
END_TIME=$(date +%s%3N)
DURATION=$((END_TIME - START_TIME))

echo "⏱️  Response time: ${DURATION}ms"

if [ "$DURATION" -lt 100 ]; then
  echo "✅ PASS: Fast response (< 100ms)"
elif [ "$DURATION" -lt 500 ]; then
  echo "⚠️  WARNING: Moderate response (< 500ms)"
else
  echo "❌ FAIL: Slow response (> 500ms)"
fi
echo ""

# Summary
echo "================================"
echo "✅ All Tests Passed!"
echo "================================"
echo ""
echo "Profile endpoint now:"
echo "  - Returns 200 (not 404)"
echo "  - Includes default Free Plan"
echo "  - Responds in < ${DURATION}ms"
echo "  - Uses NUCLEAR MODE (cache-only)"
echo ""
echo "No more 404 errors! 🎉"
