import { getVatSummary, getWhtSummary, getTaxStatusReport, getAnnualTaxSummary } from '../core/taxReportService';
import { getDb } from '../core/firebaseAdmin';
export { getTaxQuickReplies } from '../ui/quickReplies';

type MonthParseResult = {
  monthKey?: string;
  label: string;
};

const thaiMonths = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const thaiMonthAliases: Array<{ idx: number; keys: string[] }> = [
  { idx: 1, keys: ['ม.ค.', 'มกราคม'] },
  { idx: 2, keys: ['ก.พ.', 'กุมภาพันธ์'] },
  { idx: 3, keys: ['มี.ค.', 'มีนาคม'] },
  { idx: 4, keys: ['เม.ย.', 'เมษายน'] },
  { idx: 5, keys: ['พ.ค.', 'พฤษภาคม'] },
  { idx: 6, keys: ['มิ.ย.', 'มิถุนายน'] },
  { idx: 7, keys: ['ก.ค.', 'กรกฎาคม'] },
  { idx: 8, keys: ['ส.ค.', 'สิงหาคม'] },
  { idx: 9, keys: ['ก.ย.', 'กันยายน'] },
  { idx: 10, keys: ['ต.ค.', 'ตุลาคม'] },
  { idx: 11, keys: ['พ.ย.', 'พฤศจิกายน'] },
  { idx: 12, keys: ['ธ.ค.', 'ธันวาคม'] },
];

export async function handleVatSummaryRequest(userId: string, businessId: string, text: string): Promise<string> {
  const { monthKey, label } = parseMonthKeyFromText(text);
  const summary = await getVatSummary(userId, businessId, monthKey);
  if (!summary) {
    return 'โอ๊ะ! สรุปภาษีไม่สำเร็จครับเจ้านาย\nลองใหม่ได้เลยนะ';
  }

  const payableLabel = summary.payable >= 0 ? 'VAT ต้องจ่าย' : 'VAT ขอคืน';
  const payableValue = Math.abs(summary.payable);

  return (
    `🧾 สรุปภาษี ${label}\n` +
    `เดือน: ${summary.month}\n\n` +
    `✅ ภาษีขาย (Output VAT): ${formatMoney(summary.output.vat)}\n` +
    `ฐานก่อน VAT ${formatMoney(summary.output.base)}\n` +
    `เอกสาร VAT ${summary.output.docCount} ฉบับ\n\n` +
    `✅ ภาษีซื้อ (Input VAT): ${formatMoney(summary.input.vat)}\n` +
    `ฐานก่อน VAT ${formatMoney(summary.input.base)}\n` +
    `รายจ่าย VAT ${summary.input.expenseCount} รายการ\n\n` +
    `🔎 ${payableLabel} ${formatMoney(payableValue)}`
  );
}

export async function handleWhtSummaryRequest(userId: string, businessId: string, text: string): Promise<string> {
  const { monthKey, label } = parseMonthKeyFromText(text);
  const summary = await getWhtSummary(userId, businessId, monthKey);
  if (!summary) {
    return 'โอ๊ะ! สรุปหัก ณ ที่จ่ายไม่สำเร็จครับเจ้านาย\nลองใหม่ได้เลยนะ';
  }

  if (summary.totalWht <= 0) {
    return (
      `🧾 สรุปหัก ณ ที่จ่าย ${label}\n` +
      `เดือน: ${summary.month}\n\n` +
      `ยังไม่มีรายการหัก ณ ที่จ่ายในงวดนี้ครับ`
    );
  }

  const lines: string[] = [];
  lines.push(`🧾 สรุปหัก ณ ที่จ่าย ${label}`);
  lines.push(`เดือน: ${summary.month}`);
  lines.push('');
  lines.push(`💰 ยอดหักรวม: ${formatMoney(summary.totalWht)}`);
  lines.push(`📄 ยอดฐานรวม: ${formatMoney(summary.totalBase)}`);
  lines.push('');

  summary.rateGroups.forEach((group) => {
    lines.push(`อัตรา ${group.ratePercent}%`);
    const topSuppliers = group.suppliers.slice(0, 5);
    topSuppliers.forEach((supplier) => {
      lines.push(
        `${supplier.supplierName} ฐาน ${formatMoney(supplier.baseAmount)} | หัก ${formatMoney(supplier.whtAmount)}`
      );
    });
    if (group.suppliers.length > topSuppliers.length) {
      lines.push(`…และอีก ${group.suppliers.length - topSuppliers.length} ราย`);
    }
    lines.push('');
  });

  return lines.join('\n');
}

