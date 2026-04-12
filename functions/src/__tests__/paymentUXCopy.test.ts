import { describe, expect, it } from '@jest/globals';

import {
  getPaymentSuccessMessage,
  getPaymentThankYouMessage,
} from '../services/paymentUXCopy';

describe('paymentUXCopy success experience', () => {
  it('uses formal success confirmation wording', () => {
    const message = getPaymentSuccessMessage('EzDOC Team รายเดือน');
    expect(message).toContain('ได้รับการชำระเงินค่าสมาชิกเรียบร้อยแล้ว');
    expect(message).toContain('EzDOC Team รายเดือน');
    expect(message).toContain('เป็นที่เรียบร้อยแล้ว');
  });

  it('thanks the customer with a heartfelt EzDOC note', () => {
    const message = getPaymentThankYouMessage();
    expect(message).toContain('EzDOC ขอขอบพระคุณอย่างจริงใจ');
    expect(message).toContain('ไว้วางใจ');
    expect(message).toContain('กำลังใจสำคัญ');
  });
});
