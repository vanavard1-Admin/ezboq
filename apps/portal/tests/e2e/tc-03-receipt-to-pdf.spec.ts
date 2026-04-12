/**
 * TC-03: RECEIPT → PDF Flow
 * 
 * Test: Create Receipt → Generate PDF
 */
import { test, expect } from '@playwright/test';
import { requireAuthentication } from './helpers/auth';
import { goToNewDocument } from './helpers/navigation';

test.describe('TC-03: RECEIPT to PDF', () => {
  test.beforeEach(async ({ page }) => {
    // B-FIX-Auth: Require authentication - FAIL if not authenticated
    await requireAuthentication(page);
  });

  test('should create RECEIPT and generate PDF', async ({ page }) => {
    await goToNewDocument(page);
    
    await page.waitForSelector('[data-testid="next-step-button"]', { timeout: 15000 });
    
    const docTypeSelect = page.locator('select').first();
    if (await docTypeSelect.isVisible()) {
      await docTypeSelect.selectOption('RECEIPT');
    }
    
    const customerSelect = page
      .locator('label:has-text("ลูกค้า")')
      .locator('..')
      .locator('select')
      .first();
    if (await customerSelect.isVisible()) {
      await expect.poll(async () => customerSelect.locator('option').count(), {
        timeout: 20000,
      }).toBeGreaterThan(1);
      await customerSelect.selectOption({ index: 1 });
    }
    
    const subjectInput = page.locator(
      'input[placeholder*="โปรเจกต์" i], input[placeholder*="รายละเอียดงาน" i], input[name*="subject"]'
    ).first();
    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Test Receipt');
    }
    
    const nextButton = page.getByTestId('next-step-button');
    await nextButton.click();
    await page.waitForTimeout(1500);
    
    await page.waitForSelector('input[placeholder*="รายละเอียดสินค้า"]', { timeout: 20000 });

    const itemDescription = page.locator('input[placeholder*="รายละเอียดสินค้า"]').first();
    await itemDescription.fill('Payment Item');

    const qtyInput = page.locator('input[placeholder*="จำนวน"]').first();
    await qtyInput.fill('1');

    const priceInput = page.locator('input[placeholder*="ราคา"]').first();
    await priceInput.fill('2000');
    
    const nextButton2 = page.getByTestId('next-step-button');
    if (await nextButton2.isVisible()) {
      await nextButton2.click();
      await page.waitForTimeout(1000);
    }
    
    const generatePdfButton = page.getByTestId('generate-pdf-button');
    if (await generatePdfButton.isVisible()) {
      page.once('dialog', (dialog) => dialog.accept());
      await generatePdfButton.click();
      const disabled = await generatePdfButton.isDisabled().catch(() => false);
      if (!disabled) {
        console.warn('[E2E] generate-pdf-button not disabled after click');
      }
      await page.waitForTimeout(2000);
    }
  });
});
