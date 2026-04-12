# Playwright Authentication Setup

## B-FIX-Auth: Auto-Authentication for E2E Tests

Tests now automatically authenticate using `storageState`. Authentication happens once in `global-setup.ts` and the auth state is saved for all tests.

## Setup Methods

### Method 1: Email/Password Login (Recommended)

Set environment variables:
```bash
export TEST_USER_EMAIL="your-test-user@example.com"
export TEST_USER_PASSWORD="your-password"
```

### Method 2: Dev Login Page

Set environment variable:
```bash
export NEXT_PUBLIC_DEV_LOGIN_KEY="your-dev-login-key"
# or
export DEV_LOGIN_KEY="your-dev-login-key"
```

**Note**: Dev login uses Google OAuth which may require manual intervention.

## Running Tests

```bash
cd web

# Set credentials (if using email/password)
export TEST_USER_EMAIL="test@ezdoc.app"
export TEST_USER_PASSWORD="your-password"

# Run tests
npx playwright test

# Run specific test
npx playwright test tc-01-quo-to-pdf
```

## Auth State Location

- **Saved to**: `web/tests/.auth/user.json`
- **Git ignored**: Yes (see `.auth/.gitignore`)

## Policy Change

**Before**: Tests would `skip` if not authenticated  
**After**: Tests will **FAIL** if not authenticated

This ensures authentication issues are caught immediately.

## Troubleshooting

### Authentication Failed

1. **Check dev server is running**:
   ```bash
   npm run dev
   ```

2. **Verify credentials**:
   ```bash
   echo $TEST_USER_EMAIL
   echo $TEST_USER_PASSWORD
   ```

3. **Check auth state file**:
   ```bash
   ls -la web/tests/.auth/user.json
   ```

4. **Delete and regenerate auth state**:
   ```bash
   rm web/tests/.auth/user.json
   npx playwright test --project=chromium tc-01-quo-to-pdf
   ```

### Google OAuth Issues

If using dev login with Google OAuth:
- May require manual intervention in headless mode
- Consider using email/password login instead
- Or run with `headless: false` in global-setup.ts temporarily

## Test Execution Flow

1. **Global Setup** runs first:
   - Authenticates user
   - Saves auth state to `.auth/user.json`

2. **Each Test**:
   - Loads saved auth state
   - Verifies authentication in `beforeEach`
   - **FAILS** if not authenticated (not skip)

3. **Test Execution**:
   - All tests use the same auth state
   - No need to login in each test






