/**
 * Report Formatter for LINE Messages
 *
 * Natural Thai, concise — no bullets, no colons, no dividers
 */

import {
  MonthlySalesReport,
  OverdueInvoice,
  TopCustomer,
  PopularService,
} from './reportService';

// ============================================================================
// MONTHLY SALES
// ============================================================================

export function formatMonthlySalesMessage(report: MonthlySalesReport): string {
  const hasIssued = report.issuedDocCount > 0;
  const hasReceipts = report.receiptCount > 0;

  if (!hasIssued && !hasReceipts) {
    return `บี๊บ! สรุปยอดขาย ${report.month}\n\nยังไม่มีข้อมูลครับเจ้านาย`;
  }

  const lines = [`บี๊บ! สรุปยอดขาย ${report.month} ครับเจ้านาย`, ''];

  if (hasIssued) {
    lines.push(`เอกสารออก ${report.issuedDocCount} ฉบับ  มูลค่า ${formatCurrency(report.issuedDocTotal)} บาท`);
    lines.push(`ใบเสนอราคา ${report.issuedQuoCount}  ใบวางบิล ${report.issuedBillCount}`);
    lines.push('');
  }

  lines.push(`ใบเสร็จ ${report.receiptCount} ใบ  ยอดรับจริง ${formatCurrency(report.netReceived)} บาท`);
  lines.push(`ค่าเฉลี่ย ${formatCurrency(report.averagePerReceipt)} บาท/ใบ`);

  return lines.join('\n');
}

// ============================================================================
// OVERDUE INVOICES
// ============================================================================

export function formatOverdueInvoicesMessage(invoices: OverdueInvoice[]): string {
  if (invoices.length === 0) {
    return `ติ๊ดๆ ไม่มีใบวางบิลค้างชำระครับเจ้านาย 👍`;
  }

  let message = `ใบวางบิลค้างชำระ ${invoices.length} ใบ\n`;

  invoices.slice(0, 5).forEach((inv, idx) => {
    message += `\n${idx + 1}. ${inv.docNo}  ${inv.customerName}  ${formatCurrency(inv.amount)} บาท  เกิน ${inv.overdueByDays} วัน`;
  });

  if (invoices.length > 5) {
    message += `\n\nและอีก ${invoices.length - 5} ใบ`;
  }

  message += `\n\nพิมพ์ "ทวงเงิน" เพื่อส่งแจ้งเตือน`;

  return message;
}

// ============================================================================
// TOP CUSTOMERS
// ============================================================================

export function formatTopCustomersMessage(
  customers: TopCustomer[],
  monthLabel: string = 'เดือนนี้'
): string {
  if (customers.length === 0) {
    return `บี๊บ! ลูกค้ายอดสูง\n\nยังไม่มีข้อมูลครับเจ้านาย`;
  }

  let message = `บี๊บ! ลูกค้ายอดสูง (${monthLabel}) ครับเจ้านาย\n`;

  customers.forEach((cust, idx) => {
    message += `\n${idx + 1}. ${cust.customerName}  ${formatCurrency(cust.totalSpent)} บาท (${cust.percentOfTotal}%)`;
  });

  return message;
}

// ============================================================================
// POPULAR SERVICES
// ============================================================================

export function formatPopularServicesMessage(
  services: PopularService[],
  monthLabel: string = ''
): string {
  if (services.length === 0) {
    return `บี๊บ! บริการขายดี\n\nยังไม่มีข้อมูลครับเจ้านาย`;
  }

  let message = `บี๊บ! บริการขายดี${monthLabel ? ` (${monthLabel})` : ''} ครับเจ้านาย\n`;

  services.forEach((svc, idx) => {
    message += `\n${idx + 1}. ${svc.description}  ${formatCurrency(svc.totalRevenue)} บาท (${svc.percentOfTotal}%)`;
  });

  return message;
}

// ============================================================================
// HELPER: CURRENCY FORMATTING
// ============================================================================

function formatCurrency(amount: number): string {
  return amount.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export { formatCurrency };
