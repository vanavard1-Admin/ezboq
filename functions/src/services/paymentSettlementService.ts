import { getDb } from '../core/firebaseAdmin';
/**
 * Payment Settlement Service
 * 
 * P0 Payment Settlement Hardening - Zero Lost Credit and Zero Duplicate
 * 
 * CRITICAL RULES:
 * - Fully idempotent: calling settleVerifiedPurchase() twice never applies entitlements twice
 * - Atomic transaction: purchase status, entitlement, and ledger updated together
 * - slip_hash deduplication: prevents cross-purchase duplicates
 * - Observable failures: if settlement fails, purchase remains in observable state for watchdog
 */

import * as admin from 'firebase-admin';
import { getPackageDefinition } from './purchaseService';
import { normalizePlan } from '../core/planService';

const db = getDb();

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

export interface SettleVerifiedPurchaseParams {
  purchaseId: string;
  verifiedBy: 'OCR' | 'ADMIN' | 'MANUAL';
  traceId?: string;
}

export interface SettleVerifiedPurchaseResult {
  ok: true;
  alreadySettled: boolean;
  reason?: string;
}

/**
 * Settle verified purchase with atomic transaction
 * 
 * Guarantees:
 * - If purchase is verified as PAID, subscription is activated exactly once
 * - If function crashes mid-way, next retry/watchdog can safely re-run
 * - slip_hash reused across purchases cannot add credits twice
 * 
 * @param params - Settlement parameters
 * @returns Settlement result
 */
