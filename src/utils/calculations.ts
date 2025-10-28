/**
 * BOQ Calculation Utilities
 * Production-ready calculation functions for BOQ system
 */

import { BOQItem, Profile, Discount, BOQSummary } from '../types/boq';

/**
 * Calculate BOQ Summary from items and profile
 */
export function calculateBOQSummary(
  boqItems: BOQItem[],
  profile: Profile,
  discount?: Discount | null
): BOQSummary & { discountAmount: number; totalAfterDiscount: number } {
  // Calculate base totals
  const subtotalMaterial = boqItems.reduce(
    (sum, item) => sum + (item.material * item.quantity),
    0
  );
  
  const subtotalLabor = boqItems.reduce(
    (sum, item) => sum + (item.labor * item.quantity),
    0
  );
  
  const subtotal = subtotalMaterial + subtotalLabor;
  
  // Apply percentages
  const waste = subtotal * (profile.wastePct / 100);
  const opex = subtotal * (profile.opexPct / 100);
  const error = subtotal * (profile.errorPct / 100);
  const totalBeforeMarkup = subtotal + waste + opex + error;
  const markup = totalBeforeMarkup * (profile.markupPct / 100);
  const totalBeforeVat = totalBeforeMarkup + markup;
  const vat = totalBeforeVat * (profile.vatPct / 100);
  const grandTotal = totalBeforeVat + vat;
  
  // Calculate discount
  let discountAmount = 0;
  if (discount) {
    discountAmount = discount.type === 'percent'
      ? grandTotal * (discount.value / 100)
      : discount.value;
  }
  
  const totalAfterDiscount = grandTotal - discountAmount;
  
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
  
  // Calculate withholding tax (applied to totalBeforeVat)
  const withholdingTaxAmount = summary.totalBeforeVat * (withholdingTaxRate / 100);
  
  // Net payable = total after discount - withholding tax
  const netPayable = summary.totalAfterDiscount - withholdingTaxAmount;
  
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
 */
export function calculatePaymentTermAmount(
  totalAmount: number,
  percentage?: number,
  fixedAmount?: number
): number {
  if (fixedAmount !== undefined) {
    return fixedAmount;
  }
  if (percentage !== undefined) {
    return totalAmount * (percentage / 100);
  }
  return 0;
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
