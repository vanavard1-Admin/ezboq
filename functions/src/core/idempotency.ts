import { getDb } from './firebaseAdmin';
/**
 * Idempotency Module
 * Prevent duplicate event processing from LINE webhook retries
 */

import * as admin from 'firebase-admin';

const PROCESSED_EVENTS_COLLECTION = 'processed_events';
const EVENT_TTL_HOURS = 24; // Keep processed event IDs for 24 hours

/**
 * Check if an event has already been processed
 * @returns true if event was already processed (should skip)
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
    if (!eventId) return false;

    const db = getDb();
    const ref = db.doc(`${PROCESSED_EVENTS_COLLECTION}/${eventId}`);
    const snap = await ref.get();

    return snap.exists;
}

/**
 * Mark an event as processed
 * Uses set with merge to be idempotent itself
 */
export async function markEventProcessed(eventId: string): Promise<void> {
    if (!eventId) return;

    const db = getDb();
    const ref = db.doc(`${PROCESSED_EVENTS_COLLECTION}/${eventId}`);

    await ref.set({
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Auto-delete after TTL using Firebase TTL policy
        // ✅ B1 FIX: Use expiresAt (with 's') to match TTL policy in firestore.indexes.json
        expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + EVENT_TTL_HOURS * 60 * 60 * 1000)
        ),
    });
}

/**
 * Check and mark event in a single transaction
 * Returns true if event should be processed (not a duplicate)
 */
export async function acquireEventLock(eventId: string): Promise<boolean> {
    if (!eventId) return true; // No ID = can't dedupe, proceed anyway

    const db = getDb();
    const ref = db.doc(`${PROCESSED_EVENTS_COLLECTION}/${eventId}`);

    try {
        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);

            if (snap.exists) {
                // Already processed
                return false;
            }

            // Mark as processed
            tx.set(ref, {
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                // ✅ B1 FIX: Use expiresAt (with 's') to match TTL policy
                expiresAt: admin.firestore.Timestamp.fromDate(
                    new Date(Date.now() + EVENT_TTL_HOURS * 60 * 60 * 1000)
                ),
            });

            return true;
        });

        return result;
    } catch (error) {
        console.error('Event lock acquisition failed:', error);
        // On error, proceed with processing to avoid blocking
        // The duplicate risk is better than dropping events
        return true;
    }
}
