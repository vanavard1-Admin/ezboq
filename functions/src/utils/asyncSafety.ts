import { getDb } from '../core/firebaseAdmin';
/**
 * STEP 1: Async Safety Utilities
 * Prevents "async silence" - ensures users always get feedback
 */

import * as admin from "firebase-admin";
import { LINE_API } from "../shared/config";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface TraceContext {
  traceId: string; // For correlation (unique per processing attempt)
  eventId?: string; // For idempotency (LINE's event.id or message.id - stable across retries)
  lineUserId: string;
  eventType: string;
  stage: string;
}

export interface AsyncFailureRecord {
  traceId: string;
  lineUserId: string;
  eventType: string;
  stage: string;
  errorMessage: string;
  errorStack?: string;
  eventData?: unknown;
  createdAt: admin.firestore.Timestamp;
  resolved?: boolean;
  needsAttention?: boolean;
  attemptCount?: number;
  lastAttemptAt?: admin.firestore.Timestamp;
  resolvedAt?: admin.firestore.Timestamp;
  resolution?: string;
}

// ============================================================================
// TRACE ID GENERATION
// ============================================================================

/**
 * Generate unique trace ID for correlation
 * Format: {timestamp}-{random6chars}
 */
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36); // Base36 timestamp
  const random = Math.random().toString(36).substring(2, 8); // 6 random chars
  return `${timestamp}-${random}`;
}

/**
 * Create structured log with trace context
 */
export function logWithTrace(
  tag: string,
  context: Partial<TraceContext>,
  message: string,
  data?: unknown
): void {
  const logData: Record<string, unknown> = {
    tag,
    traceId: context.traceId || "unknown",
    lineUserId: context.lineUserId || "unknown",
    eventType: context.eventType || "unknown",
    stage: context.stage || "unknown",
    message,
    timestamp: new Date().toISOString(),
  };

  if (data) {
    logData.data = data;
  }

  console.log(JSON.stringify(logData));
}

// ============================================================================
// SAFE PUSH MESSAGE (NEVER THROWS)
// ============================================================================

/**
 * Safely push message to LINE user with retry/backoff + jitter + time cap
 * Catches all errors internally and logs them
 * Returns true if successful, false if failed after retries
 * 
 * Retry strategy:
 * - 429 (Rate Limit): Exponential backoff with jitter (1s, 2s, 4s) - 3 retries
 * - 5xx (Server Error): Exponential backoff with jitter (0.5s, 1s, 2s) - 3 retries
 * - 4xx (Client Error): No retry (except 429)
 * - Network errors: Exponential backoff with jitter (0.5s, 1s, 2s) - 3 retries
 * 
 * Safety:
 * - Jitter: ±20% random to prevent thundering herd
 * - Time cap: Total retry time capped at 15s to prevent function timeout
 */
