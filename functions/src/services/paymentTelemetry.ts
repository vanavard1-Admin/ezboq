import { getDb } from '../core/firebaseAdmin';
/**
 * Payment Telemetry Service
 * 
 * Structured logging for payment flow events
 * 
 * Events logged:
 * - payment_ack_sent: Slip acknowledgment sent
 * - ocr_started: OCR processing started
 * - ocr_delay_sent: OCR delay notification sent
 * - ocr_failed: OCR processing failed
 * - payment_success_sent: Payment success notification sent
 * - subscription_activated: Subscription activated
 * - retry_attempted: User attempted retry
 * 
 * All logs are structured JSON for BigQuery analysis
 */

import * as admin from "firebase-admin";

const db = getDb();

/**
 * Payment telemetry event types
 */
export type PaymentTelemetryEvent =
  | 'payment_ack_sent'
  | 'ocr_started'
  | 'ocr_delay_sent'
  | 'ocr_failed'
  | 'payment_success_sent'
  | 'credits_applied'
  | 'subscription_activated'
  | 'retry_attempted';

/**
 * Base telemetry payload
 */
interface BaseTelemetryPayload {
  userId: string;
  purchaseId: string;
  timestamp: admin.firestore.Timestamp;
  eventType: PaymentTelemetryEvent;
}

/**
 * Extended telemetry payloads
 */
interface PaymentAckSentPayload extends BaseTelemetryPayload {
  eventType: 'payment_ack_sent';
  lineUserId: string;
  slipUploadedAt: admin.firestore.Timestamp;
}

interface OcrStartedPayload extends BaseTelemetryPayload {
  eventType: 'ocr_started';
  imageUrl: string;
  expectedAmount: number;
}

interface OcrDelaySentPayload extends BaseTelemetryPayload {
  eventType: 'ocr_delay_sent';
  delaySeconds: number;
  slipUploadedAt: admin.firestore.Timestamp;
}

interface OcrFailedPayload extends BaseTelemetryPayload {
  eventType: 'ocr_failed';
  reason: string;
  confidence?: number;
  retryCount: number;
}

interface PaymentSuccessSentPayload extends BaseTelemetryPayload {
  eventType: 'payment_success_sent';
  planName: string;
  packageType: number;
}

interface CreditsAppliedPayload extends BaseTelemetryPayload {
  eventType: 'credits_applied';
  creditsAmount: number | null; // null for unlimited
  packageType: number;
  verifiedBy: 'OCR' | 'ADMIN' | 'MANUAL';
}

interface SubscriptionActivatedPayload extends BaseTelemetryPayload {
  eventType: 'subscription_activated';
  planName: 'PRO' | 'TEAM';
  seatTotal: number;
  packageType: number;
  verifiedBy: 'OCR' | 'ADMIN' | 'MANUAL';
}

interface RetryAttemptedPayload extends BaseTelemetryPayload {
  eventType: 'retry_attempted';
  retryCount: number;
  previousStatus: string;
}

type TelemetryPayload =
  | PaymentAckSentPayload
  | OcrStartedPayload
  | OcrDelaySentPayload
  | OcrFailedPayload
  | PaymentSuccessSentPayload
  | CreditsAppliedPayload
  | SubscriptionActivatedPayload
  | RetryAttemptedPayload;

/**
 * Log payment telemetry event
 * 
 * Stores structured JSON in Firestore for BigQuery export
 * Also logs to console for immediate visibility
 */
export async function logPaymentEvent(
  payload: TelemetryPayload
): Promise<void> {
  try {
    const { userId, purchaseId, eventType, timestamp } = payload;

    // Store in Firestore (for BigQuery export)
    const telemetryRef = db
      .collection('payment_telemetry')
      .doc();

    await telemetryRef.set({
      ...payload,
      timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp(),
      _exported: false, // Flag for BigQuery export
    });

    // Console log for immediate visibility (structured JSON)
    const logData = {
      event: eventType,
      userId,
      purchaseId,
      timestamp: timestamp?.toDate().toISOString() || new Date().toISOString(),
      ...Object.fromEntries(
        Object.entries(payload).filter(([key]) => 
          !['userId', 'purchaseId', 'eventType', 'timestamp'].includes(key)
        )
      ),
    };

    console.log(`[PAYMENT_TELEMETRY] ${JSON.stringify(logData)}`);
  } catch (error) {
    // Don't throw - telemetry failure shouldn't block payment flow
    console.error(`[paymentTelemetry] Failed to log event ${payload.eventType}:`, error);
  }
}

