#!/bin/bash

# ===========================================
# EZBOQ Security Verification Script
# ===========================================
# ตรวจสอบความปลอดภัยก่อน deploy
#
# Usage: bash verify-security.sh
# ===========================================

set -e  # Exit on error

echo "🔐 EZBOQ Security Verification"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# ===========================================
# 1. Check .env is not tracked
# ===========================================
echo "📁 [1/8] Checking .env file..."
if git ls-files --error-unmatch .env 2>/dev/null; then
    echo -e "${RED}❌ ERROR: .env is tracked by git!${NC}"
    echo "   Run: git rm --cached .env"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ .env is not tracked${NC}"
fi

if [ -f .env ]; then
    echo -e "${GREEN}✅ .env file exists locally${NC}"
else
    echo -e "${YELLOW}⚠️  .env file not found (create from .env.example)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ===========================================
# 2. Check .env.example exists
# ===========================================
echo "📋 [2/8] Checking .env.example..."
if [ -f .env.example ]; then
    echo -e "${GREEN}✅ .env.example exists${NC}"
    
    # Check it doesn't contain real values
    if grep -q "cezwqajbkjhvumbhpsgy" .env.example; then
        echo -e "${RED}❌ ERROR: .env.example contains real Supabase URL!${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "eyJhbGc" .env.example; then
        echo -e "${RED}❌ ERROR: .env.example contains real JWT!${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ ERROR: .env.example not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ===========================================
# 3. Check .gitignore exists
# ===========================================
echo "🚫 [3/8] Checking .gitignore..."
if [ -f .gitignore ]; then
    echo -e "${GREEN}✅ .gitignore exists${NC}"
    
    # Check it contains important entries
    if grep -q "^\.env$" .gitignore || grep -q "^\.env$" .gitignore; then
        echo -e "${GREEN}✅ .gitignore includes .env${NC}"
    else
        echo -e "${RED}❌ ERROR: .gitignore doesn't include .env!${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "node_modules" .gitignore; then
        echo -e "${GREEN}✅ .gitignore includes node_modules${NC}"
    else
        echo -e "${YELLOW}⚠️  .gitignore should include node_modules${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ ERROR: .gitignore not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ===========================================
# 4. Check for hardcoded credentials
# ===========================================
echo "🔍 [4/8] Scanning for hardcoded credentials..."

# Check for JWT tokens in src/
if git grep -n "eyJhbGc" src/ 2>/dev/null; then
    echo -e "${RED}❌ ERROR: Found hardcoded JWT in source code!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No hardcoded JWT found in src/${NC}"
fi

# Check for Supabase URL (excluding utils/supabase)
if git grep -n "cezwqajbkjhvumbhpsgy\.supabase\.co" src/ 2>/dev/null | grep -v "utils/supabase"; then
    echo -e "${YELLOW}⚠️  Found Supabase URL in unexpected places${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ No unexpected Supabase URLs${NC}"
fi

echo ""

# ===========================================
# 5. Check CSP in index.html
# ===========================================
echo "🛡️  [5/8] Checking Content Security Policy..."
if grep -q "Content-Security-Policy" index.html; then
    echo -e "${GREEN}✅ CSP meta tag found${NC}"
else
    echo -e "${YELLOW}⚠️  CSP meta tag not found in index.html${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ===========================================
# 6. Check package.json
# ===========================================
echo "📦 [6/8] Checking package.json..."
if grep -q '"engines"' package.json; then
    echo -e "${GREEN}✅ Node version specified in engines${NC}"
else
    echo -e "${YELLOW}⚠️  No engines field in package.json${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if grep -q '"type-check"' package.json; then
    echo -e "${GREEN}✅ type-check script exists${NC}"
else
    echo -e "${YELLOW}⚠️  No type-check script${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ===========================================
# 7. Check for console.log in production code
# ===========================================
echo "🔊 [7/8] Checking for console.log (production)..."
LOG_COUNT=$(git grep -n "console\.log" src/ 2>/dev/null | grep -v "import.meta.env.DEV" | wc -l)
if [ "$LOG_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}⚠️  Found $LOG_COUNT console.log statements (consider conditional logging)${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ Console.log usage looks OK${NC}"
fi
echo ""

# ===========================================
# 8. TypeScript & Build Check
# ===========================================
echo "🔨 [8/8] Running TypeScript check and build..."
if npm run type-check 2>&1 | grep -q "error TS"; then
    echo -e "${RED}❌ TypeScript errors found!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No TypeScript errors${NC}"
fi

# Try to build
echo "   Building production bundle..."
if npm run build > /tmp/build-output.log 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
    
    # Show build size
    if [ -d dist ]; then
        DIST_SIZE=$(du -sh dist | cut -f1)
        echo "   📊 Build size: $DIST_SIZE"
    fi
else
    echo -e "${RED}❌ Build failed! Check /tmp/build-output.log${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ===========================================
# Summary
# ===========================================
echo "=============================="
echo "📊 Verification Summary"
echo "=============================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✨ Perfect! All checks passed!${NC}"
    echo ""
    echo "🚀 Ready to deploy!"
    echo ""
    echo "Next steps:"
    echo "  1. git add ."
    echo "  2. git commit -m 'feat: production ready'"
    echo "  3. git push origin main"
    echo "  4. Deploy to your hosting platform"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Passed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "You can deploy, but consider fixing warnings."
    exit 0
else
    echo -e "${RED}❌ Failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix all errors before deploying!"
    exit 1
fi
