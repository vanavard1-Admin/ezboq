#!/bin/bash

# ========================================
# 🔥 Production Smoke Tests
# ========================================
# Run these tests BEFORE deploying to production
# All tests should PASS ✅

set -e  # Exit on first failure

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "🔥 Production Smoke Tests"
echo "========================================="
echo ""

# ========================================
# Configuration
# ========================================
DOMAIN="${DOMAIN:-YOUR_DOMAIN}"
FN_URL="${FN_URL:-YOUR_FN_URL}"
USER_TOKEN="${USER_TOKEN:-}"

if [ "$DOMAIN" = "YOUR_DOMAIN" ] || [ "$FN_URL" = "YOUR_FN_URL" ]; then
  echo -e "${RED}❌ ERROR: Please set DOMAIN and FN_URL environment variables${NC}"
  echo ""
  echo "Usage:"
  echo "  export DOMAIN=ezboq.com"
  echo "  export FN_URL=https://PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3"
  echo "  export USER_TOKEN=your_access_token  # Optional for auth tests"
  echo "  ./smoke-test.sh"
  exit 1
fi

echo "Configuration:"
echo "  DOMAIN: $DOMAIN"
echo "  FN_URL: $FN_URL"
echo "  USER_TOKEN: ${USER_TOKEN:0:20}..."
echo ""

# ========================================
# Test 1: Demo Guard (404 in production)
# ========================================
echo "Test 1: Demo Guard (404 in production)"
echo "---------------------------------------"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/demo/ping)

if [ "$RESPONSE" = "404" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Demo routes are disabled (404)"
else
  echo -e "${RED}❌ FAIL${NC}: Demo routes returned $RESPONSE (expected 404)"
  exit 1
fi

echo ""

# ========================================
# Test 2: Unauthorized Access (401)
# ========================================
echo "Test 2: Unauthorized Access (401)"
echo "---------------------------------------"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $FN_URL/customers)

if [ "$RESPONSE" = "401" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Unauthorized access blocked (401)"
else
  echo -e "${RED}❌ FAIL${NC}: Unauthorized access returned $RESPONSE (expected 401)"
  exit 1
fi

echo ""

# ========================================
# Test 3: /profile endpoint exists (no 404)
# ========================================
echo "Test 3: /profile endpoint exists (no 404)"
echo "---------------------------------------"

if [ -z "$USER_TOKEN" ]; then
  echo -e "${YELLOW}⚠️ SKIP${NC}: USER_TOKEN not set, skipping auth tests"
else
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $USER_TOKEN" \
    $FN_URL/profile)

  if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC}: /profile endpoint exists and returns 200"
  elif [ "$RESPONSE" = "401" ]; then
    echo -e "${YELLOW}⚠️ WARN${NC}: /profile returned 401 (check token validity)"
  else
    echo -e "${RED}❌ FAIL${NC}: /profile returned $RESPONSE (expected 200)"
    exit 1
  fi
fi

echo ""

# ========================================
# Test 4: Security Headers
# ========================================
echo "Test 4: Security Headers"
echo "---------------------------------------"

HEADERS=$(curl -sI https://$DOMAIN/ | grep -iE "Content-Security-Policy|Strict-Transport-Security|X-Frame-Options|Referrer-Policy|Permissions-Policy")

HEADERS_FOUND=0

if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
  echo -e "${GREEN}✅${NC} Content-Security-Policy found"
  HEADERS_FOUND=$((HEADERS_FOUND + 1))
else
  echo -e "${RED}❌${NC} Content-Security-Policy missing"
fi

if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
  echo -e "${GREEN}✅${NC} Strict-Transport-Security found"
  HEADERS_FOUND=$((HEADERS_FOUND + 1))
else
  echo -e "${RED}❌${NC} Strict-Transport-Security missing"
fi

if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
  echo -e "${GREEN}✅${NC} X-Frame-Options found"
  HEADERS_FOUND=$((HEADERS_FOUND + 1))
else
  echo -e "${RED}❌${NC} X-Frame-Options missing"
fi

if echo "$HEADERS" | grep -qi "Referrer-Policy"; then
  echo -e "${GREEN}✅${NC} Referrer-Policy found"
  HEADERS_FOUND=$((HEADERS_FOUND + 1))
else
  echo -e "${RED}❌${NC} Referrer-Policy missing"
fi

if echo "$HEADERS" | grep -qi "Permissions-Policy"; then
  echo -e "${GREEN}✅${NC} Permissions-Policy found"
  HEADERS_FOUND=$((HEADERS_FOUND + 1))
else
  echo -e "${RED}❌${NC} Permissions-Policy missing"
fi

if [ $HEADERS_FOUND -ge 4 ]; then
  echo -e "${GREEN}✅ PASS${NC}: Security headers present ($HEADERS_FOUND/5)"
else
  echo -e "${RED}❌ FAIL${NC}: Missing security headers (found only $HEADERS_FOUND/5)"
  exit 1
fi

echo ""

# ========================================
# Test 5: Health Check
# ========================================
echo "Test 5: Health Check"
echo "---------------------------------------"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $FN_URL/health)

if [ "$RESPONSE" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Health check OK (200)"
else
  echo -e "${RED}❌ FAIL${NC}: Health check returned $RESPONSE (expected 200)"
  exit 1
fi

echo ""

# ========================================
# Test 6: Readiness Check
# ========================================
echo "Test 6: Readiness Check"
echo "---------------------------------------"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $FN_URL/readyz)

if [ "$RESPONSE" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Readiness check OK (200)"
else
  echo -e "${RED}❌ FAIL${NC}: Readiness check returned $RESPONSE (expected 200)"
  exit 1
fi

echo ""

# ========================================
# Summary
# ========================================
echo "========================================="
echo -e "${GREEN}🎉 All smoke tests PASSED!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. ✅ Run RLS_SETUP.sql in Supabase Dashboard → SQL Editor"
echo "  2. ✅ Verify RLS is enabled:"
echo "     SELECT relname, relrowsecurity FROM pg_class"
echo "     WHERE relname IN ('kv_store_6e95bca3', 'customers', 'documents', 'partners');"
echo "  3. ✅ Set environment variables:"
echo "     Frontend: VITE_APP_ENV=production"
echo "     Backend:  APP_ENV=production"
echo "  4. ✅ Deploy to production"
echo ""
