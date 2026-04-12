import { getDb } from '../core/firebaseAdmin';
/**
 * Upgrade Success Notification Service
 * 
 * Sends LINE message when user upgrades to PRO or TEAM (first time only)
 * 
 * RULES:
 * - First time upgrade only (not renewals)
 * - Calm, reassuring, professional tone
 * - Never repeat on renewals
 */

import * as admin from "firebase-admin";
import { pushLineMessage } from "./lineService";
import { getUpgradeSuccessButtons } from "../ui/quickReplies";

const db = getDb();

/**
 * Check if this is first-time upgrade
 */
async function isFirstTimeUpgrade(
  userId: string,
  newPlan: 'PRO' | 'TEAM'
): Promise<boolean> {
  const db = getDb();

  // Check if user has ever had this plan before
  const subscriptionRef = db.collection('subscriptions').doc(userId);
  const subSnap = await subscriptionRef.get();

  if (!subSnap.exists) {
    return true; // New subscription = first time
  }

  // Check upgrade history
  const historyRef = subscriptionRef.collection('upgrade_history');
  const historySnap = await historyRef
    .where('plan', '==', newPlan)
    .limit(1)
    .get();

  // If no history, this is first time
  if (historySnap.empty) {
    return true;
  }

  return false;
}

/**
 * Record upgrade in history
 */
async function recordUpgrade(
  userId: string,
  plan: 'PRO' | 'TEAM'
): Promise<void> {
  const db = getDb();
  const subscriptionRef = db.collection('subscriptions').doc(userId);

  await subscriptionRef.collection('upgrade_history').add({
    plan,
    upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Send upgrade success message
 */
export async function sendUpgradeSuccessMessage(
  userId: string,
  plan: 'PRO' | 'TEAM'
): Promise<void> {
  // Check if first time
  const isFirstTime = await isFirstTimeUpgrade(userId, plan);

  if (!isFirstTime) {
    console.log(`[upgradeSuccess] Not first time upgrade, skipping message for userId=${userId}, plan=${plan}`);
    return;
  }

  // Get LINE userId
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    console.log(`[upgradeSuccess] User not found: ${userId}`);
    return;
  }

  const userData = userDoc.data()!;
  const lineUserId = userData.lineUserId || userData.line_user_id;

  if (!lineUserId) {
    console.log(`[upgradeSuccess] No LINE account linked for userId=${userId}`);
    return;
  }

  // Plan-specific message
  const message = `บี๊บ! อัปเกรดเรียบร้อยแล้วครับเจ้านาย 🎉

ตอนนี้ออกเอกสารได้ครบทุกขั้นตอนแล้วนะครับ`;

  // Quick Reply buttons (REFACTORED: Use ui/quickReplies.ts)
  const quickReply = getUpgradeSuccessButtons();

  // Send message
  await pushLineMessage(lineUserId, message, undefined, quickReply);

  // Record upgrade
  await recordUpgrade(userId, plan);

  console.log(`[upgradeSuccess] ✅ Sent upgrade success message to userId=${userId}, plan=${plan}`);
}
