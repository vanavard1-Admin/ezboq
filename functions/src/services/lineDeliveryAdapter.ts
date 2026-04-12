export type GeneratedDocDeliveryPayload = {
  lineUserId: string;
  docId: string;
  docNo: string;
  docType: string;
  pdfPath: string;
  businessId: string;
  userId: string;
  traceId?: string;
};

export type AdapterAcceptResponse = {
  acceptedAt: string;
  providerMessageId?: string;
  providerRequestId?: string;
  providerStatus?: 'ACCEPTED' | 'QUEUED';
};

/**
 * Adapter contract for generated document delivery through LINE.
 *
 * Notes:
 * - `sendGeneratedDocument` should only confirm acceptance by provider.
 * - final read/delivery state should be tracked asynchronously (webhook/polling in a later lane).
 */
export interface LineGeneratedDocDeliveryAdapter {
  readonly channel: 'LINE';
  readonly adapterName: string;
  sendGeneratedDocument(payload: GeneratedDocDeliveryPayload): Promise<AdapterAcceptResponse>;
}

export type RetryPlaceholderDecision = {
  shouldRetry: boolean;
  retryAfterMs: number;
  reason: string;
};

/**
 * Placeholder retry strategy for LINE delivery orchestration.
 *
 * TODO(lane-5): replace this with provider-aware strategy that can classify
 * HTTP/network errors, quota limits and permanent recipient errors.
 */
export function getLineRetryPlaceholder(
  attempt: number,
  error: unknown
): RetryPlaceholderDecision {
  const errText = String(error || 'Unknown LINE delivery error');

  // Temporary max-attempts policy until queue-based retry orchestration is plugged in.
  if (attempt >= 3) {
    return {
      shouldRetry: false,
      retryAfterMs: 0,
      reason: `max_attempts_reached: ${errText}`,
    };
  }

  const retryAfterMs = Math.min(60_000, 5_000 * Math.max(attempt, 1));
  return {
    shouldRetry: true,
    retryAfterMs,
    reason: `placeholder_transient_error: ${errText}`,
  };
}
