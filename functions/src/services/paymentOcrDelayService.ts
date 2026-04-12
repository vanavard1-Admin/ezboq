import { getDb } from '../core/firebaseAdmin';
/**
 * Payment OCR Delay Service
 * 
 * Detects when OCR is taking longer than expected and sends holding message
 * 
 * Rules:
 * - Send ONE holding message only (idempotent)
 * - Trigger after ~30-60 seconds of OCR processing
 * - No panic wording
 * - Do NOT ask for resend yet
 */

import * as admin from "firebase-admin";
import { getOcrDelayMessage, getPaymentPendingQuickReply } from "./paymentUXCopy";
import { pushLineMessage } from "./lineService";
import { sendAdminAlert } from "./supportTicketService";

const db = getDb();
const OCR_DELAY_THRESHOLD_MS = 30 * 1000; // 30 seconds (progressive update)
const ADMIN_NOTIFY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Check for purchases with OCR delay and send holding message
 * 
 * This should be called by a scheduled function periodically
 */
export async function checkAndNotifyOcrDelay(): Promise<number> {
  try {
    const now = admin.firestore.Timestamp.now();
    const thresholdTime = admin.firestore.Timestamp.fromMillis(now.toMillis() - OCR_DELAY_THRESHOLD_MS);
    const adminThresholdTime = admin.firestore.Timestamp.fromMillis(now.toMillis() - ADMIN_NOTIFY_THRESHOLD_MS);

    // Avoid composite-index-only query here. Read recent pending reviews and filter in memory
    // so the delay notifier still works even when indexes are missing during production incidents.
    const query = await db
      .collection('credit_purchases')
      .where('status', '==', 'PENDING_REVIEW')
      .limit(100)
      .get();

    if (query.empty) {
      return 0;
    }

    const candidates = query.docs
      .filter((doc) => {
        const purchase = doc.data();
        return (
          !!purchase.slip_uploaded_at &&
          purchase.slip_uploaded_at.toMillis() <= thresholdTime.toMillis() &&
          purchase.delay_notified !== true
        );
      })
      .sort((a, b) => {
        const aTime = a.data().slip_uploaded_at?.toMillis?.() || 0;
        const bTime = b.data().slip_uploaded_at?.toMillis?.() || 0;
        return aTime - bTime;
      });

    if (candidates.length === 0) {
      return 0;
    }

    let notifiedCount = 0;

    for (const doc of candidates) {
      try {
        const purchase = doc.data();
        const purchaseId = doc.id;

        // Double-check: ensure we haven't notified already (race condition protection)
        const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
        const currentDoc = await purchaseRef.get();
        const currentData = currentDoc.data();

        if (currentData?.delay_notified === true || currentData?.status !== 'PENDING_REVIEW') {
          // Already notified or status changed, skip
          continue;
        }

        // C2) Delay > 60s: ต้องมี "ยังตรวจ / ไม่ต้องโอนซ้ำ / เดี๋ยวแจ้งผล"
        const message = getOcrDelayMessage(purchaseId);
        const quickReply = getPaymentPendingQuickReply();
        await pushLineMessage(purchase.lineUserId, message, undefined, quickReply);

        // ✅ Telemetry: Log OCR delay sent
        try {
          const { logOcrDelaySent } = await import('./paymentTelemetry');
          const delaySeconds = Math.floor(
            (now.toMillis() - (currentData.slip_uploaded_at?.toMillis() || now.toMillis())) / 1000
          );
          await logOcrDelaySent(
            purchase.userId,
            purchaseId,
            delaySeconds,
            currentData.slip_uploaded_at || admin.firestore.Timestamp.now()
          );
        } catch (telemetryError) {
          console.warn(`[paymentOcrDelayService] Failed to log OCR delay:`, telemetryError);
        }

        // Mark as notified (idempotent)
        await purchaseRef.update({
          delay_notified: true,
          delay_notified_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`[paymentOcrDelayService] Delay notification sent: purchaseId=${purchaseId}`);
        notifiedCount++;

        // ✅ Admin notification for long pending review (single-shot)
        try {
          if (
            currentData?.slip_uploaded_at &&
            currentData.slip_uploaded_at.toMillis() <= adminThresholdTime.toMillis() &&
            currentData?.admin_notified !== true
          ) {
            const subject = `EzDoc: PENDING_REVIEW เกิน ${Math.floor(ADMIN_NOTIFY_THRESHOLD_MS / 60000)} นาที`;
            const body = [
              `Purchase: ${purchaseId}`,
              `User: ${purchase.userId}`,
              `LINE: ${purchase.lineUserId}`,
              `Amount: ${purchase.amount}`,
              `Status: ${currentData.status}`,
              `Uploaded: ${currentData.slip_uploaded_at?.toDate?.() || '-'}`,
              `Ref: ${purchaseId}`,
            ].join('\n');
            const adminEmailSent = await sendAdminAlert(subject, body);
            await purchaseRef.update({
              admin_notified: adminEmailSent,
              admin_notified_at: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        } catch (adminNotifyError) {
          console.warn(`[paymentOcrDelayService] Failed to notify admin for ${purchaseId}:`, adminNotifyError);
        }
      } catch (error) {
        console.error(`[paymentOcrDelayService] Error processing purchase ${doc.id}:`, error);
        // Continue with next purchase
      }
    }

    console.log(`[paymentOcrDelayService] Notified ${notifiedCount} purchases of OCR delay`);
    return notifiedCount;
  } catch (error) {
    console.error(`[paymentOcrDelayService] Error checking OCR delay:`, error);
    return 0;
  }
}
