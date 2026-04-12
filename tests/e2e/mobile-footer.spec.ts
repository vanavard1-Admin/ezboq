import { expect, test } from '@playwright/test';

const MOCK_PROJECT = {
  id: 'proj-mobile-footer',
  name: 'Mobile Footer Audit',
  address: 'Bangkok',
  phone: '0812345678',
  owner: 'Owner',
  quotationData: [
    {
      no: 'B1',
      description: 'งานทดสอบ footer mobile',
      unit: 'งาน',
      quantity: 1,
      unitPrice: 1000,
      laborCost: 500,
    },
  ],
  markupRate: 0.25,
  workPlan: {
    totalWeeks: 1,
    items: [],
  },
  paymentSchedule: [
    {
      no: 1,
      description: 'มัดจำ',
      percentage: 100,
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((project) => {
    const session = { userId: 'owner-main', signedInAt: '2026-04-01T00:00:00.000Z' };
    localStorage.setItem('ezboq_auth_session', JSON.stringify(session));
    localStorage.setItem('ezboq_projects__u_owner-main', JSON.stringify([project]));
    localStorage.setItem('ezboq_data_version__u_owner-main', '7.9');
    localStorage.setItem('selectedProjectId__u_owner-main', project.id);
  }, MOCK_PROJECT);
});

test('mobile bottom footer tabs remain tappable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const nav = page.locator('nav').last();
  await expect(nav).toBeVisible();

  await nav.getByRole('button', { name: 'เอกสาร' }).click();
  await expect(page.getByText('เอกสารลูกค้า', { exact: false })).toBeVisible();

  await nav.getByRole('button', { name: 'จัดซื้อ' }).click();
  await expect(page.getByText('จัดซื้อวัสดุ', { exact: false })).toBeVisible();

  await nav.getByRole('button', { name: 'ช่าง' }).click();
  await expect(page.getByText('จัดการช่าง', { exact: false })).toBeVisible();

  await nav.getByRole('button', { name: 'การเงิน' }).click();
  await expect(page.getByText('ภาพรวม', { exact: true })).toBeVisible();

  await nav.getByRole('button', { name: 'หน้าหลัก' }).click();
  await expect(page.getByRole('heading', { name: 'Mobile Footer Audit' })).toBeVisible();
});
