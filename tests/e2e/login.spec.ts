import { test, expect } from '@playwright/test';

test('login screen loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeVisible();
});

test('login screen can switch to registration mode', async ({ page }) => {
  await page.goto('/');

  await page
    .locator('form')
    .getByRole('button', { name: 'สมัครสมาชิก' })
    .first()
    .click();

  await expect(page.getByRole('heading', { name: 'สมัครสมาชิก' })).toBeVisible();
  await expect(page.getByPlaceholder('กรอกรหัสผ่านอีกครั้ง')).toBeVisible();
  await expect(page.getByRole('button', { name: 'สมัครสมาชิก' }).first()).toBeVisible();
});
