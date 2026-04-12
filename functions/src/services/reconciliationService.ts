import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Reconciliation Service
 * 
 * Provides daily reconciliation reports for credit purchases.
 */

import * as admin from 'firebase-admin';

const db = getDb();

export interface ReconciliationMetrics {
  total_created: number;
  slip_received: number;
  auto_paid: number; // OCR verified
  admin_paid: number; // Admin verified
  pending_review: number;
  rejected: number;
  expired: number;
  revenue_total: number;
}

/**
 * Generate daily reconciliation report
 */
export async function generateDailyReconciliation(date: Date | null = null): Promise<ReconciliationMetrics> {
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

  const metrics: ReconciliationMetrics = {
    total_created: 0,
    slip_received: 0,
    auto_paid: 0,
    admin_paid: 0,
    pending_review: 0,
    rejected: 0,
    expired: 0,
    revenue_total: 0,
  };

  for (const doc of purchasesQuery.docs) {
    const p = doc.data();
    metrics.total_created++;

    // Count slip received
    if (p.slip_image_url) {
      metrics.slip_received++;
    }

    // Count by status and verified_by
    if (p.status === 'PAID') {
      if (p.verified_by === 'OCR') {
        metrics.auto_paid++;
      } else if (p.verified_by === 'ADMIN') {
        metrics.admin_paid++;
      }
      metrics.revenue_total += p.amount || 0;
    } else if (p.status === 'PENDING_REVIEW') {
      metrics.pending_review++;
    } else if (p.status === 'REJECTED') {
      metrics.rejected++;
    } else if (p.status === 'EXPIRED') {
      metrics.expired++;
    }
  }

  return metrics;
}

/**
 * Format reconciliation report as text
 */
export function formatReconciliationReport(metrics: ReconciliationMetrics, date: Date): string {
  const dateStr = date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const lines = [
    `📊 รายงานการกระทบยอดแพ็ก (${dateStr})`,
    '',
    `📈 สร้างรายการ: ${metrics.total_created}`,
    `📸 รับสลิป: ${metrics.slip_received}`,
    '',
    `✅ ชำระเงินแล้ว: ${metrics.auto_paid + metrics.admin_paid}`,
    `   🤖 OCR อัตโนมัติ: ${metrics.auto_paid}`,
    `   👤 Admin: ${metrics.admin_paid}`,
    '',
    `⏳ รอตรวจสอบ: ${metrics.pending_review}`,
    `❌ ปฏิเสธ: ${metrics.rejected}`,
    `⏰ หมดอายุ: ${metrics.expired}`,
    '',
    `💰 รายได้รวม: ${metrics.revenue_total.toLocaleString('th-TH')} บาท`,
  ];

  return lines.join('\n');
}

/**
 * Get admin LINE user IDs for pushing reports
 */
async function getAdminLineUserIds(): Promise<string[]> {
  const adminUsersQuery = await db
    .collection('users')
    .where('isAdmin', '==', true)
    .get();

  const adminLineUserIds: string[] = [];
  for (const doc of adminUsersQuery.docs) {
    const userData = doc.data();
    if (userData.lineUserId) {
      adminLineUserIds.push(userData.lineUserId);
    }
  }

  return adminLineUserIds;
}

/**
 * Push daily reconciliation report to admins
 */
export async function pushDailyReconciliationReport(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const metrics = await generateDailyReconciliation(yesterday);
  const reportText = formatReconciliationReport(metrics, yesterday);

  const adminLineUserIds = await getAdminLineUserIds();

  if (adminLineUserIds.length === 0) {
    console.warn('[reconciliationService] No admin users found to send report');
    return;
  }

  const { pushLineMessage } = await import('./lineService');

  // Push to all admins
  const pushPromises = adminLineUserIds.map(lineUserId =>
    pushLineMessage(lineUserId, reportText).catch(err => {
      console.error(`[reconciliationService] Failed to push report to ${lineUserId}:`, err);
    })
  );

  await Promise.all(pushPromises);
  console.log(`[reconciliationService] Pushed daily reconciliation report to ${adminLineUserIds.length} admin(s)`);
}
