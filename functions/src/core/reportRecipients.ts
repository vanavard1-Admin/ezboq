import { getDb } from './firebaseAdmin';
/**
 * LINE Report Recipients Registry
 * ================================
 * Efficient registry for users who want monthly reports
 * Avoids expensive `where('lineUserId', '!=', null)` queries
 * 
 * Data model:
 * line_report_recipients/{lineUserId}
 * {
 *   lineUserId: string,
 *   enabled: boolean,
 *   businesses: {
 *     [businessId]: {
 *       businessId: string,
 *       businessName: string,
 *       uid: string,
 *       registeredAt: Timestamp,
 *     }
 *   },
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp,
 *   lastReportSentAt?: Timestamp,
 * }
 */

import * as admin from 'firebase-admin';

const db = getDb();
const COLLECTION = 'line_report_recipients';

export interface BusinessEntry {
  businessId: string;
  businessName: string;
  uid: string;
  registeredAt: admin.firestore.Timestamp;
}

export interface RecipientDoc {
  lineUserId: string;
  enabled: boolean;
  businesses: { [businessId: string]: BusinessEntry };
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  lastReportSentAt?: admin.firestore.Timestamp;
}

// Flattened view for processing
export interface ReportRecipient {
  lineUserId: string;
  uid: string;
  businessId: string;
  businessName: string;
}

/**
 * Register a user for monthly reports
 * Called when user links LINE account
 */
export async function registerReportRecipient(
  lineUserId: string,
  uid: string,
  businessId: string,
  businessName: string
): Promise<void> {
  const ref = db.collection(COLLECTION).doc(lineUserId);
  const existing = await ref.get();

  if (existing.exists) {
    // Add business to existing recipient
    await ref.update({
      [`businesses.${businessId}`]: {
        businessId,
        businessName,
        uid,
        registeredAt: admin.firestore.Timestamp.now(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    // Create new recipient
    await ref.set({
      lineUserId,
      enabled: true,
      businesses: {
        [businessId]: {
          businessId,
          businessName,
          uid,
          registeredAt: admin.firestore.Timestamp.now(),
        },
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Unregister a business from recipient
 * Called when user unlinks LINE or disables reporting
 */
export async function unregisterBusiness(
  lineUserId: string,
  businessId: string
): Promise<void> {
  const ref = db.collection(COLLECTION).doc(lineUserId);
  await ref.update({
    [`businesses.${businessId}`]: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Get all enabled recipients flattened
 * Returns one entry per business per LINE user
 */
export async function getEnabledRecipients(): Promise<ReportRecipient[]> {
  const snapshot = await db
    .collection(COLLECTION)
    .where('enabled', '==', true)
    .get();

  const recipients: ReportRecipient[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as RecipientDoc;
    const lineUserId = data.lineUserId;
    const businesses = data.businesses || {};

    for (const [businessId, entry] of Object.entries(businesses)) {
      recipients.push({
        lineUserId,
        uid: entry.uid,
        businessId,
        businessName: entry.businessName,
      });
    }
  }

  return recipients;
}

/**
 * Mark report as sent for a LINE user
 */
export async function markReportSent(
  lineUserId: string
): Promise<void> {
  const ref = db.collection(COLLECTION).doc(lineUserId);
  await ref.update({
    lastReportSentAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Bulk register all businesses for a user
 * Called when user links LINE
 */
export async function registerAllBusinessesForUser(
  uid: string,
  lineUserId: string
): Promise<number> {
  // Get all businesses for user
  const businessesSnap = await db
    .collection(`users/${uid}/businesses`)
    .get();

  if (businessesSnap.empty) {
    return 0;
  }

  const ref = db.collection(COLLECTION).doc(lineUserId);
  const existing = await ref.get();

  const businesses: { [businessId: string]: BusinessEntry } = 
    existing.exists ? (existing.data() as RecipientDoc).businesses || {} : {};

  let count = 0;

  for (const bizDoc of businessesSnap.docs) {
    const bizData = bizDoc.data();
    const businessId = bizDoc.id;

    // Skip if reporting explicitly disabled
    if (bizData.reporting_enabled === false) {
      continue;
    }

    // Skip if already registered
    if (businesses[businessId]) {
      continue;
    }

    businesses[businessId] = {
      businessId,
      businessName: bizData.name || 'ธุรกิจ',
      uid,
      registeredAt: admin.firestore.Timestamp.now(),
    };
    count++;
  }

  if (count > 0) {
    if (existing.exists) {
      await ref.update({
        businesses,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await ref.set({
        lineUserId,
        enabled: true,
        businesses,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  return count;
}

/**
 * Disable recipient entirely
 */
export async function disableRecipient(lineUserId: string): Promise<void> {
  const ref = db.collection(COLLECTION).doc(lineUserId);
  await ref.update({
    enabled: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Delete recipient when LINE unlinked
 */
export async function deleteRecipient(lineUserId: string): Promise<void> {
  const ref = db.collection(COLLECTION).doc(lineUserId);
  await ref.delete();
}
