import { getDb } from '../core/firebaseAdmin';
/**
 * Payment Retry Service
 * 
 * Manages retry logic for payment slip verification
 * 
 * Rules:
 * - Allow retry up to N times (default: 3)
 * - Track retry count per purchase
 * - Prevent spam
 * - No drama, calm messaging
 */

import * as admin from "firebase-admin";

const db = getDb();
const MAX_RETRIES = 3;

/**
 * Get retry count for a purchase
 */
export async function getRetryCount(purchaseId: string): Promise<number> {
  try {
    const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
    const purchaseDoc = await purchaseRef.get();

    if (!purchaseDoc.exists) {
      return 0;
    }

    const purchase = purchaseDoc.data();
    return purchase?.retry_count || 0;
  } catch (error) {
    console.error(`[paymentRetryService] Error getting retry count:`, error);
    return 0;
  }
}

/**
 * Increment retry count for a purchase
 */
export async function incrementRetryCount(purchaseId: string): Promise<number> {
  try {
    const purchaseRef = db.collection('credit_purchases').doc(purchaseId);

    const newCount = await db.runTransaction(async (tx) => {
      const purchaseDoc = await tx.get(purchaseRef);

      if (!purchaseDoc.exists) {
        throw new Error(`Purchase ${purchaseId} not found`);
      }

      const currentCount = purchaseDoc.data()?.retry_count || 0;
      const newCount = currentCount + 1;

      tx.update(purchaseRef, {
        retry_count: newCount,
        last_retry_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      return newCount;
    });

    console.log(`[paymentRetryService] Retry count incremented: purchaseId=${purchaseId}, count=${newCount}`);
    return newCount;
  } catch (error) {
    console.error(`[paymentRetryService] Error incrementing retry count:`, error);
    throw error;
  }
}

/**
 * Check if max retries reached
 */
export async function hasReachedMaxRetries(purchaseId: string): Promise<boolean> {
  const count = await getRetryCount(purchaseId);
  return count >= MAX_RETRIES;
}

/**
 * Reset retry count (e.g., on successful payment)
 */
export async function resetRetryCount(purchaseId: string): Promise<void> {
  try {
    const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
    await purchaseRef.update({
      retry_count: 0,
      last_retry_at: admin.firestore.FieldValue.delete(),
    });
    console.log(`[paymentRetryService] Retry count reset: purchaseId=${purchaseId}`);
  } catch (error) {
    console.error(`[paymentRetryService] Error resetting retry count:`, error);
  }
}

