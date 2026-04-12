# E2E Test Instructions - Make Tests PASS

## Quick Start (Recommended)

### Option 1: Use Helper Script (Easiest)

```bash
cd web

# Set credentials
export TEST_USER_EMAIL="test@ezdoc.app"
export TEST_USER_PASSWORD="your-actual-password"

# Run everything (starts server, runs tests, shows report)
npm run e2e
```

### Option 2: Manual Steps

#### Terminal 1: Start Dev Server
```bash
cd web
npm run dev
```
**Wait for**: `✓ Ready in X.Xs` or `Local: http://localhost:3000`

#### Terminal 2: Run Tests
```bash
cd web
export TEST_USER_EMAIL="test@ezdoc.app"
export TEST_USER_PASSWORD="your-actual-password"

# Run all desktop tests
npx playwright test

# Run mobile tests
npx playwright test --project="Mobile Chrome"

# View report
npx playwright show-report
```

## Expected Results

### ✅ Success
- Global setup: `✅ Authentication successful!`
- Auth state: `web/tests/.auth/user.json` created
- Tests: All PASS
- Report: Available at `playwright-report/index.html`

### ❌ Failure Scenarios

1. **ERR_CONNECTION_REFUSED**
   - **Fix**: Start dev server first (`npm run dev`)

2. **Not authenticated**
   - **Fix**: Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`
   - **Or**: Use dev login with `NEXT_PUBLIC_DEV_LOGIN_KEY`

3. **Auth state missing**
   - **Fix**: Global setup will create it automatically on first run

## Test Files

- `tc-01-quo-to-pdf.spec.ts` - QUO → PDF flow
- `tc-02-bill-to-pdf.spec.ts` - BILL → PDF flow
- `tc-03-receipt-to-pdf.spec.ts` - RECEIPT → PDF flow
- `tc-04-confirm-document.spec.ts` - Confirm document flow
- `mobile-responsive.spec.ts` - Mobile viewport tests (4 tests)

**Total: 8 tests**

## Verification Checklist

- [ ] Dev server running on port 3000
- [ ] Credentials set (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`)
- [ ] Global setup runs successfully
- [ ] Auth state file exists: `web/tests/.auth/user.json`
- [ ] All tests PASS (not skip, not fail)
- [ ] Test results in `test-results/`
- [ ] HTML report available

## Troubleshooting

### Server Not Starting
```bash
# Check if port 3000 is in use
lsof -ti:3000

# Kill process if needed
kill -9 $(lsof -ti:3000)
```

### Authentication Fails
```bash
# Delete old auth state and retry
rm -rf web/tests/.auth/user.json
npx playwright test
```

### Tests Still Fail
1. Check dev server logs
2. Verify credentials are correct
3. Check browser console in test traces
4. View report: `npx playwright show-report`

## Done-When Criteria

- ✅ No ERR_CONNECTION_REFUSED
- ✅ Global setup login successful
- ✅ TC-01, TC-02, TC-03, TC-04 = PASS
- ✅ Mobile tests = PASS
- ✅ test-results/ directory exists
- ✅ HTML report available






