import { getDb } from './firebaseAdmin';
/**
 * Monthly Stats Service (Concurrency-Safe)
 * =========================================
 * Write-through stats aggregation for monthly reports
 * 
 * Data Model:
 * businesses/{businessId}/stats_monthly/{YYYY-MM}
 * {
 *   year_month: string,
 *   docs_total: number,
 *   docs_by_type: { QUOTE, INVOICE, RECEIPT },
 *   total_amount_thb: number,
 *   credits_spent: number,
 *   credit_purchased_amount_thb: number,
 *   pdf_sent_total: number,
 *   pdf_failed_total: number,
 *   updated_at: Timestamp,
 * }
 * 
 * Event Lock Model (for idempotency):
 * businesses/{businessId}/stats_events/{eventId}
 * {
 *   eventId: string,
 *   eventType: 'pdf' | 'purchase' | 'doc',
 *   processedAt: Timestamp,
 * }
 * 
 * Pattern: Transaction creates event lock FIRST, then increments stats
 * If event lock exists → skip (already processed)
 * This is atomic and handles concurrent retries correctly
 */

import * as admin from 'firebase-admin';

const db = getDb();

// TTL for event locks: 120 days (enough for retry/late events)
const EVENT_LOCK_TTL_DAYS = 120;

// Event types for clarity
type EventType = 'pdf_sent' | 'pdf_failed' | 'purchase_confirm' | 'doc_confirm';

// Document types mapping
type DocType = 'QUOTE' | 'INVOICE' | 'RECEIPT';
const DOC_TYPE_MAP: { [key: string]: DocType } = {
  'QUO': 'QUOTE',
  'QT': 'QUOTE',
  'QUOTE': 'QUOTE',
  'BILL': 'INVOICE',
  'WB': 'INVOICE',
  'INVOICE': 'INVOICE',
  'RECEIPT': 'RECEIPT',
  'RC': 'RECEIPT',
};

/**
 * Get YYYY-MM format from Date
 */
export function getYearMonth(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get stats_monthly document reference
 */
function getStatsRef(businessId: string, yearMonth: string) {
  return db.doc(`businesses/${businessId}/stats_monthly/${yearMonth}`);
}

/**
 * Get event lock document reference
 */
function getEventLockRef(businessId: string, eventId: string) {
  return db.doc(`businesses/${businessId}/stats_events/${eventId}`);
}

/**
 * Create event lock document with TTL
 * expiresAt field is used by Firestore TTL policy for auto-deletion
 */
function createEventLock(eventId: string, eventType: EventType) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EVENT_LOCK_TTL_DAYS * 24 * 60 * 60 * 1000);

  return {
    eventId,
    type: eventType,
    createdAt: admin.firestore.Timestamp.now(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  };
}

/**
 * Default empty stats structure
 */
function getEmptyStats(yearMonth: string): MonthlyStats {
  return {
    year_month: yearMonth,
    docs_total: 0,
    docs_by_type: {
      QUOTE: 0,
      INVOICE: 0,
      RECEIPT: 0,
    },
    total_amount_thb: 0,
    credits_spent: 0,
    credit_purchased_amount_thb: 0,
    pdf_sent_total: 0,
    pdf_failed_total: 0,
    updated_at: admin.firestore.Timestamp.now(),
  };
}

/**
 * Increment document stats when a document is CONFIRMED
 * Called from: POST /documents/:id/confirm
 * 
 * Note: Documents are created once, so no idempotency needed here
 * 
 * @param businessId - Business ID
 * @param docType - Document type (QUO, BILL, RECEIPT, etc.)
 * @param grandTotal - Total amount in THB
 * @param date - Issue date (defaults to now)
 */
