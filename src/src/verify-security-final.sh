#!/bin/bash

# Security Verification Script
# ตรวจสอบความปลอดภัยก่อน Deploy

echo "🔐 EZBOQ Security Check - Final Verification"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Check .gitignore exists
echo "📁 1. Checking .gitignore..."
if [ -f .gitignore ]; then
    echo -e "${GREEN}✓ .gitignore exists${NC}"
    
    # Check if .env is ignored
    if grep -q "^\.env$" .gitignore || grep -q "^\.env$" .gitignore 2>/dev/null; then
        echo -e "${GREEN}✓ .env is in .gitignore${NC}"
    else
        echo -e "${RED}✗ .env is NOT in .gitignore!${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗ .gitignore NOT found!${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Check .env.example exists
echo "📋 2. Checking .env.example..."
if [ -f .env.example ]; then
    echo -e "${GREEN}✓ .env.example exists${NC}"
    
    # Check it doesn't contain real credentials
    if grep -q "cezwqajbkjhvumbhpsgy" .env.example; then
        echo -e "${RED}✗ .env.example contains real project ID!${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ .env.example is safe (no real credentials)${NC}"
    fi
    
    if grep -q "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" .env.example; then
        echo -e "${RED}✗ .env.example contains real JWT token!${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ .env.example is safe (no real JWT)${NC}"
    fi
else
    echo -e "${RED}✗ .env.example NOT found!${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Check for hardcoded credentials in code
echo "🔍 3. Scanning for hardcoded credentials..."

# Check for hardcoded project ID
if grep -r "cezwqajbkjhvumbhpsgy" utils/ components/ pages/ src/ 2>/dev/null | grep -v ".md" | grep -v "node_modules"; then
    echo -e "${RED}✗ Found hardcoded project ID in code!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No hardcoded project ID in code${NC}"
fi

# Check for hardcoded JWT token
if grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5" utils/ components/ pages/ src/ 2>/dev/null | grep -v ".md" | grep -v "node_modules"; then
    echo -e "${RED}✗ Found hardcoded JWT token in code!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No hardcoded JWT token in code${NC}"
fi

# Check for hardcoded .supabase.co URLs (except in comments/docs)
SUPABASE_MATCHES=$(grep -r "https://.*\.supabase\.co" utils/ components/ pages/ 2>/dev/null | grep -v ".md" | grep -v "// " | grep -v "* " | grep -v node_modules | wc -l)
if [ "$SUPABASE_MATCHES" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $SUPABASE_MATCHES hardcoded .supabase.co URLs${NC}"
    echo "  Check these manually - they might be in comments/docs"
    grep -r "https://.*\.supabase\.co" utils/ components/ pages/ 2>/dev/null | grep -v ".md" | grep -v node_modules | head -3
else
    echo -e "${GREEN}✓ No hardcoded .supabase.co URLs${NC}"
fi
echo ""

# 4. Check utils/supabase/info.tsx uses env variables
echo "⚙️  4. Checking utils/supabase/info.tsx..."
if [ -f utils/supabase/info.tsx ]; then
    if grep -q "import.meta.env.VITE_SUPABASE" utils/supabase/info.tsx; then
        echo -e "${GREEN}✓ info.tsx uses environment variables${NC}"
    else
        echo -e "${RED}✗ info.tsx does NOT use environment variables!${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check it doesn't have hardcoded values
    if grep -q "export const projectId = \"cezwqajbkjhvumbhpsgy\"" utils/supabase/info.tsx; then
        echo -e "${RED}✗ info.tsx has hardcoded projectId!${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ info.tsx has no hardcoded projectId${NC}"
    fi
else
    echo -e "${RED}✗ utils/supabase/info.tsx NOT found!${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 5. Check if .env is in git staging
echo "📦 5. Checking git status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    if git ls-files | grep -q "^\.env$"; then
        echo -e "${RED}✗ .env is tracked by git!${NC}"
        echo "  Run: git rm --cached .env"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ .env is not tracked by git${NC}"
    fi
    
    # Check if .env is in working directory but not staged
    if [ -f .env ]; then
        if git status --porcelain | grep -q "^?? \.env$"; then
            echo -e "${GREEN}✓ .env exists locally but is ignored by git${NC}"
        elif git status --porcelain | grep -q "\.env$"; then
            echo -e "${YELLOW}⚠ .env is modified but should be ignored${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ Not a git repository${NC}"
fi
echo ""

# 6. Test build (quick check)
echo "🔨 6. Testing build configuration..."
if [ -f package.json ]; then
    echo -e "${GREEN}✓ package.json exists${NC}"
    
    # Check for build script
    if grep -q "\"build\":" package.json; then
        echo -e "${GREEN}✓ Build script found in package.json${NC}"
    else
        echo -e "${YELLOW}⚠ No build script in package.json${NC}"
    fi
else
    echo -e "${RED}✗ package.json NOT found!${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Final Report
echo "=========================================="
echo "📊 Security Check Results"
echo "=========================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "🎉 Your application is ready for secure deployment!"
    echo ""
    echo "Next steps:"
    echo "  1. Create .env file: cp .env.example .env"
    echo "  2. Fill in your real credentials in .env"
    echo "  3. Set environment variables in your hosting platform"
    echo "  4. Run: npm run build"
    echo "  5. Deploy!"
    echo ""
    exit 0
else
    echo -e "${RED}❌ FOUND $ERRORS SECURITY ISSUE(S)!${NC}"
    echo ""
    echo "Please fix the issues above before deploying."
    echo "Read SECURITY_CHECKLIST_FINAL.md for detailed instructions."
    echo ""
    exit 1
fi
