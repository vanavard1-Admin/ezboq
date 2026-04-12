import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Package Report Service
 * 
 * Provides daily revenue reports and CSV export functionality.
 */

import * as admin from 'firebase-admin';
import { normalizePackageType, PACKAGE_TYPE_PRO, PACKAGE_TYPE_TEAM } from './purchaseService';

const db = getDb();
const storage = admin.storage();

/**
 * Generate daily package revenue report
 */
export async function generateDailyReport(date: Date | null = null): Promise<string> {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const startTimestamp = admin.firestore.Timestamp.fromDate(startOfDay);
  const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);

  // Query all purchases for the day
  const purchasesQuery = await db
    .collection('credit_purchases')
    .where('createdAt', '>=', startTimestamp)
    .where('createdAt', '<=', endTimestamp)
    .get();

  let totalRevenue = 0;
  let totalCount = 0;
  let pack199Count = 0;
  let pack399Count = 0;
  let paidCount = 0;
  let expiredCount = 0;
  let failedCount = 0;
  let rejectedCount = 0;

  for (const doc of purchasesQuery.docs) {
    const p = doc.data();
    totalCount++;
    totalRevenue += p.amount || 0;

    const rawPackageType = (p.packageType ?? p.amount) as number | undefined;
    if (rawPackageType) {
      const normalizedType = normalizePackageType(rawPackageType as any);
      if (normalizedType === PACKAGE_TYPE_PRO) {
        pack199Count++;
      } else if (normalizedType === PACKAGE_TYPE_TEAM) {
        pack399Count++;
      }
    }

    if (p.status === 'PAID') {
      paidCount++;
    } else if (p.status === 'EXPIRED') {
      expiredCount++;
    } else if (p.status === 'FAILED') {
      failedCount++;
    } else if (p.status === 'REJECTED') {
      rejectedCount++;
    }
  }

  const dateStr = targetDate.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const lines = [
    `📊 รายงานแพ็ก (${dateStr})`,
    '',
    `💰 ยอดขายรวม: ${totalRevenue.toLocaleString('th-TH')} บาท`,
    `📈 จำนวนรายการ: ${totalCount}`,
    '',
    `📦 แพ็ค 99: ${pack199Count}`,
    `📦 แพ็ค Team (279): ${pack399Count}`,
    '',
    `✅ ชำระแล้ว: ${paidCount}`,
    `⏰ หมดอายุ: ${expiredCount}`,
    `❌ ล้มเหลว: ${failedCount}`,
    `🚫 ปฏิเสธ: ${rejectedCount}`,
  ];

  return lines.join('\n');
}

/**
 * Generate monthly report
 */
