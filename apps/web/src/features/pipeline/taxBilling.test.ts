import { describe, expect, it } from 'vitest';
import { calculateRoundedPercentage, calculateThaiTaxBilling } from './taxBilling';

describe('calculateThaiTaxBilling', () => {
  it('calculates Thai VAT and withholding from base amount with deterministic baht rounding', () => {
    const result = calculateThaiTaxBilling(10001, {
      vatEnabled: true,
      vatRate: 0.07,
      whtEnabled: true,
      whtRate: 0.03,
      roundingUnit: 'baht',
    });

    expect(result.baseAmount).toBe(10001);
    expect(result.vatAmount).toBe(700);
    expect(result.grossAmount).toBe(10701);
    expect(result.withholdingAmount).toBe(300);
    expect(result.netAmount).toBe(10401);
    expect(result.auditTrail).toHaveLength(5);
    expect(result.auditTrail.map((x) => x.step)).toEqual([
      'base-rounding',
      'vat',
      'gross',
      'withholding',
      'net',
    ]);
  });

  it('supports satang precision when required and keeps deterministic ordering in audit trail', () => {
    const result = calculateThaiTaxBilling(15234.56, {
      vatEnabled: true,
      vatRate: 0.07,
      whtEnabled: true,
      whtRate: 0.03,
      roundingUnit: 'satang',
    });

    expect(result.vatAmount).toBe(1066); // 1,066.42 rounded to baht in API response
    expect(result.withholdingAmount).toBe(457); // 457.04 rounded to baht in API response
    expect(result.grossAmount).toBe(16301); // 16,300.98 rounded to baht
    expect(result.netAmount).toBe(15844); // 15,843.94 rounded to baht
    expect(result.auditTrail[0]?.step).toBe('base-rounding');
    expect(result.auditTrail[4]?.step).toBe('net');
  });

  it('returns base as net amount when VAT and withholding are disabled', () => {
    const result = calculateThaiTaxBilling(5000, {
      vatEnabled: false,
      vatRate: 0.07,
      whtEnabled: false,
      whtRate: 0.03,
    });

    expect(result.vatAmount).toBe(0);
    expect(result.withholdingAmount).toBe(0);
    expect(result.grossAmount).toBe(5000);
    expect(result.netAmount).toBe(5000);
    expect(result.auditTrail[1]?.formula).toBe('disabled');
    expect(result.auditTrail[3]?.formula).toBe('disabled');
  });
});

describe('calculateRoundedPercentage', () => {
  it('rounds percentage in baht for deterministic billing components', () => {
    expect(calculateRoundedPercentage(9999, 7)).toBe(700);
    expect(calculateRoundedPercentage(9999, 0)).toBe(0);
  });
});
