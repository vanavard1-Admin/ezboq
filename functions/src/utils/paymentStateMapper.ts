/**
 * Payment State Mapper
 * 
 * Maps PaymentState to QuickReplyContext payment state parameter
 * 
 * TODO: Add proper RETRY/SUCCESS detection when purchase status enum is extended
 */

import { PaymentState, getPaymentState } from '../services/paymentStateService';
import { hasRecentPendingPurchase, type CreditPurchase } from '../services/purchaseService';
import { getRetryCount } from '../services/paymentRetryService';

/**
 * Map PaymentState to QuickReplyContext payment state
 * 
 * @param userId - User ID
 * @param paymentState - Current payment state
 * @returns Mapped payment state for QuickReplyContext
 */
export async function mapPaymentStateToContext(
  userId: string,
  paymentState: PaymentState
): Promise<'PROCESSING' | 'RETRY' | 'SUCCESS' | null> {
  if (paymentState === 'NO_PAYMENT') {
    return null;
  }

  // TODO: Implement proper RETRY detection
  // Current logic: Check if purchase status is REJECTED and retry count < max
  // This requires checking the actual purchase document, not just PaymentState
  try {
    const recentPurchase = await hasRecentPendingPurchase(userId, 15);
    if (recentPurchase) {
      const purchase = recentPurchase.purchase as CreditPurchase;
      
      // RETRY: Purchase was rejected and user can retry
      if (purchase.status === 'REJECTED') {
        const retryCount = await getRetryCount(recentPurchase.purchaseId);
        const MAX_RETRIES = 3; // TODO: Get from config
        if (retryCount < MAX_RETRIES) {
          return 'RETRY';
        }
      }
      
      // SUCCESS: Payment confirmed (but still in flow for confirmation)
      // Note: If status is PAID, paymentState should be NO_PAYMENT, so this is unlikely
      // TODO: Add SUCCESS state when payment confirmation flow is implemented
      if (purchase.status === 'PAID') {
        // Payment completed - should not be in payment flow
        return null;
      }
    }
  } catch (error) {
    console.error(`[paymentStateMapper] Error mapping payment state:`, error);
    // Fall through to default PROCESSING
  }

  // Default: All active payment states map to PROCESSING
  return 'PROCESSING';
}

/**
 * Get payment state parameter for QuickReplyContext
 * 
 * Convenience function that gets payment state and maps it
 * 
 * @param userId - User ID
 * @param useCache - If true, use fast-path cache (for fallback paths). Default: false
 * @param traceId - Optional trace ID for logging
 */
export async function getPaymentStateParam(
  userId: string,
  useCache: boolean = false,
  traceId?: string
): Promise<'PROCESSING' | 'RETRY' | 'SUCCESS' | null> {
  const startTime = Date.now();
  
  // Fast path: Use cache for fallback paths (no DB reads)
  if (useCache) {
    const { getCachedPaymentState } = await import('./paymentStateCache');
    const cached = getCachedPaymentState(userId);
    if (cached !== null) {
      const durationMs = Date.now() - startTime;
      if (traceId) {
        console.log(JSON.stringify({
          tag: '[paymentStateMapper]',
          traceId,
          userId,
          path: 'fastPath',
          durationMs,
          cached: true,
        }));
      }
      return cached;
    }
    // Cache miss - fall through to slow path
  }
  
  // Slow path: Read from DB
  const { isInPaymentFlow } = await import('../services/paymentStateService');
  
  if (!(await isInPaymentFlow(userId))) {
    const durationMs = Date.now() - startTime;
    if (traceId) {
      console.log(JSON.stringify({
        tag: '[paymentStateMapper]',
        traceId,
        userId,
        path: 'slowPath',
        durationMs,
        result: 'NO_PAYMENT',
      }));
    }
    return null;
  }
  
  const paymentState = await getPaymentState(userId);
  const result = await mapPaymentStateToContext(userId, paymentState);
  
  // Cache result for future fast-path lookups
  if (useCache) {
    const { setCachedPaymentState } = await import('./paymentStateCache');
    setCachedPaymentState(userId, result);
  }
  
  const durationMs = Date.now() - startTime;
  if (traceId) {
    console.log(JSON.stringify({
      tag: '[paymentStateMapper]',
      traceId,
      userId,
      path: 'slowPath',
      durationMs,
      result,
      cached: useCache,
    }));
  }
  
  return result;
}

