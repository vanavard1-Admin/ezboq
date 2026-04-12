import { getDb } from '../core/firebaseAdmin';
/**
 * Upgrade Prompts Service
 * 
 * Handles value-moment upgrade prompts (FREE users only)
 * 
 * RULES:
 * - Only trigger at value-realized moments
 * - Never interrupt work mid-flow
 * - Calm, informational, optional tone
 * - Never auto-open payment screens
 */

import * as admin from "firebase-admin";
import { getUserPlan } from '../core/planService';
import type { QuickReplyAction } from '../shared/lineQuickReply';

/**
 * Value moments when upgrade prompts are allowed
 */
export enum UpgradeMoment {
  FIRST_QUOTATION_COMPLETE = 'FIRST_QUOTATION_COMPLETE',
  VIEW_PDF_WITH_WATERMARK = 'VIEW_PDF_WITH_WATERMARK',
  MONTHLY_LIMIT_REACHED = 'MONTHLY_LIMIT_REACHED',
}

/**
 * Check if user has already seen upgrade prompt for this moment
 */
async function hasSeenUpgradePrompt(
  userId: string,
  moment: UpgradeMoment
): Promise<boolean> {
  const db = getDb();
  const promptRef = db
    .collection('users')
    .doc(userId)
    .collection('upgrade_prompts')
    .doc(moment);

  const snap = await promptRef.get();
  return snap.exists;
}

/**
 * Mark upgrade prompt as seen
 */
async function markUpgradePromptSeen(
  userId: string,
  moment: UpgradeMoment
): Promise<void> {
  const db = getDb();
  const promptRef = db
    .collection('users')
    .doc(userId)
    .collection('upgrade_prompts')
    .doc(moment);

  await promptRef.set({
    seen: true,
    seenAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Check if user should see upgrade prompt
 */
export async function shouldShowUpgradePrompt(
  userId: string,
  moment: UpgradeMoment
): Promise<boolean> {
  const plan = await getUserPlan(userId);

  // Only show to FREE users
  if (plan !== 'FREE') {
    return false;
  }

  // Check if already seen
  const hasSeen = await hasSeenUpgradePrompt(userId, moment);
  if (hasSeen) {
    return false;
  }

  return true;
}

/**
 * Get upgrade prompt message and buttons
 */
export function getUpgradePrompt(moment: UpgradeMoment): {
  message: string;
  buttons: QuickReplyAction[];
} {
  switch (moment) {
    case UpgradeMoment.FIRST_QUOTATION_COMPLETE:
      return {
        message: `บี๊บ! ถ้าอยากให้เอกสารดูเป็นทางการขึ้น แพ็ก 99 ช่วยได้เลยนะครับเจ้านาย

ไม่มีลายน้ำ ใช้โลโก้และลายเซ็นได้ ครบ flow ใบวางบิลกับใบเสร็จด้วยครับ`,
        buttons: [
          {
            type: "action",
            action: {
              type: "message",
              label: "ดูรายละเอียดแพ็ก",
              text: "ซื้อแพ็ค 99",
            },
          },
          {
            type: "action",
            action: {
              type: "message",
              label: "ยังไม่ตอนนี้",
              text: "ยังไม่ตอนนี้",
            },
          },
        ],
      };

    case UpgradeMoment.VIEW_PDF_WITH_WATERMARK:
      return {
        message: `ติ๊ดๆ ลายน้ำจะหายไปเมื่ออัปเกรดเป็นแพ็ก 99 ครับเจ้านาย

แพ็ก 99 ใช้โลโก้ ลายเซ็นได้ ครบ flow ใบวางบิลกับใบเสร็จ ไม่จำกัดจำนวนเอกสารด้วยครับ`,
        buttons: [
          {
            type: "action",
            action: {
              type: "message",
              label: "ซื้อแพ็ค 99",
              text: "ซื้อแพ็ค 99",
            },
          },
          {
            type: "action",
            action: {
              type: "message",
              label: "ยังไม่ตอนนี้",
              text: "ยังไม่ตอนนี้",
            },
          },
        ],
      };

    case UpgradeMoment.MONTHLY_LIMIT_REACHED:
      return {
        message: `โอ๊ะ! เดือนนี้เจ้านายใช้เอกสารครบ 5 ใบแล้วครับ

แพ็ก 99 ไม่จำกัดจำนวนเอกสาร ครบ flow ใบวางบิลกับใบเสร็จ ไม่มีลายน้ำด้วยครับ`,
        buttons: [
          {
            type: "action",
            action: {
              type: "message",
              label: "ซื้อแพ็ค 99",
              text: "ซื้อแพ็ค 99",
            },
          },
          {
            type: "action",
            action: {
              type: "message",
              label: "รอเดือนหน้า",
              text: "รอเดือนหน้า",
            },
          },
        ],
      };

    default:
      return {
        message: '',
        buttons: [],
      };
  }
}

/**
 * Show upgrade prompt and mark as seen
 */
export async function showUpgradePrompt(
  userId: string,
  moment: UpgradeMoment,
  sendMessage: (message: string, buttons?: QuickReplyAction[]) => Promise<void>
): Promise<void> {
  const shouldShow = await shouldShowUpgradePrompt(userId, moment);

  if (!shouldShow) {
    return;
  }

  const { message, buttons } = getUpgradePrompt(moment);

  await sendMessage(message, buttons);

  // Mark as seen (non-blocking)
  markUpgradePromptSeen(userId, moment).catch(err => {
    console.error(`[upgradePrompts] Failed to mark prompt as seen:`, err);
  });
}
