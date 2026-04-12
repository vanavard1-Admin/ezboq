/**
 * calculate-quotation.ts
 * คำนวณราคาใบเสนอราคาจาก QuotationItem[]
 * ใช้สำหรับ validate + compute totals
 */

interface QuotationItem {
  no: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  laborCost?: number;
  customerUnitPrice?: number;
  scopeDetails?: string;
  totalPrice?: number;
}

interface QuotationSummary {
  items: QuotationItem[];
  subtotal: number;
  vat: number;
  grandTotal: number;
  materialTotal: number;
  laborTotal: number;
}

export function calculateQuotation(
  items: QuotationItem[],
  includeVat: boolean = true,
  vatRate: number = 0.07
): QuotationSummary {
  const computed = items.map(item => {
    const qty = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const laborCost = Number(item.laborCost) || 0;
    const totalPrice = qty * (unitPrice + laborCost);
    return { ...item, quantity: qty, unitPrice, laborCost, totalPrice };
  });

  const subtotal = computed.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
  const materialTotal = computed.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  const laborTotal = computed.reduce((sum, i) => sum + (i.quantity * (i.laborCost || 0)), 0);
  const vat = includeVat ? subtotal * vatRate : 0;

  return {
    items: computed,
    subtotal,
    vat: Math.round(vat * 100) / 100,
    grandTotal: subtotal + vat,
    materialTotal,
    laborTotal,
  };
}

export function generatePaymentInstallments(
  totalAmount: number,
  plan: '3-installment' | '4-installment' = '3-installment'
) {
  const plans = {
    '3-installment': [
      { no: 1, description: 'งวดที่ 1 — เมื่อตกลงและเริ่มสั่งของ', percentage: 40 },
      { no: 2, description: 'งวดที่ 2 — เมื่อเริ่มติดตั้ง', percentage: 30 },
      { no: 3, description: 'งวดที่ 3 — เมื่อส่งมอบงานเรียบร้อย', percentage: 30 },
    ],
    '4-installment': [
      { no: 1, description: 'งวดที่ 1 — เมื่อตกลงสัญญา', percentage: 40 },
      { no: 2, description: 'งวดที่ 2 — เมื่อเริ่มติดตั้ง', percentage: 20 },
      { no: 3, description: 'งวดที่ 3 — งานเสร็จ 70%', percentage: 20 },
      { no: 4, description: 'งวดที่ 4 — ส่งมอบงาน', percentage: 20 },
    ],
  };

  return plans[plan].map(p => ({
    ...p,
    amount: Math.round(totalAmount * p.percentage / 100),
  }));
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
