import * as admin from 'firebase-admin';
import { getDb } from '../core/firebaseAdmin';
import {
  GeneratedDocDeliveryPayload,
  LineGeneratedDocDeliveryAdapter,
  getLineRetryPlaceholder,
} from './lineDeliveryAdapter';

export type GeneratedDocOrchestrationInput = {
  jobId: string;
  payload: GeneratedDocDeliveryPayload;
  adapter: LineGeneratedDocDeliveryAdapter;
};

/**
 * Orchestrates generated document delivery via LINE adapter.
 *
 * Current behavior (lane 4):
 * - Updates async delivery tracking fields under `line_delivery`.
 * - Uses placeholder retry strategy metadata (no scheduler enqueue yet).
 *
 * TODO(lane 5): hook retry placeholder into Cloud Tasks re-enqueue worker.
 */
export async function orchestrateGeneratedDocLineDelivery(
  input: GeneratedDocOrchestrationInput
): Promise<void> {
  const { jobId, payload, adapter } = input;
  const db = getDb();
  const jobRef = db.collection('pdf_generation_jobs').doc(jobId);

  const snap = await jobRef.get();
  const data = (snap.data() || {}) as Record<string, unknown>;
  const currentAttempt = Number(data.line_delivery_attempt ?? 0) + 1;

  await jobRef.set(
    {
      line_delivery_attempt: currentAttempt,
      line_delivery: {
        channel: 'LINE',
        adapter: adapter.adapterName,
        asyncStatus: 'SENDING',
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );

  try {
    const accepted = await adapter.sendGeneratedDocument(payload);

    await jobRef.set(
      {
        delivery_status: 'DONE',
        delivered_at: admin.firestore.FieldValue.serverTimestamp(),
        line_delivery: {
          channel: 'LINE',
          adapter: adapter.adapterName,
          asyncStatus: accepted.providerStatus || 'ACCEPTED',
          acceptedAt: accepted.acceptedAt,
          providerMessageId: accepted.providerMessageId || null,
          providerRequestId: accepted.providerRequestId || null,
          finalStatus: 'PENDING_PROVIDER_CALLBACK',
        },
      },
      { merge: true }
    );
  } catch (error) {
    const retry = getLineRetryPlaceholder(currentAttempt, error);
    const nextRetryAt = retry.shouldRetry
      ? admin.firestore.Timestamp.fromMillis(Date.now() + retry.retryAfterMs)
      : null;

    await jobRef.set(
      {
        delivery_status: 'FAILED',
        delivery_error: String(error),
        line_delivery: {
          channel: 'LINE',
          adapter: adapter.adapterName,
          asyncStatus: retry.shouldRetry ? 'RETRY_SCHEDULED_PLACEHOLDER' : 'FAILED_NO_RETRY',
          retryPlaceholder: {
            shouldRetry: retry.shouldRetry,
            retryAfterMs: retry.retryAfterMs,
            reason: retry.reason,
            nextRetryAt,
          },
        },
      },
      { merge: true }
    );

    throw error;
  }
}
