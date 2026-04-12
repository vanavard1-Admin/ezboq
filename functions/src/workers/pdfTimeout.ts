import { getDb } from '../core/firebaseAdmin';
/**
 * PDF Timeout Handler (PHASE 2)
 * 
 * Checks for PDF jobs that have been PROCESSING for > 60-120s
 * and sends timeout notification to user
 */

import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { getLineUserIdFromFirebaseUid } from '../core/lineUserMapping';
import { getLineChannelAccessToken } from '../shared/config';

const db = getDb();
const LINE_API_PUSH = 'https://api.line.me/v2/bot/message/push';
const TIMEOUT_THRESHOLD_MS = 90000; // 90 seconds (between 60-120s as requested)

/**
 * Check and notify for PDF jobs stuck in PROCESSING
 * Called by onUpdate trigger when pdf_generation_jobs status changes
 */
export async function checkPdfTimeout(
  change: { before: admin.firestore.DocumentSnapshot; after: admin.firestore.DocumentSnapshot }
): Promise<void> {
  const beforeData = change.before.data();
  const afterData = change.after.data();

  // Only check if status is PROCESSING
  if (!afterData || afterData.status !== 'PROCESSING') {
    return;
  }

  const jobId = change.after.id;
  const jobRef = db.collection('pdf_generation_jobs').doc(jobId);

  // If was already PROCESSING, check elapsed time
  const wasProcessing = beforeData?.status === 'PROCESSING';
  if (!wasProcessing) {
    // Just transitioned to PROCESSING - set a marker timestamp
    await jobRef.update({
      processing_started_at: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {
      // Non-blocking - if update fails, skip timeout check
    });
    return;
  }

  // Check elapsed time since processing started
  const processingStartedAt = afterData.processing_started_at as admin.firestore.Timestamp | undefined;
  if (!processingStartedAt) {
    // No timestamp - skip (might be old job)
    return;
  }

  const elapsedMs = Date.now() - processingStartedAt.toMillis();
  if (elapsedMs < TIMEOUT_THRESHOLD_MS) {
    // Not timeout yet
    return;
  }

  // Check if we already sent timeout notification (idempotency)
  if (afterData.timeout_notified) {
    return;
  }

  // Send timeout notification
  const userId = afterData.user_id as string;
  const documentNo = afterData.document_no as string;

  try {
    const lineUserId = await getLineUserIdFromFirebaseUid(userId);
    if (!lineUserId) {
      console.warn(`[pdfTimeout] No LINE user ID for userId=${userId}`);
      return;
    }

    const accessToken = getLineChannelAccessToken();
    if (!accessToken) {
      console.warn('[pdfTimeout] LINE_CHANNEL_ACCESS_TOKEN not configured');
      return;
    }

    const message = `ติ๊ดๆ ยังทำอยู่นะครับเจ้านาย\nถ้าเกิน 2 นาทีพิมพ์ "เอกสารล่าสุด" ได้เลยครับ`;

    const response = await fetch(LINE_API_PUSH, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text: message }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(`[pdfTimeout] LINE API error: ${response.status} ${errorBody}`);
      return;
    }

    // Mark as notified (idempotency)
    await jobRef.update({
      timeout_notified: true,
      timeout_notified_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[pdfTimeout] Timeout notification sent: jobId=${jobId}, doc_no=${documentNo}, elapsed=${elapsedMs}ms`);
  } catch (err) {
    console.error(`[pdfTimeout] Error sending timeout notification:`, err);
  }
}
