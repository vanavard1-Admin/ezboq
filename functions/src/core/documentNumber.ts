import * as admin from 'firebase-admin';
import { getDb } from './firebaseAdmin';

type SequenceSeed = {
  maxDailyCounter: number;
  maxMonthlyCounter: number;
};

export async function getNextDocumentSequence(params: {
  businessId: string;
  docTypeKey: string;
  typePrefix: string;
  thaiYear: number;
}): Promise<number> {
  const { businessId, docTypeKey, typePrefix, thaiYear } = params;
  const db = getDb();
  const sequencesRef = db
    .collection('document_sequences')
    .doc(businessId)
    .collection('sequences');

  const yearlyRef = sequencesRef.doc(`${typePrefix}_${thaiYear}`);
  const counterPrefix = `${businessId}_${docTypeKey}_${thaiYear}`;
  const counterStart = counterPrefix;
  const counterEnd = `${counterPrefix}\uf8ff`;
  const monthlyStart = `${typePrefix}_${thaiYear}_`;
  const monthlyEnd = `${typePrefix}_${thaiYear}_\uf8ff`;

  return db.runTransaction(async (tx) => {
    const yearlySnap = await tx.get(yearlyRef);
    if (yearlySnap.exists) {
      const current = (yearlySnap.get('count') as number) || 0;
      const next = current + 1;
      tx.set(
        yearlyRef,
        { count: next, lastUpdated: admin.firestore.Timestamp.now() },
        { merge: true }
      );
      return next;
    }

    const counterQuery = db
      .collection('counters')
      .where(admin.firestore.FieldPath.documentId(), '>=', counterStart)
      .where(admin.firestore.FieldPath.documentId(), '<=', counterEnd);
    const counterSnap = await tx.get(counterQuery);
    let maxDailyCounter = 0;
    counterSnap.forEach((doc) => {
      const count = (doc.get('count') as number) || 0;
      if (count > maxDailyCounter) maxDailyCounter = count;
    });

    const monthlyQuery = sequencesRef
      .where(admin.firestore.FieldPath.documentId(), '>=', monthlyStart)
      .where(admin.firestore.FieldPath.documentId(), '<=', monthlyEnd);
    const monthlySnap = await tx.get(monthlyQuery);
    let maxMonthlyCounter = 0;
    monthlySnap.forEach((doc) => {
      const count = (doc.get('count') as number) || 0;
      if (count > maxMonthlyCounter) maxMonthlyCounter = count;
    });

    const seed: SequenceSeed = { maxDailyCounter, maxMonthlyCounter };
    const next = Math.max(maxDailyCounter, maxMonthlyCounter) + 1;
    tx.set(
      yearlyRef,
      {
        count: next,
        lastUpdated: admin.firestore.Timestamp.now(),
        seededFrom: seed,
      },
      { merge: true }
    );
    return next;
  });
}
