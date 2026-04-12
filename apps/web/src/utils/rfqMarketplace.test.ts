import { describe, expect, it } from 'vitest';
import { buildPurchaseListFromMatches, buildVendorQuoteOptions, calculateLandedCost } from './rfqMarketplace';
import type { BoqShopMatch } from './boqShopIntegration';

describe('rfqMarketplace', () => {
  it('calculates landed cost from materials plus shipping', () => {
    expect(calculateLandedCost(12_500, 650)).toBe(13_150);
  });

  it('summarizes matched, review, and unmatched purchase-list lines', () => {
    const matches: BoqShopMatch[] = [
      {
        boqItem: { no: '1.1', description: 'ปูนซีเมนต์ปอร์ตแลนด์', unit: 'ถุง', quantity: 10, unitPrice: '', laborCost: '' },
        product: {
          id: 'product-1',
          sku: 'EZ-CEM-001',
          name: 'ปูนซีเมนต์ปอร์ตแลนด์',
          categoryId: 'cement-mortar',
          vendorId: 'vendor-siam',
          unit: 'ถุง',
          price: 135,
          stock: 100,
          leadTimeDays: 1,
        },
        confidence: 0.76,
        note: 'match by name',
      },
      {
        boqItem: { no: '1.2', description: 'กระเบื้องผนังสีขาว', unit: 'ตร.ม.', quantity: 20, unitPrice: '', laborCost: '' },
        product: {
          id: 'product-2',
          sku: 'EZ-TIL-001',
          name: 'กระเบื้องผนัง 30x60',
          categoryId: 'tile-floor',
          vendorId: 'vendor-homepro',
          unit: 'ตร.ม.',
          price: 320,
          stock: 50,
          leadTimeDays: 3,
        },
        confidence: 0.41,
        note: 'review',
      },
      {
        boqItem: { no: '1.3', description: 'วัสดุหายาก', unit: 'ชุด', quantity: 1, unitPrice: '', laborCost: '' },
        confidence: 0,
        note: 'unmatched',
      },
    ];

    const purchaseList = buildPurchaseListFromMatches(matches);
    expect(purchaseList.matchedLines).toBe(1);
    expect(purchaseList.reviewLines).toBe(1);
    expect(purchaseList.unmatchedLines).toBe(1);
    expect(purchaseList.estimatedSubtotal).toBe(7_750);
  });

  it('returns vendor quotes sorted by lowest landed cost first', () => {
    const matches: BoqShopMatch[] = [
      {
        boqItem: { no: '1.1', description: 'ปูนซีเมนต์ปอร์ตแลนด์', unit: 'ถุง', quantity: 10, unitPrice: '', laborCost: '' },
        product: {
          id: 'product-1',
          sku: 'EZ-CEM-001',
          name: 'ปูนซีเมนต์ปอร์ตแลนด์',
          categoryId: 'cement-mortar',
          vendorId: 'vendor-siam',
          unit: 'ถุง',
          price: 135,
          stock: 100,
          leadTimeDays: 1,
          alternateOffers: [
            { vendorId: 'vendor-thaiwatsadu', price: 145, leadTimeDays: 2 },
            { vendorId: 'vendor-homepro', price: 152, leadTimeDays: 3 },
          ],
        },
        confidence: 0.88,
        note: 'match by name',
      },
    ];

    const purchaseList = buildPurchaseListFromMatches(matches);
    const quotes = buildVendorQuoteOptions(purchaseList, matches);
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes[0].landedCost).toBeLessThanOrEqual(quotes[quotes.length - 1].landedCost);
  });
});
