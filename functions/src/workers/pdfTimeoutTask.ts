import { getDb } from '../core/firebaseAdmin';
/**
 * PDF Timeout Task Handler
 * 
 * Cloud Task handler that checks if a PDF job is still PROCESSING after timeout threshold
 * and sends notification to user if so.
 * 
 * This addresses the issue where jobs stuck in PROCESSING don't trigger Firestore onUpdate events,
 * so the timeout check in checkPdfTimeout() never runs.
 * 
 * SECURITY: OIDC token verification required (only Cloud Tasks can invoke)
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { OAuth2Client } from 'google-auth-library';
import { getLineUserIdFromFirebaseUid } from '../core/lineUserMapping';

const db = getDb();
const TIMEOUT_THRESHOLD_MS = 90000; // 90 seconds

// Get timeout task URL/audience from env (should match function URL)
import { getLineChannelAccessToken, getTimeoutTaskAudience } from '../shared/config';
const oauth2Client = new OAuth2Client();

interface TimeoutTaskPayload {
  jobId: string;
}

/**
 * Cloud Task handler: Check if PDF job is still PROCESSING and notify if so
 */
export const pdfTimeoutTaskHandler = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['LINE_CHANNEL_ACCESS_TOKEN'],
    memory: '256MB',
    timeoutSeconds: 60,
  })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    let jobId: string | undefined; // Declare jobId in outer scope for error handler

    try {
      // ✅ SECURITY SEV-0: Verify OIDC token from Cloud Tasks
      if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
      }

      try {
        const authHeader = (req.get('authorization') || req.get('Authorization') || '') as string;
        if (!authHeader) {
          console.warn('[pdfTimeoutTask] Missing Authorization header');
          res.status(401).send('Unauthorized');
          return;
        }
        const match = authHeader.match(/^Bearer\s+(.*)$/i);
        if (!match) {
          console.warn('[pdfTimeoutTask] Invalid Authorization header format');
          res.status(401).send('Unauthorized');
          return;
        }
        const idToken = match[1];

        // ✅ FIX 4: Fail-closed - TIMEOUT_TASK_AUDIENCE must be configured in production
        const timeoutAudience = getTimeoutTaskAudience();
        if (!timeoutAudience) {
          console.error('[pdfTimeoutTask] TIMEOUT_TASK_AUDIENCE not configured; rejecting request (fail-closed)');
          res.status(500).send('Server configuration error');
          return;
        }

        try {
          await oauth2Client.verifyIdToken({ idToken, audience: timeoutAudience });
        } catch (e) {
          console.warn('[pdfTimeoutTask] OIDC token verification failed', e);
          res.status(401).send('Unauthorized');
          return;
        }
      } catch (e) {
        console.warn('[pdfTimeoutTask] Token verification error', e);
        res.status(401).send('Unauthorized');
        return;
      }

      const payload = req.body as TimeoutTaskPayload;
      const { jobId } = payload;

      if (!jobId) {
        res.status(400).send('Missing jobId');
        return;
      }

      const jobRef = db.collection('pdf_generation_jobs').doc(jobId);
      const jobSnap = await jobRef.get();

      if (!jobSnap.exists) {
        // Job doesn't exist - might have been deleted or completed
        res.status(200).send('Job not found (likely completed)');
        return;
      }

      const jobData = jobSnap.data() as Record<string, unknown>;
      const status = jobData.status as string;

      // Only send notification if job is still PROCESSING
      if (status !== 'PROCESSING') {
        // Job is DONE, FAILED, or PENDING - no timeout notification needed
        res.status(200).send(`Job status is ${status}, no timeout notification needed`);
        return;
      }

      // Check if we already sent timeout notification (idempotency)
      if (jobData.timeout_notified) {
        res.status(200).send('Timeout notification already sent');
        return;
      }

      // Check elapsed time since processing started
      const processingStartedAt = jobData.processing_started_at as admin.firestore.Timestamp | undefined;
      if (!processingStartedAt) {
        // No timestamp - might be an old job, skip
        res.status(200).send('No processing_started_at timestamp');
        return;
      }

      const elapsedMs = Date.now() - processingStartedAt.toMillis();
      if (elapsedMs < TIMEOUT_THRESHOLD_MS) {
        // Not timeout yet (shouldn't happen with 90s delay, but check anyway)
        res.status(200).send(`Not timeout yet (${elapsedMs}ms < ${TIMEOUT_THRESHOLD_MS}ms)`);
        return;
      }

      // ✅ FIX 1: Atomic idempotency - Use transaction to acquire lock (separate from delivery status)
      // Strategy: timeout_lock_acquired = prevents duplicate attempts, timeout_delivered = tracks success
      // This allows retry via separate task if push fails, while preventing race conditions
      const userId = jobData.user_id as string;
      const documentNo = jobData.document_no as string;

      let acquiredLock = false;
      try {
        // Transaction: Re-read job, check conditions, and acquire lock atomically
        await db.runTransaction(async (tx) => {
          const freshJobSnap = await tx.get(jobRef);
          if (!freshJobSnap.exists) {
            throw new Error('Job not found in transaction');
          }

          const freshJobData = freshJobSnap.data() as Record<string, unknown>;
          const freshStatus = freshJobData.status as string;
          const freshLockAcquired = freshJobData.timeout_lock_acquired as boolean | undefined;
          const freshDelivered = freshJobData.timeout_delivered as boolean | undefined;

          // Re-check conditions in transaction
          if (freshStatus !== 'PROCESSING') {
            throw new Error(`Job status changed to ${freshStatus} during transaction`);
          }

          // If already delivered, skip (idempotency)
          if (freshDelivered) {
            throw new Error('Timeout notification already delivered');
          }

          // If lock acquired but not delivered, another task is processing (or failed)
          // Allow retry if lock is older than 5 minutes (assume previous attempt failed)
          if (freshLockAcquired) {
            const lockAcquiredAt = freshJobData.timeout_lock_acquired_at as admin.firestore.Timestamp | undefined;
            if (lockAcquiredAt) {
              const lockAgeMs = Date.now() - lockAcquiredAt.toMillis();
              if (lockAgeMs < 5 * 60 * 1000) { // 5 minutes
                throw new Error('Timeout lock already acquired by another task (recent)');
              }
              // Lock is stale (>5min) - allow retry
            } else {
              // Lock exists but no timestamp - assume stale, allow retry
            }
          }

          // Atomic update: Acquire lock (separate from delivery status)
          tx.update(jobRef, {
            timeout_lock_acquired: true,
            timeout_lock_acquired_at: admin.firestore.FieldValue.serverTimestamp(),
            timeout_push_attempts: admin.firestore.FieldValue.increment(1),
          });

          acquiredLock = true;
        });
      } catch (txError: any) {
        // Transaction failed - either job changed or another task acquired lock
        if (txError?.message?.includes('already delivered')) {
          // Already delivered - success
          res.status(200).send('Timeout notification already delivered');
          return;
        }
        if (txError?.message?.includes('already acquired') || txError?.message?.includes('status changed')) {
          // Another task processing or job changed - expected in race condition
          res.status(200).send('Timeout notification being processed by another task');
          return;
        }
        // Other transaction error
        const { secureError } = await import('../utils/secureConsole');
        secureError({
          tag: '[PDF_TIMEOUT_TASK_TX_ERROR]',
          trace_id: `timeout-${jobId}`,
          job_id: jobId,
          timestamp: new Date().toISOString(),
        }, txError);
        res.status(500).send('Transaction failed');
        return;
      }

      // Only proceed if we successfully acquired the lock
      if (!acquiredLock) {
        res.status(500).send('Failed to acquire lock');
        return;
      }

      // Now send push (flag already set, so no race condition)
      const lineUserId = await getLineUserIdFromFirebaseUid(userId);
      if (!lineUserId) {
        res.status(200).send(`No LINE user ID for userId=${userId}`);
        return;
      }

      const accessToken = getLineChannelAccessToken();
      if (!accessToken) {
        res.status(500).send('LINE_CHANNEL_ACCESS_TOKEN not configured');
        return;
      }

      const message = `ติ๊ดๆ ยังทำอยู่นะครับเจ้านาย\nถ้าเกิน 2 นาทีพิมพ์ "เอกสารล่าสุด" ได้เลยครับ`;

      // ✅ FIX 2: Use safePushMessage for reliability (with retry/backoff)
      const { safePushMessage } = await import('../utils/asyncSafety');
      const pushSuccess = await safePushMessage(
        lineUserId,
        message,
        accessToken,
        { traceId: `timeout-${jobId}`, lineUserId, eventType: 'pdf_timeout', stage: 'notification' }
      );

      if (!pushSuccess) {
        // Push failed (even after retries) - flag already set, so won't retry
        // Log for manual investigation
        const { secureError } = await import('../utils/secureConsole');
        secureError({
          tag: '[PDF_TIMEOUT_PUSH_FAILED]',
          trace_id: `timeout-${jobId}`,
          job_id: jobId,
          user_id: userId,
          line_user_id: lineUserId,
          timestamp: new Date().toISOString(),
        });
        res.status(500).send('Failed to send timeout notification');
        return;
      }

      // ✅ FIX 3: Use secure logging
      const { secureLog } = await import('../utils/secureConsole');
      secureLog({
        tag: '[PDF_TIMEOUT_NOTIFIED]',
        trace_id: `timeout-${jobId}`,
        job_id: jobId,
        user_id: userId,
        line_user_id: lineUserId,
        document_no: documentNo,
        elapsed_ms: elapsedMs,
        timestamp: new Date().toISOString(),
      });
      res.status(200).send('Timeout notification sent');
    } catch (err) {
      // ✅ FIX 3: Use secure error logging
      const { secureError } = await import('../utils/secureConsole');
      secureError({
        tag: '[PDF_TIMEOUT_TASK_ERROR]',
        trace_id: `timeout-${jobId || 'unknown'}`,
        job_id: jobId,
        timestamp: new Date().toISOString(),
      }, err);
      res.status(500).send('Internal server error');
    }
  });
