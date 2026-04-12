import { describe, expect, it } from '@jest/globals';

import {
  isExplicitJarvisActivation,
  isJarvisIntent,
  shouldPreferDeterministicDocumentFlow,
} from '../jarvis';

describe('jarvis routing guards', () => {
  it('keeps explicit AI activation available', () => {
    expect(isExplicitJarvisActivation('ai')).toBe(true);
    expect(isExplicitJarvisActivation('จาวิส')).toBe(true);
    expect(isExplicitJarvisActivation('ทำใบเสนอราคา')).toBe(false);
  });

  it('prefers deterministic flow for standard document commands', () => {
    expect(shouldPreferDeterministicDocumentFlow('ทำใบเสนอราคา')).toBe(true);
    expect(shouldPreferDeterministicDocumentFlow('ใบเสนอราคา')).toBe(true);
    expect(shouldPreferDeterministicDocumentFlow('ใบเสรอราคา')).toBe(true);
    expect(shouldPreferDeterministicDocumentFlow('ลูกค้า Holiday Park Residences')).toBe(true);
    expect(shouldPreferDeterministicDocumentFlow('เพิ่มรายการ ค่าออกแบบ 200000')).toBe(true);
    expect(shouldPreferDeterministicDocumentFlow('ตัวอย่างเอกสาร')).toBe(true);
    expect(shouldPreferDeterministicDocumentFlow('จ่ายเงินสด')).toBe(true);
    expect(
      shouldPreferDeterministicDocumentFlow('ลูกค้า Holiday Park Residences\nรายการ\nค่าออกแบบ 200000')
    ).toBe(true);
    expect(
      shouldPreferDeterministicDocumentFlow('คุณ ไก่\nรายละเอียดรายการงาน:\n• หมวด E งานระบบไฟฟ้า\n• E.1 จำนวน 1 งาน ราคา 17,500 บาท')
    ).toBe(true);
  });

  it('does not auto-route standard document commands into Jarvis AI', () => {
    expect(isJarvisIntent('ทำใบเสนอราคา')).toBe(false);
    expect(isJarvisIntent('ลูกค้า Holiday Park Residences')).toBe(false);
  });

  it('still allows explicit AI-prefixed prompts to use Jarvis', () => {
    expect(isJarvisIntent('ai ช่วยสรุปยอดขายเดือนนี้')).toBe(true);
  });
});