/**
 * Log payment acknowledgment sent
 */
export async function logPaymentAckSent(
  userId: string,
  purchaseId: string,
  lineUserId: string,
  slipUploadedAt: admin.firestore.Timestamp
): Promise<void> {
  await logPaymentEvent({
    userId,
    purchaseId,
    eventType: 'payment_ack_sent',
    timestamp: admin.firestore.Timestamp.now(),
    lineUserId,
    slipUploadedAt,
  });
}

/**
 * Log OCR started
 */
export async function logOcrStarted(
  userId: string,
  purchaseId: string,
  imageUrl: string,
  expectedAmount: number
): Promise<void> {
  await logPaymentEvent({
    userId,
    purchaseId,
    eventType: 'ocr_started',
    timestamp: admin.firestore.Timestamp.now(),
    imageUrl,
    expectedAmount,
  });
}

/**
 * Log OCR delay notification sent
 */
export async function logOcrDelaySent(
  userId: string,
  purchaseId: string,
  delaySeconds: number,
  slipUploadedAt: admin.firestore.Timestamp
): Promise<void> {
  await logPaymentEvent({
    userId,
    purchaseId,
    eventType: 'ocr_delay_sent',
    timestamp: admin.firestore.Timestamp.now(),
    delaySeconds,
    slipUploadedAt,
  });
}

/**
 * Log OCR failed
 */
export async function logOcrFailed(
  userId: string,
  purchaseId: string,
  reason: string,
  retryCount: number,
  confidence?: number
): Promise<void> {
  await logPaymentEvent({
    userId,
    purchaseId,
    eventType: 'ocr_failed',
    timestamp: admin.firestore.Timestamp.now(),
    reason,
    retryCount,
    confidence,
  });
}

/**
 * Log payment success notification sent
 */
export async function logPaymentSuccessSent(
  userId: string,
  purchaseId: string,
  planName: string,
  packageType: number
): Promise<void> {
  await logPaymentEvent({
    userId,
    purchaseId,
    eventType: 'payment_success_sent',
    timestamp: admin.firestore.Timestamp.now(),
    planName,
    packageType,
  });
}

/**
 * Log credits applied
 */
export async function logCreditsApplied(
  userId: string,
  purchaseId: string,
  creditsAmount: number | null,
  packageType: number,
  verifiedBy: 'OCR' | 'ADMIN' | 'MANUAL'
): Promise<void> {
  await logPaymentEvent({
    userId,
    purchaseId,
    eventType: 'credits_applied',
    timestamp: admin.firestore.Timestamp.now(),
    creditsAmount,
    packageType,
    verifiedBy,
  });
}

/**
 * Log subscription activated
 */
export async function logSubscriptionActivated(
  userId: string,
  purchaseId: string,
  planName: 'PRO' | 'TEAM',
  seatTotal: number,
  packageType: number,
  verifiedBy: 'OCR' | 'ADMIN' | 'MANUAL'
): Promise<void> {
  await logPaymentEvent({
    userId,
    purchaseId,
    eventType: 'subscription_activated',
    timestamp: admin.firestore.Timestamp.now(),
    planName,
    seatTotal,
    packageType,
    verifiedBy,
  });
}

/**
 * Log retry attempted
 */
export async function logRetryAttempted(
  userId: string,
  purchaseId: string,
  retryCount: number,
  previousStatus: string
): Promise<void> {
  await logPaymentEvent({
    userId,
    purchaseId,
    eventType: 'retry_attempted',
    timestamp: admin.firestore.Timestamp.now(),
    retryCount,
    previousStatus,
  });
}