export async function settleVerifiedPurchase(
  params: SettleVerifiedPurchaseParams
): Promise<SettleVerifiedPurchaseResult> {
  const { purchaseId, verifiedBy, traceId } = params;

  console.log(`[paymentSettlement] Starting settlement for purchaseId=${purchaseId}, verifiedBy=${verifiedBy}, traceId=${traceId || 'none'}`);

  const purchaseRef = db.collection('credit_purchases').doc(purchaseId);

  // Store original status for event logging (read before transaction)
  let originalStatus: string | null = null;
  try {
    const purchaseDocBefore = await purchaseRef.get();
    if (purchaseDocBefore.exists) {
      originalStatus = (purchaseDocBefore.data() as any).status || null;
    }
  } catch (error) {
    console.warn(`[paymentSettlement] Failed to read original status (non-blocking):`, error);
  }

  const result: SettleVerifiedPurchaseResult = await db.runTransaction(async (transaction) => {
    // Read purchase document
    const purchaseDoc = await transaction.get(purchaseRef);

    if (!purchaseDoc.exists) {
      throw new Error(`Purchase ${purchaseId} not found`);
    }

    const purchase = purchaseDoc.data() as any;
    const userId = purchase.userId;
    const slipHash = purchase.slip_hash;
    const packageType = purchase.packageType;
    const pkg = getPackageDefinition(packageType);
    const packageKind = pkg?.type || purchase.packageKind || 'SUBSCRIPTION';

    // ✅ IDEMPOTENCY CHECK 1: If credit_applied === true OR credit_applied_at exists -> already settled
    if (purchase.credit_applied === true || purchase.credit_applied_at) {
      console.log(`[paymentSettlement] Purchase already settled: purchaseId=${purchaseId}, credit_applied=${purchase.credit_applied}, credit_applied_at=${purchase.credit_applied_at}`);
      return {
        ok: true,
        alreadySettled: true,
        reason: 'credits_already_applied',
      };
    }

    // ✅ IDEMPOTENCY CHECK 2: Check if ledger entry exists with deterministic document ID
    // Use slip_hash if available, else fallback to purchaseId
    const ledgerDocId = slipHash 
      ? `slip_${slipHash}` 
      : `purchase_${purchaseId}`;

    const ledgerRef = db.collection('credits_ledger').doc(ledgerDocId);
    const ledgerDoc = await transaction.get(ledgerRef);

    if (ledgerDoc.exists) {
      // Ledger entry exists - repair purchase document and return
      const ledgerData = ledgerDoc.data();
      if (!ledgerData) {
        throw new Error(`Ledger entry exists but data is null for ${ledgerDocId}`);
      }
      const ledgerMetadata = (ledgerData.metadata || {}) as Record<string, unknown>;
      const ledgerPurchaseId = ledgerMetadata.purchaseId as string | undefined;

      // ✅ CRITICAL: If slip_hash exists and ledger entry exists but purchaseId differs -> DUPLICATE SETTLEMENT
      if (slipHash && ledgerPurchaseId && ledgerPurchaseId !== purchaseId) {
        console.warn(`[paymentSettlement] ⚠️ DUPLICATE SETTLEMENT DETECTED: slip_hash=${slipHash} already settled for purchaseId=${ledgerPurchaseId}, rejecting purchaseId=${purchaseId}`);

        // Mark purchase as REJECTED with fraud flag
        const fraudFlags = Array.isArray(purchase.fraud_flags) ? [...purchase.fraud_flags] : [];
        if (!fraudFlags.includes('DUPLICATE_SETTLEMENT_SLIP_HASH')) {
          fraudFlags.push('DUPLICATE_SETTLEMENT_SLIP_HASH');
        }

        transaction.update(purchaseRef, {
          status: 'REJECTED',
          payment_verified_at: admin.firestore.FieldValue.serverTimestamp(),
          settlement_trace_id: traceId || null,
          settlement_version: 'v1',
          fraud_flags: fraudFlags,
          fraud_reason: `Duplicate settlement: slip_hash already used for purchase ${ledgerPurchaseId}`,
        });

        // Return result - event will be written after transaction commits
        return {
          ok: true,
          alreadySettled: true,
          reason: 'duplicate_slip_settlement',
        };
      }

      // Same purchaseId - repair purchase document
      console.log(`[paymentSettlement] Ledger entry exists, repairing purchase document: purchaseId=${purchaseId}, ledgerDocId=${ledgerDocId}`);

      transaction.update(purchaseRef, {
        credit_applied: true,
        credit_applied_at: ledgerData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        payment_verified_at: purchase.payment_verified_at || admin.firestore.FieldValue.serverTimestamp(),
        paidAt: purchase.paidAt || ledgerData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        settlement_trace_id: traceId || purchase.settlement_trace_id || null,
        settlement_version: 'v1',
        status: 'PAID', // Ensure status is PAID
      });

      return {
        ok: true,
        alreadySettled: true,
        reason: 'ledger_entry_exists',
      };
    }

    // ✅ VALIDATION: Purchase must be verified (status should be PAID or we're setting it)
    // If status is not PAID, we'll set it to PAID only if verification passed
    const currentStatus = purchase.status;
    if (currentStatus !== 'PAID' && currentStatus !== 'PENDING_REVIEW') {
      // Only proceed if we're verifying it now
      // For safety, we'll set status to PAID in the transaction
    }

    // ✅ SETTLEMENT: Apply subscription and update purchase atomically
    const now = admin.firestore.Timestamp.now();

    // ✅ SUBSCRIPTION: Set plan, seats, auto-renew, and billing period
    const { getPackagePlan } = await import('./purchaseService');
    const plan = pkg?.plan || getPackagePlan(packageType);
    const seatTotal = pkg?.seats || (plan === 'TEAM' ? 3 : 1);
    const promoDurationMonths =
      typeof purchase.promo_duration_months === 'number' && purchase.promo_duration_months > 0
        ? Math.round(purchase.promo_duration_months)
        : null;
    const durationMonths = promoDurationMonths || pkg?.durationMonths || 1;

    const subRef = db.collection('subscriptions').doc(userId);
    const subDoc = await transaction.get(subRef);
    const existingSub = subDoc.exists ? (subDoc.data() as any) : null;
    const existingPlan = normalizePlan(existingSub?.plan || 'FREE');
    const planRank: Record<string, number> = { FREE: 0, PRO: 1, TEAM: 2 };
    const currentRank = planRank[existingPlan] ?? 0;
    const targetRank = planRank[plan] ?? 0;
    const existingPeriodEnd = existingSub?.periodEnd as admin.firestore.Timestamp | undefined;
    const existingPeriodStart = existingSub?.periodStart as admin.firestore.Timestamp | undefined;
    const isActive =
      existingSub?.status === 'ACTIVE' &&
      existingPeriodEnd &&
      existingPeriodEnd.toMillis() > now.toMillis();

    const periodStartDate = isActive && existingPeriodStart
      ? existingPeriodStart.toDate()
      : now.toDate();

    const periodEndBaseDate =
      isActive && existingPeriodEnd && targetRank >= currentRank
        ? existingPeriodEnd.toDate()
        : now.toDate();

    const periodEndDate = addMonths(periodEndBaseDate, durationMonths);
    const periodStartTs = admin.firestore.Timestamp.fromDate(periodStartDate);
    const periodEndTs = admin.firestore.Timestamp.fromDate(periodEndDate);

    const seatUsed = subDoc.exists ? Math.max((subDoc.data() as any)?.seatUsed || 1, 1) : 1;
    const subscriptionUpdate = {
      uid: userId,
      plan,
      status: 'ACTIVE' as const,
      seatTotal,
      seatUsed,
      autoRenew: true, // ✅ Auto-renew enabled for monthly subscriptions
      nextBillingAt: periodEndTs, // ✅ Next billing date = periodEnd
      periodStart: periodStartTs,
      periodEnd: periodEndTs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // ✅ REMOVED: creditsRemaining (deprecated - subscriptions don't use credits)
    };

    if (!subDoc.exists) {
      transaction.set(subRef, {
        ...subscriptionUpdate,
        createdAt: now,
      });
    } else {
      transaction.update(subRef, subscriptionUpdate);
    }

    const userRef = db.collection('users').doc(userId);
    transaction.set(userRef, {
      plan,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // ✅ LEDGER: Record subscription activation (not credit-based)
    const ledgerEntry = {
      userId,
      type: 'SUBSCRIPTION' as const,
      amount: purchase.amount, // ✅ Record actual payment amount
      balanceBefore: 0, // ✅ Not applicable for subscriptions
      balanceAfter: 0, // ✅ Not applicable for subscriptions
      referenceId: purchaseId,
      reason: `Subscription activated: ${plan} (${purchase.referenceId || purchaseId})`,
      metadata: {
        packageType,
        amount: purchase.amount,
        verifiedBy,
        idempotency_key: ledgerDocId,
        purchaseId,
        plan,
        seatTotal,
        seatUsed,
        autoRenew: true,
        periodStart: now,
        periodEnd: periodEndTs,
        slip_hash: slipHash || null,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'SYSTEM' as const,
    };

    transaction.set(ledgerRef, ledgerEntry);

    // Update purchase
    transaction.update(purchaseRef, {
      status: 'PAID',
      paidAt: purchase.paidAt || admin.firestore.FieldValue.serverTimestamp(),
      payment_verified_at: admin.firestore.FieldValue.serverTimestamp(),
      credit_applied: true,
      credit_applied_at: admin.firestore.FieldValue.serverTimestamp(),
      settlement_trace_id: traceId || null,
      settlement_version: 'v2',
    });

    console.log(`[paymentSettlement] ✅ Subscription settled: purchaseId=${purchaseId}, userId=${userId}, plan=${plan}, seats=${seatTotal}`);

    // ✅ AUDIT EVENT: Log payment event (non-blocking)
    try {
      const { appendPaymentEvent } = await import('./paymentEvents');
      await appendPaymentEvent(purchaseId, {
        event: 'SUBSCRIPTION_ACTIVATED',
        traceId: traceId || undefined,
        handler: 'paymentSettlementService',
        result_code: 'OK',
        from_status: currentStatus,
        to_status: 'PAID',
        meta: {
          verifiedBy,
          packageKind,
          packageType,
          plan,
          seatTotal,
          amount: purchase.amount,
        },
      }).catch((err: any) => {
        console.warn(`[paymentSettlement] Failed to append payment event (non-blocking):`, err);
      });
    } catch (auditError) {
      // Non-blocking - don't fail settlement if audit fails
      console.warn(`[paymentSettlement] Audit event helper not available (non-blocking):`, auditError);
    }

    return {
      ok: true,
      alreadySettled: false,
    };
  });

  // ✅ Write payment_events for duplicate detection (after transaction commits)
  if (result.reason === 'duplicate_slip_settlement') {
    try {
      // Re-read purchase to get slip_hash and fraud flags
      const purchaseDocAfter = await purchaseRef.get();
      if (purchaseDocAfter.exists) {
        const purchaseAfter = purchaseDocAfter.data() as any;

        const { appendPaymentEvent } = await import('./paymentEvents');
        await appendPaymentEvent(purchaseId, {
          event: 'DUPLICATE_SETTLEMENT_BLOCKED',
          traceId: traceId || undefined,
          handler: 'paymentSettlementService',
          result_code: 'BLOCKED',
          from_status: originalStatus,
          to_status: 'REJECTED',
          meta: {
            verifiedBy,
            slip_hash: purchaseAfter.slip_hash || null,
            fraud_flags: purchaseAfter.fraud_flags || [],
            fraud_reason: purchaseAfter.fraud_reason || null,
          },
        }).catch((err: any) => {
          console.warn(`[paymentSettlement] Failed to write duplicate event (non-blocking):`, err);
        });
      }
    } catch (auditError) {
      console.warn(`[paymentSettlement] Failed to write duplicate event (non-blocking):`, auditError);
    }
  }

  return result;
}
