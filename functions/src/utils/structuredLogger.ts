/**
 * Structured Logging Utilities (Issue #5)
 * 
 * Standardized logging with required context:
 * - traceId (required)
 * - stage (required)
 * - lineUserId_hash (required, hashed for privacy)
 * - intent (optional but recommended)
 * - latencyMs (optional but recommended)
 * - Additional fields as needed
 * 
 * Enforces logging standards across the codebase.
 */

import * as crypto from 'crypto';

export interface LogContext {
  traceId: string;
  stage: string;
  lineUserId?: string;
  lineUserId_hash?: string; // Pre-hashed (optional, will hash if lineUserId provided)
  intent?: string;
  user_id?: string;
  latencyMs?: number;
  docId?: string;
  purchaseId?: string;
  pdfJobId?: string;
  [key: string]: unknown; // Allow additional fields
}

export interface LogFields {
  [key: string]: unknown;
}

/**
 * Hash LINE user ID for privacy in logs
 */
function hashLineUserId(lineUserId: string): string {
  const hash = crypto.createHash('sha256').update(lineUserId).digest('hex');
  return hash.substring(0, 16); // First 16 chars for readability
}

/**
 * Prepare context with required fields
 */
function prepareContext(ctx: LogContext): Record<string, unknown> {
  const prepared: Record<string, unknown> = {
    trace_id: ctx.traceId,
    stage: ctx.stage,
    timestamp: new Date().toISOString(),
  };

  // Hash lineUserId if provided
  if (ctx.lineUserId) {
    prepared.line_user_id_hash = hashLineUserId(ctx.lineUserId);
  } else if (ctx.lineUserId_hash) {
    prepared.line_user_id_hash = ctx.lineUserId_hash;
  }

  // Add optional fields if present
  if (ctx.intent) prepared.intent = ctx.intent;
  if (ctx.user_id) prepared.user_id = ctx.user_id;
  if (ctx.latencyMs !== undefined) prepared.latency_ms = ctx.latencyMs;
  if (ctx.docId) prepared.doc_id = ctx.docId;
  if (ctx.purchaseId) prepared.purchase_id = ctx.purchaseId;
  if (ctx.pdfJobId) prepared.pdf_job_id = ctx.pdfJobId;

  // Add any additional fields
  Object.keys(ctx).forEach((key) => {
    if (
      !['traceId', 'stage', 'lineUserId', 'lineUserId_hash', 'intent', 'user_id', 
        'latencyMs', 'docId', 'purchaseId', 'pdfJobId'].includes(key)
    ) {
      prepared[key] = ctx[key];
    }
  });

  return prepared;
}

/**
 * Log info level message with structured context
 * 
 * @param ctx - Required context (traceId, stage, lineUserId or lineUserId_hash)
 * @param message - Human-readable message
 * @param fields - Additional fields to include
 */
export function logInfo(ctx: LogContext, message: string, fields?: LogFields): void {
  if (!ctx.traceId || !ctx.stage) {
    console.error('[STRUCTURED_LOGGER_ERROR] Missing required fields: traceId and stage are required');
    return;
  }

  const logData = prepareContext(ctx);
  logData.tag = '[INFO]';
  logData.message = message;

  if (fields) {
    Object.assign(logData, fields);
  }

  console.log(JSON.stringify(logData));
}

/**
 * Log warn level message with structured context
 */
export function logWarn(ctx: LogContext, message: string, fields?: LogFields): void {
  if (!ctx.traceId || !ctx.stage) {
    console.error('[STRUCTURED_LOGGER_ERROR] Missing required fields: traceId and stage are required');
    return;
  }

  const logData = prepareContext(ctx);
  logData.tag = '[WARN]';
  logData.message = message;

  if (fields) {
    Object.assign(logData, fields);
  }

  console.warn(JSON.stringify(logData));
}

/**
 * Log error level message with structured context
 * 
 * @param ctx - Required context
 * @param message - Human-readable message
 * @param error - Error object (optional)
 * @param fields - Additional fields
 */
export function logError(
  ctx: LogContext,
  message: string,
  error?: Error | unknown,
  fields?: LogFields
): void {
  if (!ctx.traceId || !ctx.stage) {
    console.error('[STRUCTURED_LOGGER_ERROR] Missing required fields: traceId and stage are required');
    return;
  }

  const logData = prepareContext(ctx);
  logData.tag = '[ERROR]';
  logData.message = message;

  if (error) {
    if (error instanceof Error) {
      logData.error_message = error.message;
      logData.error_code = (error as any).code;
      logData.error_stack = error.stack;
    } else {
      logData.error = String(error);
    }
  }

  if (fields) {
    Object.assign(logData, fields);
  }

  console.error(JSON.stringify(logData));
}

/**
 * Create trace context from entry point (webhook entry)
 * Use this at the start of request processing to create context
 * 
 * @param traceId - Unique trace ID
 * @param lineUserId - LINE user ID (will be hashed)
 * @param eventType - Event type (e.g., 'WEBHOOK_RECEIVED', 'ACK_SENT')
 * @param additionalFields - Additional fields to include
 */
export function withTrace(
  traceId: string,
  lineUserId: string,
  eventType: string,
  additionalFields?: Record<string, unknown>
): LogContext {
  return {
    traceId,
    lineUserId,
    stage: eventType,
    ...additionalFields,
  };
}

/**
 * Common stage constants for consistency
 */
export const LogStage = {
  WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
  ACK_SENT: 'ACK_SENT',
  ACK_FAILED: 'ACK_FAILED',
  OCR_START: 'OCR_START',
  OCR_DONE: 'OCR_DONE',
  OCR_FAILED: 'OCR_FAILED',
  PDF_ENQUEUE: 'PDF_ENQUEUE',
  PDF_DONE: 'PDF_DONE',
  PDF_FAILED: 'PDF_FAILED',
  DELIVER_PUSH: 'DELIVER_PUSH',
  DELIVER_PUSH_FAILED: 'DELIVER_PUSH_FAILED',
  REPLY_HANDLER: 'REPLY_HANDLER',
  INTENT_RECOGNIZED: 'INTENT_RECOGNIZED',
  DRAFT_CREATED: 'DRAFT_CREATED',
  DRAFT_UPDATED: 'DRAFT_UPDATED',
  DOCUMENT_ISSUED: 'DOCUMENT_ISSUED',
  PAYMENT_PROCESSING: 'PAYMENT_PROCESSING',
  PAYMENT_COMPLETE: 'PAYMENT_COMPLETE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
} as const;

export type LogStageType = typeof LogStage[keyof typeof LogStage];

