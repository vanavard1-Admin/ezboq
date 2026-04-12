import { getDb } from '../core/firebaseAdmin';
/**
 * DLQ Processor - Scheduled Function
 * 
 * Processes async_failures collection (dead letter queue)
 * - Runs every 5 minutes
 * - Attempts safe retries for idempotent operations
 * - Marks failures that need manual attention
 * - Cleans up old failures
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

const db = getDb();

/**
 * Process async failures (DLQ processor)
 * Runs every 5 minutes
 */
export const processAsyncFailures = functions.pubsub
  .schedule('every 5 minutes')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    void context;
    console.log('[DLQ_PROCESSOR] Starting async failures processing');

    const cutoffTime = admin.firestore.Timestamp.fromMillis(
      Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    );

    try {
      // Get unresolved failures from last 24 hours
      const failuresQuery = await db.collection('async_failures')
        .where('resolved', '==', false)
        .where('createdAt', '>', cutoffTime)
        .limit(50) // Process in batches
        .get();

      console.log(`[DLQ_PROCESSOR] Found ${failuresQuery.size} unresolved failures`);

      let processed = 0;
      let retried = 0;
      let markedForAttention = 0;

      for (const doc of failuresQuery.docs) {
        const failure = doc.data();
        const failureId = doc.id;

        try {
          // Classify failure type
          const failureType = classifyFailureType(failure);

          // Check if safe to retry
          const canRetry = isSafeToRetry(failureType, failure);

          if (canRetry) {
            // Attempt retry (only for idempotent operations)
            const retrySuccess = await attemptRetry(failure, failureType);

            if (retrySuccess) {
              // Mark as resolved
              await doc.ref.update({
                resolved: true,
                resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                resolution: 'RETRY_SUCCESS',
                attemptCount: (failure.attemptCount || 0) + 1,
                lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              retried++;
              console.log(`[DLQ_PROCESSOR] ✅ Retried and resolved: ${failureId}`);
            } else {
              // Retry failed, increment attempt count
              const attemptCount = (failure.attemptCount || 0) + 1;

              if (attemptCount >= 3) {
                // Max retries reached, mark for manual attention
                await doc.ref.update({
                  needsAttention: true,
                  attemptCount,
                  lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                markedForAttention++;
                console.log(`[DLQ_PROCESSOR] ⚠️ Max retries reached, marked for attention: ${failureId}`);
              } else {
                // Increment attempt count and schedule next retry with backoff
                const backoffDelay = getBackoffDelay(attemptCount);
                const nextAttemptAt = admin.firestore.Timestamp.fromMillis(Date.now() + backoffDelay);

                await doc.ref.update({
                  attemptCount,
                  lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
                  nextAttemptAt,
                });

                console.log(`[DLQ_PROCESSOR] Retry failed, will retry again: ${failureId} (attempt ${attemptCount}, next in ${Math.round(backoffDelay / 1000)}s)`);
              }
            }
          } else {
            // Not safe to retry, mark for manual attention
            await doc.ref.update({
              needsAttention: true,
              attemptCount: (failure.attemptCount || 0) + 1,
              lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            markedForAttention++;
            console.log(`[DLQ_PROCESSOR] ⚠️ Not safe to retry, marked for attention: ${failureId}`);
          }

          processed++;
        } catch (error) {
          console.error(`[DLQ_PROCESSOR] Error processing failure ${failureId}:`, error);
          // Continue with next failure
        }
      }

      console.log(`[DLQ_PROCESSOR] Completed: processed=${processed}, retried=${retried}, markedForAttention=${markedForAttention}`);

      return {
        processed,
        retried,
        markedForAttention,
      };
    } catch (error) {
      console.error('[DLQ_PROCESSOR] Fatal error:', error);
      throw error;
    }
  });

/**
 * Classify failure type based on stage/eventType
 */
function classifyFailureType(failure: {
  stage?: string;
  eventType?: string;
  errorMessage?: string;
}): 'delivery' | 'pdf' | 'payment' | 'webhook' | 'unknown' {
  const stage = failure.stage || '';
  const eventType = failure.eventType || '';
  const errorMsg = failure.errorMessage || '';

  if (stage.includes('delivery') || stage.includes('push') || errorMsg.includes('LINE API')) {
    return 'delivery';
  }

  if (stage.includes('pdf') || stage.includes('generation') || errorMsg.includes('PDF')) {
    return 'pdf';
  }

  if (stage.includes('payment') || stage.includes('purchase') || eventType.includes('payment')) {
    return 'payment';
  }

  if (stage.includes('webhook') || stage.includes('async')) {
    return 'webhook';
  }

  return 'unknown';
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attemptCount: number): number {
  const baseDelay = 5 * 60 * 1000; // 5 minutes base
  const delay = Math.min(baseDelay * Math.pow(2, attemptCount - 1), 60 * 60 * 1000); // Max 60 min
  const jitter = delay * 0.2 * (Math.random() * 2 - 1); // ±20% jitter
  return delay + jitter;
}

/**
 * Check if failure is safe to retry (idempotent operations only)
 */
function isSafeToRetry(
  failureType: 'delivery' | 'pdf' | 'payment' | 'webhook' | 'unknown',
  failure: { attemptCount?: number; lastAttemptAt?: admin.firestore.Timestamp }
): boolean {
  // Max 3 retry attempts
  if ((failure.attemptCount || 0) >= 3) {
    return false;
  }

  // Check backoff delay
  const lastAttempt = failure.lastAttemptAt?.toMillis() || 0;
  const backoffDelay = getBackoffDelay(failure.attemptCount || 0);
  if (Date.now() - lastAttempt < backoffDelay) {
    return false; // Too soon - respect backoff
  }

  // Only retry idempotent operations
  switch (failureType) {
    case 'delivery':
      // Delivery can be retried (idempotent with delivery_status check)
      return true;
    case 'pdf':
      // PDF generation can be retried (idempotent with job status)
      return true;
    case 'payment':
      // Payment processing should NOT be auto-retried (risk of double-charge)
      return false;
    case 'webhook':
      // Webhook processing can be retried if idempotent (eventId check)
      return true;
    default:
      return false;
  }
}

/**
 * Attempt to retry the failed operation
 */
async function attemptRetry(
  failure: {
    traceId?: string;
    lineUserId?: string;
    eventType?: string;
    stage?: string;
    eventData?: unknown;
    errorMessage?: string;
  },
  failureType: 'delivery' | 'pdf' | 'webhook' | 'payment' | 'unknown'
): Promise<boolean> {
  try {
    // For now, we just log the retry attempt
    // Actual retry logic would depend on the specific operation type
    // This is a placeholder - implement specific retry logic per failure type

    console.log(`[DLQ_PROCESSOR] Attempting retry for ${failureType}: ${failure.traceId}`);

    // TODO: Implement specific retry logic:
    // - Delivery: Re-enqueue delivery task
    // - PDF: Re-trigger PDF generation
    // - Webhook: Re-process message (if idempotent)

    // For now, return false (retry not implemented yet)
    // This marks failures for manual attention
    return false;
  } catch (error) {
    console.error(`[DLQ_PROCESSOR] Retry attempt failed:`, error);
    return false;
  }
}

/**
 * Cleanup old failures (runs daily)
 */
export const cleanupOldFailures = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    void context;
    console.log('[DLQ_CLEANUP] Starting cleanup of old failures');

    const cutoffTime = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days ago
    );

    try {
      const oldFailuresQuery = await db.collection('async_failures')
        .where('resolved', '==', true)
        .where('createdAt', '<', cutoffTime)
        .limit(500) // Process in batches
        .get();

      console.log(`[DLQ_CLEANUP] Found ${oldFailuresQuery.size} old failures to delete`);

      const batch = db.batch();
      let deleted = 0;

      for (const doc of oldFailuresQuery.docs) {
        batch.delete(doc.ref);
        deleted++;

        // Firestore batch limit is 500
        if (deleted % 500 === 0) {
          await batch.commit();
          console.log(`[DLQ_CLEANUP] Deleted ${deleted} old failures`);
        }
      }

      if (deleted % 500 !== 0) {
        await batch.commit();
      }

      console.log(`[DLQ_CLEANUP] Completed: deleted ${deleted} old failures`);

      return { deleted };
    } catch (error) {
      console.error('[DLQ_CLEANUP] Fatal error:', error);
      throw error;
    }
  });
