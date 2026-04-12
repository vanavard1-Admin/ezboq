import { getDb } from './core/firebaseAdmin';
/**
 * Cleanup Expired Stats Events
 * =============================
 * Scheduled function to delete expired event locks
 * 
 * Run monthly via Cloud Scheduler as backup to Firestore TTL
 * Or use this if TTL is not enabled
 * 
 * Schedule: 0 3 1 * * (Day 1 of each month at 03:00 Bangkok)
 * 
 * Security: OIDC token verification (only Cloud Scheduler can invoke)
 * 
 * Query Parameters:
 *   - dryRun=1    : Count and list samples without deleting
 *   - maxDelete=N : Limit max deletions per run (default: 10000)
 * 
 * Environment Variables:
 *   - CLEANUP_DISABLED=true : Skip cleanup (when Firestore TTL is enabled)
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { verifySchedulerAuth } from './core/schedulerAuth';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getDb();

// Batch size for deletion (Firestore limit is 500)
const BATCH_SIZE = 500;

// Default max deletions per run (safety limit)
const DEFAULT_MAX_DELETE = 10000;

// Toggle to disable cleanup when Firestore TTL is enabled
const CLEANUP_DISABLED = process.env.CLEANUP_DISABLED === 'true';

/**
 * Cleanup expired stats_events documents
 * Uses collection group query to find all expired events across all businesses
 */
export const cleanupStatsEvents = functions.https.onRequest(
  {
    region: 'asia-southeast1',
    timeoutSeconds: 540,
    memory: '256MiB',
  },
  async (req, res) => {
    // Check if cleanup is disabled (Firestore TTL is handling it)
    if (CLEANUP_DISABLED) {
      console.log('[Cleanup] Disabled - Firestore TTL is enabled');
      res.json({
        status: 'skipped',
        reason: 'CLEANUP_DISABLED=true (Firestore TTL is enabled)',
      });
      return;
    }

    const startTime = Date.now();

    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Verify OIDC token from Cloud Scheduler
    const authResult = await verifySchedulerAuth(req);
    if (!authResult.valid) {
      console.log(`[Cleanup] Auth failed: ${authResult.error}`);
      res.status(401).json({ error: 'Unauthorized', detail: authResult.error });
      return;
    }
    console.log(`[Cleanup] Auth OK: ${authResult.email}`);

    // Parse query parameters
    const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true';
    const maxDelete = Math.min(
      parseInt(req.query.maxDelete as string, 10) || DEFAULT_MAX_DELETE,
      50000 // Hard cap
    );

    console.log(`[Cleanup] Starting stats_events cleanup... (dryRun=${dryRun}, maxDelete=${maxDelete})`);

    const now = admin.firestore.Timestamp.now();
    let expiredFound = 0;
    let totalDeleted = 0;
    let batchCount = 0;
    const samples: Array<{ path: string; eventId: string; type: string }> = [];

    try {
      // Loop until no more expired documents or limit reached
      while (totalDeleted < maxDelete) {
        const remaining = maxDelete - totalDeleted;
        const batchLimit = Math.min(BATCH_SIZE, remaining);

        // Query expired events (collection group query)
        const expiredSnap = await db
          .collectionGroup('stats_events')
          .where('expiresAt', '<', now)
          .limit(batchLimit)
          .get();

        if (expiredSnap.empty) {
          console.log('[Cleanup] No more expired events found');
          break;
        }

        expiredFound += expiredSnap.size;

        // Collect samples (first 10 only)
        if (samples.length < 10) {
          for (const doc of expiredSnap.docs) {
            if (samples.length >= 10) break;
            const data = doc.data();
            samples.push({
              path: doc.ref.path,
              eventId: data.eventId || doc.id,
              type: data.type || 'unknown',
            });
          }
        }

        if (dryRun) {
          // Dry run: just count, don't delete
          batchCount++;
          console.log(`[Cleanup] DryRun batch ${batchCount}: found ${expiredSnap.size} events (total: ${expiredFound})`);

          // Continue to count more (up to maxDelete worth)
          if (expiredFound >= maxDelete) {
            break;
          }
          // In dry run, we need to paginate differently since we're not deleting
          // Just break after first batch to avoid counting forever
          break;
        } else {
          // Actual delete
          const batch = db.batch();
          expiredSnap.docs.forEach(doc => {
            batch.delete(doc.ref);
          });

          await batch.commit();

          totalDeleted += expiredSnap.size;
          batchCount++;

          console.log(`[Cleanup] Batch ${batchCount}: deleted ${expiredSnap.size} events (total: ${totalDeleted})`);
        }

        // Safety: limit total batches to prevent runaway
        if (batchCount >= 100) {
          console.log('[Cleanup] Reached batch limit, stopping');
          break;
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const durationMs = Date.now() - startTime;
      const needsMoreRuns = dryRun ? expiredFound >= maxDelete : totalDeleted >= maxDelete;

      // Summary log (consistent format) - for Cloud Monitoring metrics
      console.log(JSON.stringify({
        event: 'cleanup_completed',
        expiredFound: dryRun ? expiredFound : totalDeleted,
        deleted: totalDeleted,
        batches: batchCount,
        durationMs,
        dryRun,
        needsMoreRuns,
      }));

      // Alert log when needsMoreRuns=true (severity WARNING for alerting)
      if (needsMoreRuns && !dryRun) {
        console.warn(JSON.stringify({
          severity: 'WARNING',
          event: 'cleanup_needs_more_runs',
          message: `Cleanup hit maxDelete limit (${maxDelete}). More expired events remain.`,
          deleted: totalDeleted,
          maxDelete,
        }));
      }

      console.log(`[Cleanup] Completed: ${dryRun ? 'DryRun found' : 'Deleted'} ${dryRun ? expiredFound : totalDeleted} events in ${batchCount} batches (${durationMs}ms)`);

      res.json({
        status: 'completed',
        dryRun,
        expiredFound: dryRun ? expiredFound : totalDeleted,
        deletedCount: totalDeleted,
        batchCount,
        durationMs,
        needsMoreRuns,
        samples: dryRun ? samples : undefined,
      });

    } catch (error) {
      console.error('[Cleanup] Error:', error);
      res.status(500).json({
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