export async function incrementDocStats(
  businessId: string,
  docType: string,
  grandTotal: number,
  date: Date = new Date()
): Promise<void> {
  const yearMonth = getYearMonth(date);
  const ref = getStatsRef(businessId, yearMonth);
  const canonicalType = DOC_TYPE_MAP[docType.toUpperCase()] || 'QUOTE';

  try {
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);

      if (!snap.exists) {
        // Create new stats doc
        const newStats = getEmptyStats(yearMonth);
        newStats.docs_total = 1;
        newStats.docs_by_type[canonicalType] = 1;
        newStats.total_amount_thb = grandTotal;
        transaction.set(ref, newStats);
      } else {
        // Increment existing
        transaction.update(ref, {
          docs_total: admin.firestore.FieldValue.increment(1),
          [`docs_by_type.${canonicalType}`]: admin.firestore.FieldValue.increment(1),
          total_amount_thb: admin.firestore.FieldValue.increment(grandTotal),
          updated_at: admin.firestore.Timestamp.now(),
        });
      }
    });

    console.log(`[statsMonthly] +1 doc (${canonicalType}) ฿${grandTotal} → ${businessId}/${yearMonth}`);
  } catch (error) {
    console.error(`[statsMonthly] Failed to increment doc stats:`, error);
    // Don't throw - stats update failure shouldn't break main flow
  }
}

/**
 * Increment credit purchase stats (with idempotency)
 * Called from: credit purchase flow
 * 
 * Uses transaction + event lock for concurrent safety
 * 
 * @param businessId - Business ID
 * @param credits - Number of credits purchased
 * @param amountThb - Amount paid in THB
 * @param purchaseId - Unique purchase ID for idempotency
 * @param date - Purchase date (defaults to now)
 */
export async function incrementCreditPurchase(
  businessId: string,
  credits: number,
  amountThb: number,
  purchaseId?: string,
  date: Date = new Date()
): Promise<void> {
  const yearMonth = getYearMonth(date);
  const statsRef = getStatsRef(businessId, yearMonth);

  // If no purchaseId, skip idempotency (backward compat)
  if (!purchaseId) {
    try {
      await statsRef.set({
        credit_purchased_amount_thb: admin.firestore.FieldValue.increment(amountThb),
        updated_at: admin.firestore.Timestamp.now(),
      }, { merge: true });
      console.log(`[statsMonthly] +${credits} credits (฿${amountThb}) → ${businessId}/${yearMonth} (no idempotency)`);
    } catch (error) {
      console.error(`[statsMonthly] Failed to increment credit purchase:`, error);
    }
    return;
  }

  const eventId = `purchase:${purchaseId}`;
  const lockRef = getEventLockRef(businessId, eventId);

  try {
    await db.runTransaction(async (transaction) => {
      // Check event lock FIRST
      const lockSnap = await transaction.get(lockRef);

      if (lockSnap.exists) {
        // Already processed - skip
        console.log(`[statsMonthly] Skip duplicate purchase: ${purchaseId}`);
        return;
      }

      // Get or create stats doc
      const statsSnap = await transaction.get(statsRef);

      if (!statsSnap.exists) {
        // Create new stats doc
        const newStats = getEmptyStats(yearMonth);
        newStats.credit_purchased_amount_thb = amountThb;
        transaction.set(statsRef, newStats);
      } else {
        // Increment existing
        transaction.update(statsRef, {
          credit_purchased_amount_thb: admin.firestore.FieldValue.increment(amountThb),
          updated_at: admin.firestore.Timestamp.now(),
        });
      }

      // Create event lock with TTL (MUST be in same transaction)
      transaction.set(lockRef, createEventLock(eventId, 'purchase_confirm'));
    });

    console.log(`[statsMonthly] +${credits} credits (฿${amountThb}) → ${businessId}/${yearMonth}`);
  } catch (error) {
    console.error(`[statsMonthly] Failed to increment credit purchase:`, error);
  }
}

/**
 * Increment credit spent when PDF is generated
 * Called from: PDF generation flow
 * 
 * @param businessId - Business ID
 * @param credits - Number of credits spent (usually 1)
 * @param date - Date (defaults to now)
 */
