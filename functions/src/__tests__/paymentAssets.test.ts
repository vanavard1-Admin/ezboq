import { describe, expect, it } from '@jest/globals';
import { buildPaymentSnapshot } from '../shared/paymentAssets';

describe('paymentAssets bank normalization', () => {
  it('resolves Thai bank names into canonical bank code and logo', () => {
    const snapshot = buildPaymentSnapshot({
      method: 'BANK_TRANSFER',
      bank_code: 'กสิกรไทย',
      bank_account: '123-4-56789-0',
      bank_account_name: 'EzDOC Co., Ltd.',
    });

    expect(snapshot).toMatchObject({
      method: 'BANK_TRANSFER',
      bank_code: 'KBANK',
      bank_name: 'ธนาคารกสิกรไทย',
      bank_account: '123-4-56789-0',
      bank_account_name: 'EzDOC Co., Ltd.',
    });
    expect(snapshot?.bank_logo_url).toContain('/payment-logos/banks/KBANK.png');
  });

  it('keeps PromptPay snapshots able to show hybrid bank logo from Thai name', () => {
    const snapshot = buildPaymentSnapshot({
      method: 'PROMPTPAY',
      promptpay_account: '0812345678',
      bank_code: 'ไทยพาณิชย์',
    });

    expect(snapshot).toMatchObject({
      method: 'PROMPTPAY',
      bank_code: 'SCB',
      bank_name: 'ธนาคารไทยพาณิชย์',
    });
    expect(snapshot?.bank_logo_url).toContain('/payment-logos/banks/SCB.png');
  });
});
