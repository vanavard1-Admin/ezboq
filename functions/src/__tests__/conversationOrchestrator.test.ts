import { describe, expect, it } from '@jest/globals';

import { Intent, recognizeIntent } from '../core/conversationOrchestrator';

describe('conversationOrchestrator', () => {
  it('routes natural bill creation wording to invoice intent', () => {
    expect(recognizeIntent('ช่วยทำบิลให้หน่อย')).toBe(Intent.CREATE_INVOICE);
    expect(recognizeIntent('ขอบิลให้หน่อย')).toBe(Intent.CREATE_INVOICE);
  });

  it('keeps report wording specific after removing generic bill matching', () => {
    expect(recognizeIntent('บิลค้าง')).toBe(Intent.REPORT);
  });
});
