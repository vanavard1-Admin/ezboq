import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../core/firebaseAdmin', () => ({
  getDb: jest.fn(() => ({
    collection: jest.fn(),
  })),
}));

import {
  canCreateDocumentTypeForPlan,
  getEffectiveSubscriptionPlan,
  getEffectiveSubscriptionStatus,
  isSubscriptionCurrentlyActive,
  normalizePlanDocumentType,
} from '../core/planService';

describe('planService document type gating', () => {
  it('normalizes BILL/RECEIPT aliases to canonical plan document types', () => {
    expect(normalizePlanDocumentType('BILL')).toBe('INV');
    expect(normalizePlanDocumentType('INVOICE')).toBe('INV');
    expect(normalizePlanDocumentType('RECEIPT')).toBe('REC');
    expect(normalizePlanDocumentType('CREDIT_NOTE')).toBe('CN');
    expect(normalizePlanDocumentType('DEBIT_NOTE')).toBe('DN');
  });

  it('allows TEAM users to create BILL and RECEIPT documents', () => {
    expect(canCreateDocumentTypeForPlan('TEAM', 'BILL')).toBe(true);
    expect(canCreateDocumentTypeForPlan('TEAM', 'RECEIPT')).toBe(true);
  });

  it('keeps FREE users blocked from BILL aliases', () => {
    expect(canCreateDocumentTypeForPlan('FREE', 'BILL')).toBe(false);
    expect(canCreateDocumentTypeForPlan('FREE', 'INVOICE')).toBe(false);
    expect(canCreateDocumentTypeForPlan('FREE', 'RECEIPT')).toBe(false);
  });

  it('treats expired paid subscriptions as FREE for access checks', () => {
    const expiredTeam = {
      plan: 'TEAM',
      status: 'ACTIVE',
      periodEnd: {
        toMillis: () => Date.now() - 60_000,
      },
    };

    expect(isSubscriptionCurrentlyActive(expiredTeam)).toBe(false);
    expect(getEffectiveSubscriptionPlan(expiredTeam)).toBe('FREE');
    expect(getEffectiveSubscriptionStatus(expiredTeam)).toBe('FREE');
  });

  it('keeps active paid subscriptions effective until period end', () => {
    const activePro = {
      plan: 'PRO',
      status: 'ACTIVE',
      periodEnd: {
        toMillis: () => Date.now() + 60_000,
      },
    };

    expect(isSubscriptionCurrentlyActive(activePro)).toBe(true);
    expect(getEffectiveSubscriptionPlan(activePro)).toBe('PRO');
    expect(getEffectiveSubscriptionStatus(activePro)).toBe('ACTIVE');
  });
});