export async function safePushMessage(
  lineUserId: string,
  text: string,
  accessToken: string,
  context: Partial<TraceContext> = {}
): Promise<boolean> {
  const maxRetries = 3;
  const baseDelayMs = 500; // Base delay for exponential backoff
  const maxTotalTimeMs = 15000; // ✅ FIX 3: Cap total retry time at 15s
  const jitterPercent = 0.2; // ✅ FIX 3: ±20% jitter

  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logWithTrace(
          "[PUSH_RETRY]",
          { ...context, lineUserId },
          `Retry attempt ${attempt}/${maxRetries}`,
          { attempt }
        );
      } else {
        logWithTrace("[PUSH_ATTEMPT]", { ...context, lineUserId }, "Attempting to push message");
      }

      // ✅ FIX 3: Add per-attempt fetch timeout (5s per attempt)
      const FETCH_TIMEOUT_MS = 5000; // 5 seconds per attempt
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(LINE_API.PUSH, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            to: lineUserId,
            messages: [{ type: "text", text }],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const elapsedTime = Date.now() - startTime;
          logWithTrace(
            "[PUSH_OK]",
            { ...context, lineUserId },
            "Message pushed successfully",
            {
              attempt,
              elapsed_ms: elapsedTime,
              final_success: true
            }
          );
          return true;
        }

        // Handle error response
        const status = response.status;

        // ✅ FIX 2: Retry logic for transient errors
        const isRetryable =
          status === 429 || // Rate limit
          status >= 500 || // Server error
          status === 408; // Request timeout

        const isRateLimit = status === 429;

        if (isRetryable && attempt < maxRetries) {
          // Calculate exponential backoff delay with jitter
          // Rate limit: 1s, 2s, 4s
          // Server error: 0.5s, 1s, 2s
          const baseDelay = isRateLimit
            ? baseDelayMs * Math.pow(2, attempt) * 2 // 1000, 2000, 4000
            : baseDelayMs * Math.pow(2, attempt); // 500, 1000, 2000

          // Add jitter: ±20% random
          const jitter = baseDelay * jitterPercent * (Math.random() * 2 - 1);
          const delayMs = Math.max(100, Math.floor(baseDelay + jitter));

          // Check time cap
          const elapsedTime = Date.now() - startTime;
          const willExceedCap = elapsedTime + delayMs > maxTotalTimeMs;

          if (willExceedCap) {
            logWithTrace(
              "[PUSH_RETRY_CAPPED]",
              { ...context, lineUserId },
              `Retry would exceed time cap (${elapsedTime}ms + ${delayMs}ms > ${maxTotalTimeMs}ms), giving up`,
              { status, attempt, elapsedTime, delayMs, isRateLimit }
            );
            return false;
          }

          logWithTrace(
            "[PUSH_RETRY_SCHEDULED]",
            { ...context, lineUserId },
            `Transient error ${status}, retrying after ${delayMs}ms (with jitter)`,
            {
              status,
              attempt: attempt + 1,
              delay_ms: delayMs,
              base_delay_ms: baseDelay,
              jitter_ms: jitter,
              elapsed_ms: elapsedTime,
              will_retry: true,
              is_rate_limit: isRateLimit
            }
          );

          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue; // Retry
        }

        // Not retryable or max retries reached
        const elapsedTime = Date.now() - startTime;
        logWithTrace(
          "[PUSH_FAILED]",
          { ...context, lineUserId },
          `LINE API error: ${status}${attempt > 0 ? ` (after ${attempt} retries)` : ''}`,
          {
            status,
            status_text: response.statusText,
            attempt,
            is_retryable: isRetryable,
            elapsed_ms: elapsedTime,
            will_retry: false,
            final_success: false
          }
        );
        return false;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Check if it's a timeout error
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
          const elapsedTime = Date.now() - startTime;
          logWithTrace(
            "[PUSH_TIMEOUT]",
            { ...context, lineUserId },
            `Fetch timeout after ${FETCH_TIMEOUT_MS}ms`,
            { attempt, elapsed_ms: elapsedTime }
          );

          // Treat timeout as retryable (network issue)
          if (attempt < maxRetries) {
            const baseDelay = baseDelayMs * Math.pow(2, attempt);
            const jitter = baseDelay * jitterPercent * (Math.random() * 2 - 1);
            const delayMs = Math.max(100, Math.floor(baseDelay + jitter));

            const elapsedTime = Date.now() - startTime;
            const willExceedCap = elapsedTime + delayMs > maxTotalTimeMs;

            if (willExceedCap) {
              logWithTrace(
                "[PUSH_RETRY_CAPPED]",
                { ...context, lineUserId },
                `Retry would exceed time cap, giving up`,
                { attempt, elapsedTime, delayMs }
              );
              return false;
            }

            logWithTrace(
              "[PUSH_RETRY_SCHEDULED]",
              { ...context, lineUserId },
              `Timeout error, retrying after ${delayMs}ms (with jitter)`,
              {
                attempt: attempt + 1,
                delay_ms: delayMs,
                elapsed_ms: elapsedTime,
                will_retry: true
              }
            );
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue; // Retry
          }
        }

        // Network error or exception
        const isNetworkError = fetchError instanceof TypeError ||
          (fetchError instanceof Error && fetchError.message.includes('fetch'));

        if (isNetworkError && attempt < maxRetries) {
          // ✅ FIX 3: Retry network errors with exponential backoff + jitter
          const baseDelay = baseDelayMs * Math.pow(2, attempt);
          const jitter = baseDelay * jitterPercent * (Math.random() * 2 - 1);
          const delayMs = Math.max(100, Math.floor(baseDelay + jitter));

          // Check time cap
          const elapsedTime = Date.now() - startTime;
          const willExceedCap = elapsedTime + delayMs > maxTotalTimeMs;

          if (willExceedCap) {
            logWithTrace(
              "[PUSH_RETRY_CAPPED]",
              { ...context, lineUserId },
              `Retry would exceed time cap, giving up`,
              { attempt, elapsedTime, delayMs }
            );
            return false;
          }

          logWithTrace(
            "[PUSH_RETRY_SCHEDULED]",
            { ...context, lineUserId },
            `Network error, retrying after ${delayMs}ms (with jitter)`,
            {
              attempt: attempt + 1,
              delay_ms: delayMs,
              base_delay_ms: baseDelay,
              jitter_ms: jitter,
              elapsed_ms: elapsedTime,
              will_retry: true,
              error: fetchError instanceof Error ? fetchError.message : String(fetchError)
            }
          );
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue; // Retry
        }

        // Not retryable or max retries reached
        const elapsedTime = Date.now() - startTime;
        logWithTrace(
          "[PUSH_FAILED]",
          { ...context, lineUserId },
          `Failed to push message (exception)${attempt > 0 ? ` (after ${attempt} retries)` : ''}`,
          {
            error: fetchError instanceof Error ? fetchError.message : String(fetchError),
            stack: fetchError instanceof Error ? fetchError.stack : undefined,
            attempt,
            elapsed_ms: elapsedTime,
            will_retry: false,
            final_success: false
          }
        );
        return false;
      }
    } catch (outerError: any) {
      // Outer try-catch for unexpected errors
      const elapsedTime = Date.now() - startTime;
      logWithTrace(
        "[PUSH_FAILED]",
        { ...context, lineUserId },
        `Unexpected error during push attempt${attempt > 0 ? ` (after ${attempt} retries)` : ''}`,
        {
          error: outerError instanceof Error ? outerError.message : String(outerError),
          stack: outerError instanceof Error ? outerError.stack : undefined,
          attempt,
          elapsed_ms: elapsedTime,
          will_retry: false,
          final_success: false
        }
      );
      return false;
    }
  }

  // Should never reach here, but TypeScript needs it
  return false;
}

