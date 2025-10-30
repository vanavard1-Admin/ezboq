#!/bin/bash

# 🧪 Test Script: Profile Endpoints (404 Fix)
# Run this AFTER restarting server!

echo ""
echo "🧪 Testing Profile Endpoints (404 Fix)"
echo "========================================"
echo ""

# Configuration
SERVER_URL="http://localhost:54321/functions/v1/make-server-6e95bca3"
TEST_USER="test-user-$(date +%s)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

echo "📊 Test Configuration:"
echo "  Server: $SERVER_URL"
echo "  Test User: $TEST_USER"
echo ""

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_status="$4"
    local data="$5"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$SERVER_URL$endpoint")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d "$data" "$SERVER_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$SERVER_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected HTTP $expected_status, got $http_code)"
        echo "  Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Test 1: Health Check
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Health Endpoint" "GET" "/health" "200"

# Test 2: Get Profile (NEW!)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Get Profile (NEW!)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if test_endpoint "Get Profile" "GET" "/profile/$TEST_USER" "200"; then
    echo ""
    echo "📊 Checking Free Plan creation..."
    profile_response=$(curl -s "$SERVER_URL/profile/$TEST_USER")
    
    if echo "$profile_response" | grep -q '"plan":"free"'; then
        echo -e "${GREEN}✅ Free Plan created successfully!${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ Free Plan NOT found in response${NC}"
        echo "Response: $profile_response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

# Test 3: Update Profile (NEW!)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Update Profile (NEW!)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_data='{"name":"Test User","email":"test@example.com","phone":"0812345678"}'
test_endpoint "Update Profile" "PUT" "/profile/$TEST_USER" "200" "$test_data"

# Test 4: Team Members (NEW!)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Get Team Members (NEW!)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Team Members" "GET" "/team/members/$TEST_USER" "200"

# Test 5: Verify No 404s
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Verify No 404 Errors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "Checking for 404 responses... "
has_404=false

# Test each endpoint for 404
for endpoint in "/profile/$TEST_USER" "/team/members/$TEST_USER"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL$endpoint")
    if [ "$status" = "404" ]; then
        has_404=true
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Endpoint $endpoint returned 404!"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        break
    fi
done

if [ "$has_404" = false ]; then
    echo -e "${GREEN}✅ PASS${NC} - No 404 errors!"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 ALL TESTS PASSED! 404 FIX WORKS!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "✅ Profile endpoints are working!"
    echo "✅ Free Plan auto-creation works!"
    echo "✅ No 404 errors!"
    echo ""
    echo "🚀 Next steps:"
    echo "  1. Open Profile page: http://localhost:5173/profile"
    echo "  2. Verify page loads without errors"
    echo "  3. Check for 'Free Plan' badge"
    echo ""
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ SOME TESTS FAILED!${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "⚠️  Possible causes:"
    echo "  1. Server not restarted yet"
    echo "  2. Server not running"
    echo "  3. Wrong port (expecting 54321)"
    echo ""
    echo "🔧 How to fix:"
    echo "  1. Stop server: Ctrl + C"
    echo "  2. Start server: npm run dev"
    echo "  3. Wait for 'Server started on port 54321'"
    echo "  4. Run this test again: bash test-404-fix.sh"
    echo ""
    exit 1
fi
