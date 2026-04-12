/**
 * Document Sequence Numbering
 * Atomic document number allocation using Firestore transactions
 */

import { firestore } from 'firebase-admin';
import { DocType } from '../shared/types';
import { DOC_PREFIX } from '../shared/config';

interface AllocateDocNoParams {
    userId: string;
    businessId: string;
    docType: DocType;
    yearBE: number;
}

interface AllocateDocNoResult {
    docNo: string;
    seq: number;
}

/**
 * Allocate a new document number atomically
 * Uses Firestore transaction to prevent duplicate numbers
 * 
 * @param params - userId, businessId, docType, yearBE
 * @returns Document number (e.g., "RC-2568-0001") and sequence number
 */
export async function allocateDocNo(
    params: AllocateDocNoParams,
    externalTx?: firestore.Transaction
): Promise<AllocateDocNoResult> {
    const { userId, businessId, docType, yearBE } = params;
    const db = firestore();

    const seqRef = db.doc(
        `users/${userId}/businesses/${businessId}/sequences/${yearBE}`
    );

    const runAllocation = async (tx: firestore.Transaction) => {
        const snap = await tx.get(seqRef);
        const cur = snap.exists ? (snap.data() as Record<string, unknown>) : {};

        // Determine which counter to increment
        const field =
            docType === 'QUO'
                ? 'quoSeq'
                : docType === 'BILL'
                    ? 'billSeq'
                    : docType === 'RECEIPT'
                        ? 'receiptSeq'
                        : docType === 'CN'
                            ? 'cnSeq'
                            : 'dnSeq';

        // Get current sequence and increment
        const currentSeq = Number(cur[field] || 0);
        const nextSeq = currentSeq + 1;

        // Update sequence atomically
        tx.set(
            seqRef,
            {
                [field]: nextSeq,
                updatedAt: firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        // Generate document number
        const prefix = DOC_PREFIX[docType];
        const docNo = `${prefix}-${yearBE}-${String(nextSeq).padStart(4, '0')}`;

        return { docNo, seq: nextSeq };
    };

    if (externalTx) {
        return runAllocation(externalTx);
    } else {
        return db.runTransaction(runAllocation);
    }
}

/**
 * Get Buddhist Era year from ISO date string
 * @param iso - ISO date string (YYYY-MM-DD)
 * @returns Buddhist Era year (e.g., 2568)
 */
export function getYearBEFromISO(iso: string): number {
    const year = Number(iso.slice(0, 4));
    return year + 543;
}

/**
 * Get current Buddhist Era year
 * @returns Current BE year
 */
export function getCurrentYearBE(): number {
    return new Date().getFullYear() + 543;
}
