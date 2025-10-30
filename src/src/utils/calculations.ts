/**
 * BOQ Calculation Utilities
 * Production-ready calculation functions for BOQ system
 * 
 * ⚠️ CRITICAL: All monetary calculations use Decimal.js to avoid floating-point precision errors
 * This ensures accurate calculations for invoicing, taxes, and payments
 * 
 * 🎯 Rounding Policy: ROUND_HALF_UP (Standard Rounding)
 * - 0.5 ขึ้นไป → ปัดขึ้น
 * - ต่ำกว่า 0.5 → ปัดลง
 * - ใช้ทั้ง Client + Edge Functions
 */

import { BOQItem, Profile, Discount, BOQSummary } from '../types/boq';
import Decimal from 'decimal.js';
import { roundMoney, configureDecimal } from './rounding';

// Ensure Decimal.js is configured with EZBOQ rounding policy
configureDecimal();

/**
 * Helper function to convert Decimal to number with proper rounding
 * Always rounds to 2 decimal places for currency
 * Uses EZBOQ universal rounding policy (ROUND_HALF_UP)
 */
function toMoney(decimal: Decimal): number {
  return roundMoney(decimal);
}

/**
 * Create empty summary when no valid items exist
 */
function createEmptySummary(): BOQSummary & { discountAmount: number; totalAfterDiscount: number } {
  return {
    subtotalMaterial: 0,
    subtotalLabor: 0,
    subtotal: 0,
    waste: 0,
    opex: 0,
    error: 0,
    totalBeforeMarkup: 0,
    markup: 0,
    totalBeforeVat: 0,
    vat: 0,
    grandTotal: 0,
    totalMaterial: 0,
    totalLabor: 0,
    wastage: 0,
    operational: 0,
    contingency: 0,
    profit: 0,
    discountAmount: 0,
    totalAfterDiscount: 0,
  };
}

/**
 * Calculate BOQ Summary from items and profile
 * Uses Decimal.js for all calculations to prevent floating-point errors
 */
export function calculateBOQSummary(
  boqItems: BOQItem[],
  profile: Profile,
  discount?: Discount | null
): BOQSummary & { discountAmount: number; totalAfterDiscount: number } {
  // Early return for empty/null array
  if (!boqItems || !Array.isArray(boqItems) || boqItems.length === 0) {
    return createEmptySummary();
  }
  
  // Debug: Check for problematic items
  const invalidItems = boqItems.filter(item => 
    !item || 
    typeof item !== 'object' ||
    (item.material === undefined && item.labor === undefined) ||
    item.quantity === undefined
  );
  
  if (invalidItems.length > 0) {
    console.error('⚠️ Invalid BOQ items detected:', invalidItems);
  }
  
  // Filter out invalid items and calculate base totals using Decimal.js
  const validItems = boqItems.filter(item => 
    item && 
    typeof item === 'object' &&
    (item.material !== undefined || item.labor !== undefined) &&
    item.quantity !== undefined
  );
  
  if (validItems.length === 0) {
    if (boqItems.length > 0) {
      console.error('⚠️ All BOQ items are invalid!', boqItems);
    }
    return createEmptySummary();
  }
  
  const subtotalMaterial = toMoney(
    validItems.reduce(
      (sum, item) => {
        const material = Number(item.material) || 0;
        const quantity = Number(item.quantity) || 0;
        return sum.plus(new Decimal(material).times(quantity));
      },
      new Decimal(0)
    )
  );
  
  const subtotalLabor = toMoney(
    validItems.reduce(
      (sum, item) => {
        const labor = Number(item.labor) || 0;
        const quantity = Number(item.quantity) || 0;
        return sum.plus(new Decimal(labor).times(quantity));
      },
      new Decimal(0)
    )
  );
  
  const subtotal = toMoney(new Decimal(subtotalMaterial).plus(subtotalLabor));
  
  // Apply percentages using Decimal.js
  const waste = toMoney(
    new Decimal(subtotal).times(profile.wastePct).dividedBy(100)
  );
  const opex = toMoney(
    new Decimal(subtotal).times(profile.opexPct).dividedBy(100)
  );
  const error = toMoney(
    new Decimal(subtotal).times(profile.errorPct).dividedBy(100)
  );
  
  const totalBeforeMarkup = toMoney(
    new Decimal(subtotal).plus(waste).plus(opex).plus(error)
  );
  
  const markup = toMoney(
    new Decimal(totalBeforeMarkup).times(profile.markupPct).dividedBy(100)
  );
  
  const totalBeforeVat = toMoney(
    new Decimal(totalBeforeMarkup).plus(markup)
  );
  
  const vat = toMoney(
    new Decimal(totalBeforeVat).times(profile.vatPct).dividedBy(100)
  );
  
  const grandTotal = toMoney(
    new Decimal(totalBeforeVat).plus(vat)
  );
  
  // Calculate discount using Decimal.js
  let discountAmount = 0;
  if (discount) {
    if (discount.type === 'percent') {
      discountAmount = toMoney(
        new Decimal(grandTotal).times(discount.value).dividedBy(100)
      );
    } else {
      discountAmount = toMoney(new Decimal(discount.value));
    }
  }
  
  const totalAfterDiscount = toMoney(
    new Decimal(grandTotal).minus(discountAmount)
  );
  
  return {
    subtotalMaterial,
    subtotalLabor,
    subtotal,
    waste,
    opex,
    error,
    totalBeforeMarkup,
    markup,
    totalBeforeVat,
    vat,
    grandTotal,
    discountAmount,
    totalAfterDiscount,
    
    // Aliases for backward compatibility with PDFs
    totalMaterial: subtotalMaterial,
    totalLabor: subtotalLabor,
    wastage: waste,
    operational: opex,
    contingency: error,
    profit: markup,
  };
}

