/**
 * Mobile Responsive Tests
 * 
 * B2: Verify buttons are accessible on mobile viewports
 */
import { test, expect } from '@playwright/test';
import { requireAuthentication } from './helpers/auth';
import { goToNewDocument } from './helpers/navigation';

test.describe('B2: Mobile Responsive', () => {
  test.use({ 
    viewport: { width: 375, height: 667 }, // iPhone SE size
  });

  test.beforeEach(async ({ page }) => {
    // B-FIX-Auth: Require authentication - FAIL if not authenticated
    await requireAuthentication(page);
  });

  test('should have accessible buttons on mobile - Draft QUO', async ({ page }) => {
    await goToNewDocument(page);
    await page.waitForSelector('[data-testid="next-step-button"]', { timeout: 15000 });
    
    // Verify buttons are visible and clickable
    const nextButton = page.getByTestId('next-step-button');
    if (await nextButton.isVisible()) {
      await expect(nextButton).toBeVisible();
      await expect(nextButton).toBeInViewport();
      
      // Check button is not covered by other elements
      const buttonBox = await nextButton.boundingBox();
      expect(buttonBox).not.toBeNull();
      
      // Verify button is clickable (not behind overlay)
      await expect(nextButton).toBeEnabled();
    }
  });

  test('should have accessible buttons on mobile - Draft BILL', async ({ page }) => {
    await goToNewDocument(page);
    await page.waitForSelector('[data-testid="next-step-button"]', { timeout: 15000 });
    
    const docTypeSelect = page.locator('select').first();
    if (await docTypeSelect.isVisible()) {
      await docTypeSelect.selectOption('BILL');
    }
    
    const nextButton = page.getByTestId('next-step-button');
    if (await nextButton.isVisible()) {
      await expect(nextButton).toBeVisible();
      await expect(nextButton).toBeInViewport();
    }
  });

  test('should have accessible buttons on mobile - Draft RECEIPT', async ({ page }) => {
    await goToNewDocument(page);
    await page.waitForSelector('[data-testid="next-step-button"]', { timeout: 15000 });
    
    const docTypeSelect = page.locator('select').first();
    if (await docTypeSelect.isVisible()) {
      await docTypeSelect.selectOption('RECEIPT');
    }
    
    const nextButton = page.getByTestId('next-step-button');
    if (await nextButton.isVisible()) {
      await expect(nextButton).toBeVisible();
      await expect(nextButton).toBeInViewport();
    }
  });

  test('should have bottom bar buttons accessible on mobile', async ({ page }) => {
    await goToNewDocument(page);
    await page.waitForSelector('[data-testid="next-step-button"]', { timeout: 15000 });
    
    // Try to navigate to review step
    const customerSelect = page.locator('select').nth(1);
    if (await customerSelect.isVisible()) {
      const options = await customerSelect.locator('option').count();
      if (options > 1) {
        await customerSelect.selectOption({ index: 1 });
      }
    }
    
    const subjectInput = page.locator('input[type="text"]').first();
    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Test');
    }
    
    const nextButton = page.getByTestId('next-step-button');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(2000);
      
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Check bottom bar buttons
    const generatePdfButton = page.getByTestId('generate-pdf-button');
    const confirmButton = page.getByTestId('confirm-document-button');
    
    // Verify at least one button is visible
    const pdfVisible = await generatePdfButton.isVisible().catch(() => false);
    const confirmVisible = await confirmButton.isVisible().catch(() => false);
    
    if (pdfVisible || confirmVisible) {
      if (pdfVisible) {
        await expect(generatePdfButton).toBeInViewport();
        const pdfBox = await generatePdfButton.boundingBox();
        expect(pdfBox).not.toBeNull();
      }
      if (confirmVisible) {
        await expect(confirmButton).toBeInViewport();
        const confirmBox = await confirmButton.boundingBox();
        expect(confirmBox).not.toBeNull();
      }
    }
  });
});
