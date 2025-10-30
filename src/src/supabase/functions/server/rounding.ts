/**
 * 🎯 EZBOQ Rounding Policy (Edge Functions)
 * 
 * ✅ P1: Uses Half-Up Rounding (NOT Banker's Rounding)
 * ✅ ใช้ร่วมกับ /utils/rounding.ts (Client)
 * ✅ Decimal.js ROUND_HALF_UP (Standard Rounding)
 * 
 * หลักการ Half-Up Rounding:
 * - 0.5 ขึ้นไป → ปัดขึ้นเสมอ (round up)
 * - ต่ำกว่า 0.5 → ปัดลง (round down)
 * 
 * ⚠️ NOT Banker's Rounding (Half-Even):
 * Banker's rounding would round 0.5 to nearest even number
 * We use Half-Up which always rounds 0.5 up
 * 
 * ตัวอย่าง Half-Up:
 * - 10.125 → 10.13 (ปัดขึ้น)
 * - 10.124 → 10.12 (ปัดลง)
 * - 10.500 → 10.50 (ปัดขึ้น)
 * - 10.5 → 11 (ปัดขึ้น)
 * - 11.5 → 12 (ปัดขึ้น - ไม่ใช่ banker's rounding)
 * 
 * @version 2.0.0
 * @since 2025-10-28
 * @policy half-up
 */

import Decimal from 'npm:decimal.js@10.4.3';

/**
 * Rounding Mode: ROUND_HALF_UP (4)
 * - Standard rounding
 * - 0.5 ปัดขึ้นเสมอ
 */
export const ROUNDING_MODE = Decimal.ROUND_HALF_UP;

/**
 * Decimal Places for Money
 */
export const MONEY_DECIMALS = 2;

/**
 * Configure Decimal.js globally
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
 */
export function roundMoney(value: Decimal | number): number {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  return decimal.toDecimalPlaces(MONEY_DECIMALS, ROUNDING_MODE).toNumber();
}

/**
 * Format number as Thai Baht currency
 */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Auto-configure on import
configureDecimal();

export default {
  ROUNDING_MODE,
  MONEY_DECIMALS,
  configureDecimal,
  roundMoney,
  formatMoney,
};
