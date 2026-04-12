// functions/test-pdf-template.js
// Run: cd functions && npm run build && node test-pdf-template.js
// Output: functions/test-output.html

const fs = require("fs");
const path = require("path");

console.error("Legacy pdfTemplate is disabled. Use pdf-service renderPdfFromPayload instead.");
process.exit(1);

function mockDraft(docType) {
  return {
    draftId: "DRAFT_001",
    docType,
    docNo: `${docType}-2025-0001`,
    docDate: "29/12/2568",
    status: "CONFIRMED",
    customer: {
      name: "บริษัท ABC จำกัด",
      address: "99/1 ถนนตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพฯ 10110",
      taxId: "0105559999999",
    },
    items: [
      { name: "ค่าแรงติดตั้ง", qty: 1, unitPrice: 15000 },
      { name: "ปูนซีเมนต์", qty: 10, unitPrice: 120 },
      { name: "ค่าขนส่ง", qty: 1, unitPrice: 800 },
    ],
    vatRate: 7,
    discountType: "AMOUNT",
    discountValue: 500,
    dueDate: "31/12/2568",
    payment: { method: "โอนเงิน", paidAt: "29/12/2568", refNo: "TRX-12345" },
    totals: {
      subtotal: 15000 + 10 * 120 + 800,
      discountAmount: 500,
      vatAmount: 0,      // จะใส่จริงจาก engine ของคุณก็ได้
      grandTotal: 0,     // จะใส่จริงจาก engine ของคุณก็ได้
    },
    company: {
      name: "EzBOQ",
      address: "123 ถนนสุขุมวิท กรุงเทพฯ",
      taxId: "0105551234567",
      phone: "02-000-0000",
      email: "admin@ezboq.com",
    },
  };
}

function calcTotals(d) {
  const subtotal = d.items.reduce((s, it) => s + (it.qty * it.unitPrice), 0);
  let discountAmount = 0;

  if (d.discountType === "AMOUNT") discountAmount = Number(d.discountValue || 0);
  if (d.discountType === "PERCENT") discountAmount = subtotal * (Number(d.discountValue || 0) / 100);

  if (discountAmount < 0) discountAmount = 0;
  if (discountAmount > subtotal) discountAmount = subtotal;

  const afterDiscount = subtotal - discountAmount;
  const vatAmount = afterDiscount * (Number(d.vatRate || 0) / 100);
  const grandTotal = afterDiscount + vatAmount;

  d.totals = { subtotal, discountAmount, vatAmount, grandTotal };
  return d;
}

const docType = process.argv[2] || "WB"; // QT | WB | RC
const draft = calcTotals(mockDraft(docType));

// This script is intentionally blocked to prevent legacy rendering.
