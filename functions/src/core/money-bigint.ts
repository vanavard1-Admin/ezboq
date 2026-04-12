/**
 * Money Calculation Module (BigInt Implementation)
 * Ensuring 100% tax accuracy (VAT/WHT) during AutoFlow.
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
 * Scale factor for currency calculations (to handle 2 decimal places)
 */
const SCALE = 100n;

/**
 * Converts a number to BigInt cents (scaled by 100)
 */
const toCents = (n: number): bigint => BigInt(Math.round(n * 100));

/**
 * Converts BigInt cents back to number (dividing by 100)
 */
const fromCents = (b: bigint): number => Number(b) / 100;

/**
 * Calculate all money fields for a document using BigInt for precision
 * @param input - Items, discounts, fees, and tax settings
 * @returns Complete money calculation result
 */
export function calcMoney(input: MoneyInput): MoneyResult {
    // 1. Sum up subtotal
    let subtotalCents = 0n;
    for (const it of input.items) {
        const itemQtyCents = toCents(Math.max(0, it.qty));
        const itemUnitPriceCents = toCents(Math.max(0, it.unit_price));
        // qty (scaled 100) * unitPrice (scaled 100) = scaled 10000
        // Divide by SCALE to get scaled 100 (cents)
        const itemAmountCents = (itemQtyCents * itemUnitPriceCents) / SCALE;
        subtotalCents += itemAmountCents;
    }

    // 2. Adjustments
    const discountCents = toCents(Math.max(0, input.discount_amount || 0));
    const extraCents = toCents(Math.max(0, input.extra_fee_amount || 0));
    const beforeVatCents = subtotalCents - discountCents + extraCents;

    // 3. Taxes
    let vatAmountCents = 0n;
    if (input.vat_enabled && input.vat_rate > 0) {
        // (beforeVat * rate) / 100
        vatAmountCents = (beforeVatCents * BigInt(Math.round(input.vat_rate))) / 100n;
    }

    const totalAmountCents = beforeVatCents + vatAmountCents;

    let whtAmountCents = 0n;
    if (input.wht_enabled && input.wht_rate > 0) {
        // (beforeVat * rate) / 100
        whtAmountCents = (beforeVatCents * BigInt(Math.round(input.wht_rate))) / 100n;
    }

    // 4. Net Receive
    const netReceiveAmountCents = totalAmountCents - whtAmountCents;

    return {
        subtotal: fromCents(subtotalCents),
        discount: fromCents(discountCents),
        extra: fromCents(extraCents),
        before_vat: fromCents(beforeVatCents),
        vat_amount: fromCents(vatAmountCents),
        total_amount: fromCents(totalAmountCents),
        wht_amount: fromCents(whtAmountCents),
        net_receive_amount: fromCents(netReceiveAmountCents),
    };
}
