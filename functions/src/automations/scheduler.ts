import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { LINE_API, getLineChannelAccessToken } from '../shared/config';
import { buildDueDateReminderHelper, buildUnpaidFollowupHelper } from '../line/replies';
import { getDb } from '../core/firebaseAdmin';

// ----------------------------------------------------------------------------
// Types & Config
// ----------------------------------------------------------------------------

// interface AutomationLog removed (unused)

const DB = getDb();

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

async function sendLineFlex(lineUserId: string, message: any) {
    const accessToken = getLineChannelAccessToken();
    if (!accessToken) {
        console.error('[Scheduler] LINE_CHANNEL_ACCESS_TOKEN not configured');
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

/**
 * Check if we already processed this doc for this automation cycle
 */
async function checkIdempotency(
    automationName: string,
    runKey: string, // e.g. YYYY-MM-DD
    docId: string
): Promise<boolean> {
    const ref = DB.doc(`automations/${automationName}/runs/${runKey}/docs/${docId}`);
    const snap = await ref.get();
    if (snap.exists) return true;

    await ref.set({
        status: 'PROCESSING',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return false;
}

// ----------------------------------------------------------------------------
// 1. Due Date Reminder (Daily 09:00 BKK)
// ----------------------------------------------------------------------------

export const dailyDueDateReminder = onSchedule({
    schedule: '0 9 * * *',
    timeZone: 'Asia/Bangkok',
    region: 'asia-southeast1',
    memory: '256MiB',
    secrets: ['LINE_CHANNEL_ACCESS_TOKEN'],
    invoker: 'private', // Only Cloud Scheduler can invoke
}, async (_event) => {
    void _event;
    console.log('Starting dailyDueDateReminder...');
    await runDueDateLogic();
});

export async function runDueDateLogic(targetLineUserId?: string) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const runKey = todayStr;

    // Query 1: Due soon (tomorrow)
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // Query Docs
    // If targetLineUserId is set (Test Mode), filter strictly.
    // Otherwise scan all businesses (In prod, would need collectionGroup or partitioned queries for scale)
    // For MVP, we'll traverse known active users or use collectionGroup 'documents'.

    // NOTE: collectionGroup query requires index.
    // We will assume 'documents' collection group exists.

    const query = DB.collectionGroup('documents')
        .where('status', 'in', ['ISSUED', 'DLVR', 'READ']) // Using known states 
        .where('issueDate', '<=', tomorrowStr);
    // Note: Real due date logic might depend on 'dueDate' field if exists, 
    // else assume Issue Date + X. Assuming 'dueDate' exists on doc.
    // If not, we skip.

    // For this implementation, we assume we want to remind logic based on `dueDate`.
    // Let's assume standard 'dueDate' field exists.

    const snap = await query.get();
    let sentCount = 0;

    for (const doc of snap.docs) {
        const data = doc.data();

        // Filter manually for complexity not covered by index
        if (!data.dueDate && !data.issueDate) continue;
        const targetDate = data.dueDate || data.issueDate;

        // Reminder Logic:
        // 1. Due is today or tomorrow OR older (overdue)
        // 2. Not paid
        if (data.paymentStatus === 'PAID') continue;

        // Parent resolve (to get lineUserId)
        // This is expensive: doc -> business -> user. 
        // Better: store creatorLineId on doc (Added in Phase 5.5).
        const lineUserId = data.creatorLineId;
        if (!lineUserId) continue;

        // Test Mode Filter
        if (targetLineUserId && lineUserId !== targetLineUserId) continue;

        // Idempotency Check
        if (await checkIdempotency('dueDate', runKey, doc.id)) continue;

        // Rate Limit (Simple Cap per user)
        // (Skipped for brevity, but should be here)

        try {
            const msg = buildDueDateReminderHelper(data.docNo, data.customerSnapshot?.displayName || 'ลูกค้า', targetDate, data.money?.total_amount || 0);
            await sendLineFlex(lineUserId, msg);
            sentCount++;

            // Audit
            await DB.collection('auditLogs').add({
                type: 'AUTOMATION_REMINDER',
                subtype: 'DUE_DATE',
                docId: doc.id,
                lineUserId,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } catch (e) {
            console.error(`Failed to send reminder for ${doc.id}`, e);
        }
    }

    console.log(`[DueDate] Processed. Sent: ${sentCount}`);
    return sentCount;
}

// ----------------------------------------------------------------------------
// 2. Unpaid Follow-up (Every 3 days 10:00 BKK)
// ----------------------------------------------------------------------------

export const unpaidFollowup = onSchedule({
    schedule: '0 10 */3 * *',
    timeZone: 'Asia/Bangkok',
    region: 'asia-southeast1',
    memory: '256MiB',
    secrets: ['LINE_CHANNEL_ACCESS_TOKEN'],
    invoker: 'private', // Only Cloud Scheduler can invoke
}, async (_event) => {
    void _event;
    console.log('Starting unpaidFollowup...');
    await runUnpaidLogic();
});

export async function runUnpaidLogic(targetLineUserId?: string) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const runKey = `Unpaid_${todayStr}`;

    // Target: Delivered/Read but NOT Paid.
    // Last follow up > 3 days ago.

    const snap = await DB.collectionGroup('documents')
        .where('status', 'in', ['DLVR', 'READ']) // Assuming these maps to DELIVERED/READ
        // .where('paymentStatus', '!=', 'PAID') // Index Requirement
        .get();

    let sentCount = 0;

    for (const doc of snap.docs) {
        const data = doc.data();
        if (data.paymentStatus === 'PAID') continue;

        const lineUserId = data.creatorLineId;
        if (!lineUserId) continue;
        if (targetLineUserId && lineUserId !== targetLineUserId) continue;

        // Check last follow up
        if (data.lastFollowupAt) {
            const last = data.lastFollowupAt.toDate();
            const diff = Date.now() - last.getTime();
            if (diff < 1000 * 60 * 60 * 72) continue; // Skip if < 72h
        }

        if (await checkIdempotency('unpaid', runKey, doc.id)) continue;

        try {
            const msg = buildUnpaidFollowupHelper(data.docNo, data.customerSnapshot?.displayName || '-', data.money?.net_receive_amount || 0);
            await sendLineFlex(lineUserId, msg);

            // Update Doc
            await doc.ref.update({
                lastFollowupAt: admin.firestore.FieldValue.serverTimestamp()
            });

            sentCount++;
        } catch (e) {
            console.error(`Failed unpaid follow up ${doc.id}`, e);
        }
    }

    console.log(`[Unpaid] Processed. Sent: ${sentCount}`);
    return sentCount;
}

// ----------------------------------------------------------------------------
// 3. Cleanup Expired States & Drafts (Daily 02:00 BKK)
// ----------------------------------------------------------------------------

/**
 * Cleanup expired conversation states and drafts
 * Runs daily at 02:00 BKK to remove expired documents
 * 
 * Rationale: Auto-clear on read is sufficient for active users, but expired
 * documents accumulate for inactive users. Scheduled cleanup prevents unbounded
 * growth in Firestore.
 */
export const cleanupExpiredStates = onSchedule({
    schedule: '0 2 * * *', // 02:00 daily
    timeZone: 'Asia/Bangkok',
    region: 'asia-southeast1',
    memory: '256MiB',
    invoker: 'private', // Only Cloud Scheduler can invoke
}, async (_event) => {
    void _event;
    console.log('Starting cleanupExpiredStates...');
    await runCleanupExpiredStates();
});

export async function runCleanupExpiredStates(): Promise<number> {
    const now = Date.now();
    let deletedCount = 0;

    // Cleanup expired conversation states
    const statesQuery = await DB.collectionGroup('conversation_state')
        .where('expiresAt', '<=', admin.firestore.Timestamp.fromMillis(now))
        .limit(500)
        .get();

    for (const doc of statesQuery.docs) {
        try {
            await doc.ref.delete();
            deletedCount++;
        } catch (err) {
            console.error(`Failed to delete expired state ${doc.id}:`, err);
        }
    }

    // Cleanup expired drafts
    const draftsQuery = await DB.collection('line_drafts')
        .where('expiresAt', '<=', admin.firestore.Timestamp.fromMillis(now))
        .limit(500)
        .get();

    for (const doc of draftsQuery.docs) {
        try {
            await doc.ref.delete();
            deletedCount++;
        } catch (err) {
            console.error(`Failed to delete expired draft ${doc.id}:`, err);
        }
    }

    console.log(`[CleanupExpiredStates] Deleted ${deletedCount} expired documents`);
    return deletedCount;
}
