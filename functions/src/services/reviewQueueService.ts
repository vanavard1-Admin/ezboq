import { getDb } from '../core/firebaseAdmin';
/**
 * Review Queue Service
 * 
 * Manages admin review queue for ambiguous payment verification cases.
 * 
 * Purpose:
 * - Track purchases that need manual admin review
 * - Store fraud flags and reasons for review
 * - Idempotent upsert (safe to call multiple times)
 */

import * as admin from 'firebase-admin';

const db = getDb();

export interface ReviewQueuePayload {
  userId: string;
  lineUserId: string;
  amount: number;
  slip_image_url?: string | null;
  slip_hash?: string | null;
  fraud_flags?: string[];
  reason?: string;
}

export interface ReviewQueueDocument {
  purchaseId: string;
  userId: string;
  lineUserId: string;
  amount: number;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  reason?: string;
  fraud_flags?: string[];
  slip_hash?: string | null;
  slip_image_url?: string | null;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Upsert review queue entry
 * 
 * Creates or updates a review queue document for a purchase.
 * Idempotent: safe to call multiple times with same purchaseId.
 * 
 * @param purchaseId - The purchase ID (used as document ID)
 * @param payload - Review queue data
 */
export async function upsertReviewQueue(
  purchaseId: string,
  payload: ReviewQueuePayload
): Promise<void> {
  const now = admin.firestore.Timestamp.now();

  const reviewQueueData: Omit<ReviewQueueDocument, 'purchaseId'> = {
    userId: payload.userId,
    lineUserId: payload.lineUserId,
    amount: payload.amount,
    status: 'OPEN',
    reason: payload.reason || undefined,
    fraud_flags: payload.fraud_flags || [],
    slip_hash: payload.slip_hash || null,
    slip_image_url: payload.slip_image_url || null,
    updatedAt: now,
    // Only set createdAt if document doesn't exist (upsert behavior)
    createdAt: now,
  };

  const reviewQueueRef = db.collection('review_queue').doc(purchaseId);

  // Use set with merge to make it idempotent
  // If document exists, only update fields (preserve createdAt)
  // If document doesn't exist, create with createdAt
  const existingDoc = await reviewQueueRef.get();

  if (existingDoc.exists) {
    // Update existing document (preserve original createdAt)
    const existingData = existingDoc.data() as ReviewQueueDocument;
    const updateData: any = {
      userId: payload.userId,
      lineUserId: payload.lineUserId,
      amount: payload.amount,
      status: 'OPEN',
      reason: payload.reason || null,
      fraud_flags: payload.fraud_flags || [],
      slip_hash: payload.slip_hash || null,
      slip_image_url: payload.slip_image_url || null,
      updatedAt: now,
      // Preserve original createdAt
      createdAt: existingData.createdAt || now,
    };
    await reviewQueueRef.update(updateData);
    console.log(`[reviewQueueService] Updated review queue entry: purchaseId=${purchaseId}`);
  } else {
    // Create new document
    await reviewQueueRef.set({
      purchaseId,
      ...reviewQueueData,
    });
    console.log(`[reviewQueueService] Created review queue entry: purchaseId=${purchaseId}`);
  }
}

