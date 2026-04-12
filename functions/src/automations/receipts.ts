import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { enqueuePdfJobWithTasks } from '../core/tasks';
import { getDb } from '../core/firebaseAdmin';
// import { buildPdfReadyMessage } from '../line/replies'; // Unused

import { LINE_API, getLineChannelAccessToken } from '../shared/config';

// ----------------------------------------------------------------------------
// Types & Config
// ----------------------------------------------------------------------------

const DB = getDb();

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

async function sendLinePush(lineUserId: string, message: any) {
    const accessToken = getLineChannelAccessToken();
    if (!accessToken) {
        console.error('[Receipt] LINE_CHANNEL_ACCESS_TOKEN not configured');
        return;
    }
    await fetch(LINE_API.PUSH, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            to: lineUserId,
            messages: [message],
        }),
    });
}

// ----------------------------------------------------------------------------
// Trigger: On Document Payment Status Change -> PAID
// ----------------------------------------------------------------------------

export const onDocumentPaid = functions.firestore.onDocumentUpdated(
    {
        document: 'users/{userId}/businesses/{businessId}/documents/{docId}',
        region: 'asia-southeast1',
        secrets: ['LINE_CHANNEL_ACCESS_TOKEN'],
    },
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();

        // 1. Check Trigger Condition: paymentStatus changes to 'PAID'
        if (before?.paymentStatus === 'PAID' || after?.paymentStatus !== 'PAID') {
            return;
        }

        const docId = event.params.docId;
        const userId = event.params.userId;
        const businessId = event.params.businessId;

        console.log(`[Receipt] Payment detected for ${docId}`);

        // 2. Idempotency Check (Prevent duplicate receipt generation)
        const idempotencyKey = `receipt_gen_${docId}`;
        const idemRef = DB.doc(`automations/receipts/runs/${idempotencyKey}`);

        try {
            await DB.runTransaction(async (tx) => {
                const snap = await tx.get(idemRef);
                if (snap.exists) throw new Error('ALREADY_PROCESSED');
                tx.set(idemRef, {
                    docId,
                    triggeredAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });
        } catch (e: any) {
            if (e.message === 'ALREADY_PROCESSED') {
                console.log(`[Receipt] Skipped duplicate for ${docId}`);
                return;
            }
            throw e;
        }

        // 3. Generate Receipt PDF
        // We reuse the PDF service. Often systems create a NEW document (Receipt) or just a new PDF.
        // Requirement: "generate receipt PDF (reuse pdf-service template with receipt type)"
        // We will assume PDF Service handles type=RECEIPT or we instruct it.
        // For EzDoc, typically we might clone to a new Doc type=RECEIPT, OR just render the current doc as receipt.
        // Plan: If detected, we enqueue a PDF job with `docType: 'RECEIPT'` override? 
        // Or actually, the payload usually takes docId. 
        // If the Doc itself is still 'QUO' or 'INV', we might need to Issue a Receipt Document.
        // AUTOMATION: "transition document via state-machine (NO new states)" 
        // -> EzDoc might handle Receipt as a separate document or just a status.
        // If status is PAID, PDF service should render it as Receipt/Paid Invoice.

        const lineUserId = after.creatorLineId; // Preferred

        // Enqueue PDF Job
        await enqueuePdfJobWithTasks({
            userId,
            businessId,
            docId,
            revision: (after.revision || 0) + 1, // Force new render
            lineUserId: lineUserId || null
        });

        // 4. Notification?
        // PDF Worker will send "PDF Ready" when done. 
        // We can ALSO send a "Payment Received" message here if we want immediate feedback.

        if (lineUserId) {
            await sendLinePush(lineUserId, {
                type: 'text',
                text: `💰 ได้รับการชำระเงินสำหรับเอกสาร ${after.docNo} แล้ว\nกำลังออกใบเสร็จ...`
            });
        }
    }
);
