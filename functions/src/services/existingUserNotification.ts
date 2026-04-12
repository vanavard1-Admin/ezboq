import { getDb } from '../core/firebaseAdmin';
/**
 * Existing User Notification Service
 * 
 * Notifies existing paid users about pricing improvement
 * 
 * RULES:
 * - Informative, appreciative, non-promotional
 * - No CTA, no upgrade buttons, no urgency
 * - One-time notification only
 */

import * as admin from "firebase-admin";
import { normalizePlan } from '../core/planService';
import { pushLineMessage } from "./lineService";

/**
 * Check if user has been notified about pricing update
 */
async function hasBeenNotified(userId: string): Promise<boolean> {
  const db = getDb();
  const notificationRef = db
    .collection('users')
    .doc(userId)
    .collection('notifications')
    .doc('pricing_update_2024');

  const snap = await notificationRef.get();
  return snap.exists;
}

/**
 * Mark user as notified
 */
async function markAsNotified(userId: string): Promise<void> {
  const db = getDb();
  const notificationRef = db
    .collection('users')
    .doc(userId)
    .collection('notifications')
    .doc('pricing_update_2024');

  await notificationRef.set({
    notified: true,
    notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Send pricing update notification to existing paid users
 */
export async function notifyExistingPaidUsers(): Promise<void> {
  const db = getDb();

  // Get all subscriptions with paid plans
  const subscriptionsRef = db.collection('subscriptions');
  const subscriptionsSnap = await subscriptionsRef.get();

  let notifiedCount = 0;
  let skippedCount = 0;

  for (const subDoc of subscriptionsSnap.docs) {
    const subscription = subDoc.data();
    const userId = subscription.uid || subDoc.id;
    const periodEnd = subscription.periodEnd as { toMillis(): number } | undefined;
    const isActive =
      normalizePlan(subscription.plan || 'FREE') !== 'FREE' &&
      subscription.status === 'ACTIVE' &&
      periodEnd &&
      periodEnd.toMillis() > Date.now();

    if (!isActive) {
      continue;
    }

    const plan = normalizePlan(subscription.plan || 'FREE');

    // Only notify PRO and TEAM users
    if (plan !== 'PRO' && plan !== 'TEAM') {
      continue;
    }

    // Check if already notified
    const alreadyNotified = await hasBeenNotified(userId);
    if (alreadyNotified) {
      skippedCount++;
      continue;
    }

    // Get LINE userId
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      continue;
    }

    const userData = userDoc.data()!;
    const lineUserId = userData.lineUserId || userData.line_user_id;

    if (!lineUserId) {
      continue;
    }

    // Send notification
    try {
      const planName = plan === 'PRO' ? '99' : '279';
      const message = `บี๊บ! ปรับแพ็กเกจให้ใช้งานง่ายขึ้นนะครับเจ้านาย

ตอนนี้แพ็ก ${planName} ออกเอกสารได้ครบทุกขั้นตอนแล้วครับ`;

      await pushLineMessage(lineUserId, message);

      // Mark as notified
      await markAsNotified(userId);
      notifiedCount++;

      console.log(`[existingUserNotification] ✅ Notified userId=${userId}, plan=${plan}`);
    } catch (error) {
      console.error(`[existingUserNotification] ❌ Failed to notify userId=${userId}:`, error);
    }
  }

  console.log(`[existingUserNotification] Complete: notified=${notifiedCount}, skipped=${skippedCount}`);
}
