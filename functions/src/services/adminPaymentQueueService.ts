import { getDb } from '../core/firebaseAdmin';
/**
 * Admin Payment Queue Service
 * 
 * Mini-queue for payment cases that need admin review:
 * - Max retries reached (3+ attempts)
 * - OCR consistently failing
 * - Suspicious patterns
 * 
 * Provides admin with:
 * - List of pending cases
 * - Case details (timeline, slip image, retry history)
 * - Quick actions (approve, reject, request new slip)
 */

import * as admin from "firebase-admin";
import { CreditPurchase } from "./purchaseService";
import { getPaymentTimeline, formatTimelineAsText } from "./paymentTimelineService";

const db = getDb();

/**
 * Admin queue entry
 */
export interface AdminQueueEntry {
  purchaseId: string;
  userId: string;
  lineUserId: string;
  status: string;
  retryCount: number;
  amount: number;
  packageType: number;
  createdAt: admin.firestore.Timestamp;
  slipUploadedAt: admin.firestore.Timestamp | null;
  lastRetryAt: admin.firestore.Timestamp | null;
  issues: string[];
  timeline: string; // Formatted timeline text
  slipImageUrl: string | null;
}

/**
 * Get admin queue (cases needing review)
 */
export async function getAdminQueue(limit: number = 50): Promise<AdminQueueEntry[]> {
  try {
    // Find purchases with max retries reached
    const maxRetriesQuery = await db
      .collection('credit_purchases')
      .where('status', '==', 'REJECTED')
      .where('retry_count', '>=', 3)
      .orderBy('retry_count', 'desc')
      .orderBy('last_retry_at', 'desc')
      .limit(limit)
      .get();

    const entries: AdminQueueEntry[] = [];

    for (const doc of maxRetriesQuery.docs) {
      try {
        const purchase = doc.data() as CreditPurchase;
        const purchaseId = doc.id;

        // Get timeline
        const timeline = await getPaymentTimeline(purchaseId);
        const timelineText = timeline ? formatTimelineAsText(timeline) : 'ไม่พบข้อมูล timeline';

        // Collect issues
        const issues: string[] = [];
        const retryCount = (purchase as any).retry_count || 0;
        if (retryCount >= 3) {
          issues.push(`ลองแล้ว ${retryCount} ครั้ง`);
        }
        if (purchase.fraud_flags && purchase.fraud_flags.length > 0) {
          issues.push(...purchase.fraud_flags);
        }
        const imageQualityScore = (purchase as any).image_quality_score;
        if (imageQualityScore !== undefined && imageQualityScore < 50) {
          issues.push(`คุณภาพภาพต่ำ (${imageQualityScore}/100)`);
        }
        if (purchase.slip_ocr_confidence !== undefined && purchase.slip_ocr_confidence < 0.5) {
          issues.push(`OCR confidence ต่ำ (${(purchase.slip_ocr_confidence * 100).toFixed(0)}%)`);
        }

        entries.push({
          purchaseId,
          userId: purchase.userId,
          lineUserId: purchase.lineUserId,
          status: purchase.status,
          retryCount,
          amount: purchase.amount,
          packageType: purchase.packageType,
          createdAt: purchase.createdAt,
          slipUploadedAt: purchase.slip_uploaded_at || null,
          lastRetryAt: (purchase as any).last_retry_at || null,
          issues,
          timeline: timelineText,
          slipImageUrl: purchase.slip_image_url || null,
        });
      } catch (error) {
        console.error(`[adminPaymentQueueService] Error processing purchase ${doc.id}:`, error);
        // Continue with next entry
      }
    }

    return entries;
  } catch (error) {
    console.error(`[adminPaymentQueueService] Error getting admin queue:`, error);
    return [];
  }
}

/**
 * Format admin queue entry as text (for LINE message)
 */
export function formatQueueEntryAsText(entry: AdminQueueEntry): string {
  const lines: string[] = [];
  lines.push(`📋 รายการที่ต้องตรวจสอบ`);
  lines.push(`ID: ${entry.purchaseId.slice(0, 12)}...`);
  lines.push(`💰 จำนวน: ${entry.amount} บาท`);
  lines.push(`🔄 ลองแล้ว: ${entry.retryCount} ครั้ง`);
  lines.push(`\n⚠️ ปัญหา:`);
  if (entry.issues.length > 0) {
    entry.issues.forEach(issue => lines.push(`• ${issue}`));
  } else {
    lines.push(`• ไม่ระบุ`);
  }
  lines.push(`\n${entry.timeline}`);

  if (entry.slipImageUrl) {
    lines.push(`\n📸 สลิป: ${entry.slipImageUrl}`);
  }

  return lines.join('\n');
}

/**
 * Get queue summary (count of pending cases)
 */
export async function getQueueSummary(): Promise<{
  total: number;
  maxRetries: number;
  avgRetryCount: number;
}> {
  try {
    const queue = await getAdminQueue(100);

    const total = queue.length;
    const maxRetries = queue.length > 0 ? Math.max(...queue.map(e => e.retryCount)) : 0;
    const avgRetryCount = total > 0 
      ? queue.reduce((sum, e) => sum + e.retryCount, 0) / total 
      : 0;

    return {
      total,
      maxRetries,
      avgRetryCount: Math.round(avgRetryCount * 10) / 10,
    };
  } catch (error) {
    console.error(`[adminPaymentQueueService] Error getting queue summary:`, error);
    return { total: 0, maxRetries: 0, avgRetryCount: 0 };
  }
}

