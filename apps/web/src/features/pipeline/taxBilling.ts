export type MoneyRoundingUnit = 'satang' | 'baht';

export interface ThaiTaxConfig {
  vatEnabled: boolean;
  vatRate: number; // e.g. 0.07
  whtEnabled: boolean;
  whtRate: number; // e.g. 0.03
  roundingUnit?: MoneyRoundingUnit;
}

export interface TaxAuditEntry {
  step: string;
  formula: string;
  inputs: Record<string, number | string | boolean>;
  result: number;
}

export interface ThaiTaxBillingResult {
  baseAmount: number;
  vatAmount: number;
  grossAmount: number;
  withholdingAmount: number;
  netAmount: number;
  auditTrail: TaxAuditEntry[];
}

const SATANG_PER_BAHT = 100n;
const RATE_SCALE = 1_000_000n;

function toSatang(value: number): bigint {
  return BigInt(Math.round((value + Number.EPSILON) * Number(SATANG_PER_BAHT)));
}

function satangToNumber(satang: bigint): number {
  return Number(satang) / Number(SATANG_PER_BAHT);
}

function toRateScaled(rate: number): bigint {
  return BigInt(Math.round((rate + Number.EPSILON) * Number(RATE_SCALE)));
}

function applyRate(baseSatang: bigint, rate: number): bigint {
  const scaledRate = toRateScaled(rate);
  return (baseSatang * scaledRate + RATE_SCALE / 2n) / RATE_SCALE;
}

function roundMoney(satang: bigint, unit: MoneyRoundingUnit): bigint {
  if (unit === 'satang') return satang;
  return ((satang + 50n) / SATANG_PER_BAHT) * SATANG_PER_BAHT;
}

function toBahtRounded(value: number): number {
  return Math.round(value);
}

export function calculateThaiTaxBilling(baseAmount: number, config: ThaiTaxConfig): ThaiTaxBillingResult {
  const roundingUnit = config.roundingUnit ?? 'baht';
  const auditTrail: TaxAuditEntry[] = [];

  const baseSatangRaw = toSatang(baseAmount);
  const baseSatang = roundMoney(baseSatangRaw, roundingUnit);
  auditTrail.push({
    step: 'base-rounding',
    formula: `round(baseAmount, ${roundingUnit})`,
    inputs: { baseAmount, roundingUnit },
    result: satangToNumber(baseSatang),
  });

  const vatSatangRaw = config.vatEnabled ? applyRate(baseSatang, config.vatRate) : 0n;
  const vatSatang = roundMoney(vatSatangRaw, roundingUnit);
  auditTrail.push({
    step: 'vat',
    formula: config.vatEnabled ? 'baseAmount * vatRate' : 'disabled',
    inputs: { vatEnabled: config.vatEnabled, vatRate: config.vatRate, baseAmount: satangToNumber(baseSatang) },
    result: satangToNumber(vatSatang),
  });

  const grossSatang = roundMoney(baseSatang + vatSatang, roundingUnit);
  auditTrail.push({
    step: 'gross',
    formula: 'baseAmount + vatAmount',
    inputs: { baseAmount: satangToNumber(baseSatang), vatAmount: satangToNumber(vatSatang) },
    result: satangToNumber(grossSatang),
  });

  const withholdingSatangRaw = config.whtEnabled ? applyRate(baseSatang, config.whtRate) : 0n;
  const withholdingSatang = roundMoney(withholdingSatangRaw, roundingUnit);
  auditTrail.push({
    step: 'withholding',
    formula: config.whtEnabled ? 'baseAmount * whtRate' : 'disabled',
    inputs: { whtEnabled: config.whtEnabled, whtRate: config.whtRate, baseAmount: satangToNumber(baseSatang) },
    result: satangToNumber(withholdingSatang),
  });

  const netSatang = roundMoney(grossSatang - withholdingSatang, roundingUnit);
  auditTrail.push({
    step: 'net',
    formula: 'grossAmount - withholdingAmount',
    inputs: { grossAmount: satangToNumber(grossSatang), withholdingAmount: satangToNumber(withholdingSatang) },
    result: satangToNumber(netSatang),
  });

  return {
    baseAmount: toBahtRounded(satangToNumber(baseSatang)),
    vatAmount: toBahtRounded(satangToNumber(vatSatang)),
    grossAmount: toBahtRounded(satangToNumber(grossSatang)),
    withholdingAmount: toBahtRounded(satangToNumber(withholdingSatang)),
    netAmount: toBahtRounded(satangToNumber(netSatang)),
    auditTrail,
  };
}

export function calculateRoundedPercentage(baseAmount: number, ratePercent: number, roundingUnit: MoneyRoundingUnit = 'baht'): number {
  const baseSatang = roundMoney(toSatang(baseAmount), roundingUnit);
  const amountSatang = roundMoney(applyRate(baseSatang, ratePercent / 100), roundingUnit);
  return toBahtRounded(satangToNumber(amountSatang));
}
