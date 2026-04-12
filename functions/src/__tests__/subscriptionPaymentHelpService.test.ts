import { describe, expect, it } from '@jest/globals';

import {
  buildSubscriptionPaymentHelpMessage,
  isSubscriptionPaymentHelpQuestion,
} from '../services/subscriptionPaymentHelpService';
import { getFaqResponse } from '../services/faqService';

describe('subscriptionPaymentHelpService', () => {
  it('detects subscription payment help questions', () => {
    expect(isSubscriptionPaymentHelpQuestion('จ่ายเงินยังไง')).toBe(true);
    expect(isSubscriptionPaymentHelpQuestion('สมัครแพ็กยังไง')).toBe(true);
    expect(isSubscriptionPaymentHelpQuestion('ทางไลน์จ่ายไม่ได้แล้วเหรอ')).toBe(true);
    expect(isSubscriptionPaymentHelpQuestion('ลูกค้าจ่ายบิลยังไง')).toBe(false);
    expect(isSubscriptionPaymentHelpQuestion('ซื้อแพ็ค99')).toBe(false);
    expect(isSubscriptionPaymentHelpQuestion('ซื้อแพ็ค 99')).toBe(false);
    expect(isSubscriptionPaymentHelpQuestion('ซื้อแพ็ค399')).toBe(false);
  });

  it('returns current LINE-first payment instructions', () => {
    const message = buildSubscriptionPaymentHelpMessage();
    expect(message).toContain('10 ใบแรก');
    expect(message).toContain('ผ่าน LINE ได้');
    expect(message).toContain('PromptPay QR');
    expect(message).toContain('ส่งสลิป');
    expect(message).toContain('เชื่อมต่อ');
    expect(message).toContain('ซื้อแพ็ค 279');
  });

  it('routes faq payment question away from generic AI answer', () => {
    const faq = getFaqResponse('จ่ายเงินยังไง');
    expect(faq).not.toBeNull();
    expect(faq?.message).toContain('PromptPay QR');
    expect(faq?.message).toContain('ซื้อแพ็ค 99');
    expect(faq?.message).not.toContain('บัตรเครดิต/เดบิต');
  });
});