// ============================================================================
// FALLBACK MESSAGES
// ============================================================================

/**
 * Standard fallback messages (user-friendly, no sensitive data)
 */
export const FALLBACK_MESSAGES = {
  GENERIC: (traceId: string) =>
    `โอ๊ะ! ระบบขัดข้องชั่วคราวครับเจ้านาย\n\n` +
    `ลองใหม่ได้เลยนะครับ\n\n` +
    `📋 รหัสอ้างอิง ${traceId}`,

  ACCOUNT_LINKING: (traceId: string) =>
    `โอ๊ะ! เชื่อมต่อบัญชีไม่สำเร็จตอนนี้ครับ\n\n` +
    `ลองใหม่ได้เลย หรือทักแอดมินนะครับเจ้านาย\n\n` +
    `📋 รหัสอ้างอิง ${traceId}`,

  DOCUMENT_CREATION: (traceId: string) =>
    `โอ๊ะ! ออกเอกสารไม่สำเร็จตอนนี้ครับ\n\n` +
    `ลองใหม่ได้เลยนะครับเจ้านาย\n\n` +
    `📋 รหัสอ้างอิง ${traceId}`,

  PAYMENT_PROCESSING: (traceId: string) =>
    `โอ๊ะ! ระบบชำระเงินติดขัดครับ\n\n` +
    `ทักแอดมินพร้อมรหัสอ้างอิงได้เลยนะครับเจ้านาย\n\n` +
    `📋 รหัสอ้างอิง ${traceId}`,

  SLIP_UPLOAD: (traceId: string) =>
    `โอ๊ะ! รับสลิปไม่สำเร็จตอนนี้ครับ\n\n` +
    `ส่งใหม่ได้เลยนะครับเจ้านาย\n\n` +
    `📋 รหัสอ้างอิง ${traceId}`,
};

// ============================================================================
// DEAD LETTER QUEUE (FIRESTORE)
// ============================================================================

/**
 * Record async failure to Firestore for later investigation
 * Never throws - logs errors instead
 */