export async function generateMonthlyReport(year: number, month: number): Promise<string> {
  const startOfMonth = new Date(year, month - 1, 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const startTimestamp = admin.firestore.Timestamp.fromDate(startOfMonth);
  const endTimestamp = admin.firestore.Timestamp.fromDate(endOfMonth);

  const purchasesQuery = await db
    .collection('credit_purchases')
    .where('createdAt', '>=', startTimestamp)
    .where('createdAt', '<=', endTimestamp)
    .get();

  let totalRevenue = 0;
  let totalCount = 0;
  let pack199Count = 0;
  let pack399Count = 0;
  let paidCount = 0;

  for (const doc of purchasesQuery.docs) {
    const p = doc.data();
    totalCount++;
    totalRevenue += p.amount || 0;

    const rawPackageType = (p.packageType ?? p.amount) as number | undefined;
    if (rawPackageType) {
      const normalizedType = normalizePackageType(rawPackageType as any);
      if (normalizedType === PACKAGE_TYPE_PRO) {
        pack199Count++;
      } else if (normalizedType === PACKAGE_TYPE_TEAM) {
        pack399Count++;
      }
    }

    if (p.status === 'PAID') {
      paidCount++;
    }
  }

  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  const lines = [
    `📊 รายงานแพ็ก ${monthNames[month - 1]} ${year}`,
    '',
    `💰 ยอดขายรวม: ${totalRevenue.toLocaleString('th-TH')} บาท`,
    `📈 จำนวนรายการ: ${totalCount}`,
    '',
    `📦 แพ็ค 99: ${pack199Count}`,
    `📦 แพ็ค Team (279): ${pack399Count}`,
    '',
    `✅ ชำระแล้ว: ${paidCount}`,
  ];

  return lines.join('\n');
}

/**
 * Export credit purchases to CSV
 */
export async function exportCreditPurchasesCSV(startDate: Date | null = null, endDate: Date | null = null): Promise<string> {
  let query: admin.firestore.Query = db.collection('credit_purchases').orderBy('createdAt', 'desc');

  if (startDate && endDate) {
    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);
    query = query.where('createdAt', '>=', startTimestamp).where('createdAt', '<=', endTimestamp);
  }

  const purchasesQuery = await query.limit(1000).get(); // Limit to 1000 for safety

  // Build CSV
  const headers = [
    'purchaseId',
    'referenceId',
    'amount',
    'packageType',
    'status',
    'verified_by',
    'slip_transaction_ref',
    'createdAt',
    'paidAt',
    'fraud_reason',
  ];

  const rows: string[][] = [headers];

  for (const doc of purchasesQuery.docs) {
    const p = doc.data();
    rows.push([
      doc.id,
      p.referenceId || '',
      String(p.amount || ''),
      String(p.packageType || ''),
      p.status || '',
      p.verified_by || '',
      p.slip_transaction_ref || '',
      p.createdAt?.toDate().toISOString() || '',
      p.paidAt?.toDate().toISOString() || '',
      p.fraud_reason || '',
    ]);
  }

  // Convert to CSV format
  const csvLines = rows.map(row =>
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma or newline
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  );

  const csvContent = csvLines.join('\n');

  // Upload to Cloud Storage
  const bucket = storage.bucket();
  const timestamp = Date.now();
  const fileName = `credit-exports/credit_purchases_${timestamp}.csv`;
  const file = bucket.file(fileName);

  await file.save(csvContent, {
    metadata: {
      contentType: 'text/csv',
      cacheControl: 'private, max-age=3600',
    },
  });

  // Generate signed URL (valid for 1 hour)
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  return signedUrl;
}

// ============================================================================
// DOCUMENT REPORT HANDLER (for LINE conversation)
// ============================================================================

/**
 * Handle report request from LINE conversation
 * 
 * Supports:
 * - "รายงาน" → Show report menu
 * - "รายงาน เดือนนี้" → Current month report
 * - "รายงาน เดือนก่อน" → Previous month report
 * - "รายงาน เดือน MM/YYYY" → Specific month report
 */
