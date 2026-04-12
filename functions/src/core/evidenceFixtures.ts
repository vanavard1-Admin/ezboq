/**
 * Evidence Fixtures - Self-contained test data for Evidence A
 * 
 * Creates minimal test documents and businesses for Evidence A collection
 * All fixtures use idempotent IDs and TTL to avoid cluttering production data
 */

import * as admin from 'firebase-admin';
import { getDb } from './firebaseAdmin';

const db = getDb();

const EVIDENCE_BIZ_ID = 'evidenceA_biz';
const EVIDENCE_DOC_PREFIX = 'evidenceA_';

/**
 * Ensure test business exists (idempotent)
 */
export async function ensureBusiness(
  userId: string,
  businessId: string = EVIDENCE_BIZ_ID
): Promise<string> {
  const bizRef = db.collection('users').doc(userId).collection('businesses').doc(businessId);
  const bizSnap = await bizRef.get();

  if (!bizSnap.exists) {
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days TTL
    );

    await bizRef.set({
      id: businessId,
      name: 'Evidence A Test Business',
      address: '123 Test Street, Bangkok 10110',
      phone: '02-123-4567',
      email: 'test@evidence.example.com',
      taxId: '1234567890123',
      bankName: 'Test Bank',
      bankAccountNo: '123-456-7890',
      bankAccountName: 'Evidence A Test Business',
      createdAt: now,
      updatedAt: now,
      expiresAt, // TTL for cleanup
    }, { merge: true });
  }

  return businessId;
}

/**
 * Ensure ISSUED document exists for Evidence A (idempotent)
 */
export async function ensureIssuedDocument(params: {
  userId: string;
  businessId: string;
  docType: 'QUO' | 'BILL' | 'RECEIPT' | 'REPORT';
}): Promise<string> {
  const { userId, businessId, docType } = params;
  const docId = `${EVIDENCE_DOC_PREFIX}${docType}`;

  const docRef = db
    .collection('users')
    .doc(userId)
    .collection('businesses')
    .doc(businessId)
    .collection('documents')
    .doc(docId);

  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days TTL
    );

    // Get business data for snapshot
    const bizRef = db.collection('users').doc(userId).collection('businesses').doc(businessId);
    const bizSnap = await bizRef.get();
    const bizData = bizSnap.data() || {};

    // Minimal document schema for Evidence A
    const docData: any = {
      id: docId,
      doc_type: docType,
      doc_no: `${docType}-2568-001`,
      status: 'ISSUED',
      created_at: now,
      updated_at: now,
      issue_date: now,
      user_id: userId,
      business_id: businessId,
      expiresAt, // TTL for cleanup

      // Minimal snapshots
      business_snapshot: {
        id: businessId,
        name: bizData.name || 'Evidence A Test Business',
        tax_id: bizData.taxId || '1234567890123',
        address: bizData.address || '123 Test Street, Bangkok 10110',
      },
      customer_snapshot: {
        name: 'Test Customer',
        tax_id: '9876543210987',
        address: '456 Customer Street, Bangkok 10120',
      },
      tax_snapshot: {
        vat_percent: 7,
        vat_type: 'inclusive',
      },

      // Minimal items for PDF rendering
      items: [
        {
          name: 'Test Item 1',
          qty: 1,
          price: 1000,
          total: 1000,
        },
      ],
      subtotal: 1000,
      vat: 70,
      total: 1070,
      customer_name: 'Test Customer',
    };

    await docRef.set(docData, { merge: true });
  }

  return docId;
}


