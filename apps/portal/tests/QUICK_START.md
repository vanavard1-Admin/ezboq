# Quick Start - Make E2E Tests PASS

## 🚀 Fastest Way (One Command)

```bash
cd web
export TEST_USER_EMAIL="test@ezdoc.app"
export TEST_USER_PASSWORD="your-password"
npm run e2e
```

This will:
1. ✅ Check if dev server is running (start if not)
2. ✅ Wait for server to be ready
3. ✅ Run all Playwright tests
4. ✅ Show results

## 📋 Manual Steps (If Needed)

### Step 1: Start Dev Server
```bash
cd web
npm run dev
```
Wait for: `Local: http://localhost:3000`

### Step 2: Set Credentials
```bash
export TEST_USER_EMAIL="test@ezdoc.app"
export TEST_USER_PASSWORD="your-password"
```

### Step 3: Run Tests
```bash
# Desktop
npx playwright test

# Mobile
npx playwright test --project="Mobile Chrome"

# View report
npx playwright show-report
```

## ✅ Success Indicators

- Global setup: `✅ Authentication successful!`
- Auth file: `web/tests/.auth/user.json` exists
- Tests: All show `✓` (PASS)
- Report: `playwright-report/index.html` available

## ❌ Common Errors

### ERR_CONNECTION_REFUSED
→ Start dev server: `npm run dev`

### Not authenticated
→ Set credentials: `export TEST_USER_EMAIL="..."`

### Auth state missing
→ Will be created automatically on first run

## 📊 Test Results Location

- **Screenshots**: `test-results/` (on failure)
- **Traces**: `test-results/` (on retry)
- **Report**: `playwright-report/index.html`






