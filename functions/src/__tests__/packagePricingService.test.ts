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

import {
  buildPackagePricingMessage,
  buildPackageRecommendationMessage,
  buildPackageTrialMessage,
  isPackagePricingQuestion,
} from '../services/packagePricingService';
import { getFaqResponse } from '../services/faqService';

describe('packagePricingService', () => {
  it('detects generic package pricing questions', () => {
    expect(isPackagePricingQuestion('ค่าบริการเท่าไหร่')).toBe(true);
    expect(isPackagePricingQuestion('แพ็กเกจมีราคาเท่าไหร่')).toBe(true);
    expect(isPackagePricingQuestion('ใช้ฟรีไหม')).toBe(false);
    expect(isPackagePricingQuestion('ค่าบริการออกแบบ 5000')).toBe(false);
    expect(isPackagePricingQuestion('ใบเสรอราคา')).toBe(false);
    expect(isPackagePricingQuestion('ทำใบเสรอราคา')).toBe(false);
  });

  it('builds pricing copy from real package config', () => {
    const message = buildPackagePricingMessage();
    expect(message).toContain('99');
    expect(message).toContain('891');
    expect(message).toContain('279');
    expect(message).toContain('2,511');
    expect(message).not.toContain('5000');
  });

  it('returns consistent recommendation and trial copy', () => {
    expect(buildPackageRecommendationMessage()).toContain('Team');
    expect(buildPackageTrialMessage()).toContain('10 ใบแรก');
    expect(buildPackageTrialMessage()).toContain('ลายน้ำ EzDOC');
    expect(buildPackageTrialMessage()).toContain('เชื่อมต่อ');
    expect(buildPackageTrialMessage()).toContain('99 บาท');
  });

  it('routes faq pricing question to package pricing message', () => {
    const faq = getFaqResponse('ค่าบริการเท่าไหร่');
    expect(faq).not.toBeNull();
    expect(faq?.message).toContain('EzDOC');
    expect(faq?.message).toContain('10 ใบแรก');
    expect(faq?.message).toContain('2,511');
    expect(faq?.message).not.toContain('5000');
  });

  it('does not route document typos into pricing faq', () => {
    expect(getFaqResponse('ใบเสรอราคา')).toBeNull();
    expect(getFaqResponse('ทำใบเสรอราคา')).toBeNull();
  });
});
