import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Admin Report Service
 * 
 * Handles admin-only reports and package invoice generation.
 */

import * as admin from 'firebase-admin';
import { normalizePackageType, PACKAGE_TYPE_PRO, PACKAGE_TYPE_TEAM } from './purchaseService';
import { isAdminFirebaseUid } from './adminAuthService';

const db = getDb();

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return isAdminFirebaseUid(userId);
}

/**
 * Get package report
 */
export async function getCreditReport(
  userId: string,
  period?: string // "เดือนนี้" | "สัปดาห์นี้" | "วันนี้"
): Promise<string> {
  // Check admin
  if (!await isAdmin(userId)) {
    return '❌ คำสั่งนี้สำหรับ Admin เท่านั้น';
  }

  // Determine date range
  const now = new Date();
  let startDate: Date;
  let periodLabel: string;

  if (period?.includes('วันนี้')) {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    periodLabel = 'วันนี้';
  } else if (period?.includes('สัปดาห์')) {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    periodLabel = '7 วันที่ผ่านมา';
  } else {
    // Default: เดือนนี้
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    periodLabel = 'เดือนนี้';
  }

  const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);

  // Query credit purchases
  const purchasesQuery = await db
    .collection('credit_purchases')
    .where('createdAt', '>=', startTimestamp)
    .get();

  // Aggregate stats
  let totalRevenue = 0;
  const statusCounts: Record<string, number> = {
    PAID: 0,
    PENDING: 0,
    EXPIRED: 0,
    FAILED: 0,
  };
  const packageCounts: Record<string, number> = {
    [String(PACKAGE_TYPE_PRO)]: 0,
    [String(PACKAGE_TYPE_TEAM)]: 0,
  };

  for (const doc of purchasesQuery.docs) {
    const data = doc.data();
    const status = data.status || 'UNKNOWN';
    const rawPackageType = (data.packageType ?? data.amount) as number | undefined;
    const pkg = rawPackageType ? String(normalizePackageType(rawPackageType as any)) : 'unknown';

    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (status === 'PAID') {
      totalRevenue += data.amount || 0;
      packageCounts[pkg] = (packageCounts[pkg] || 0) + 1;
    }
  }

  // Format report
  const revenueFmt = totalRevenue.toLocaleString('th-TH');

  let report = `📊 รายงานแพ็ก (${periodLabel})\n\n`;
  report += `━━━━━━━━━━━━━━━━━━━━\n`;
  report += `💰 รายได้รวม: ${revenueFmt} บาท\n`;
  const totalPackages = (packageCounts[String(PACKAGE_TYPE_PRO)] || 0) + (packageCounts[String(PACKAGE_TYPE_TEAM)] || 0);
  report += `🎁 จำนวนแพ็ก: ${totalPackages} ครั้ง\n`;
  report += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  report += `📦 แพ็คเกจ:\n`;
  report += `• แพ็ค 99: ${packageCounts[String(PACKAGE_TYPE_PRO)] || 0} ครั้ง\n`;
  report += `• แพ็ค Team (279): ${packageCounts[String(PACKAGE_TYPE_TEAM)] || 0} ครั้ง\n\n`;

  report += `📊 สถานะ:\n`;
  report += `• ✅ ชำระแล้ว: ${statusCounts.PAID || 0}\n`;
  report += `• ⏳ รอชำระ: ${statusCounts.PENDING || 0}\n`;
  report += `• ⏰ หมดอายุ: ${statusCounts.EXPIRED || 0}\n`;
  report += `• ❌ ล้มเหลว: ${statusCounts.FAILED || 0}\n`;

  report += `\n📅 ข้อมูล ณ ${now.toLocaleDateString('th-TH')}`;

  return report;
}

/**
 * Create package invoice for a purchase
 */
export async function createCreditInvoice(
  purchaseId: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    const purchaseDoc = await db.collection('credit_purchases').doc(purchaseId).get();
    if (!purchaseDoc.exists) {
      return { success: false, error: 'Purchase not found' };
    }

    const purchase = purchaseDoc.data()!;
    if (purchase.status !== 'PAID') {
      return { success: false, error: 'Purchase not paid' };
    }

    // Check if invoice already exists
    if (purchase.credit_invoice_id) {
      return { success: true, invoiceId: purchase.credit_invoice_id };
    }

    // Create invoice document
    const invoiceRef = db.collection('credit_invoices').doc();
    const invoiceData = {
      id: invoiceRef.id,
      purchase_id: purchaseId,
      user_id: purchase.userId,

      // Invoice details
      invoice_no: await generateCreditInvoiceNo(),
      invoice_date: admin.firestore.Timestamp.now(),

      // Snapshot from purchase
      amount: purchase.amount,
      credits: purchase.credits,
      package_type: purchase.packageType,
      reference_id: purchase.referenceId,

      // Status
      status: 'ISSUED',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await invoiceRef.set(invoiceData);

    // Update purchase with invoice ID
    await purchaseDoc.ref.update({
      credit_invoice_id: invoiceRef.id,
    });

    console.log(`[adminReport] Created package invoice: ${invoiceRef.id} for purchase: ${purchaseId}`);

    return { success: true, invoiceId: invoiceRef.id };
  } catch (error) {
    console.error('[adminReport] Error creating package invoice:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Generate credit invoice number
 */
async function generateCreditInvoiceNo(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear() + 543; // Thai Buddhist year
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Count invoices this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const countQuery = await db
    .collection('credit_invoices')
    .where('created_at', '>=', admin.firestore.Timestamp.fromDate(startOfMonth))
    .where('created_at', '<=', admin.firestore.Timestamp.fromDate(endOfMonth))
    .count()
    .get();

  const count = countQuery.data().count + 1;
  const seq = String(count).padStart(4, '0');

  return `CINV-${year}${month}-${seq}`;
}

/**
 * Get latest credit invoice for user
 */
export async function getLatestCreditInvoice(
  userId: string
): Promise<{ found: boolean; invoiceId?: string; invoiceNo?: string; pdfPath?: string }> {
  // Find latest PAID purchase with invoice
  const purchaseQuery = await db
    .collection('credit_purchases')
    .where('userId', '==', userId)
    .where('status', '==', 'PAID')
    .orderBy('paidAt', 'desc')
    .limit(1)
    .get();

  if (purchaseQuery.empty) {
    return { found: false };
  }

  const purchase = purchaseQuery.docs[0].data();

  // Create invoice if not exists
  if (!purchase.credit_invoice_id) {
    const result = await createCreditInvoice(purchaseQuery.docs[0].id);
    if (!result.success) {
      return { found: false };
    }

    // Get the created invoice
    const invoiceDoc = await db.collection('credit_invoices').doc(result.invoiceId!).get();
    const invoice = invoiceDoc.data();

    return {
      found: true,
      invoiceId: result.invoiceId,
      invoiceNo: invoice?.invoice_no,
      pdfPath: invoice?.pdf_path,
    };
  }

  // Get existing invoice
  const invoiceDoc = await db.collection('credit_invoices').doc(purchase.credit_invoice_id).get();
  if (!invoiceDoc.exists) {
    return { found: false };
  }

  const invoice = invoiceDoc.data()!;

  return {
    found: true,
    invoiceId: invoiceDoc.id,
    invoiceNo: invoice.invoice_no,
    pdfPath: invoice.pdf_path,
  };
}
