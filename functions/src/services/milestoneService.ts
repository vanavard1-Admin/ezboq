import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - First-Time Success Experience
 * 
 * Tracks user milestones and triggers celebratory messages for first-time achievements.
 * 
 * Milestones:
 * - Business setup completed
 * - First quotation created
 * - First invoice issued
 * 
 * Rules:
 * - Trigger once per milestone
 * - Never repeat
 * - Store completion flags in userState
 */

import * as admin from 'firebase-admin';
import { pushLineMessage } from './lineService';
import { getContextualQuickReply } from '../shared/contextualQuickReply';

const db = getDb();

interface UserMilestones {
  businessSetupCompleted?: boolean;
  firstQuotationCreated?: boolean;
  firstInvoiceIssued?: boolean;
  milestonesCompletedAt?: {
    businessSetup?: admin.firestore.Timestamp;
    firstQuotation?: admin.firestore.Timestamp;
    firstInvoice?: admin.firestore.Timestamp;
  };
}

/**
 * Check and trigger milestone celebration
 */
export async function checkAndCelebrateMilestone(
  userId: string,
  lineUserId: string,
  milestone: 'businessSetup' | 'firstQuotation' | 'firstInvoice',
  accessToken: string
): Promise<boolean> {
  const userDoc = await db.collection('users').doc(userId).get();
  const currentMilestones: UserMilestones = userDoc.data()?.milestones || {};

  // Check if already completed
  const milestoneKey = milestone === 'businessSetup' ? 'businessSetupCompleted' :
                      milestone === 'firstQuotation' ? 'firstQuotationCreated' :
                      'firstInvoiceIssued';

  if (currentMilestones[milestoneKey]) {
    return false; // Already celebrated
  }

  // Mark as completed
  const updateData: any = {
    [`milestones.${milestoneKey}`]: true,
    [`milestones.milestonesCompletedAt.${milestone}`]: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('users').doc(userId).update(updateData);

  // Send celebratory message
  await sendMilestoneCelebration(userId, lineUserId, milestone, accessToken);

  return true;
}

/**
 * Send celebratory message for milestone
 */
async function sendMilestoneCelebration(
  userId: string,
  lineUserId: string,
  milestone: 'businessSetup' | 'firstQuotation' | 'firstInvoice',
  accessToken: string
): Promise<void> {
  let message = '';
  let context: 'SUCCESS' | 'GLOBAL' = 'SUCCESS';

  switch (milestone) {
    case 'businessSetup':
      message = 'เรียบร้อยแล้ว 🎉\n\nตั้งค่าธุรกิจเสร็จสมบูรณ์ พร้อมใช้งาน EzDoc ได้ทันที';
      context = 'SUCCESS';
      break;

    case 'firstQuotation':
      message = 'สำเร็จแล้ว ✨\n\nสร้างใบเสนอราคาแรกเสร็จแล้ว พร้อมส่งให้ลูกค้าได้เลย';
      context = 'SUCCESS';
      break;

    case 'firstInvoice':
      message = 'เรียบร้อยแล้ว 🎉\n\nออกใบวางบิลแรกเสร็จแล้ว ระบบพร้อมใช้งานเต็มรูปแบบ';
      context = 'SUCCESS';
      break;
  }

  // Use SUCCESS context Quick Reply
  const buttons = getContextualQuickReply({ context });

  await pushLineMessage(lineUserId, message, accessToken, buttons);

  console.log(`[MILESTONE] Celebrated ${milestone} for user ${userId}`);
}

/**
 * Get user milestones status
 */
export async function getUserMilestones(userId: string): Promise<UserMilestones> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    return {};
  }
  return userDoc.data()?.milestones || {};
}

/**
 * Check if milestone is already completed
 */
export async function isMilestoneCompleted(
  userId: string,
  milestone: 'businessSetup' | 'firstQuotation' | 'firstInvoice'
): Promise<boolean> {
  const milestones = await getUserMilestones(userId);
  const milestoneKey = milestone === 'businessSetup' ? 'businessSetupCompleted' :
                      milestone === 'firstQuotation' ? 'firstQuotationCreated' :
                      'firstInvoiceIssued';
  return milestones[milestoneKey] || false;
}

