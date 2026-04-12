/**
 * Payment UX Copy Service
 *
 * Centralized payment flow messages — calm, ด๊อกๆ character
 *
 * CRITICAL RULES:
 * - Tone: สุภาพ, ใจเย็น, ไม่โทษใคร
 * - Never use: error, ผิดพลาด, ไม่สำเร็จ
 * - All messages must be calm and confidence-preserving
 */

import type { QuickReplyAction } from '../shared/lineQuickReply';
import { getManualSlipReview } from '../shared/config';

export function getSlipReceivedMessage(purchaseId?: string): string {
  const refLine = purchaseId ? `\nRef ${purchaseId}` : '';
  if (getManualSlipReview()) {
    return `ติ๊ดๆ รับสลิปแล้วครับเจ้านาย อยู่ระหว่างตรวจสอบโดยทีมงาน โดยปกติภายใน 1 ชั่วโมง ไม่ต้องโอนซ้ำนะ${refLine}`;
  }
  return `ติ๊ดๆ รับสลิปแล้วครับเจ้านาย กำลังตรวจสอบ ใช้เวลาไม่เกิน 1 นาที ไม่ต้องโอนซ้ำนะ${refLine}`;
}

export function getPaymentSuccessMessage(planName: string = 'Pro'): string {
  return `เรียนแจ้งว่า EzDOC ได้รับการชำระเงินค่าสมาชิกเรียบร้อยแล้ว และได้เปิดใช้งานแพ็กเกจ ${planName} ให้กับบัญชีของคุณเป็นที่เรียบร้อยแล้วครับ`;
}

export function getPaymentThankYouMessage(): string {
  return `EzDOC ขอขอบพระคุณอย่างจริงใจที่มอบความไว้วางใจให้เราได้ดูแลงานเอกสารของคุณ การสนับสนุนของคุณไม่เพียงช่วยให้บริการนี้เดินหน้าต่อได้ แต่ยังเป็นกำลังใจสำคัญให้ทีมงานตั้งใจพัฒนา EzDOC ให้ดียิ่งขึ้นในทุกวันครับ`;
}

export function getPaymentSuccessQuickReply(): QuickReplyAction[] {
  const { getPaymentSuccessButtons } = require('../ui/quickReplies');
  return getPaymentSuccessButtons();
}

export function getOcrDelayMessage(purchaseId?: string): string {
  const refLine = purchaseId ? `\nRef ${purchaseId}` : '';
  return `ติ๊ดๆ ยังตรวจสอบอยู่นะครับเจ้านาย ไม่ต้องโอนซ้ำ เดี๋ยวแจ้งผลให้ทราบ${refLine}`;
}

export function getPaymentFailureMessage(): string {
  return `โอ๊ะ! ระบบอ่านข้อมูลจากสลิปยังไม่ครบครับ อาจเป็นเพราะภาพไม่ชัดหรือแสงสะท้อน ลองส่งสลิปใหม่ได้นะเจ้านาย`;
}

export function getPaymentRetryQuickReply(): QuickReplyAction[] {
  const { getPaymentRetryButtons } = require('../ui/quickReplies');
  return getPaymentRetryButtons();
}

export function getMaxRetriesReachedMessage(): string {
  return `ติ๊ดๆ ถ้ายังอ่านไม่ครบ แอดมินช่วยตรวจสอบให้ได้นะครับเจ้านาย พิมพ์ "รายงานปัญหา" ได้เลย`;
}

export function getProcessingPaymentMessage(): string {
  return `ติ๊ดๆ กำลังตรวจสอบการชำระเงินอยู่นะครับเจ้านาย รอสักครู่`;
}

export function getWaitingForSlipMessage(): string {
  return `ติ๊ดๆ ตอนนี้กำลังรอสลิปนะเจ้านาย ส่งสลิปเป็นรูปภาพในแชทนี้ได้เลยครับ`;
}

export function getGlobalFallbackMessage(): string {
  return `บี๊บ! ด๊อกๆ ช่วยต่อให้ได้นะครับเจ้านาย 😊 พิมพ์ "เมนู" ได้เลย`;
}

export function getPaymentPendingQuickReply(): QuickReplyAction[] {
  const { getPaymentPendingButtons } = require('../ui/quickReplies');
  return getPaymentPendingButtons();
}

export function getPaymentPendingReviewQuickReply(): QuickReplyAction[] {
  const { getPaymentPendingReviewButtons } = require('../ui/quickReplies');
  return getPaymentPendingReviewButtons();
}
