import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Payment Watchdog Service
 * 
 * Reconciles stuck payment states and guarantees eventual consistency.
 * 
 * This service runs periodically to:
 * 1. Fix PAID purchases that haven't had credits applied
 * 2. Retry OCR for PENDING_REVIEW purchases stuck too long
 * 3. Route max-retry purchases to manual review
 * 
 * CRITICAL: This ensures no purchase gets stuck in an inconsistent state.
 */

import * as admin from 'firebase-admin';
import { CreditPurchase } from './purchaseService';

const db = getDb();

const MAX_BATCH_SIZE = 50;
const PENDING_REVIEW_STUCK_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

// Note: settleVerifiedPurchase is imported from paymentSettlementService

/**
 * Run payment watchdog reconciliation
 * 
 * Processes up to MAX_BATCH_SIZE purchases per run to avoid timeout.
 * 
 * @returns Statistics about the run
 */
export async function runPaymentWatchdog(): Promise<{
  scanned: number;
  fixed: number;
  flagged: number;
}> {
  const stats = {
    scanned: 0,
    fixed: 0,
    flagged: 0,
  };

  console.log('[paymentWatchdog] Starting watchdog run...');

  try {
    // ============================================================
    // FIX 1: PAID but not credit_applied
    // ============================================================
    // Note: Firestore doesn't allow multiple != filters, so we query by status=PAID and filter credit_applied in memory
    try {
      const paidQuery = await db
        .collection('credit_purchases')
        .where('status', '==', 'PAID')
        .limit(MAX_BATCH_SIZE * 2) // Get more to filter in memory
        .get();

      // Filter in memory: must have status=PAID AND credit_applied != true
      const stuckPaidDocs = paidQuery.docs.filter(doc => {
        const data = doc.data() as CreditPurchase;
        return !data.credit_applied && !data.credit_applied_at;
      });

      console.log(`[paymentWatchdog] Found ${stuckPaidDocs.length} PAID purchases without credit_applied (from ${paidQuery.size} total PAID purchases)`);

      for (const doc of stuckPaidDocs) {
        stats.scanned++;
        const purchase = doc.data() as CreditPurchase;

        try {
          const { settleVerifiedPurchase } = await import('./paymentSettlementService');
          const settlementResult = await settleVerifiedPurchase({
            purchaseId: doc.id,
            verifiedBy: (purchase.verified_by as 'OCR' | 'ADMIN' | 'MANUAL') || 'MANUAL',
            traceId: 'watchdog',
          });

          // Log watchdog event
          const { appendPaymentEvent } = await import('./paymentEvents');
          await appendPaymentEvent(doc.id, {
            event: 'WATCHDOG_CREDIT_APPLY',
            traceId: 'watchdog',
            handler: 'watchdog',
            result_code: settlementResult.ok ? 'OK' : 'ERR_SETTLEMENT_FAILED',
            from_status: 'PAID',
            to_status: 'PAID',
            meta: {
              verifiedBy: purchase.verified_by || 'MANUAL',
              alreadySettled: settlementResult.alreadySettled,
              reason: settlementResult.reason,
            },
          });

          if (settlementResult.ok && !settlementResult.alreadySettled) {
            stats.fixed++;
          } else if (settlementResult.alreadySettled) {
            // Already settled - repair completed, no need to count as fixed
            console.log(`[paymentWatchdog] Purchase ${doc.id} was already settled, repair completed`);
          }
        } catch (error) {
          console.error(`[paymentWatchdog] Failed to fix PAID purchase ${doc.id}:`, error);

          // Log failure event
          try {
            const { appendPaymentEvent } = await import('./paymentEvents');
            await appendPaymentEvent(doc.id, {
              event: 'WATCHDOG_CREDIT_APPLY',
              traceId: 'watchdog',
              handler: 'watchdog',
              result_code: `ERR_${error instanceof Error ? error.message : String(error)}`,
              from_status: 'PAID',
              to_status: 'PAID',
              meta: {
                error: error instanceof Error ? error.message : String(error),
              },
            });
          } catch (eventError) {
            console.error(`[paymentWatchdog] Failed to log error event:`, eventError);
          }

          // Continue to next purchase
        }
      }
    } catch (error) {
      console.error('[paymentWatchdog] Error processing PAID purchases:', error);
    }

    // ============================================================
    // FIX 2: OCR_SUCCESS but not credit_applied
    // ============================================================
    // C2) Watchdog Coverage: OCR_SUCCESS but still not credit_applied
    // Detection: Purchase has slip_ocr_raw_text (OCR ran) but credit_applied != true
    // Note: Firestore doesn't allow multiple != filters, so we query by slip_ocr_raw_text and filter credit_applied in memory
    try {
      const ocrSuccessQuery = await db
        .collection('credit_purchases')
        .where('slip_ocr_raw_text', '!=', null)
        .limit(MAX_BATCH_SIZE * 2) // Get more to filter in memory
        .get();

      // Filter in memory: must have slip_ocr_raw_text AND credit_applied != true
      const ocrSuccessDocs = ocrSuccessQuery.docs.filter(doc => {
        const data = doc.data() as CreditPurchase;
        return !data.credit_applied && !data.credit_applied_at;
      });

      console.log(`[paymentWatchdog] Found ${ocrSuccessDocs.length} purchases with OCR success but no credit_applied (from ${ocrSuccessQuery.size} total with OCR data)`);

      for (const doc of ocrSuccessDocs) {
        stats.scanned++;
        const purchase = doc.data() as CreditPurchase;

        // Skip if already PAID (handled by Fix 1)
        if (purchase.status === 'PAID') {
          continue;
        }

        // Skip if REJECTED (intentional)
        if (purchase.status === 'REJECTED') {
          continue;
        }

        // Manual-review purchases must never be auto-settled by the watchdog.
        if (purchase.manual_review_required) {
          continue;
        }

        // Only process if OCR succeeded (has verified_by or slip_ocr_confidence > threshold)
        const hasOcrSuccess = purchase.verified_by || (purchase.slip_ocr_confidence && purchase.slip_ocr_confidence > 0.5);
        if (!hasOcrSuccess) {
          continue;
        }

        try {
          // Check if purchase should be PAID (OCR verified but status not updated)
          // Note: TypeScript may not recognize 'PAID' in union type, but it's valid at runtime
          if (purchase.verified_by && (purchase.status as string) !== 'PAID') {
            // Update status to PAID first, then settle
            await db.collection('credit_purchases').doc(doc.id).update({
              status: 'PAID',
            });
          }

          const { settleVerifiedPurchase } = await import('./paymentSettlementService');
          const settlementResult = await settleVerifiedPurchase({
            purchaseId: doc.id,
            verifiedBy: (purchase.verified_by as 'OCR' | 'ADMIN' | 'MANUAL') || 'OCR',
            traceId: 'watchdog_ocr_success',
          });

          // Log watchdog event
          const { appendPaymentEvent } = await import('./paymentEvents');
          await appendPaymentEvent(doc.id, {
            event: 'WATCHDOG_OCR_SUCCESS_SETTLE',
            traceId: 'watchdog_ocr_success',
            handler: 'watchdog',
            result_code: settlementResult.ok ? 'OK' : 'ERR_SETTLEMENT_FAILED',
            from_status: purchase.status,
            to_status: 'PAID',
            meta: {
              verifiedBy: purchase.verified_by || 'OCR',
              alreadySettled: settlementResult.alreadySettled,
              reason: settlementResult.reason,
              ocr_confidence: purchase.slip_ocr_confidence || null,
            },
          });

          if (settlementResult.ok && !settlementResult.alreadySettled) {
            stats.fixed++;
            console.log(`[paymentWatchdog] ✅ Settled OCR_SUCCESS purchase ${doc.id}`);
          } else if (settlementResult.alreadySettled) {
            console.log(`[paymentWatchdog] Purchase ${doc.id} was already settled, repair completed`);
          }
        } catch (error) {
          console.error(`[paymentWatchdog] Failed to settle OCR_SUCCESS purchase ${doc.id}:`, error);

          // Log failure event
          try {
            const { appendPaymentEvent } = await import('./paymentEvents');
            await appendPaymentEvent(doc.id, {
              event: 'WATCHDOG_OCR_SUCCESS_SETTLE',
              traceId: 'watchdog_ocr_success',
              handler: 'watchdog',
              result_code: `ERR_${error instanceof Error ? error.message : String(error)}`,
              from_status: purchase.status,
              to_status: purchase.status,
              meta: {
                error: error instanceof Error ? error.message : String(error),
              },
            });
          } catch (eventError) {
            console.error(`[paymentWatchdog] Failed to log error event:`, eventError);
          }
        }
      }
    } catch (error) {
      console.error('[paymentWatchdog] Error processing OCR_SUCCESS purchases:', error);
    }

    // ============================================================
    // FIX 3: PENDING_REVIEW stuck too long
    // ============================================================
    // Firestore Index Required:
    // Collection: credit_purchases
    // Fields: status (Ascending), slip_uploaded_at (Ascending)
    // Note: slip_image_url existence cannot be indexed; filtered in code
    try {
      const now = admin.firestore.Timestamp.now();
      const thresholdTime = new Date(now.toMillis() - PENDING_REVIEW_STUCK_THRESHOLD_MS);
      const thresholdTimestamp = admin.firestore.Timestamp.fromDate(thresholdTime);

      const waitingRecoveryQuery = await db
        .collection('credit_purchases')
        .where('status', '==', 'WAITING_FOR_SLIP')
        .limit(MAX_BATCH_SIZE * 2)
        .get();

      const missingUploadedSlipWaitingDocs = waitingRecoveryQuery.docs.filter((doc) => {
        const purchase = doc.data() as CreditPurchase;
        return (
          !!purchase.slipReceivedAt &&
          !purchase.slip_image_url &&
          purchase.slipReceivedAt.toMillis() <= thresholdTimestamp.toMillis() &&
          !purchase.slip_upload_missing
        );
      });

      for (const doc of missingUploadedSlipWaitingDocs) {
        stats.scanned++;
        const purchase = doc.data() as CreditPurchase;

        try {
          await doc.ref.update({
            slip_upload_missing: true,
            slip_upload_missing_at: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const { appendPaymentEvent } = await import('./paymentEvents');
          await appendPaymentEvent(doc.id, {
            event: 'WATCHDOG_SLIP_UPLOAD_RECOVERY',
            traceId: 'watchdog',
            handler: 'watchdog',
            result_code: 'OK',
            from_status: 'WAITING_FOR_SLIP',
            to_status: 'WAITING_FOR_SLIP',
            meta: {
              action: 'mark_slip_upload_missing',
              reason: 'slip_upload_missing',
              slipMessageId: purchase.slipMessageId || null,
            },
          });

          stats.fixed++;
          console.log(`[paymentWatchdog] Marked purchase ${doc.id} as missing slip upload while waiting for slip`);
        } catch (error) {
          console.error(`[paymentWatchdog] Failed to flag missing WAITING_FOR_SLIP upload for ${doc.id}:`, error);
        }
      }

      const pendingReviewRecoveryQuery = await db
        .collection('credit_purchases')
        .where('status', '==', 'PENDING_REVIEW')
        .limit(MAX_BATCH_SIZE * 2)
        .get();

      const missingSlipUploadDocs = pendingReviewRecoveryQuery.docs.filter((doc) => {
        const purchase = doc.data() as CreditPurchase;
        return (
          !purchase.slip_image_url &&
          !!purchase.slipReceivedAt &&
          purchase.slipReceivedAt.toMillis() <= thresholdTimestamp.toMillis()
        );
      });

      for (const doc of missingSlipUploadDocs) {
        stats.scanned++;
        const purchase = doc.data() as CreditPurchase;

        try {
          await doc.ref.update({
            status: 'WAITING_FOR_SLIP',
            slip_upload_missing: true,
            slip_upload_missing_at: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const { appendPaymentEvent } = await import('./paymentEvents');
          await appendPaymentEvent(doc.id, {
            event: 'WATCHDOG_SLIP_UPLOAD_RECOVERY',
            traceId: 'watchdog',
            handler: 'watchdog',
            result_code: 'OK',
            from_status: 'PENDING_REVIEW',
            to_status: 'WAITING_FOR_SLIP',
            meta: {
              action: 'reset_waiting_for_slip',
              reason: 'slip_upload_missing',
              slipMessageId: purchase.slipMessageId || null,
            },
          });

          stats.fixed++;
          console.log(`[paymentWatchdog] Reset purchase ${doc.id} to WAITING_FOR_SLIP because slip upload was missing`);
        } catch (error) {
          console.error(`[paymentWatchdog] Failed to recover missing slip upload for ${doc.id}:`, error);
        }
      }

      // Query PENDING_REVIEW purchases with slip uploaded more than 3 minutes ago.
      // Prefer the indexed query, but degrade to a status-only query if the composite
      // index is still building so the watchdog never stops processing production traffic.
      let pendingReviewDocs: admin.firestore.QueryDocumentSnapshot[] = [];
      try {
        const pendingReviewQuery = await db
          .collection('credit_purchases')
          .where('status', '==', 'PENDING_REVIEW')
          .where('slip_uploaded_at', '<=', thresholdTimestamp)
          .orderBy('slip_uploaded_at', 'asc')
          .limit(MAX_BATCH_SIZE)
          .get();

        pendingReviewDocs = pendingReviewQuery.docs;
      } catch (pendingReviewQueryError) {
        console.warn(
          '[paymentWatchdog] Indexed PENDING_REVIEW query unavailable, using status-only fallback:',
          pendingReviewQueryError instanceof Error ? pendingReviewQueryError.message : String(pendingReviewQueryError),
        );

        const pendingReviewFallback = await db
          .collection('credit_purchases')
          .where('status', '==', 'PENDING_REVIEW')
          .limit(MAX_BATCH_SIZE * 4)
          .get();

        pendingReviewDocs = pendingReviewFallback.docs
          .filter((doc) => {
            const purchase = doc.data() as CreditPurchase;
            return !!purchase.slip_uploaded_at && purchase.slip_uploaded_at.toMillis() <= thresholdTimestamp.toMillis();
          })
          .sort((left, right) => {
            const leftPurchase = left.data() as CreditPurchase;
            const rightPurchase = right.data() as CreditPurchase;
            return leftPurchase.slip_uploaded_at!.toMillis() - rightPurchase.slip_uploaded_at!.toMillis();
          })
          .slice(0, MAX_BATCH_SIZE);
      }

      console.log(`[paymentWatchdog] Found ${pendingReviewDocs.length} PENDING_REVIEW purchases older than 3 minutes`);

      for (const doc of pendingReviewDocs) {
        stats.scanned++;
        const purchase = doc.data() as CreditPurchase;

        // Filter: must have slip_image_url
        if (!purchase.slip_image_url) {
          continue;
        }

        // OCR already ran and the purchase is waiting for manual review.
        if (
          purchase.manual_review_required ||
          purchase.needs_review ||
          purchase.auto_verification_status
        ) {
          console.log(`[paymentWatchdog] Manual review pending for purchase ${doc.id}, skipping OCR retry`);
          continue;
        }

        // Check if OCR data is missing or verification failed
        const needsOcrRetry =
          !purchase.slip_ocr_raw_text || // OCR not run or failed
          !purchase.verified_by; // Verification not completed

        if (needsOcrRetry) {
          // Check retry count
          const { hasReachedMaxRetries } = await import('./paymentRetryService');
          const maxRetriesReached = await hasReachedMaxRetries(doc.id);

          if (maxRetriesReached) {
            // Max retries reached - route to manual review
            try {
              await db.collection('credit_purchases').doc(doc.id).update({
                needs_review: true,
                watchdog_flagged_at: admin.firestore.FieldValue.serverTimestamp(),
              });

              // Create review_queue entry (if collection exists)
              try {
                await db.collection('review_queue').add({
                  purchase_id: doc.id,
                  user_id: purchase.userId,
                  line_user_id: purchase.lineUserId,
                  amount: purchase.amount,
                  package_type: purchase.packageType,
                  slip_image_url: purchase.slip_image_url,
                  slip_uploaded_at: purchase.slip_uploaded_at,
                  status: 'PENDING_REVIEW',
                  flagged_by: 'watchdog',
                  flagged_at: admin.firestore.FieldValue.serverTimestamp(),
                  reason: 'Max OCR retries reached',
                });
              } catch (reviewQueueError) {
                // review_queue collection might not exist - that's okay
                console.warn(`[paymentWatchdog] Could not create review_queue entry:`, reviewQueueError);
              }

              const { appendPaymentEvent } = await import('./paymentEvents');
              await appendPaymentEvent(doc.id, {
                event: 'WATCHDOG_OCR_RETRY',
                traceId: 'watchdog',
                handler: 'watchdog',
                result_code: 'OK',
                from_status: 'PENDING_REVIEW',
                to_status: 'PENDING_REVIEW',
                meta: {
                  action: 'flagged_for_review',
                  reason: 'max_retries_reached',
                  retry_count: purchase.retry_count || 0,
                },
              });

              stats.flagged++;
              console.log(`[paymentWatchdog] ⚠️ Flagged purchase ${doc.id} for manual review (max retries)`);
            } catch (error) {
              console.error(`[paymentWatchdog] Failed to flag purchase ${doc.id}:`, error);
            }
          } else {
            // Retry OCR
            try {
              const { runSlipOcrAndVerify, applyVerificationResult } = await import('./slipOcrService');

              console.log(`[paymentWatchdog] Retrying OCR for purchase ${doc.id}`);

              const verification = await runSlipOcrAndVerify({
                imageUrl: purchase.slip_image_url,
                expectedAmount: purchase.amount,
                expectedPromptPayName: 'นายฉัตรดนัย จิตต์เพ็ชร',
                purchaseId: doc.id,
              });

              await applyVerificationResult(doc.id, verification);

              const { appendPaymentEvent } = await import('./paymentEvents');
              await appendPaymentEvent(doc.id, {
                event: 'WATCHDOG_OCR_RETRY',
                traceId: 'watchdog',
                handler: 'watchdog',
                result_code: verification.verified ? 'OK' : 'PARTIAL',
                from_status: 'PENDING_REVIEW',
                to_status: verification.status,
                meta: {
                  action: 'ocr_retry',
                  verified: verification.verified,
                  reason: verification.reason,
                },
              });

              if (verification.verified) {
                stats.fixed++;
                console.log(`[paymentWatchdog] ✅ OCR retry succeeded for purchase ${doc.id}`);
              } else {
                console.log(`[paymentWatchdog] ⏳ OCR retry still pending for purchase ${doc.id}`);
              }
            } catch (error) {
              console.error(`[paymentWatchdog] Failed to retry OCR for purchase ${doc.id}:`, error);

              // Log error event
              try {
                const { appendPaymentEvent } = await import('./paymentEvents');
                await appendPaymentEvent(doc.id, {
                  event: 'WATCHDOG_OCR_RETRY',
                  traceId: 'watchdog',
                  handler: 'watchdog',
                  result_code: `ERR_${error instanceof Error ? error.message : String(error)}`,
                  from_status: 'PENDING_REVIEW',
                  to_status: 'PENDING_REVIEW',
                  meta: {
                    action: 'ocr_retry',
                    error: error instanceof Error ? error.message : String(error),
                  },
                });
              } catch (eventError) {
                console.error(`[paymentWatchdog] Failed to log error event:`, eventError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[paymentWatchdog] Error processing PENDING_REVIEW purchases:', error);
    }

    console.log(`[paymentWatchdog] Watchdog run complete: scanned=${stats.scanned}, fixed=${stats.fixed}, flagged=${stats.flagged}`);
  } catch (error) {
    console.error('[paymentWatchdog] Fatal error in watchdog run:', error);
  }

  return stats;
}
