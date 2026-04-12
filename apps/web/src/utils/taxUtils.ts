import { getCurrentThaiDate } from './dateUtils';

export interface TaxOptions {
  includeVat: boolean;
  includeWithholding: boolean;
  vatRate?: number;          // default 0.07
  withholdingRate?: number;  // default 0.03
}

export interface TaxCalculation {
  subtotalBeforeVat: number;
  vatAmount: number;
  totalWithVat: number;
  withholdingAmount: number;
  netPayable: number;
  vatRate: number;
  withholdingRate: number;
}

export function calculateTax(
  sellingTotal: number,
  options: TaxOptions
): TaxCalculation {
  const vatRate = options.vatRate ?? 0.07;
  const withholdingRate = options.withholdingRate ?? 0.03;

  const subtotalBeforeVat = sellingTotal;
  const vatAmount = options.includeVat ? Math.round(subtotalBeforeVat * vatRate) : 0;
  const totalWithVat = subtotalBeforeVat + vatAmount;
  const withholdingAmount = options.includeWithholding
    ? Math.round(subtotalBeforeVat * withholdingRate)
    : 0;
  const netPayable = totalWithVat - withholdingAmount;

  return {
    subtotalBeforeVat,
    vatAmount,
    totalWithVat,
    withholdingAmount,
    netPayable,
    vatRate,
    withholdingRate,
  };
}

// คำนวณภาษีต่องวด
export function calculateInstallmentTax(
  installmentAmount: number,
  options: TaxOptions
): TaxCalculation {
  return calculateTax(installmentAmount, options);
}

// format เลขที่ใบกำกับภาษี
export function formatTaxInvoiceNumber(prefix: string, sequence: number): string {
  const now = new Date();
  const buddhistYear = now.getFullYear() + 543;
  const seq = String(sequence).padStart(3, '0');
  return `${prefix}-TAX-${buddhistYear}-${seq}`;
}

// format เลขที่ใบหัก ณ ที่จ่าย
export function formatWhtCertNumber(prefix: string, sequence: number): string {
  const now = new Date();
  const buddhistYear = now.getFullYear() + 543;
  const seq = String(sequence).padStart(3, '0');
  return `${prefix}-WHT-${buddhistYear}-${seq}`;
}

// format จำนวนเงินเป็นภาษาไทย (สำหรับเอกสารภาษี)
export function numberToThaiText(num: number): string {
  if (num === 0) return 'ศูนย์บาทถ้วน';

  const digits = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  function convertGroup(n: number): string {
    if (n === 0) return '';
    const str = String(n);
    let result = '';
    const len = str.length;

    for (let i = 0; i < len; i++) {
      const digit = parseInt(str[i]);
      const pos = len - i - 1;

      if (digit === 0) continue;

      if (pos === 0 && digit === 1 && len > 1) {
        result += 'เอ็ด';
      } else if (pos === 1 && digit === 1) {
        result += 'สิบ';
      } else if (pos === 1 && digit === 2) {
        result += 'ยี่สิบ';
      } else {
        result += digits[digit] + positions[pos];
      }
    }
    return result;
  }

  // Handle millions
  let result = '';
  if (intPart >= 1000000) {
    const millions = Math.floor(intPart / 1000000);
    result += convertGroup(millions) + 'ล้าน';
    const remainder = intPart % 1000000;
    if (remainder > 0) {
      result += convertGroup(remainder);
    }
  } else {
    result = convertGroup(intPart);
  }

  result += 'บาท';

  if (decPart > 0) {
    result += convertGroup(decPart) + 'สตางค์';
  } else {
    result += 'ถ้วน';
  }

  return result;
}

// format วันที่สำหรับเอกสารภาษี
export function getTaxDate(): string {
  return getCurrentThaiDate();
}
