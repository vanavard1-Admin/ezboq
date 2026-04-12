import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../core/firebaseAdmin', () => ({
  getDb: jest.fn(() => ({
    collection: jest.fn(),
    collectionGroup: jest.fn(),
  })),
}));

import {
  buildDocumentFingerprintFromPayload,
  buildDocumentFingerprintFromSnapshot,
  normalizeFingerprint,
  normalizeVerificationKind,
} from '../services/verificationService';

describe('verificationService', () => {
  it('normalizes supported verification kinds', () => {
    expect(normalizeVerificationKind('document')).toBe('document');
    expect(normalizeVerificationKind('tax_summary')).toBe('tax-summary');
    expect(normalizeVerificationKind('WHT')).toBe('wht-certificate');
    expect(normalizeVerificationKind('unknown')).toBeNull();
  });

  it('normalizes fingerprints to uppercase hex', () => {
    expect(normalizeFingerprint('ab-12 cd')).toBe('AB12CD');
  });

  it('builds the same document fingerprint from payload and Firestore snapshot shapes', () => {
    const payload = {
      doc: {
        id: 'doc_123',
        no: 'CN-2569-0001',
        status: 'ISSUED',
        issue_date: '2026-03-11T00:00:00.000Z',
      },
      business: {
        tax_id: '0105559999999',
      },
      customer: {
        tax_id: '0101112223334',
      },
      totals: {
        total: 1250,
      },
    };

    const snapshot = {
      doc_no: 'CN-2569-0001',
      status: 'ISSUED',
      issue_date: '2026-03-11T00:00:00.000Z',
      total_amount: 1250,
      business_snapshot: {
        tax_id: '0105559999999',
      },
      customer_snapshot: {
        tax_id: '0101112223334',
      },
    };

    const fromPayload = buildDocumentFingerprintFromPayload(payload);
    const fromSnapshot = buildDocumentFingerprintFromSnapshot('doc_123', snapshot);

    expect(fromPayload).toBe('9FE2157A113E6584B10E');
    expect(fromSnapshot).toBe(fromPayload);
  });
});
