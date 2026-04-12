import { getDb } from '../core/firebaseAdmin';
/**
 * Cleanup Processed Events
 * 
 * Removes expired processed_events documents (older than 24 hours)
 * Required if Firestore TTL policy is not enabled
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

const db = getDb();

/**
 * Cleanup expired processed events (runs daily)
 */
export const cleanupProcessedEvents = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    void context;
    console.log('[CLEANUP_PROCESSED_EVENTS] Starting cleanup');

    const cutoffTime = admin.firestore.Timestamp.fromMillis(
      Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago
    );

    try {
      const oldEventsQuery = await db.collection('processed_events')
        .where('expiresAt', '<', cutoffTime)
        .limit(500) // Process in batches
        .get();

      console.log(`[CLEANUP_PROCESSED_EVENTS] Found ${oldEventsQuery.size} expired events to delete`);

      const batch = db.batch();
      let deleted = 0;

      for (const doc of oldEventsQuery.docs) {
        batch.delete(doc.ref);
        deleted++;

        // Firestore batch limit is 500
        if (deleted % 500 === 0) {
          await batch.commit();
          console.log(`[CLEANUP_PROCESSED_EVENTS] Deleted ${deleted} expired events`);
        }
      }

      if (deleted % 500 !== 0) {
        await batch.commit();
      }

      console.log(`[CLEANUP_PROCESSED_EVENTS] Completed: deleted ${deleted} expired events`);

      return { deleted };
    } catch (error) {
      console.error('[CLEANUP_PROCESSED_EVENTS] Fatal error:', error);
      throw error;
    }
  });
