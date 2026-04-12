import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Payment Events Service
 * 
 * Append-only audit log for payment lifecycle events.
 * 
 * Events are stored in subcollection: credit_purchases/{purchaseId}/payment_events/{autoId}
 * 
 * This provides a complete timeline of all payment-related actions for debugging,
 * auditing, and reconciliation.
 */

import * as admin from 'firebase-admin';

const db = getDb();

export interface PaymentEvent {
  event: string; // e.g. 'SLIP_RECEIVED','OCR_STARTED','OCR_SUCCESS','OCR_FAILED','PAYMENT_VERIFIED','CREDIT_APPLIED','DELIVERY_SENT','NEEDS_REVIEW','WATCHDOG_CREDIT_APPLY','WATCHDOG_OCR_RETRY'
  traceId?: string;
  handler?: string; // 'lineWebhookV1'|'processSlipOcrTask'|'watchdog'
  result_code?: string; // 'OK'|'ERR_xxx'
  from_status?: string | null;
  to_status?: string | null;
  meta?: Record<string, any>;
  createdAt: admin.firestore.Timestamp;
}

/**
 * Append a payment event to the purchase's event log
 * 
 * This is append-only - events are never updated or deleted.
 * 
 * @param purchaseId - Purchase ID
 * @param evt - Event data (createdAt will be set automatically)
 */
export async function appendPaymentEvent(
  purchaseId: string,
  evt: {
    event: string;
    traceId?: string;
    handler?: string;
    result_code?: string;
    from_status?: string | null;
    to_status?: string | null;
    meta?: Record<string, any>;
  }
): Promise<void> {
  try {
    const purchaseRef = db.collection('credit_purchases').doc(purchaseId);

    // Verify purchase exists (lightweight check)
    const purchaseDoc = await purchaseRef.get();
    if (!purchaseDoc.exists) {
      console.warn(`[paymentEvents] Purchase not found: ${purchaseId}, skipping event: ${evt.event}`);
      return;
    }

    // Create event document with server timestamp
    const eventData: PaymentEvent = {
      ...evt,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    };

    // Append to subcollection (auto-generated ID for ordering)
    await purchaseRef
      .collection('payment_events')
      .add(eventData);

    console.log(`[paymentEvents] Event logged: purchaseId=${purchaseId}, event=${evt.event}, handler=${evt.handler || 'unknown'}`);
  } catch (error) {
    // Don't throw - event logging failure shouldn't break the main flow
    console.error(`[paymentEvents] Failed to log event for purchase ${purchaseId}:`, error);
  }
}

