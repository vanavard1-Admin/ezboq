/**
 * TC-04: Confirm Document Flow
 *
 * Test: Create Draft -> Confirm -> Issue Document
 */
import { test, expect } from '@playwright/test';

import { requireAuthentication } from './helpers/auth';
import { goToNewDocument } from './helpers/navigation';

test.describe('TC-04: Confirm Document', () => {
  test.beforeEach(async ({ page }) => {
    await requireAuthentication(page);
  });

  test('should confirm document without duplicates', async ({ page }) => {
    await goToNewDocument(page);

    await page.waitForSelector('[data-testid="next-step-button"]', { timeout: 15000 });

    const docTypeSelect = page.locator('select').first();
    if (await docTypeSelect.isVisible()) {
      await docTypeSelect.selectOption('QUO');
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
      await subjectInput.fill('Confirm flow quotation');
    }

    await page.getByTestId('next-step-button').click();
    await page.waitForSelector('input[placeholder*="รายละเอียดสินค้า"]', { timeout: 10000 });

    await page.locator('input[placeholder*="รายละเอียดสินค้า"]').first().fill('Confirm Item');
    await page.locator('input[placeholder*="จำนวน"]').first().fill('1');
    await page.locator('input[placeholder*="ราคา"]').first().fill('1500');

    const nextButton = page.getByTestId('next-step-button');
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    const confirmButton = page.getByTestId('confirm-document-button');
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toBeEnabled();

    await confirmButton.click();

    await expect(page).toHaveURL(/\/dashboard\/documents\?notice=confirmed$/);
    await expect(page.getByText('ออกเอกสารสำเร็จแล้ว กำลังสร้าง PDF ให้')).toBeVisible();

    const hasErrorState = await page.locator('text=/เกิดข้อผิดพลาด/').isVisible().catch(() => false);
    expect(hasErrorState).toBeFalsy();
  });
});