export async function recordAsyncFailure(
  context: TraceContext,
  error: unknown,
  eventData?: unknown
): Promise<void> {
  try {
    const db = getDb();
    const record: AsyncFailureRecord = {
      traceId: context.traceId,
      lineUserId: context.lineUserId,
      eventType: context.eventType,
      stage: context.stage,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      eventData,
      createdAt: admin.firestore.Timestamp.now(),
      resolved: false,
      needsAttention: false,
      attemptCount: 0,
    };

    await db.collection("async_failures").doc(context.traceId).set(record);

    logWithTrace(
      "[FAILURE_RECORDED]",
      context,
      "Async failure recorded to Firestore",
      { collection: "async_failures", docId: context.traceId }
    );
  } catch (recordError) {
    // If even recording fails, just log it (don't throw)
    logWithTrace(
      "[FAILURE_RECORD_FAILED]",
      context,
      "Failed to record async failure to Firestore",
      {
        originalError: error instanceof Error ? error.message : String(error),
        recordError: recordError instanceof Error ? recordError.message : String(recordError),
      }
    );
  }
}

// ============================================================================
// IDEMPOTENCY GUARD (PREVENT DOUBLE-PUSH)
// ============================================================================

/**
 * Extract stable event ID from LINE event for idempotency
 * Uses event.id (LINE's retry-safe identifier) or falls back to stable hash
 */
export function extractEventId(event: {
  id?: string;
  message?: { id?: string; type?: string };
  source?: { userId?: string };
  type?: string;
  timestamp?: number;
}): string {
  // Priority 1: Use LINE's event.id (most reliable for retry deduplication)
  if (event.id) {
    return event.id;
  }

  // Priority 2: Use message.id for message events
  if (event.message?.id) {
    return `msg_${event.message.id}`;
  }

  // Priority 3: Fallback to stable hash (source.userId + timestamp + type + message.id if present)
  // This ensures same event content = same eventId even without LINE's ID
  const sourceId = event.source?.userId || 'unknown';
  const timestamp = event.timestamp || Date.now();
  const eventType = event.type || 'unknown';
  const messageId = event.message?.id || '';
  const hashInput = `${sourceId}_${timestamp}_${eventType}_${messageId}`;

  // Simple hash (not crypto-secure, but sufficient for deduplication)
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `fallback_${Math.abs(hash).toString(36)}`;
}

/**
 * Check if event was already processed (idempotency)
 * Uses eventId (LINE's stable identifier) NOT traceId
 * Returns true if already processed, false if new
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  if (!eventId) {
    // No eventId = can't dedupe, proceed anyway
    return false;
  }

  try {
    const db = getDb();
    const eventDoc = await db.collection("processed_events").doc(eventId).get();
    return eventDoc.exists;
  } catch (error) {
    logWithTrace(
      "[IDEMPOTENCY_CHECK_FAILED]",
      { traceId: "unknown", eventId, lineUserId: "", eventType: "", stage: "idempotency_check" },
      "Failed to check event processing status",
      { error: error instanceof Error ? error.message : String(error) }
    );
    // On error, assume not processed (fail-open) to avoid blocking user
    return false;
  }
}

/**
 * Acquire event lock atomically (transaction-based)
 * Returns true if lock acquired (should process), false if already processed
 */
