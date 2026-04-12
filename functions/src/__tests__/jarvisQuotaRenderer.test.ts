import { describe, expect, it } from '@jest/globals';

import { buildBlockedMessage, buildTextFillBar } from '../jarvis/quotaRenderer';
import type { JarvisQuota } from '../jarvis/quotaService';

const baseQuota: JarvisQuota = {
  questionsUsed: 0,
  questionsLimit: 99999,
  documentsUsed: 10,
  documentsLimit: 10,
  plan: 'FREE',
  periodStart: 0,
  periodEnd: 0,
  updatedAt: 0,
};

describe('jarvisQuotaRenderer', () => {
  it('uses starter-free upgrade copy for blocked free users', () => {
    const blocked = buildBlockedMessage(baseQuota);

    expect(blocked.text).toContain('สิทธิ์ฟรี 10 ใบแรก');
    expect(blocked.text).toContain('ซื้อแพ็ค 99');
    expect(blocked.text).toContain('ซื้อแพ็ค 279');
    expect(blocked.text).not.toContain('เดือนนี้');
    expect(blocked.text).not.toContain('99/เดือน');
  });

  it('renders unlimited plans without the old Pro-only wording', () => {
    const text = buildTextFillBar({
      ...baseQuota,
      plan: 'BASIC',
      documentsUsed: 12,
      documentsLimit: 99999,
    });

    expect(text).toContain('ออกเอกสารไม่จำกัด');
    expect(text).not.toContain('Pro —');
  });
});
