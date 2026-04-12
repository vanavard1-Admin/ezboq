/**
 * Global Setup for Playwright Tests
 * 
 * B-FIX-Auth: Authenticates once and saves auth state for all tests
 * Uses email/password login or dev login page
 */
import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

const RUNTIME_DEV_BYPASS_KEY = 'ezdoc-e2e-dev-bypass';

function isDevBypassEnabled(): boolean {
  return process.env.PLAYWRIGHT_USE_DEV_BYPASS === '1' || process.env.NEXT_PUBLIC_DEV_LOGIN === '1';
}

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  // B-FIX-Auth: Use correct path relative to test directory
  const authDir = path.join(__dirname, '..', '.auth');
  const storageState = path.join(authDir, 'user.json');
  
  // Create auth directory if it doesn't exist
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  console.log('[Global Setup] Starting authentication...');
  console.log(`[Global Setup] Base URL: ${baseURL}`);
  console.log(`[Global Setup] Storage state will be saved to: ${storageState}`);
  
  // Wait for server to be ready (webServer should start it, but give it time)
  console.log('[Global Setup] Waiting for dev server to be ready...');
  const maxRetries = 30;
  let retries = 0;
  let serverReady = false;
  
  // Parse baseURL to get hostname and port
  const url = new URL(baseURL || 'http://localhost:3000');
  const hostname = url.hostname;
  const port = parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80);
  
  // Use a simple HTTP check
  while (retries < maxRetries && !serverReady) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.request({
          hostname,
          port,
          path: '/',
          method: 'HEAD',
          timeout: 2000,
        }, (res: http.IncomingMessage) => {
          if (res.statusCode && res.statusCode < 500) {
            serverReady = true;
            console.log('[Global Setup] ✅ Dev server is ready');
            resolve();
          } else {
            reject(new Error(`Server returned ${res.statusCode}`));
          }
        });
        req.on('error', (err: NodeJS.ErrnoException) => {
          // Connection refused is expected while waiting
          if (err.code !== 'ECONNREFUSED') {
            reject(err);
          } else {
            reject(new Error('Connection refused'));
          }
        });
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        req.end();
      });
      // If we get here, server is ready
      break;
    } catch {
      retries++;
      if (retries < maxRetries) {
        if (retries % 5 === 0) {
          console.log(`[Global Setup] Waiting for server... (${retries}/${maxRetries})`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      } else {
        throw new Error(`Dev server not ready after ${maxRetries * 2} seconds. Make sure 'npm run dev' is running on ${baseURL}`);
      }
    }
  }

  if (isDevBypassEnabled()) {
    fs.writeFileSync(storageState, JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: new URL(baseURL || 'http://localhost:3000').origin,
          localStorage: [
            {
              name: RUNTIME_DEV_BYPASS_KEY,
              value: '1',
            },
          ],
        },
      ],
    }, null, 2));
    console.log('[Global Setup] Dev bypass enabled - skipping real authentication');
    return;
  }
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const ensureCustomer = async () => {
    try {
      await page.goto(`${baseURL}/dashboard/customers`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);

      const searchInput = page.locator('input[placeholder*="ค้นหา"], input[placeholder*="Search"]').first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('');
      }

      const loadingRow = page.locator('text=กำลังโหลด');
      if (await loadingRow.isVisible().catch(() => false)) {
        await loadingRow.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
      }

      await page.waitForSelector('tbody', { timeout: 15000 });

      const emptyState =
        (await page.locator('text=No customers found').isVisible().catch(() => false)) ||
        (await page.locator('text=ยังไม่มีลูกค้าในระบบ').isVisible().catch(() => false)) ||
        (await page.locator('tbody tr td:has-text("ยังไม่มีลูกค้าในระบบ")').isVisible().catch(() => false));
      if (!emptyState) return;

      await page.locator('button:has-text("เพิ่มลูกค้า"), button:has-text("Add Customer")').first().click();
      await page.waitForSelector('text=เพิ่มลูกค้า', { timeout: 10000 });

      const displayNameInput = page
        .locator('label:has-text("ชื่อที่แสดง"), label:has-text("Display Name")')
        .locator('..')
        .locator('input')
        .first();

      await displayNameInput.fill('E2E Customer');

      await page.locator('button:has-text("บันทึก"), button:has-text("Save")').first().click({ force: true });
      await page.waitForTimeout(1500);
    } catch (error) {
      console.warn('[Global Setup] ⚠️ Failed to ensure customer:', error);
    }
  };

  try {
    // Method 1: Try email/password login first (most reliable for automation)
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    const attemptEmailLogin = async (path: string) => {
      console.log(`[Global Setup] Trying email/password login at ${path}...`);
      await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);

      const emailSection = page.locator('text=หรือเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน');
      try {
        await emailSection.waitFor({ timeout: 12000 });
      } catch {
        const bodyText = await page.locator('body').innerText().catch(() => '');
        console.warn('[Global Setup] Email section not found. Body text snippet:', bodyText.slice(0, 500));
        throw new Error('Email/password section not found');
      }

      const emailInput = page.locator(
        'input[type="email"], input[name="email"], input[placeholder*="อีเมล"]'
      ).first();
      const passwordInput = page.locator(
        'input[type="password"], input[name="password"], input[placeholder*="รหัสผ่าน"]'
      ).first();

      if (!(await emailInput.isVisible({ timeout: 5000 })) || !(await passwordInput.isVisible({ timeout: 5000 }))) {
        throw new Error('Email/password inputs not found');
      }

      console.log('[Global Setup] Found email/password inputs, filling...');
      await emailInput.fill(testEmail!);
      await passwordInput.fill(testPassword!);

      const submitButton = page.locator(
        'button:has-text("เข้าสู่ระบบด้วยอีเมล"), button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("เข้าสู่ระบบ")'
      ).first();

      await submitButton.click();
      // Some flows (link/complete) won't auto-redirect, so wait a bit then go to dashboard
      await page.waitForTimeout(4000);
      await page.goto(`${baseURL}/dashboard/documents`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);

      if (!page.url().includes('/dashboard')) {
        throw new Error(`Login did not land on dashboard (current: ${page.url()})`);
      }

      console.log('[Global Setup] ✅ Email/password login successful!');
      return true;
    };

    if (testEmail && testPassword) {
      console.log('[Global Setup] Attempting email/password login...');
      const loginPaths = ['/link/complete?e2e=1', '/login'];
      let emailLoginOk = false;
      for (const path of loginPaths) {
        try {
          emailLoginOk = await attemptEmailLogin(path);
          if (emailLoginOk) break;
        } catch (error) {
          console.warn(`[Global Setup] Email/password login failed at ${path}`, error);
        }
      }
      if (!emailLoginOk) {
        console.warn('[Global Setup] Email/password login failed, trying dev login...');
      }
    }
    
    // Method 2: Explicitly fail if no deterministic auth path is configured
    if (!page.url().includes('/dashboard')) {
      throw new Error(
        'Authentication not configured for Playwright. Use PLAYWRIGHT_USE_DEV_BYPASS=1 or set TEST_USER_EMAIL/TEST_USER_PASSWORD.'
      );
    }
    
    // Verify we're authenticated
    const finalUrl = page.url();
    if (!finalUrl.includes('/dashboard')) {
      // Try navigating to dashboard to verify
      await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      const verifyUrl = page.url();
      if (verifyUrl.includes('/login')) {
        throw new Error('Authentication failed - still redirected to login page');
      }
    }

    // Ensure at least one customer exists for document creation tests
    await ensureCustomer();
    
    // Save auth state
    await context.storageState({ path: storageState });
    console.log(`[Global Setup] ✅ Auth state saved to: ${storageState}`);
    console.log(`[Global Setup] ✅ Authentication successful! Final URL: ${page.url()}`);
    
  } catch (error) {
    console.error('[Global Setup] ❌ Authentication failed:', error);
    console.error('[Global Setup] Make sure:');
    console.error('  1. Dev server is running (npm run dev)');
    console.error('  2. TEST_USER_EMAIL and TEST_USER_PASSWORD are set (for email/password login)');
    console.error('  3. Or PLAYWRIGHT_USE_DEV_BYPASS=1 to use mocked frontend repos');
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