export async function acquireEventLock(
  eventId: string,
  context: TraceContext
): Promise<boolean> {
  if (!eventId) {
    // No eventId = can't dedupe, proceed anyway
    return true;
  }

  try {
    const db = getDb();
    const eventRef = db.collection("processed_events").doc(eventId);

    const result = await db.runTransaction(async (tx) => {
      const eventDoc = await tx.get(eventRef);

      if (eventDoc.exists) {
        // Already processed - skip
        return false;
      }

      // Mark as processing (lock acquired)
      tx.set(eventRef, {
        traceId: context.traceId,
        eventId,
        lineUserId: context.lineUserId,
        eventType: context.eventType,
        stage: context.stage,
        resultType: "processing", // Will be updated to success/failure
        processedAt: admin.firestore.Timestamp.now(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // 24h
      });

      return true;
    });

    return result;
  } catch (error) {
    logWithTrace(
      "[EVENT_LOCK_FAILED]",
      context,
      "Failed to acquire event lock",
      { error: error instanceof Error ? error.message : String(error), eventId }
    );
    // On error, proceed with processing to avoid blocking user
    // The duplicate risk is better than dropping events
    return true;
  }
}

/**
 * Mark event as processed (idempotency)
 * Uses eventId (LINE's stable identifier) NOT traceId
 * Expires after 24 hours (TTL via Firestore rules or Cloud Scheduler cleanup)
 */
export async function markEventProcessed(
  context: TraceContext,
  resultType: "success" | "failure"
): Promise<void> {
  if (!context.eventId) {
    // No eventId = can't mark, but log for debugging
    logWithTrace(
      "[EVENT_MARK_SKIPPED]",
      context,
      "No eventId provided, skipping idempotency mark"
    );
    return;
  }

  try {
    const db = getDb();
    await db.collection("processed_events").doc(context.eventId).set({
      traceId: context.traceId,
      eventId: context.eventId,
      lineUserId: context.lineUserId,
      eventType: context.eventType,
      stage: context.stage,
      resultType,
      processedAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // 24h
    }, { merge: true }); // Merge to update resultType if already exists

    logWithTrace(
      "[EVENT_MARKED_PROCESSED]",
      context,
      `Event marked as processed (${resultType})`
    );
  } catch (error) {
    // Non-critical - just log
    logWithTrace(
      "[EVENT_MARK_FAILED]",
      context,
      "Failed to mark event as processed",
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

// ============================================================================
// ASYNC WRAPPER WITH FULL PROTECTION
// ============================================================================

/**
 * Wrap async processing with full error handling and fallback
 * Guarantees user feedback even on catastrophic failure
 */
export async function withAsyncSafety<T>(
  context: TraceContext,
  accessToken: string,
  asyncWork: () => Promise<T>,
  options: {
    fallbackMessage?: (traceId: string) => string;
    skipIdempotencyCheck?: boolean;
    sendTo?: string;
  } = {}
): Promise<void> {
  const { fallbackMessage = FALLBACK_MESSAGES.GENERIC, skipIdempotencyCheck = false, sendTo } = options;

  logWithTrace("[ASYNC_START]", context, "Starting async processing");

  try {
    // Check idempotency (prevent duplicate processing)
    // CRITICAL: Use eventId (LINE's stable identifier) NOT traceId
    if (!skipIdempotencyCheck && context.eventId) {
      const lockAcquired = await acquireEventLock(context.eventId, context);
      if (!lockAcquired) {
        logWithTrace("[ASYNC_SKIPPED]", context, "Event already processed (idempotent)");
        return;
      }
    } else if (!skipIdempotencyCheck && !context.eventId) {
      logWithTrace("[ASYNC_NO_EVENT_ID]", context, "No eventId provided, skipping idempotency check");
    }

    // Execute async work
    await asyncWork();

    // Mark as successfully processed
    await markEventProcessed(context, "success");

    logWithTrace("[ASYNC_OK]", context, "Async processing completed successfully");
  } catch (error) {
    logWithTrace(
      "[ASYNC_FAILED]",
      context,
      "Async processing failed",
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }
    );

    // Record failure to dead-letter queue
    await recordAsyncFailure(context, error);

    // Mark as failed (still processed, to prevent retry loops)
    await markEventProcessed(context, "failure");

    // CRITICAL: Send fallback message to user
    const fallbackSent = await safePushMessage(
      sendTo || context.lineUserId,
      fallbackMessage(context.traceId),
      accessToken,
      context
    );

    if (!fallbackSent) {
      logWithTrace(
        "[CATASTROPHIC_FAILURE]",
        context,
        "Failed to send fallback message - user left in silence!",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    } else {
      // Send MASCOT_ERROR image after fallback text (non-blocking)
      try {
        const { buildMascotImageMessage } = await import('../shared/mascotAssets');

        fetch(LINE_API.PUSH, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            to: context.lineUserId,
            messages: [buildMascotImageMessage('MASCOT_ERROR')],
          }),
        }).then((response) => {
          logWithTrace(
            "[MASCOT_SENT]",
            context,
            "MASCOT_ERROR image sent",
            { assetKey: 'MASCOT_ERROR', event: 'async_fallback', result: response.ok ? 'success' : 'fail' }
          );
        }).catch(() => {
          logWithTrace(
            "[MASCOT_FAILED]",
            context,
            "Failed to send MASCOT_ERROR",
            { assetKey: 'MASCOT_ERROR', event: 'async_fallback', result: 'fail' }
          );
        });
      } catch {
        // Non-blocking - mascot image is optional
      }
    }
  }
}
