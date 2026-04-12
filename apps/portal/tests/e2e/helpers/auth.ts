/**
 * Authentication Helper for Playwright Tests
 * 
 * B-FIX-Auth: Changed policy - FAIL if not authenticated (not skip)
 */
import { Page } from '@playwright/test';

function isDevBypassEnabled(): boolean {
    return process.env.PLAYWRIGHT_USE_DEV_BYPASS === '1' || process.env.NEXT_PUBLIC_DEV_LOGIN === '1';
}

/**
 * Verify authentication - FAILS test if not authenticated
 */
export async function requireAuthentication(page: Page): Promise<void> {
    try {
        // Get baseURL from environment or use default
        const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;
        const devBypass = isDevBypassEnabled();

        if (devBypass) {
            await page.goto(`${baseURL}/dashboard/documents`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForLoadState('networkidle').catch(() => {});
            return;
        }

    if (!testEmail || !testPassword) {
      throw new Error('Missing TEST_USER_EMAIL/TEST_USER_PASSWORD for E2E authentication.');
    }

    // First try to load dashboard; only login if redirected to /login
    await page.goto(`${baseURL}/dashboard/documents`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    let currentUrl = page.url();

    if (currentUrl.includes('/login')) {
      await page.goto(`${baseURL}/login?returnUrl=/dashboard/documents`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      await emailInput.waitFor({ timeout: 10000 });
      await passwordInput.waitFor({ timeout: 10000 });
      await emailInput.fill(testEmail);
      await passwordInput.fill(testPassword);

      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("เข้าสู่ระบบ")'
      ).first();
      await submitButton.click();
      await page.waitForURL(/dashboard/, { timeout: 30000 });
      currentUrl = page.url();
    }
    
    // Verify we're on dashboard
    const currentPath = new URL(currentUrl).pathname;
    if (!currentPath.startsWith('/dashboard') && !currentPath.startsWith('/admin')) {
      throw new Error(`Not authenticated - expected dashboard but got: ${currentUrl}`);
    }
  } catch (error) {
    // B-FIX-Auth: Re-throw to fail test
    throw error;
  }
}
