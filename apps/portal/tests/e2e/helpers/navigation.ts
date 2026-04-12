import { Page } from '@playwright/test';

export async function goToNewDocument(page: Page): Promise<void> {
  await page.goto('/dashboard/documents/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
}
