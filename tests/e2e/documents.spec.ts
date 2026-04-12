import { expect, test } from '@playwright/test';

const MOCK_DOCS_STORAGE_KEY = 'ezboq_mock_docs_state_v1';
const MOCK_AUTH_SESSION = {
  userId: 'owner-main',
  signedInAt: '2026-03-31T00:00:00.000Z',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ session, docsKey }) => {
    localStorage.setItem('ezboq_auth_session', JSON.stringify(session));
    localStorage.removeItem(docsKey);
    sessionStorage.removeItem('ezboq_auth_session_temp');
    sessionStorage.removeItem('ezboq-documents-notice');
  }, { session: MOCK_AUTH_SESSION, docsKey: MOCK_DOCS_STORAGE_KEY });
});

test('documents module opens from hash route in mock workspace', async ({ page }) => {
  await page.goto('/#docs');

  await expect(page.getByText('EzBOQ Module')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'สร้างเอกสารใหม่' })).toBeVisible();
  await expect(page.getByText('Workspace: Mock Workspace')).toBeVisible();
});

test('authenticated user can create, issue, render PDF, and deliver a mock document', async ({ page }) => {
  const buddhistYear = new Date().getFullYear() + 543;
  const expectedDocNo = `QUO-${buddhistYear}-0001`;

  await page.goto('/#docs/new');

  await page.locator('label:has-text("ลูกค้า") select').selectOption({ index: 1 });
  await page.getByLabel('หัวข้อเอกสาร').fill('งานตกแต่งภายใน mock flow สำหรับ audit');
  await page.getByRole('button', { name: 'ถัดไป' }).click();

  await page.getByLabel('รายละเอียด').fill('งานตกแต่งภายในครบชุด');
  await page.getByLabel('ราคา / หน่วย').fill('120000');
  await page.getByRole('button', { name: 'ถัดไป' }).click();

  await expect(page.getByText('Net Receive', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ยืนยันและออกเอกสาร' }).click();

  await expect(page).toHaveURL(/#docs$/);
  await expect(page.getByText('ออกเอกสารสำเร็จแล้ว กำลังสร้าง PDF ให้ใน background')).toBeVisible();

  const docRow = page.getByRole('row').filter({ hasText: expectedDocNo });
  await expect(docRow).toBeVisible();
  await expect(docRow.getByText('Issued')).toBeVisible();

  await docRow.getByRole('button', { name: 'สร้าง PDF' }).click();
  await expect(docRow.getByRole('button', { name: 'PDF' })).toBeVisible();

  await docRow.getByRole('button', { name: 'LINE' }).click();
  await expect(page.getByText('ส่งลิงก์เอกสารไปที่ LINE แล้ว')).toBeVisible();
});
