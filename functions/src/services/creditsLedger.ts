import { getDb } from '../core/firebaseAdmin';
/**
 * Credits Ledger Service
 * 
 * CRITICAL: All credit changes must be recorded in ledger for audit trail
 * - Balance updates MUST be atomic with ledger entry
 * - Ledger entries are immutable (append-only)
 * - ReferenceId provides idempotency (same purchase/doc cannot be applied twice)
 */

import * as admin from 'firebase-admin';

const db = getDb();

export type CreditLedgerType = 'PURCHASE' | 'DEDUCTION' | 'ADJUSTMENT' | 'REFUND';

export interface CreditLedgerEntry {
  userId: string;
  businessId?: string;
  type: CreditLedgerType;
  amount: number; // Positive for add, negative for deduct
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string; // purchaseId, docId, etc. (for idempotency)
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: admin.firestore.Timestamp;
  createdBy?: 'SYSTEM' | 'ADMIN' | string;
}

/**
 * Check if a referenceId has already been applied (idempotency)
 */
export async function isReferenceIdApplied(
  userId: string,
  referenceId: string
): Promise<boolean> {
  if (!referenceId) {
    return false; // No referenceId = can't check, proceed anyway
  }

  try {
    const ledgerQuery = await db.collection('credits_ledger')
      .where('userId', '==', userId)
      .where('referenceId', '==', referenceId)
      .limit(1)
      .get();

    return !ledgerQuery.empty;
  } catch (error) {
    console.error('[creditsLedger] Failed to check referenceId:', error);
    // On error, assume not applied (fail-open) to avoid blocking
    return false;
  }
}

/**
 * Add credits with ledger entry (atomic transaction)
 * 
 * @param userId - User ID
 * @param credits - Amount to add (must be positive)
 * @param reason - Human-readable reason
 * @param referenceId - Optional reference for idempotency (e.g., purchaseId)
 * @param metadata - Optional metadata
 */
