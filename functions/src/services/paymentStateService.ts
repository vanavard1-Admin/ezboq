/**
 * Payment State Service
 * 
 * Manages payment flow state detection and guards
 * 
 * CRITICAL: Payment flow must NEVER go silent
 * Payment flow must NEVER fall into fallback
 */

import { hasRecentPendingPurchase, type CreditPurchase } from "./purchaseService";

const ACTIVE_PAYMENT_LOOKBACK_MINUTES = 7 * 24 * 60;

/**
 * Payment states
 */
export type PaymentState = 
  | 'NO_PAYMENT'           // No active payment
  | 'WAITING_FOR_SLIP'     // QR sent, waiting for slip
  | 'PROCESSING_PAYMENT'   // Slip received, OCR in progress
  | 'PENDING_REVIEW';      // OCR unclear, admin review needed

/**
 * Get current payment state for user
 */
export async function getPaymentState(userId: string): Promise<PaymentState> {
  try {
    // Check for recent purchase (within 15 minutes)
    const recentPurchase = await hasRecentPendingPurchase(userId, ACTIVE_PAYMENT_LOOKBACK_MINUTES);
    
    if (!recentPurchase) {
      return 'NO_PAYMENT';
    }
    
    const purchase = recentPurchase.purchase as CreditPurchase;
    const status = purchase.status;
    
    switch (status) {
      case 'WAITING_FOR_SLIP':
        if (purchase.slipReceivedAt && !purchase.slip_image_url) {
          return 'PROCESSING_PAYMENT';
        }
        return 'WAITING_FOR_SLIP';
      
      case 'PENDING_REVIEW':
        if (!purchase.slip_ocr_raw_text && !purchase.verified_by) {
          return 'PROCESSING_PAYMENT';
        }
        return 'PENDING_REVIEW';
      
      case 'PAID':
      case 'EXPIRED':
      case 'FAILED':
      case 'REJECTED':
        // Payment completed or failed - no longer in payment flow
        return 'NO_PAYMENT';
      
      case 'PENDING':
        // QR not yet sent - still waiting
        return 'WAITING_FOR_SLIP';
      
      default:
        return 'NO_PAYMENT';
    }
  } catch (error) {
    console.error(`[paymentStateService] Error getting payment state for userId=${userId}:`, error);
    // On error, assume no payment (safe default)
    return 'NO_PAYMENT';
  }
}

/**
 * Check if user is in payment flow
 */
export async function isInPaymentFlow(userId: string): Promise<boolean> {
  const state = await getPaymentState(userId);
  return state !== 'NO_PAYMENT';
}

/**
 * Get payment-aware message for current state
 */
export async function getPaymentStatusMessage(userId: string): Promise<string | null> {
  const state = await getPaymentState(userId);
  
  switch (state) {
    case 'WAITING_FOR_SLIP':
      return `ติ๊ดๆ ตอนนี้กำลังรอสลิปอยู่นะเจ้านาย\nส่งสลิปเป็นรูปภาพในแชทนี้ได้เลยครับ`;

    case 'PROCESSING_PAYMENT': {
      const info = await getRecentPurchaseInfo(userId);
      const refLine = info?.purchaseId ? `\nRef: ${info.purchaseId}` : '';
      if (info?.slipUploadMissing) {
        return `ติ๊ดๆ ระบบต้องการรูปสลิปเดิมอีกครั้งนะครับ\n🚫 ไม่ต้องโอนซ้ำ ส่งรูปสลิปเดิมในแชทนี้ได้เลยครับ${refLine}`;
      }
      return `ติ๊ดๆ กำลังตรวจสอบการชำระเงินอยู่นะครับเจ้านาย\nเดี๋ยวแจ้งผลให้ทันทีครับ 🙂${refLine}`;
    }

    case 'PENDING_REVIEW': {
      const info = await getRecentPurchaseInfo(userId);
      const refLine = info?.purchaseId ? `\nRef: ${info.purchaseId}` : '';
      return `ติ๊ดๆ อยู่ระหว่างตรวจสอบโดยแอดมินนะครับเจ้านาย\nปกติใช้เวลาไม่นาน 🚫 ไม่ต้องโอนซ้ำครับ${refLine}`;
    }

    default:
      return null;
  }
}

/**
 * Get recent purchase info (for logging)
 */
export async function getRecentPurchaseInfo(userId: string): Promise<{
  purchaseId: string | null;
  status: string | null;
  amount: number | null;
  slipUploadMissing: boolean;
} | null> {
  try {
    const recentPurchase = await hasRecentPendingPurchase(userId, ACTIVE_PAYMENT_LOOKBACK_MINUTES);
    
    if (!recentPurchase) {
      return null;
    }
    
    const purchase = recentPurchase.purchase as CreditPurchase;
    
    return {
      purchaseId: recentPurchase.purchaseId,
      status: purchase.status,
      amount: purchase.amount,
      slipUploadMissing: Boolean(purchase.slip_upload_missing && purchase.slipReceivedAt && !purchase.slip_image_url),
    };
  } catch (error) {
    console.error(`[paymentStateService] Error getting purchase info:`, error);
    return null;
  }
}