export async function incrementCreditsSpent(
  businessId: string,
  credits: number = 1,
  date: Date = new Date()
): Promise<void> {
  const yearMonth = getYearMonth(date);
  const ref = getStatsRef(businessId, yearMonth);

  try {
    await ref.set({
      credits_spent: admin.firestore.FieldValue.increment(credits),
      updated_at: admin.firestore.Timestamp.now(),
    }, { merge: true });

    console.log(`[statsMonthly] +${credits} credits spent → ${businessId}/${yearMonth}`);
  } catch (error) {
    console.error(`[statsMonthly] Failed to increment credits spent:`, error);
  }
}

/**
 * Increment PDF delivery stats (with idempotency)
 * Called from: deliverPdfTaskHandler after LINE push
 * 
 * Uses transaction + event lock for concurrent safety
 * 
 * @param businessId - Business ID
 * @param success - Whether delivery succeeded
 * @param eventId - Unique event ID for idempotency (e.g., documentId)
 * @param date - Date (defaults to now)
 */
export async function incrementPdfDelivery(
  businessId: string,
  success: boolean,
  eventId?: string,
  date: Date = new Date()
): Promise<void> {
  const yearMonth = getYearMonth(date);
  const statsRef = getStatsRef(businessId, yearMonth);
  const field = success ? 'pdf_sent_total' : 'pdf_failed_total';

  // If no eventId, skip idempotency (backward compat)
  if (!eventId) {
    try {
      await statsRef.set({
        [field]: admin.firestore.FieldValue.increment(1),
        updated_at: admin.firestore.Timestamp.now(),
      }, { merge: true });
      console.log(`[statsMonthly] +1 pdf ${success ? 'sent' : 'failed'} → ${businessId}/${yearMonth} (no idempotency)`);
    } catch (error) {
      console.error(`[statsMonthly] Failed to increment PDF delivery:`, error);
    }
    return;
  }

  const lockEventId = `pdf:${eventId}:${success ? 'sent' : 'failed'}`;
  const lockRef = getEventLockRef(businessId, lockEventId);

  try {
    await db.runTransaction(async (transaction) => {
      // Check event lock FIRST
      const lockSnap = await transaction.get(lockRef);

      if (lockSnap.exists) {
        // Already processed - skip
        console.log(`[statsMonthly] Skip duplicate pdf event: ${eventId}`);
        return;
      }

      // Get or create stats doc
      const statsSnap = await transaction.get(statsRef);

      if (!statsSnap.exists) {
        // Create new stats doc
        const newStats = getEmptyStats(yearMonth);
        if (success) {
          newStats.pdf_sent_total = 1;
        } else {
          newStats.pdf_failed_total = 1;
        }
        transaction.set(statsRef, newStats);
      } else {
        // Increment existing
        transaction.update(statsRef, {
          [field]: admin.firestore.FieldValue.increment(1),
          updated_at: admin.firestore.Timestamp.now(),
        });
      }

      // Create event lock with TTL (MUST be in same transaction)
      const eventType: EventType = success ? 'pdf_sent' : 'pdf_failed';
      transaction.set(lockRef, createEventLock(lockEventId, eventType));
    });

    console.log(`[statsMonthly] +1 pdf ${success ? 'sent' : 'failed'} → ${businessId}/${yearMonth}`);
  } catch (error) {
    console.error(`[statsMonthly] Failed to increment PDF delivery:`, error);
  }
}

/**
 * Get monthly stats for a business
 * Used by pushMonthlyReport
 */
export async function getMonthlyStats(
  businessId: string,
  yearMonth: string
): Promise<MonthlyStats | null> {
  const ref = getStatsRef(businessId, yearMonth);
  const snap = await ref.get();

  if (!snap.exists) {
    return null;
  }

  return snap.data() as MonthlyStats;
}

/**
 * Monthly stats interface
 */
export interface MonthlyStats {
  year_month: string;
  docs_total: number;
  docs_by_type: {
    QUOTE: number;
    INVOICE: number;
    RECEIPT: number;
  };
  total_amount_thb: number;
  credits_spent: number;
  credit_purchased_amount_thb: number;
  pdf_sent_total: number;
  pdf_failed_total: number;
  updated_at: admin.firestore.Timestamp;
}
