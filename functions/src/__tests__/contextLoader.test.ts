import { describe, expect, it } from '@jest/globals';

import { formatContextForPrompt, type BusinessContext } from '../jarvis/contextLoader';

describe('contextLoader working memory prompt', () => {
  it('includes draft, pending purchase, and latest unpaid invoice in prompt context', () => {
    const prompt = formatContextForPrompt({
      uid: 'uid-1',
      plan: 'FREE',
      planLabel: 'ฟรี (สิทธิ์พื้นฐาน)',
      businessId: 'biz-1',
      businessName: 'EzDOC Studio',
      hasBankAccount: true,
      hasPromptPay: true,
      hasLogo: false,
      setupComplete: true,
      recentCustomers: [],
      recentDocuments: [],
      monthlyDocCount: 3,
      monthlyRevenue: 5000,
      unpaidInvoiceCount: 1,
      workingMemory: {
        latestDraft: {
          source: 'jarvis_draft',
          docType: 'BILL',
          status: 'pending_confirm',
          customerName: 'นิด้า',
          notes: 'งวดที่ 1',
          sourceDocNo: 'QUO-256903-001',
          installmentNo: 1,
          installmentAmount: 5000,
          installmentRemaining: 10000,
          total: 5000,
          itemCount: 1,
          updatedAtMs: Date.now(),
        },
        pendingPurchase: {
          source: 'credit_purchase',
          status: 'WAITING_FOR_SLIP',
          packageLabel: 'EzDOC Team',
          amount: 279,
          referenceId: 'EZ12345',
          expiresAtMs: Date.now(),
        },
        latestUnpaidInvoice: {
          docNo: 'INV-256903-003',
          customer: 'นิด้า',
          amount: 5000,
          status: 'ISSUED',
          notes: 'งวดที่ 1',
          createdAtMs: Date.now(),
        },
      },
    } satisfies BusinessContext);

    expect(prompt).toContain('Working memory ล่าสุด:');
    expect(prompt).toContain('draft ล่าสุด:');
    expect(prompt).toContain('ลูกค้า นิด้า');
    expect(prompt).toContain('อ้างอิงเอกสาร: QUO-256903-001');
    expect(prompt).toContain('หมายเหตุปัจจุบัน: งวดที่ 1');
    expect(prompt).toContain('pending purchase: EzDOC Team');
    expect(prompt).toContain('unpaid invoice ล่าสุด: INV-256903-003');
  });
});
