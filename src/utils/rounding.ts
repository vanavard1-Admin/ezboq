/**
 * 🎯 EZBOQ Rounding Policy (Universal)
 * 
 * ✅ P1: Uses Half-Up Rounding (NOT Banker's Rounding)
 * ✅ ใช้ทั้ง Client + Edge Functions
 * ✅ Decimal.js ROUND_HALF_UP (Standard Rounding)
 * 
 * หลักการ Half-Up Rounding:
 * - 0.5 ขึ้นไป → ปัดขึ้นเสมอ (round up)
 * - ต่ำกว่า 0.5 → ปัดลง (round down)
 * 
 * ตัวอย่าง Half-Up:
 * - 10.125 → 10.13 (ปัดขึ้น)
 * - 10.124 → 10.12 (ปัดลง)
 * - 10.500 → 10.50 (ปัดขึ้น)
 * - 10.5 → 11 (ปัดขึ้น)
 * - 11.5 → 12 (ปัดขึ้น - ไม่ใช่ banker's)
 * 
 * ⚠️ หมายเหตุ:
 * - ไม่ใช้ Banker's Rounding (ROUND_HALF_EVEN)
 * - Banker's rounding จะปัด 0.5 ไปยังเลขคู่ที่ใกล้ที่สุด
 * - Half-Up จะปัด 0.5 ขึ้นเสมอ (เป็นมาตรฐานทั่วไป)
 * - ทุกค่าเงินใช้ทศนิยม 2 ตำแหน่ง
 * - ใช้ Decimal.js เพื่อป้องกัน floating-point errors
 * 
 * @version 2.0.0
 * @since 2025-10-28
 * @policy half-up
 */

import Decimal from 'decimal.js';

/**
 * Rounding Mode Configuration
 * 
 * ROUND_HALF_UP (4):
 * - Standard rounding ที่ใช้ทั่วไป
 * - 0.5 ปัดขึ้นเสมอ
 * - ตรงกับพฤติกรรมของ Math.round() ใน JavaScript
 */
export const ROUNDING_MODE = Decimal.ROUND_HALF_UP;

/**
 * Decimal Places for Money
 * - ทุกค่าเงินใช้ 2 ทศนิยม (บาท + สตางค์)
 */
export const MONEY_DECIMALS = 2;

/**
 * Configure Decimal.js globally
 * ⚠️ ต้อง call ฟังก์ชันนี้ก่อนใช้งาน calculations
 */
export function configureDecimal() {
  Decimal.set({
    precision: 20,
    rounding: ROUNDING_MODE,
    toExpPos: 9e15,
    toExpNeg: -9e15,
    minE: -9e15,
    maxE: 9e15
  });
}

/**
 * Round decimal to money format (2 decimal places)
 * 
 * @param value - Decimal or number to round
 * @returns Rounded number with 2 decimals
 * 
 * @example
 * roundMoney(10.125) // 10.13
 * roundMoney(10.124) // 10.12
 * roundMoney(10.500) // 10.50
 */
export function roundMoney(value: Decimal | number): number {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  return decimal.toDecimalPlaces(MONEY_DECIMALS, ROUNDING_MODE).toNumber();
}

/**
 * Format number as Thai Baht currency
 * 
 * @param value - Number to format
 * @returns Formatted string (e.g., "1,234.56")
 */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format number as Thai Baht with symbol
 * 
 * @param value - Number to format
 * @returns Formatted string (e.g., "฿1,234.56")
 */
export function formatMoneyWithSymbol(value: number): string {
  return `฿${formatMoney(value)}`;
}

/**
 * Test rounding policy
 * ✅ Call this to verify rounding behavior
 */
export function testRoundingPolicy() {
  const testCases = [
    { input: 10.125, expected: 10.13 },
    { input: 10.124, expected: 10.12 },
    { input: 10.500, expected: 10.50 },
    { input: 10.501, expected: 10.50 },
    { input: 0.005, expected: 0.01 },
    { input: 0.004, expected: 0.00 },
  ];

  console.log('🧪 Testing EZBOQ Rounding Policy (ROUND_HALF_UP)');
  console.log('─'.repeat(50));

  let allPassed = true;

  testCases.forEach(({ input, expected }) => {
    const result = roundMoney(input);
    const passed = result === expected;
    
    console.log(
      `${passed ? '✅' : '❌'} roundMoney(${input}) = ${result} (expected ${expected})`
    );

    if (!passed) allPassed = false;
  });

  console.log('─'.repeat(50));
  console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed!');

  return allPassed;
}

// Auto-configure Decimal.js on import
configureDecimal();

export default {
  ROUNDING_MODE,
  MONEY_DECIMALS,
  configureDecimal,
  roundMoney,
  formatMoney,
  formatMoneyWithSymbol,
  testRoundingPolicy,
};
