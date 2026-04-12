import { getDb } from '../core/firebaseAdmin';
/**
 * Scheduled Function: Retry Failed Timeout Push Notifications
 * 
 * Runs periodically to retry timeout notifications that failed to deliver.
 * 
 * Strategy:
 * - Finds jobs with timeout_lock_acquired=true but timeout_delivered=false
 * - Filters by: lock older than 5 minutes (stale), last error not permanent (4xx)
 * - Re-enqueues timeout task for retry
 * 
 * Schedule: Every 10 minutes (configurable)
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { enqueuePdfTimeoutTask } from '../workers/pdfTimeoutEnqueue';
import { secureLog, secureError, secureWarn } from '../utils/secureConsole';

const db = getDb();
const MAX_RETRY_ATTEMPTS = 3; // Don't retry more than 3 times

/**
 * Retry failed timeout push notifications
 */
async function retryFailedTimeoutPushes(): Promise<void> {
  const traceId = `retry-sweep-${Date.now()}`;
  secureLog({
    tag: '[TIMEOUT_RETRY_SWEEPER_START]',
    trace_id: traceId,
    timestamp: new Date().toISOString(),
  });

  try {
    const now = Date.now();

    // Find jobs with:
    // - status = PROCESSING (still relevant)
    // - timeout_lock_acquired = true (attempted)
    // - timeout_delivered = false (not delivered)
    // - timeout_lock_expires_at < now (stale lock, expired)
    // - timeout_push_attempts < MAX_RETRY_ATTEMPTS (not exhausted)
    const snapshot = await db
      .collection('pdf_generation_jobs')
      .where('status', '==', 'PROCESSING')
      .where('timeout_lock_acquired', '==', true)
      .where('timeout_delivered', '==', false)
      .where('timeout_lock_expires_at', '<', admin.firestore.Timestamp.fromMillis(now))
      .limit(50) // Process max 50 at a time
      .get();

    if (snapshot.empty) {
      secureLog({
        tag: '[TIMEOUT_RETRY_SWEEPER_NO_JOBS]',
        trace_id: traceId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let retriedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const doc of snapshot.docs) {
      const jobData = doc.data() as Record<string, unknown>;
      const jobId = doc.id;
      const pushAttempts = (jobData.timeout_push_attempts as number) || 0;
      const lastError = jobData.timeout_last_push_error as string | undefined;

      // Skip if retry attempts exhausted
      if (pushAttempts >= MAX_RETRY_ATTEMPTS) {
        skippedCount++;
        secureWarn({
          tag: '[TIMEOUT_RETRY_SKIP_EXHAUSTED]',
          trace_id: traceId,
          job_id: jobId,
          attempts: pushAttempts,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Skip if last error indicates permanent failure (4xx, except 429)
      if (lastError && (lastError.includes('400') || lastError.includes('403') || lastError.includes('404'))) {
        skippedCount++;
        secureWarn({
          tag: '[TIMEOUT_RETRY_SKIP_PERMANENT_ERROR]',
          trace_id: traceId,
          job_id: jobId,
          last_error: lastError,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      try {
        // Reset lock to allow retry
        await doc.ref.update({
          timeout_lock_acquired: false,
          timeout_lock_acquired_at: admin.firestore.FieldValue.delete(),
        });

        // Re-enqueue timeout task
        const jobDataForEnqueue = {
          processing_started_at: jobData.processing_started_at,
        };
        await enqueuePdfTimeoutTask(jobId, jobDataForEnqueue);

        retriedCount++;
        secureLog({
          tag: '[TIMEOUT_RETRY_ENQUEUED]',
          trace_id: traceId,
          job_id: jobId,
          attempts: pushAttempts,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        errors.push(`${jobId}: ${err instanceof Error ? err.message : String(err)}`);
        secureError({
          tag: '[TIMEOUT_RETRY_ERROR]',
          trace_id: traceId,
          job_id: jobId,
          timestamp: new Date().toISOString(),
        }, err);
      }
    }

    secureLog({
      tag: '[TIMEOUT_RETRY_SWEEPER_COMPLETE]',
      trace_id: traceId,
      total_found: snapshot.size,
      retried: retriedCount,
      skipped: skippedCount,
      errors: errors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    secureError({
      tag: '[TIMEOUT_RETRY_SWEEPER_ERROR]',
      trace_id: traceId,
      timestamp: new Date().toISOString(),
    }, err);
    throw err;
  }
}

/**
 * Scheduled function: Retry failed timeout pushes every 10 minutes
 */
export const retryTimeoutPushesScheduled = functions
  .region('asia-southeast1')
  .pubsub
  .schedule('*/10 * * * *') // Every 10 minutes
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    void context;
    await retryFailedTimeoutPushes();
  });
