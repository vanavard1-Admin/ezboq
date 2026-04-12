import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Document Events Service
 * 
 * Append-only audit log for document lifecycle events.
 * 
 * Events are stored in subcollection: documents/{docId}/document_events/{autoId}
 * 
 * This provides a complete timeline of all document-related actions for debugging,
 * auditing, and dispute resolution.
 */

import * as admin from 'firebase-admin';

const db = getDb();

export interface DocumentEvent {
  event: string; // e.g. 'DOC_CREATED','DOC_CONFIRMED','PDF_GENERATED','PDF_DELIVERED','DOC_ISSUED'
  traceId?: string;
  handler?: string; // 'lineWebhookV1'|'api'|'pdfWorker'|'deliverLine'
  result_code?: string; // 'OK'|'ERR_xxx'
  from_status?: string | null;
  to_status?: string | null;
  meta?: Record<string, any>;
  createdAt: admin.firestore.Timestamp;
}

/**
 * Append a document event to the document's event log
 * 
 * This is append-only - events are never updated or deleted.
 * 
 * @param docId - Document ID
 * @param evt - Event data (createdAt will be set automatically)
 */
export async function appendDocumentEvent(
  docId: string,
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
    // Try to find document in standard path first
    let docRef: admin.firestore.DocumentReference | null = null;

    // Try users/{userId}/businesses/{businessId}/documents/{docId}
    const usersSnapshot = await db.collectionGroup('documents')
      .where(admin.firestore.FieldPath.documentId(), '==', docId)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      docRef = usersSnapshot.docs[0].ref;
    } else {
      // Fallback: try direct documents collection
      const directRef = db.collection('documents').doc(docId);
      const directSnap = await directRef.get();
      if (directSnap.exists) {
        docRef = directRef;
      }
    }

    if (!docRef) {
      console.warn(`[documentEvents] Document not found: ${docId}, skipping event: ${evt.event}`);
      return;
    }

    // Create event document with server timestamp
    const eventData: DocumentEvent = {
      ...evt,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    };

    // Append to subcollection (auto-generated ID for ordering)
    await docRef
      .collection('document_events')
      .add(eventData);

    console.log(`[documentEvents] Event logged: docId=${docId}, event=${evt.event}, handler=${evt.handler || 'unknown'}, traceId=${evt.traceId || 'none'}`);
  } catch (error) {
    // Don't throw - event logging failure shouldn't break the main flow
    console.error(`[documentEvents] Failed to log event for document ${docId}:`, error);
  }
}


