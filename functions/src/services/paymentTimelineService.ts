import { getDb } from '../core/firebaseAdmin';
/**
 * Payment Timeline Service
 * 
 * Generates timeline card showing payment status progression
 * 
 * Timeline stages:
 * 1. Purchase created (QR shown)
 * 2. Slip received (acknowledgment sent)
 * 3. OCR started
 * 4. OCR processing / delay
 * 5. Success / Failure / Retry
 * 
 * Used for:
 * - Admin review
 * - User status inquiry
 * - Debugging payment issues
 */

import * as admin from "firebase-admin";
import { CreditPurchase } from "./purchaseService";

const db = getDb();

/**
 * Timeline stage
 */
export interface TimelineStage {
  stage: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  timestamp: admin.firestore.Timestamp | null;
  message?: string;
}

/**
 * Payment timeline
 */
export interface PaymentTimeline {
  purchaseId: string;
  userId: string;
  stages: TimelineStage[];
  currentStage: string;
  overallStatus: 'pending' | 'processing' | 'success' | 'failed' | 'max_retries';
}

/**
 * Get payment timeline for a purchase
 */
export async function getPaymentTimeline(purchaseId: string): Promise<PaymentTimeline | null> {
  try {
    const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
    const purchaseDoc = await purchaseRef.get();

    if (!purchaseDoc.exists) {
      return null;
    }

    const purchase = purchaseDoc.data() as CreditPurchase;
    const stages: TimelineStage[] = [];

    // Stage 1: Purchase created
    stages.push({
      stage: 'purchase_created',
      status: 'completed',
      timestamp: purchase.createdAt,
      message: `สร้างรายการซื้อ (${purchase.amount} บาท)`,
    });

    // Stage 2: QR sent (if status is WAITING_FOR_SLIP or later)
    if (purchase.status !== 'PENDING' && purchase.status !== 'FAILED') {
      stages.push({
        stage: 'qr_sent',
        status: 'completed',
        timestamp: purchase.createdAt, // QR sent immediately after creation
        message: 'ส่ง QR Code ชำระเงิน',
      });
    }

    // Stage 3: Slip received
    const slipReceivedAt = purchase.slip_uploaded_at || purchase.slipReceivedAt || null;
    if (slipReceivedAt) {
      stages.push({
        stage: 'slip_received',
        status: 'completed',
        timestamp: slipReceivedAt,
        message: 'ได้รับสลิปการโอนเงิน',
      });
    } else if (purchase.status === 'WAITING_FOR_SLIP') {
      stages.push({
        stage: 'slip_received',
        status: 'pending',
        timestamp: null,
        message: 'รอรับสลิปการโอนเงิน',
      });
    }

    // Stage 4: OCR started
    if (purchase.slip_uploaded_at) {
      stages.push({
        stage: 'ocr_started',
        status: purchase.status === 'PENDING_REVIEW' || purchase.status === 'PAID' ? 'completed' : 'in_progress',
        timestamp: purchase.slip_uploaded_at,
        message: 'เริ่มตรวจสอบสลิป (OCR)',
      });
    }

    // Stage 5: OCR processing / delay
    if (purchase.status === 'PENDING_REVIEW') {
      if (purchase.delay_notified) {
        stages.push({
          stage: 'ocr_delay',
          status: 'in_progress',
          timestamp: purchase.delay_notified_at || null,
          message: 'กำลังตรวจสอบ (ใช้เวลานานกว่าปกติ)',
        });
      } else {
        stages.push({
          stage: 'ocr_processing',
          status: 'in_progress',
          timestamp: purchase.slip_uploaded_at || null,
          message: 'กำลังตรวจสอบสลิป',
        });
      }
    }

    // Stage 6: Final result
    if (purchase.status === 'PAID') {
      const paidTimestamp =
        purchase.paidAt ||
        purchase.payment_verified_at ||
        purchase.credit_applied_at ||
        null;
      stages.push({
        stage: 'payment_success',
        status: 'completed',
        timestamp: paidTimestamp,
        message: `ชำระเงินสำเร็จ (${purchase.verified_by || 'OCR'})`,
      });
    } else if (purchase.status === 'REJECTED') {
      const retryCount = purchase.retry_count || 0;
      if (retryCount >= 3) {
        stages.push({
          stage: 'max_retries',
          status: 'failed',
          timestamp: purchase.updatedAt || null,
          message: `ตรวจสอบไม่สำเร็จ (ลองแล้ว ${retryCount} ครั้ง)`,
        });
      } else {
        stages.push({
          stage: 'ocr_failed',
          status: 'failed',
          timestamp: purchase.updatedAt || null,
          message: `ตรวจสอบไม่สำเร็จ (ลองครั้งที่ ${retryCount + 1})`,
        });
      }
    }

    // Determine current stage and overall status
    let currentStage = 'purchase_created';
    let overallStatus: PaymentTimeline['overallStatus'] = 'pending';

    const lastStage = stages[stages.length - 1];
    if (lastStage) {
      currentStage = lastStage.stage;

      if (purchase.status === 'PAID') {
        overallStatus = 'success';
      } else if (purchase.status === 'REJECTED' && (purchase.retry_count || 0) >= 3) {
        overallStatus = 'max_retries';
      } else if (purchase.status === 'REJECTED') {
        overallStatus = 'failed';
      } else if (purchase.status === 'PENDING_REVIEW' || purchase.status === 'WAITING_FOR_SLIP') {
        overallStatus = 'processing';
      } else {
        overallStatus = 'pending';
      }
    }

    return {
      purchaseId,
      userId: purchase.userId,
      stages,
      currentStage,
      overallStatus,
    };
  } catch (error) {
    console.error(`[paymentTimelineService] Error getting timeline:`, error);
    return null;
  }
}

/**
 * Format timeline as text (for LINE message)
 */
export function formatTimelineAsText(timeline: PaymentTimeline): string {
  const lines: string[] = [];
  lines.push(`บี๊บ! 📊 สถานะการชำระเงิน\nRef: ${timeline.purchaseId.slice(0, 8)}...\n`);

  for (const stage of timeline.stages) {
    let icon = '⏳';
    if (stage.status === 'completed') {
      icon = '✅';
    } else if (stage.status === 'failed') {
      icon = '❌';
    } else if (stage.status === 'in_progress') {
      icon = '🔄';
    }

    const timeStr = stage.timestamp 
      ? stage.timestamp.toDate().toLocaleString('th-TH', { 
          hour: '2-digit', 
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        })
      : '-';

    lines.push(`${icon} ${stage.message} (${timeStr})`);
  }

  return lines.join('\n');
}
