import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Auto-Nudge Service
 * 
 * Polite, smart reminder system for users with incomplete business setup.
 * 
 * Rules:
 * - Max once per 24 hours
 * - Max 3 nudges total
 * - Only if user has interacted before
 * - Only if NOT currently in wizard
 * - Fully idempotent
 */

import * as admin from 'firebase-admin';
import { pushLineMessage } from './lineService';

const db = getDb();

interface NudgeState {
  lastNudgeAt: admin.firestore.Timestamp | null;
  nudgeCount: number;
}

/**
 * Check if user should receive a nudge
 */
export async function shouldNudgeUser(userId: string): Promise<boolean> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    return false; // New user, not eligible yet
  }

  const data = userDoc.data();
  const nudgeState: NudgeState = {
    lastNudgeAt: data?.lastNudgeAt || null,
    nudgeCount: data?.nudgeCount || 0,
  };

  // Max 3 nudges total
  if (nudgeState.nudgeCount >= 3) {
    return false;
  }

  // Check 24-hour cooldown
  if (nudgeState.lastNudgeAt) {
    const lastNudgeDate = nudgeState.lastNudgeAt.toDate();
    const now = new Date();
    const hoursSinceLastNudge = (now.getTime() - lastNudgeDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastNudge < 24) {
      return false; // Too soon
    }
  }

  // Check if user is in wizard (don't nudge during active wizard)
  const { getWizardState } = await import('./wizardService');
  const wizardState = await getWizardState(userId);
  if (wizardState && wizardState.step && wizardState.step !== 'COMPLETE') {
    return false; // User is in wizard, don't interrupt
  }

  // Check if business setup is incomplete
  const { getBusinessChecklist } = await import('./businessService');
  const { getLineLink } = await import('../core/lineLinkService');

  const lineLink = await getLineLink(userId);
  if (!lineLink || !lineLink.businessId) {
    return false; // No business linked
  }

  const checklist = await getBusinessChecklist(userId, lineLink.businessId);
  const criticalFields = ['name', 'address', 'phone'];
  const missingFields = checklist.items.filter(
    item => criticalFields.includes(item.field) && !item.completed
  );

  // Only nudge if setup is incomplete
  return missingFields.length > 0;
}

/**
 * Send nudge message to user
 */
export async function sendNudge(userId: string, lineUserId: string, accessToken: string): Promise<void> {
  const nudgeMessage = `ติ๊ดๆ ยังตั้งค่าธุรกิจไม่เสร็จนะครับเจ้านาย ตั้งค่าต่อได้เลยนะครับ`;

  // Use contextual Quick Reply (INCOMPLETE_SETUP or GLOBAL)
  const { determineQuickReplyContext, getContextualQuickReply } = await import('../shared/contextualQuickReply');
  const { getLineLink } = await import('../core/lineLinkService');

  const lineLink = await getLineLink(lineUserId);
  if (!lineLink || !lineLink.businessId) {
    return; // Can't determine context
  }

  // CRITICAL: Get payment state to ensure deterministic payment flow
  const { getPaymentStateParam } = await import('../utils/paymentStateMapper');
  const paymentStateParam = await getPaymentStateParam(userId);

  const contextParams = await determineQuickReplyContext({
    userId,
    businessId: lineLink.businessId,
    paymentState: paymentStateParam, // CRITICAL: Send payment state
    // traceId not available in nudge context
  });

  // Override to show business setup button prominently
  const buttons = getContextualQuickReply({
    context: 'INCOMPLETE_SETUP',
    missingFields: contextParams.missingFields || [],
  });

  // Send message with Quick Reply
  await pushLineMessage(lineUserId, nudgeMessage, accessToken, buttons);

  // Update nudge state
  await db.collection('users').doc(userId).update({
    lastNudgeAt: admin.firestore.FieldValue.serverTimestamp(),
    nudgeCount: admin.firestore.FieldValue.increment(1),
  });

  console.log(`[NUDGE] Sent nudge to user ${userId} (count: ${(await db.collection('users').doc(userId).get()).data()?.nudgeCount || 0})`);
}

/**
 * Process all eligible users for nudging
 * Called by scheduled function
 */
export async function processNudges(accessToken: string): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  // Get all users who have interacted (have lineUserId)
  const usersSnapshot = await db.collection('users')
    .where('lineUserId', '!=', null)
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
      const shouldNudge = await shouldNudgeUser(userId);
      if (shouldNudge) {
        await sendNudge(userId, lineUserId, accessToken);
        sent++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[NUDGE] Error processing user ${userId}:`, err);
      skipped++;
    }
  }

  console.log(`[NUDGE] Processed: ${sent} sent, ${skipped} skipped`);
  return { sent, skipped };
}
