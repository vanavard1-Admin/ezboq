# Playwright Test Error Report

## First Error (Most Critical)

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/dashboard
```

**Root Cause**: Dev server is not running on port 3000

**Location**: `tests/e2e/helpers/auth.ts:22`

## All Errors Summary

All 8 tests failed with the same error:
- `ERR_CONNECTION_REFUSED` - Cannot connect to `http://localhost:3000`

## Solution

### Option 1: Start Dev Server Manually (Recommended for now)

```bash
# Terminal 1: Start dev server
cd web
npm run dev

# Wait for "Ready" message, then in Terminal 2:
cd web
export TEST_USER_EMAIL="test@ezdoc.app"
export TEST_USER_PASSWORD="your-password"
npx playwright test
```

### Option 2: Let Playwright Start Server (Auto)

Playwright config has `webServer` configured, but it may need more time:

```bash
cd web
export TEST_USER_EMAIL="test@ezdoc.app"
export TEST_USER_PASSWORD="your-password"

# Playwright will auto-start server (may take 1-2 minutes)
npx playwright test
```

## Additional Issues Found

1. **Global Setup May Fail**: If dev server not ready when global setup runs
2. **Auth State Missing**: If global setup fails, `.auth/user.json` won't exist
3. **Tests Will FAIL**: As designed (not skip) - this is correct behavior

## Next Steps

1. **Start dev server manually** to ensure it's ready
2. **Set credentials** in environment
3. **Run global setup** (happens automatically on first test run)
4. **Run tests**

## Expected Flow

1. Global setup runs → Authenticates → Saves `.auth/user.json`
2. Each test loads auth state → Verifies auth → Runs test
3. If auth fails → Test FAILS (not skip) ✅

## Verification

After fixing server issue, verify:

```bash
# Check auth state exists
ls -la web/tests/.auth/user.json

# Run single test
npx playwright test tc-01-quo-to-pdf --reporter=list
```






