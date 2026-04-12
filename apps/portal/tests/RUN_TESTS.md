# How to Run Playwright Tests

## Prerequisites

1. **Dev Server Running** (required)
2. **Test Credentials** (required)
3. **Auth State** (auto-generated on first run)

## Step-by-Step

### 1. Start Dev Server

```bash
cd web
npm run dev
```

Wait for: `✓ Ready in X.Xs` or `Local: http://localhost:3000`

### 2. Set Credentials

```bash
export TEST_USER_EMAIL="test@ezdoc.app"
export TEST_USER_PASSWORD="your-actual-password"
```

**OR** use dev login key:
```bash
export NEXT_PUBLIC_DEV_LOGIN_KEY="your-key"
```

### 3. Run Tests

#### Desktop Tests
```bash
cd web
npx playwright test
```

#### Mobile Tests
```bash
cd web
npx playwright test --project="Mobile Chrome"
```

#### Single Test
```bash
cd web
npx playwright test tc-01-quo-to-pdf
```

### 4. View Report

```bash
cd web
npx playwright show-report
```

## Troubleshooting

### Error: ERR_CONNECTION_REFUSED
**Fix**: Start dev server first (`npm run dev`)

### Error: Auth state missing
**Fix**: Global setup will run automatically. Make sure:
- Dev server is running
- Credentials are set
- First test run will create auth state

### Error: Not authenticated
**Fix**: 
1. Delete old auth state: `rm web/tests/.auth/user.json`
2. Re-run tests (global setup will re-authenticate)

## Expected Results

### Success
- ✅ Global setup: "✅ Authentication successful!"
- ✅ Tests: All pass
- ✅ Auth state: `web/tests/.auth/user.json` exists

### Failure (Expected if not authenticated)
- ❌ Tests FAIL (not skip) - This is correct behavior
- Error message: "Not authenticated - redirected to login page"






