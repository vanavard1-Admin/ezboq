import { expect, test, type Page } from '@playwright/test';

const MOCK_AUTH_SESSION = {
  userId: 'owner-main',
  signedInAt: '2026-03-31T00:00:00.000Z',
};

const E2E_PROJECT = {
  id: 'e2e-project-core-docs',
  name: 'E2E Core Docs Project',
  owner: 'E2E Owner',
  address: 'Bangkok',
  phone: '080-000-0000',
  quotationData: [
    { no: 'A', description: 'หมวดงานหลัก A', unit: '', quantity: '', unitPrice: '', laborCost: '' },
    { no: 'A.1', description: 'งานโครงสร้าง', unit: 'งาน', quantity: 1, unitPrice: 120000, laborCost: 15000, customerUnitPrice: 170000 },
    { no: 'B', description: 'หมวดงานหลัก B', unit: '', quantity: '', unitPrice: '', laborCost: '' },
    { no: 'B.1', description: 'งานตกแต่ง', unit: 'งาน', quantity: 1, unitPrice: 80000, laborCost: 10000, customerUnitPrice: 130000 },
  ],
  workPlan: {
    totalWeeks: 8,
    items: [
      { no: '1', task: 'เตรียมหน้างาน', duration: '1 สัปดาห์', weekCells: ['■', '', '', '', '', '', '', ''], status: 'planned' },
      { no: '2', task: 'ดำเนินงานหลัก', duration: '6 สัปดาห์', weekCells: ['', '■', '■', '■', '■', '■', '■', ''], status: 'planned' },
      { no: '3', task: 'ตรวจรับงาน', duration: '1 สัปดาห์', weekCells: ['', '', '', '', '', '', '', '■'], status: 'planned' },
    ],
  },
  taxData: {
    includeVat: true,
    includeWithholding: true,
    vatRate: 0.07,
    withholdingRate: 0.03,
  },
};

async function openAndAssertDocument(
  page: Page,
  cardLabelPattern: RegExp,
  modalLabelPattern: RegExp,
) {
  const cardButton = page.getByRole('button', { name: cardLabelPattern }).first();
  await expect(cardButton).toBeVisible();
  await expect(cardButton).toBeEnabled();
  await cardButton.click();

  const viewer = page.locator('div.fixed.inset-0.z-50');
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole('heading', { name: modalLabelPattern }).first()).toBeVisible();
  await expect(viewer.getByRole('button', { name: 'PDF' })).toBeVisible();
  await expect(viewer.getByRole('button', { name: 'LINE' })).toBeVisible();

  await viewer.getByRole('button', { name: 'กลับ' }).click();
  await expect(viewer).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ session, project }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('ezboq_auth_session', JSON.stringify(session));

    const storageKey = 'ezboq_projects';
    const scopedStorageKey = `ezboq_projects__u_${session.userId}`;
    const selectedKey = 'selectedProjectId';
    const scopedSelectedKey = `selectedProjectId__u_${session.userId}`;
    const versionKey = 'ezboq_data_version';
    const scopedVersionKey = `ezboq_data_version__u_${session.userId}`;

    const projectsPayload = JSON.stringify([project]);
    localStorage.setItem(storageKey, projectsPayload);
    localStorage.setItem(scopedStorageKey, projectsPayload);
    localStorage.setItem(selectedKey, project.id);
    localStorage.setItem(scopedSelectedKey, project.id);
    localStorage.setItem(versionKey, '7.9');
    localStorage.setItem(scopedVersionKey, '7.9');
  }, { session: MOCK_AUTH_SESSION, project: E2E_PROJECT });
});

test('pipeline core 7 documents support preview + PDF + LINE actions', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('เอกสารทั้งหมด')).toBeVisible();

  await openAndAssertDocument(page, /ใบเสนอราคา/, /ใบเสนอราคา/);
  await openAndAssertDocument(page, /สัญญาจ้าง/, /สัญญาจ้าง/);
  await openAndAssertDocument(page, /ใบวางบิล/, /ใบวางบิล/);
  await openAndAssertDocument(page, /ใบสั่งซื้อ \(PO\)/, /ใบสั่งซื้อ/);
  await openAndAssertDocument(page, /ใบกำกับภาษี/, /ใบกำกับภาษี/);
  await openAndAssertDocument(page, /หัก ณ ที่จ่าย/, /หัก ณ ที่จ่าย/);
  await openAndAssertDocument(page, /ใบเสร็จ/, /ใบเสร็จรับเงิน/);
});
