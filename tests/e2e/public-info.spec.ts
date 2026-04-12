import { test, expect } from '@playwright/test';

test('public info pages open from hash routes', async ({ page }) => {
  await page.goto('/#guide');
  await expect(page.getByText('คู่มือใช้งาน EzBOQ').first()).toBeVisible();
  await expect(page.getByText('ซิงก์ข้อมูลโครงการ/ข้อมูลบริษัทขึ้นระบบกลาง')).toBeVisible();

  await page.goto('/#faq');
  await expect(page.getByText('QA / คำถามที่พบบ่อย').first()).toBeVisible();

  await page.goto('/#privacy');
  await expect(page.getByText('นโยบายความเป็นส่วนตัว').first()).toBeVisible();
  await expect(page.getByText('ข้อมูลโครงการและข้อมูลบริษัทจะซิงก์ขึ้นระบบกลางตาม workspace ของผู้ใช้')).toBeVisible();
});

test('login and guide remain readable on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeVisible();
  await expect(page.getByText('กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งาน workspace ของคุณ')).toBeVisible();

  await page.goto('/#guide');
  await expect(page.getByText('คู่มือใช้งาน EzBOQ').first()).toBeVisible();
});