/**
 * Calculate BOQ Summary with withholding tax
 * Uses Decimal.js for precise tax calculations
 */
export function calculateBOQSummaryWithTax(
  boqItems: BOQItem[],
  profile: Profile,
  discount?: Discount | null,
  withholdingTaxRate: number = 0
): BOQSummary & { 
  discountAmount: number; 
  totalAfterDiscount: number;
  withholdingTaxAmount: number;
  netPayable: number;
} {
  const summary = calculateBOQSummary(boqItems, profile, discount);
  
  // Calculate withholding tax (applied to totalBeforeVat) using Decimal.js
  const withholdingTaxAmount = toMoney(
    new Decimal(summary.totalBeforeVat).times(withholdingTaxRate).dividedBy(100)
  );
  
  // Net payable = total after discount - withholding tax
  const netPayable = toMoney(
    new Decimal(summary.totalAfterDiscount).minus(withholdingTaxAmount)
  );
  
  return {
    ...summary,
    withholdingTaxAmount,
    netPayable,
  };
}

/**
 * Format currency in Thai format
 */
export function formatCurrency(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) {
    return '฿0.00';
  }
  
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with commas
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (!isFinite(value) || isNaN(value)) {
    return '0.00';
  }
  
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Calculate payment term amount
 * Uses Decimal.js for precise installment calculations
 */
export function calculatePaymentTermAmount(
  totalAmount: number,
  percentage?: number,
  fixedAmount?: number
): number {
  if (fixedAmount !== undefined) {
    return toMoney(new Decimal(fixedAmount));
  }
  if (percentage !== undefined) {
    return toMoney(
      new Decimal(totalAmount).times(percentage).dividedBy(100)
    );
  }
  return 0;
}

/**
 * 🎯 Smart Payment Terms Balancing
 * คำนวณงวดชำระเงินพร้อมปรับงวดสุดท้ายให้ลงตัว 100%
 * 
 * ✅ แก้ปัญหาทศนิยมไม่ลงตัว (เช่น 33.33% x 3 = 99.99%)
 * ✅ ใช้ Decimal.js เพื่อความแม่นยำ
 * ✅ งวดสุดท้ายจะเป็น "งวดปิดยอด" รับยอดที่เหลือทั้งหมด
 * 
 * @param totalAmount - ยอดรวมทั้งหมด
 * @param terms - รายการงวดชำระ
 * @returns Array ของจำนวนเงินแต่ละงวด (รวมกันได้พอดี totalAmount)
 */
export function calculateBalancedPaymentTerms(
  totalAmount: number,
  terms: Array<{ percentage?: number; amount?: number }>
): number[] {
  if (!terms || terms.length === 0) {
    return [];
  }

  const total = new Decimal(totalAmount);
  const amounts: number[] = [];
  let accumulated = new Decimal(0);

  // คำนวณทุกงวดยกเว้นงวดสุดท้าย
  for (let i = 0; i < terms.length - 1; i++) {
    const term = terms[i];
    let amount: Decimal;

    if (term.amount !== undefined) {
      amount = new Decimal(term.amount);
    } else if (term.percentage !== undefined) {
      amount = total.times(term.percentage).dividedBy(100);
    } else {
      amount = new Decimal(0);
    }

    // ปัดเศษแต่ละงวด
    const rounded = toMoney(amount);
    amounts.push(rounded);
    accumulated = accumulated.plus(rounded);
  }

  // งวดสุดท้าย = ยอดรวม - ยอดสะสม (ป้องกันเศษทศนิยม)
  const lastTerm = terms[terms.length - 1];
  let lastAmount: Decimal;

  if (lastTerm.amount !== undefined) {
    // ถ้างวดสุดท้ายเป็นจำนวนคงที่ ให้ใช้ค่านั้น
    lastAmount = new Decimal(lastTerm.amount);
  } else {
    // ถ้าเป็นเปอร์เซ็นต์ ให้ใช้ยอดที่เหลือ (Smart Balancing)
    lastAmount = total.minus(accumulated);
  }

  amounts.push(toMoney(lastAmount));

  return amounts;
}

/**
 * ตรวจสอบว่างวดชำระสมดุลหรือไม่
 * ใช้ Decimal.js เพื่อความแม่นยำ
 * 
 * @param totalAmount - ยอดรวมที่ต้องการ
 * @param allocatedAmounts - Array ของจำนวนเงินที่จัดสรร
 * @returns { balanced: boolean, difference: number }
 */
export function validatePaymentBalance(
  totalAmount: number,
  allocatedAmounts: number[]
): { balanced: boolean; difference: number; totalAllocated: number } {
  const total = new Decimal(totalAmount);
  const allocated = allocatedAmounts.reduce(
    (sum, amount) => sum.plus(new Decimal(amount)),
    new Decimal(0)
  );

  const difference = toMoney(total.minus(allocated));
  const totalAllocated = toMoney(allocated);

  // ถือว่าสมดุลถ้าต่างกันไม่เกิน 0.01 บาท (1 สตางค์)
  const balanced = Math.abs(difference) <= 0.01;

  return {
    balanced,
    difference,
    totalAllocated,
  };
}

/**
 * Validate BOQ items
 */
export function validateBOQItems(items: BOQItem[]): boolean {
  if (!items || items.length === 0) {
    return false;
  }
  
  return items.every(item => {
    return (
      item.quantity > 0 &&
      isFinite(item.material) &&
      isFinite(item.labor) &&
      !isNaN(item.quantity) &&
      !isNaN(item.material) &&
      !isNaN(item.labor)
    );
  });
}
