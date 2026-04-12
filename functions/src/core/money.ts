/**
 * Money Calculation Module
 * Calculate subtotal, VAT, WHT, and net amounts
 */

import { MoneyResult } from '../shared/types';

export interface MoneyInput {
    items: { qty: number; unit_price: number; amount?: number }[];
    discount_amount: number;
    extra_fee_amount: number;
    vat_enabled: boolean;
    vat_rate: number; // percentage (e.g., 7 for 7%)
    wht_enabled: boolean;
    wht_rate: number; // percentage (e.g., 3 for 3%)
}

/**
 * Round to 2 decimal places
 */
const round2 = (n: number): number => {
    return Math.round((n + Number.EPSILON) * 100) / 100;
};

/**
 * Clamp negative values to 0
 */
const clamp0 = (n: number): number => {
    return Number.isFinite(n) ? Math.max(0, n) : 0;
};

/**
 * Calculate all money fields for a document
 * @param input - Items, discounts, fees, and tax settings
 * @returns Complete money calculation result
 */
export function calcMoney(input: MoneyInput): MoneyResult {
    // Calculate subtotal from items
    const subtotal = round2(
        input.items.reduce((acc, it) => {
            const itemAmount = round2(clamp0(it.qty) * clamp0(it.unit_price));
            return acc + itemAmount;
        }, 0)
    );

    // Apply discount and extra fees
    const discount = round2(clamp0(input.discount_amount || 0));
    const extra = round2(clamp0(input.extra_fee_amount || 0));
    const before_vat = round2(subtotal - discount + extra);

    // Calculate VAT (applied to before_vat amount)
    const vat_amount = input.vat_enabled
        ? round2((before_vat * clamp0(input.vat_rate)) / 100)
        : 0;

    // Total with VAT
    const total_amount = round2(before_vat + vat_amount);

    // Calculate WHT (withholding tax)
    // Default: based on before_vat amount
    const wht_amount = input.wht_enabled
        ? round2((before_vat * clamp0(input.wht_rate)) / 100)
        : 0;

    // Net amount to receive (total minus withholding)
    const net_receive_amount = round2(total_amount - wht_amount);

    return {
        subtotal,
        discount,
        extra,
        before_vat,
        vat_amount,
        total_amount,
        wht_amount,
        net_receive_amount,
    };
}
