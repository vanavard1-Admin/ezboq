/**
 * Tests for normalizeThaiInput function
 * 
 * Note: Tests may not run until Jest is fully configured
 */

import { normalizeThaiInput, parseForgivingInput, ParsedActionType } from '../forgivingParser';

describe('normalizeThaiInput', () => {
  test('inserts space between Thai letters and digits', () => {
    expect(normalizeThaiInput('ขนส่ง82749')).toBe('ขนส่ง 82749');
    expect(normalizeThaiInput('ค่าบริการขนส่ง3000')).toBe('ค่าบริการขนส่ง 3000');
    expect(normalizeThaiInput('3000บาท')).toBe('3000 บาท');
    expect(normalizeThaiInput('service3000')).toBe('service 3000');
  });

  test('inserts space after keywords', () => {
    expect(normalizeThaiInput('ลูกค้านายABC')).toBe('ลูกค้า นายABC');
    expect(normalizeThaiInput('เพิ่มรายการขนส่ง82749')).toBe('เพิ่มรายการ ขนส่ง 82749');
    expect(normalizeThaiInput('ออกเอกสาร!')).toBe('ออกเอกสาร!');
  });

  test('preserves URLs and emails', () => {
    expect(normalizeThaiInput('www.example.com')).toBe('www.example.com');
    expect(normalizeThaiInput('test@example.com')).toBe('test@example.com');
    expect(normalizeThaiInput('https://example.com')).toBe('https://example.com');
  });

  test('collapses multiple spaces', () => {
    expect(normalizeThaiInput('ขนส่ง   82749')).toBe('ขนส่ง 82749');
  });

  test('handles already spaced text', () => {
    expect(normalizeThaiInput('ขนส่ง 82749')).toBe('ขนส่ง 82749');
    expect(normalizeThaiInput('ลูกค้า นายABC')).toBe('ลูกค้า นายABC');
  });
});

describe('parseForgivingInput with normalization', () => {
  const context = {
    hasActiveDraft: true,
    hasCustomer: false,
    hasItems: false,
  };

  test('parses unspaced item input', () => {
    const actions = parseForgivingInput('ขนส่ง82749', context);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe(ParsedActionType.ADD_ITEM);
    expect(actions[0].payload?.item?.name).toBe('ขนส่ง');
    expect(actions[0].payload?.item?.price).toBe(82749);
  });

  test('parses unspaced customer input', () => {
    const actions = parseForgivingInput('ลูกค้านายABC', context);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe(ParsedActionType.SET_CUSTOMER_NAME);
    expect(actions[0].payload?.customerName).toBe('นายABC');
  });

  test('parses unspaced item with keyword', () => {
    const actions = parseForgivingInput('เพิ่มรายการขนส่ง82749', context);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe(ParsedActionType.ADD_ITEM);
    expect(actions[0].payload?.item?.name).toBe('ขนส่ง');
    expect(actions[0].payload?.item?.price).toBe(82749);
  });

  test('detects CONFIRM command', () => {
    const actions = parseForgivingInput('ออกเอกสาร', context);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe(ParsedActionType.CONFIRM);
  });

  test('detects CONFIRM command with punctuation', () => {
    const actions = parseForgivingInput('ออกเอกสาร!', context);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe(ParsedActionType.CONFIRM);
  });

  test('parses mixed spaced and unspaced', () => {
    const actions = parseForgivingInput('ค่าขนส่ง3000', context);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe(ParsedActionType.ADD_ITEM);
    expect(actions[0].payload?.item?.name).toBe('ค่าขนส่ง');
    expect(actions[0].payload?.item?.price).toBe(3000);
  });
});