export async function handleTaxStatusRequest(userId: string, businessId: string, text: string): Promise<string> {
  const { monthKey, label } = parseMonthKeyFromText(text);
  const [statusReport, vatSummary] = await Promise.all([
    getTaxStatusReport(businessId, monthKey),
    getVatSummary(userId, businessId, monthKey),
  ]);

  const vatStatus = statusReport.vat.status === 'FILED' ? '✅' : '❌';
  const whtStatus = statusReport.wht.status === 'FILED' ? '✅' : '❌';
  const vatPayable = vatSummary ? formatMoney(Math.max(vatSummary.payable, 0)) : '-';

  return (
    `🔔 ภาษีค้าง ${label}\n` +
    `เดือน: ${statusReport.month}\n\n` +
    `${vatStatus} VAT ${statusReport.vat.status === 'FILED' ? 'ยื่นแล้ว' : 'ยังไม่ยื่น'}\n` +
    `ยอดคาดการณ์ ${vatPayable}\n\n` +
    `${whtStatus} WHT ${statusReport.wht.status === 'FILED' ? 'ยื่นแล้ว' : 'ยังไม่ยื่น'}\n\n` +
    `ถ้าต้องการอัปเดตสถานะยื่นภาษี ให้แจ้งแอดมินหรือทำผ่านหน้าเว็บครับ`
  );
}

export async function handleAnnualTaxRequest(userId: string, businessId: string, text: string): Promise<string> {
  const year = parseYearFromText(text);
  if (!year) {
    return 'โอ๊ะ! กรุณาระบุปีด้วยนะครับเจ้านาย เช่น "สรุปภาษีทั้งปี 2569"';
  }
  const report = await getAnnualTaxSummary(userId, businessId, year);

  const lines: string[] = [];
  lines.push(`📊 สรุปภาษีทั้งปี ${report.year}`);
  lines.push('');
  report.months.forEach((row) => {
    lines.push(
      `${row.month}: VAT ${formatMoney(row.vatPayable)} | WHT ${formatMoney(row.whtDeducted)}`
    );
  });
  lines.push('');
  lines.push(`รวม VAT ทั้งปี: ${formatMoney(report.totals.vatPayable)}`);
  lines.push(`รวม WHT ทั้งปี: ${formatMoney(report.totals.whtDeducted)}`);
  lines.push('');
  return lines.join('\n');
}

export async function handleTaxReminderToggle(
  userId: string,
  businessId: string,
  enabled: boolean
): Promise<string> {
  const db = getDb();
  await db
    .doc(`users/${userId}/businesses/${businessId}/settings/tax_reminder`)
    .set(
      {
        type: 'tax_reminder',
        enabled,
        businessId,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      },
      { merge: true }
    );
  return enabled
    ? '🔔 เปิดระบบเตือนภาษีแล้วครับเจ้านาย\nระบบจะแจ้งเตือนผ่าน LINE ก่อนถึงกำหนดยื่น'
    : 'ติ๊ดๆ ปิดระบบเตือนภาษีแล้วครับ';
}

export async function handleTaxAuditRequest(userId: string, businessId: string, text: string): Promise<string> {
  const { monthKey } = parseMonthKeyFromText(text);
  const { start, end } = monthKeyToDateRange(monthKey);
  const db = getDb();

  const docsSnap = await db
    .collection(`users/${userId}/businesses/${businessId}/documents`)
    .get();
  const expensesSnap = await db
    .collection(`businesses/${businessId}/expenses`)
    .get();

  let missingCustomerTax = 0;
  let missingSupplierTax = 0;

  docsSnap.docs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const issueDate = toDateSafe(data.issueDate || data.issue_date || data.createdAt || data.created_at);
    if (!isDateInRange(issueDate, start, end)) return;
    const money = (data.money || {}) as Record<string, unknown>;
    const vatAmount = Number(money.vat_amount || 0);
    const customerTaxId =
      (data.customerSnapshot as any)?.taxId ||
      (data.customer_snapshot as any)?.tax_id ||
      data.customer_tax_id ||
      data.customerTaxId;
    if (vatAmount > 0 && !customerTaxId) {
      missingCustomerTax += 1;
    }
  });

  expensesSnap.docs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const date = new Date(String(data.date || ''));
    if (!isDateInRange(date, start, end)) return;
    const vatAmount = Number(data.vatAmount || data.vat_amount || 0);
    const supplierTaxId = data.supplierTaxId || data.supplier_tax_id;
    if (vatAmount > 0 && !supplierTaxId) {
      missingSupplierTax += 1;
    }
  });

  if (missingCustomerTax === 0 && missingSupplierTax === 0) {
    return '✅ ตรวจภาษีแล้วครับเจ้านาย ไม่พบรายการผิดปกติ';
  }

  const lines = [
    '⚠️ ตรวจภาษีพบรายการที่ควรตรวจสอบ',
    missingCustomerTax > 0 ? `เอกสาร VAT ที่ไม่มีเลขผู้เสียภาษีลูกค้า ${missingCustomerTax} ฉบับ` : '',
    missingSupplierTax > 0 ? `รายจ่าย VAT ที่ไม่มีเลขผู้เสียภาษีผู้ขาย ${missingSupplierTax} รายการ` : '',
  ].filter(Boolean);

  return lines.join('\n');
}