export async function handleReportRequest(
  userId: string,
  businessId: string,
  messageText: string,
  traceId?: string
): Promise<string> {
  // ✅ D1: Generate traceId if not provided
  if (!traceId) {
    const { generateTraceId } = await import('../utils/asyncSafety');
    traceId = generateTraceId();
  }

  const text = messageText.trim();
  const textLower = text.toLowerCase();

  const { secureLog } = await import('../utils/secureConsole');
  secureLog({
    tag: '[REPORT_REQUEST_STARTED]',
    trace_id: traceId,
    user_id: userId,
    business_id: businessId,
    text_length: text.length,
  });

  // Import report service and formatter
  const {
    getMonthlySalesReport,
    getOverdueInvoicesReport,
    getTopCustomersReport,
    getPopularServicesReport,
  } = await import('../core/reportService');

  const {
    formatMonthlySalesMessage,
    formatOverdueInvoicesMessage,
    formatTopCustomersMessage,
    formatPopularServicesMessage,
  } = await import('../core/reportFormatter');

  // 1. "รายงาน" → Show menu
  if (text === 'รายงาน' || textLower === 'report') {
    return (
      '📊 รายงาน\n\n' +
      'เลือกประเภทรายงานได้เลยครับเจ้านาย\n' +
      '1. 📅 เดือนนี้ - ยอดขายเดือนนี้\n' +
      '2. 📆 เดือนก่อน - ยอดขายเดือนก่อน\n' +
      '3. ⏰ บิลค้าง - ใบวางบิลค้างชำระ\n' +
      '4. 🏆 ลูกค้ายอดสูง - ลูกค้าที่ซื้อมากที่สุด\n' +
      '5. 🔥 บริการขายดี - บริการ/สินค้าขายดี\n\n' +
      'หรือพิมพ์ "รายงาน เดือนนี้" / "รายงาน เดือนก่อน" / "รายงาน เดือน 12/2568"'
    );
  }

  // 2. Parse month from message
  let monthKey: string | undefined;
  let monthLabel = 'เดือนนี้';

  // "รายงาน เดือนนี้"
  if (textLower.includes('เดือนนี้') || textLower.includes('this month')) {
    // Use current month (default in getMonthlySalesReport)
    monthKey = undefined;
    monthLabel = 'เดือนนี้';
  }
  // "รายงาน เดือนก่อน"
  else if (textLower.includes('เดือนก่อน') || textLower.includes('last month') || textLower.includes('previous month')) {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thaiYear = prevMonth.getFullYear() + 543;
    const month = String(prevMonth.getMonth() + 1).padStart(2, '0');
    monthKey = `${thaiYear}_${month}`;
    monthLabel = 'เดือนก่อน';
  }
  // "รายงาน เดือน MM/YYYY" or "รายงาน เดือน MM/YY"
  else {
    // Pattern: "รายงาน เดือน 12/2568" or "รายงาน เดือน 12/68"
    const monthMatch = text.match(/เดือน\s+(\d{1,2})[/-](\d{2,4})/i);
    if (monthMatch) {
      const month = parseInt(monthMatch[1], 10);
      let year = parseInt(monthMatch[2], 10);

      // Convert 2-digit year to 4-digit (assume 25xx for 68, 26xx for 69, etc.)
      if (year < 100) {
        year = 2500 + year; // Thai year (BE)
      }

      // Validate month
      if (month >= 1 && month <= 12 && year >= 2500 && year <= 2600) {
        monthKey = `${year}_${String(month).padStart(2, '0')}`;
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        monthLabel = `${thaiMonths[month - 1]} ${year}`;
      }
    }
  }

  // 3. Generate report based on parsed month
  try {
    if (monthKey !== undefined || textLower.includes('เดือนนี้') || textLower.includes('เดือนก่อน')) {
      // Monthly sales report
      const report = await getMonthlySalesReport(userId, businessId, monthKey);
      if (report) {
        return formatMonthlySalesMessage(report);
      }
      // If report is null, there was an error - log it
      console.error('[handleReportRequest] getMonthlySalesReport returned null', {
        businessId,
        monthKey,
        messageText: text
      });
      return 'โอ๊ะ! สร้างรายงานไม่สำเร็จครับเจ้านาย\nลองใหม่ได้เลยนะครับ';
    }

    // 4. Other report types (if message contains keywords)
    if (textLower.includes('บิลค้าง') || textLower.includes('overdue') || textLower.includes('ค้าง')) {
      const invoices = await getOverdueInvoicesReport(userId, businessId);
      return formatOverdueInvoicesMessage(invoices);
    }

    if (textLower.includes('ลูกค้ายอดสูง') || textLower.includes('top customer') || textLower.includes('ลูกค้า')) {
      const customers = await getTopCustomersReport(userId, businessId, 5, monthKey);
      return formatTopCustomersMessage(customers, monthLabel);
    }

    if (textLower.includes('บริการขายดี') || textLower.includes('popular') || textLower.includes('ขายดี')) {
      const services = await getPopularServicesReport(userId, businessId, 5, monthKey);
      return formatPopularServicesMessage(services, monthLabel);
    }

    // Default: Show menu if can't parse
    return (
      '📊 รายงาน\n\n' +
      'โอ๊ะ! ด๊อกๆ ยังไม่เข้าใจคำสั่งครับเจ้านาย เลือกแบบนี้ได้เลย\n' +
      '1. "รายงาน เดือนนี้"\n' +
      '2. "รายงาน เดือนก่อน"\n' +
      '3. "รายงาน เดือน 12/2568"\n' +
      '4. "รายงาน บิลค้าง"\n' +
      '5. "รายงาน ลูกค้ายอดสูง"\n' +
      '6. "รายงาน บริการขายดี"'
    );
  } catch (error: any) {
    console.error('[handleReportRequest] Error:', error);
    // Check if error is due to index building
    if (error?.code === 9 || error?.message?.includes('index is currently building')) {
      return 'ติ๊ดๆ ระบบกำลังเตรียมรายงานอยู่ครับเจ้านาย ลองใหม่ได้ใน 2-3 นาทีนะครับ';
    }
    return 'โอ๊ะ! เกิดข้อผิดพลาดในการสร้างรายงานครับเจ้านาย\nลองใหม่ได้เลยนะครับ';
  }
}
