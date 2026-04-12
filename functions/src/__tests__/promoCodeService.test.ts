import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../core/firebaseAdmin', () => ({
  getDb: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
  })),
}));

jest.mock('firebase-admin', () => ({
  storage: jest.fn(() => ({
    bucket: jest.fn(),
  })),
  firestore: {
    Timestamp: {
      now: jest.fn(() => ({ toMillis: () => Date.now() })),
      fromMillis: jest.fn((ms: number) => ({ toMillis: () => ms })),
    },
    FieldValue: {
      serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
      delete: jest.fn(() => 'DELETE_FIELD'),
      increment: jest.fn((value: number) => value),
    },
  },
}));

import { applyPromoToAmount, isPendingPromoExpired } from '../services/promoCodeService';
import { PACKAGE_TYPE_PRO, PACKAGE_TYPE_PRO_YEAR } from '../services/purchaseService';

describe('promoCodeService', () => {
  it('blocks PRO99 from underpricing yearly Pro', () => {
    const result = applyPromoToAmount({
      baseAmount: 891,
      promo: {
        code: 'PRO99',
        applies_to: 'PRO',
        discounted_amount: 99,
        duration_months: 3,
        package_types: [PACKAGE_TYPE_PRO],
      },
      plan: 'PRO',
      packageType: PACKAGE_TYPE_PRO_YEAR,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('PACKAGE_MISMATCH');
    expect(result.finalAmount).toBe(891);
  });

  it('keeps PRO99 valid for monthly Pro', () => {
    const result = applyPromoToAmount({
      baseAmount: 99,
      promo: {
        code: 'PRO99',
        applies_to: 'PRO',
        discounted_amount: 99,
        duration_months: 3,
        package_types: [PACKAGE_TYPE_PRO],
      },
      plan: 'PRO',
      packageType: PACKAGE_TYPE_PRO,
    });

    expect(result.ok).toBe(true);
    expect(result.finalAmount).toBe(99);
    expect(result.durationMonths).toBe(3);
  });

  it('expires pending promo state after one hour', () => {
    const ninetyMinutesAgo = {
      toMillis: () => Date.now() - 90 * 60 * 1000,
    } as any;

    expect(isPendingPromoExpired(ninetyMinutesAgo)).toBe(true);
  });
});