export async function addCreditsWithLedger(
  userId: string,
  credits: number,
  reason: string,
  referenceId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (credits <= 0) {
    throw new Error(`addCreditsWithLedger: credits must be positive, got ${credits}`);
  }

  const subRef = db.collection('subscriptions').doc(userId);
  const ledgerRef = db.collection('credits_ledger').doc();

  await db.runTransaction(async (transaction) => {
    // Check referenceId idempotency INSIDE transaction (atomic)
    if (referenceId) {
      const ledgerQuery = await transaction.get(
        db.collection('credits_ledger')
          .where('userId', '==', userId)
          .where('referenceId', '==', referenceId)
          .limit(1)
      );

      if (!ledgerQuery.empty) {
        // Already applied - skip
        return;
      }
    }

    // Read current balance
    const subSnap = await transaction.get(subRef);

    let balanceBefore: number;
    if (!subSnap.exists) {
      // Create new subscription
      balanceBefore = 0;
      const now = admin.firestore.Timestamp.now();
      const periodEnd = new Date(now.toDate());
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      transaction.set(subRef, {
        uid: userId,
        plan: 'FREE',
        creditsRemaining: credits, // balanceAfter
        periodStart: now,
        periodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const subscription = subSnap.data() as { creditsRemaining: number };
      balanceBefore = subscription.creditsRemaining;

      transaction.update(subRef, {
        creditsRemaining: balanceBefore + credits,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const balanceAfter = balanceBefore + credits;

    // Create ledger entry (atomic with balance update)
    const ledgerEntry: CreditLedgerEntry = {
      userId,
      type: 'PURCHASE',
      amount: credits,
      balanceBefore,
      balanceAfter,
      referenceId,
      reason,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      createdBy: 'SYSTEM',
    };

    transaction.set(ledgerRef, ledgerEntry);
  });

  console.log(`[creditsLedger] ✅ Added ${credits} credits to ${userId}, balance: ${credits} (referenceId: ${referenceId || 'none'})`);
}

/**
 * Deduct credits with ledger entry (atomic transaction)
 * 
 * @param userId - User ID
 * @param credits - Amount to deduct (must be positive)
 * @param reason - Human-readable reason
 * @param referenceId - Optional reference for idempotency (e.g., docId)
 * @param metadata - Optional metadata
 */
export async function deductCreditsWithLedger(
  userId: string,
  credits: number,
  reason: string,
  referenceId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (credits <= 0) {
    throw new Error(`deductCreditsWithLedger: credits must be positive, got ${credits}`);
  }

  const subRef = db.collection('subscriptions').doc(userId);
  const ledgerRef = db.collection('credits_ledger').doc();

  await db.runTransaction(async (transaction) => {
    // Check referenceId idempotency INSIDE transaction (atomic)
    if (referenceId) {
      const ledgerQuery = await transaction.get(
        db.collection('credits_ledger')
          .where('userId', '==', userId)
          .where('referenceId', '==', referenceId)
          .limit(1)
      );

      if (!ledgerQuery.empty) {
        // Already applied - skip
        return;
      }
    }

    // Read current balance
    const subSnap = await transaction.get(subRef);

    if (!subSnap.exists) {
      throw new Error(`Subscription not found: ${userId}`);
    }

    const subscription = subSnap.data() as { creditsRemaining: number };
    const balanceBefore = subscription.creditsRemaining;

    if (balanceBefore < credits) {
      throw new Error(`Insufficient credits: required=${credits}, available=${balanceBefore}`);
    }

    const balanceAfter = balanceBefore - credits;

    // Update balance
    transaction.update(subRef, {
      creditsRemaining: balanceAfter,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create ledger entry (atomic with balance update)
    const ledgerEntry: CreditLedgerEntry = {
      userId,
      type: 'DEDUCTION',
      amount: -credits, // Negative for deduction
      balanceBefore,
      balanceAfter,
      referenceId,
      reason,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      createdBy: 'SYSTEM',
    };

    transaction.set(ledgerRef, ledgerEntry);
  });

  console.log(`[creditsLedger] ✅ Deducted ${credits} credits from ${userId}, balance: ${credits} (referenceId: ${referenceId || 'none'})`);
}

/**
 * Adjust credits (manual adjustment by admin)
 * 
 * @param userId - User ID
 * @param credits - Amount to adjust (positive = add, negative = deduct)
 * @param reason - Human-readable reason
 * @param referenceId - Optional reference
 * @param createdBy - Who made the adjustment
 * @param metadata - Optional metadata
 */
export async function adjustCreditsWithLedger(
  userId: string,
  credits: number,
  reason: string,
  referenceId?: string,
  createdBy: string = 'ADMIN',
  metadata?: Record<string, unknown>
): Promise<void> {
  if (credits === 0) {
    throw new Error('adjustCreditsWithLedger: credits cannot be zero');
  }

  const subRef = db.collection('subscriptions').doc(userId);
  const ledgerRef = db.collection('credits_ledger').doc();

  await db.runTransaction(async (transaction) => {
    // Read current balance
    const subSnap = await transaction.get(subRef);

    if (!subSnap.exists) {
      throw new Error(`Subscription not found: ${userId}`);
    }

    const subscription = subSnap.data() as { creditsRemaining: number };
    const balanceBefore = subscription.creditsRemaining;
    const balanceAfter = balanceBefore + credits;

    // Prevent negative balance (unless explicitly allowed)
    if (balanceAfter < 0) {
      throw new Error(`Adjustment would result in negative balance: ${balanceAfter}`);
    }

    // Update balance
    transaction.update(subRef, {
      creditsRemaining: balanceAfter,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create ledger entry
    const ledgerEntry: CreditLedgerEntry = {
      userId,
      type: credits > 0 ? 'ADJUSTMENT' : 'REFUND',
      amount: credits,
      balanceBefore,
      balanceAfter,
      referenceId,
      reason,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      createdBy,
    };

    transaction.set(ledgerRef, ledgerEntry);
  });

  console.log(`[creditsLedger] ✅ Adjusted ${credits > 0 ? '+' : ''}${credits} credits for ${userId}, balance: ${credits} (referenceId: ${referenceId || 'none'})`);
}

