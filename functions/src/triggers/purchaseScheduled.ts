/**
 * EzDoc - Purchase Scheduled Triggers
 * 
 * Scheduled functions for credit purchase lifecycle:
 * - Expire pending purchases after 15 minutes
 * - Send reminders at 10 minutes
 * - Daily reconciliation report at 00:05
 */

import { pubsub as pubsubV1 } from 'firebase-functions/v1';

/**
 * Expire pending purchases
 * Runs every 1 minute
 */
export const expirePendingPurchases = pubsubV1
  .schedule('every 1 minutes')
  .timeZone('Asia/Bangkok')
  .onRun(async () => {
    try {
      const { expirePendingPurchases: expireFunc } = await import('../services/purchaseService');
      const count = await expireFunc();
      
      if (count > 0) {
        console.log(`[expirePendingPurchases] Expired ${count} purchases`);
      }
    } catch (error) {
      console.error('[expirePendingPurchases] Error:', error);
    }
    
    return null;
  });

/**
 * Send payment reminders
 * Runs every 1 minute
 */
export const remindPendingPurchases = pubsubV1
  .schedule('every 1 minutes')
  .timeZone('Asia/Bangkok')
  .onRun(async () => {
    try {
      const { sendPendingReminders } = await import('../services/purchaseService');
      const count = await sendPendingReminders();
      
      if (count > 0) {
        console.log(`[remindPendingPurchases] Sent ${count} reminders`);
      }
    } catch (error) {
      console.error('[remindPendingPurchases] Error:', error);
    }
    
    return null;
  });

/**
 * Daily reconciliation report
 * Runs every day at 00:05 Asia/Bangkok
 */
export const dailyReconciliationReport = pubsubV1
  .schedule('5 0 * * *') // 00:05 daily
  .timeZone('Asia/Bangkok')
  .onRun(async () => {
    try {
      const { pushDailyReconciliationReport } = await import('../services/reconciliationService');
      await pushDailyReconciliationReport();
      console.log('[dailyReconciliationReport] Report sent successfully');
    } catch (error) {
      console.error('[dailyReconciliationReport] Error:', error);
    }
    
    return null;
  });

/**
 * Check for OCR delays and send holding messages
 * Runs every 1 minute (Cloud Scheduler minimum interval)
 * 
 * CRITICAL: This ensures users are never left in silence during OCR processing
 */
export const checkOcrDelay = pubsubV1
  .schedule('* * * * *') // Every 1 minute (Cloud Scheduler doesn't support seconds)
  .timeZone('Asia/Bangkok')
  .onRun(async () => {
    try {
      const { checkAndNotifyOcrDelay } = await import('../services/paymentOcrDelayService');
      const count = await checkAndNotifyOcrDelay();
      
      if (count > 0) {
        console.log(`[checkOcrDelay] Notified ${count} users of OCR delay`);
      }
    } catch (error) {
      console.error('[checkOcrDelay] Error:', error);
    }
    
    return null;
  });
