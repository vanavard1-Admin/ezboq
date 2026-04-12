import { getDb } from '../core/firebaseAdmin';
/**
 * Manual Settlement Function (Server-Only)
 * 
 * D-FIX-1: Manual trigger for settlement to fix stuck purchases immediately
 * 
 * Usage: Call via HTTP with purchaseIds array
 * 
 * Example:
 * POST /manualSettlement
 * Body: { purchaseIds: ["purchase1", "purchase2"] }
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { settleVerifiedPurchase } from '../services/paymentSettlementService';
import { generateTraceId } from '../utils/asyncSafety';
import { AdminAuthorizationError, assertAdminFirebaseUid } from '../services/adminAuthService';

const db = getDb();

async function requireAdminUid(
  req: functions.https.Request
): Promise<string> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  const idToken = authHeader.replace('Bearer ', '').trim();
  if (!idToken) {
    throw new Error('UNAUTHORIZED');
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    throw new Error('UNAUTHORIZED');
  }
  await assertAdminFirebaseUid(decoded.uid, decoded.email || null);
  return decoded.uid;
}

interface ManualSettlementRequest {
  purchaseIds: string[];
}

interface SettlementResult {
  purchaseId: string;
  success: boolean;
  alreadySettled: boolean;
  traceId: string;
  error?: string;
  creditApplied?: boolean;
  ledgerRecordCreated?: boolean;
}

interface ManualSettlementResponse {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: SettlementResult[];
  summary: string;
}

/**
 * Manual Settlement HTTP Function
 * 
 * Server-only function to manually settle purchases
 * 
 * POST /manualSettlement
 * Body: { purchaseIds: ["id1", "id2"] }
 * 
 * Returns: Summary of settlement results
 */
export const manualSettlement = functions
  .region('asia-southeast1')
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB',
  })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    const allowedOrigins = [
      'https://doc.ezboq.com',
      'https://ezdoc-v1-th.web.app',
      'https://ezdoc-v1-th.firebaseapp.com',
      'http://localhost:3000',
    ];
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
    const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : '';
    if (allowOrigin) {
      res.set('Access-Control-Allow-Origin', allowOrigin);
      res.set('Vary', 'Origin');
    }
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
      if (origin && !allowOrigin) {
        res.status(403).send('');
        return;
      }
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      await requireAdminUid(req);
      const body = req.body as ManualSettlementRequest;

      if (!body.purchaseIds || !Array.isArray(body.purchaseIds) || body.purchaseIds.length === 0) {
        res.status(400).json({ 
          error: 'Invalid request. Expected: { purchaseIds: ["id1", "id2"] }' 
        });
        return;
      }

      console.log(`[manualSettlement] Starting manual settlement for ${body.purchaseIds.length} purchases`);

      const results: SettlementResult[] = [];
      let succeeded = 0;
      let failed = 0;

      // Process each purchase
      for (const purchaseId of body.purchaseIds) {
        const traceId = generateTraceId();
        console.log(`[manualSettlement] Processing purchaseId=${purchaseId}, traceId=${traceId}`);

        try {
          // Call settlement service
          const settlementResult = await settleVerifiedPurchase({
            purchaseId,
            verifiedBy: 'MANUAL',
            traceId,
          });

          // Verify settlement result
          const purchaseDoc = await db.collection('credit_purchases').doc(purchaseId).get();
          const purchase = purchaseDoc.data();

          // Check ledger entry
          const ledgerQuery = await db
            .collection('credits_ledger')
            .where('purchase_id', '==', purchaseId)
            .limit(1)
            .get();

          const ledgerRecordCreated = !ledgerQuery.empty;
          const creditApplied = purchase?.credit_applied === true;

          const result: SettlementResult = {
            purchaseId,
            success: settlementResult.ok,
            alreadySettled: settlementResult.alreadySettled || false,
            traceId,
            creditApplied,
            ledgerRecordCreated,
          };

          if (settlementResult.ok) {
            succeeded++;
            console.log(`[manualSettlement] ✅ Success: purchaseId=${purchaseId}, traceId=${traceId}, creditApplied=${creditApplied}, ledgerCreated=${ledgerRecordCreated}`);
          } else {
            failed++;
            result.error = settlementResult.reason || 'Unknown error';
            console.error(`[manualSettlement] ❌ Failed: purchaseId=${purchaseId}, traceId=${traceId}, error=${result.error}`);
          }

          results.push(result);
        } catch (error: any) {
          failed++;
          const errorResult: SettlementResult = {
            purchaseId,
            success: false,
            alreadySettled: false,
            traceId,
            error: error.message || 'Unknown error',
            creditApplied: false,
            ledgerRecordCreated: false,
          };
          results.push(errorResult);
          console.error(`[manualSettlement] ❌ Exception: purchaseId=${purchaseId}, traceId=${traceId}, error=${error.message}`);
        }
      }

      // Build summary
      const summary = results
        .filter(r => r.success)
        .map(r => {
          const status = r.alreadySettled ? 'already settled' : 'settled';
          const checks = [
            r.creditApplied ? 'credit_applied=true' : 'credit_applied=false',
            r.ledgerRecordCreated ? 'ledger=1 record' : 'ledger=0 records',
          ].join(', ');
          return `✅ ${r.purchaseId}: ${status} (${checks})`;
        })
        .join('\n');

      const response: ManualSettlementResponse = {
        success: failed === 0,
        total: body.purchaseIds.length,
        succeeded,
        failed,
        results,
        summary,
      };

      console.log(`[manualSettlement] Complete: ${succeeded} succeeded, ${failed} failed`);
      console.log(`[manualSettlement] Summary:\n${summary}`);

      res.status(200).json(response);
    } catch (error: unknown) {
      if (error instanceof AdminAuthorizationError) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      if (message === 'UNAUTHORIZED') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      console.error('[manualSettlement] Fatal error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: message,
      });
    }
  });