export async function handleTaxCertificateRequest(userId: string, businessId: string, text: string): Promise<string> {
  const targetName = text.replace(/^(ออกหนังสือรับรองหัก ณ ที่จ่าย|ออก\s*50ทวิ|ออก\s*50\s*ทวิ)\s*/i, '').trim();
  if (!targetName) {
    return (
      '🧾 ออกหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ)\n' +
      'พิมพ์แบบนี้ได้เลยครับเจ้านาย\n' +
      'ออก 50ทวิ ให้ บจก.เอ'
    );
  }

  // PDF generation handled asynchronously (sent via LINE)
  return (
    `🧾 กำลังสร้าง PDF หนังสือรับรองหัก ณ ที่จ่ายให้ ${targetName} ครับ\n` +
    `ระบบจะส่งไฟล์ให้ทาง LINE เมื่อพร้อมนะเจ้านาย`
  );
}

function parseMonthKeyFromText(text: string): MonthParseResult {
  const normalized = text.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes('เดือนนี้') || lower.includes('this month')) {
    return { label: 'เดือนนี้' };
  }

  if (lower.includes('เดือนก่อน') || lower.includes('last month') || lower.includes('previous month')) {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thaiYear = prev.getFullYear() + 543;
    const month = String(prev.getMonth() + 1).padStart(2, '0');
    return { monthKey: `${thaiYear}_${month}`, label: 'เดือนก่อน' };
  }

  const numericMatch = normalized.match(/(\d{1,2})[/-](\d{2,4})/);
  if (numericMatch) {
    const month = parseInt(numericMatch[1], 10);
    let year = parseInt(numericMatch[2], 10);
    if (year < 100) year = 2500 + year;
    if (year < 2400) year += 543;
    if (month >= 1 && month <= 12) {
      return {
        monthKey: `${year}_${String(month).padStart(2, '0')}`,
        label: `${thaiMonths[month - 1]} ${year}`,
      };
    }
  }

  for (const { idx, keys } of thaiMonthAliases) {
    if (keys.some((key) => normalized.includes(key))) {
      const yearMatch = normalized.match(/(25\d{2})/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear() + 543;
      return {
        monthKey: `${year}_${String(idx).padStart(2, '0')}`,
        label: `${thaiMonths[idx - 1]} ${year}`,
      };
    }
  }

  return { label: 'เดือนนี้' };
}

function parseYearFromText(text: string): number | null {
  const match = text.match(/(25\d{2})/);
  if (match) return parseInt(match[1], 10);
  const numeric = text.match(/(20\d{2})/);
  if (numeric) return parseInt(numeric[1], 10) + 543;
  return null;
}

function monthKeyToDateRange(monthKey?: string) {
  const targetMonth = monthKey || getCurrentMonthKey();
  const [yearStr, monthStr] = targetMonth.split('_');
  const gregorianYear = parseInt(yearStr, 10) - 543;
  const month = parseInt(monthStr, 10) - 1;
  return {
    start: new Date(gregorianYear, month, 1),
    end: new Date(gregorianYear, month + 1, 1),
  };
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${thaiYear}_${month}`;
}

function isDateInRange(date: Date | null, start: Date, end: Date): boolean {
  if (!date) return false;
  return date >= start && date < end;
}

function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object') {
    const ts = value as { _seconds?: number; toDate?: () => Date };
    if (typeof ts.toDate === 'function') {
      const d = ts.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts._seconds === 'number') {
      const d = new Date(ts._seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

function formatMoney(value: number): string {
  const v = Number.isFinite(value) ? value : 0;
  return `${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`;
}
