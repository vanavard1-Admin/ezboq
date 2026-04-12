import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - 7-Day Retention Flow
 * 
 * Lightweight engagement flow for users after onboarding.
 * 
 * Principles:
 * - Helpful, not salesy
 * - Context-aware
 * - Never more than 1 message per day
 * - Stop immediately if user becomes active
 * 
 * Flow:
 * - DAY 1: Encourage first document creation
 * - DAY 3: Reminder if no document created
 * - DAY 5: Feature awareness (invoice/receipt)
 * - DAY 7: Soft close
 */

import * as admin from 'firebase-admin';
import { pushLineMessage } from './lineService';
import { getContextualQuickReply } from '../shared/contextualQuickReply';

const db = getDb();

interface RetentionState {
  onboardingCompletedAt: admin.firestore.Timestamp | null;
  retentionMessagesSent: {
    day1?: admin.firestore.Timestamp;
    day3?: admin.firestore.Timestamp;
    day5?: admin.firestore.Timestamp;
    day7?: admin.firestore.Timestamp;
  };
  retentionFlowActive: boolean;
}

/**
 * Check if user should receive retention message
 */
export async function shouldSendRetentionMessage(
  userId: string,
  day: 1 | 3 | 5 | 7
): Promise<boolean> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    return false;
  }

  const data = userDoc.data();
  const retentionState: RetentionState = {
    onboardingCompletedAt: data?.onboardingCompletedAt || null,
    retentionMessagesSent: data?.retentionMessagesSent || {},
    retentionFlowActive: data?.retentionFlowActive !== false, // Default true
  };

  // Check if flow is still active
  if (!retentionState.retentionFlowActive) {
    return false;
  }

  // Check if user has become active (created any document)
  const { hasCreatedDocument } = await checkUserActivity(userId);
  if (hasCreatedDocument) {
    // User is active, deactivate retention flow
    await db.collection('users').doc(userId).update({
      retentionFlowActive: false,
    });
    return false;
  }

  // Check if onboarding was completed
  if (!retentionState.onboardingCompletedAt) {
    return false; // Not onboarded yet
  }

  // Check if message for this day was already sent
  const dayKey = `day${day}` as keyof typeof retentionState.retentionMessagesSent;
  if (retentionState.retentionMessagesSent[dayKey]) {
    return false; // Already sent
  }

  // Check if enough days have passed
  const onboardingDate = retentionState.onboardingCompletedAt.toDate();
  const now = new Date();
  const daysSinceOnboarding = Math.floor(
    (now.getTime() - onboardingDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceOnboarding >= day;
}

/**
 * Check if user has created any document (became active)
 */
async function checkUserActivity(userId: string): Promise<{ hasCreatedDocument: boolean }> {
  const { getLineLink } = await import('../core/lineLinkService');
  const lineLink = await getLineLink(userId);

  if (!lineLink || !lineLink.businessId) {
    return { hasCreatedDocument: false };
  }

  // Check if user has any documents
  const documentsSnapshot = await db
    .collection(`users/${userId}/businesses/${lineLink.businessId}/documents`)
    .limit(1)
    .get();

  return { hasCreatedDocument: !documentsSnapshot.empty };
}

/**
 * Send retention message for specific day
 */
export async function sendRetentionMessage(
  userId: string,
  lineUserId: string,
  day: 1 | 3 | 5 | 7,
  accessToken: string
): Promise<void> {
  let message = '';
  let context: 'SUCCESS' | 'GLOBAL' = 'GLOBAL';

  switch (day) {
    case 1:
      message = 'ถ้าพร้อมแล้ว ลองสร้างใบเสนอราคาแรกดูได้นะครับ\n\nใช้เวลาไม่ถึง 1 นาที';
      context = 'GLOBAL';
      break;

    case 3:
      message = 'EzDoc พร้อมช่วยออกเอกสารให้คุณเสมอ\n\nถ้ามีงานเข้ามา ลองใช้ดูได้เลยครับ';
      context = 'GLOBAL';
      break;

    case 5:
      message = 'รู้ไหมครับ EzDoc สามารถออกใบวางบิลและใบเสร็จได้ในแชทเดียว';
      context = 'GLOBAL';
      break;

    case 7:
      message = 'หากยังไม่ได้ใช้ตอนนี้ ไม่เป็นไรนะครับ\n\nEzDoc จะอยู่ตรงนี้เสมอเมื่อคุณต้องการ';
      context = 'GLOBAL';
      break;
  }

  // Use GLOBAL context Quick Reply
  const buttons = getContextualQuickReply({ context });

  await pushLineMessage(lineUserId, message, accessToken, buttons);

  // Mark as sent
  await db.collection('users').doc(userId).update({
    [`retentionMessagesSent.day${day}`]: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[RETENTION] Sent day ${day} message to user ${userId}`);
}

/**
 * Process retention messages for all eligible users
 * Called by scheduled function
 */
export async function processRetentionMessages(accessToken: string): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  // Get all users who have completed onboarding
  const usersSnapshot = await db.collection('users')
    .where('onboardingCompletedAt', '!=', null)
    .where('retentionFlowActive', '==', true)
    .limit(100) // Process in batches
    .get();

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const data = userDoc.data();
    const lineUserId = data?.lineUserId;

    if (!lineUserId) {
      skipped++;
      continue;
    }

    try {
      // Check each day (1, 3, 5, 7)
      let messageSent = false;
      for (const day of [1, 3, 5, 7] as const) {
        const shouldSend = await shouldSendRetentionMessage(userId, day);
        if (shouldSend) {
          await sendRetentionMessage(userId, lineUserId, day, accessToken);
          sent++;
          messageSent = true;
          break; // Only send one message per user per run
        }
      }

      // If no message was sent, mark as skipped
      if (!messageSent) {
        skipped++;
      }
    } catch (err) {
      console.error(`[RETENTION] Error processing user ${userId}:`, err);
      skipped++;
    }
  }

  console.log(`[RETENTION] Processed: ${sent} sent, ${skipped} skipped`);
  return { sent, skipped };
}

