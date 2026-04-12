/**
 * EzDoc - Payment Watchdog Scheduled Trigger
 * 
 * Runs every 1 minute to reconcile stuck payment states.
 * 
 * This ensures:
 * - PAID purchases get credits applied within <= 2 watchdog cycles (2 minutes)
 * - PENDING_REVIEW purchases older than 3 minutes get OCR retried or routed to review
 * - No purchase gets stuck in an inconsistent state
 */

import { pubsub as pubsubV1 } from 'firebase-functions/v1';

/**
 * Payment watchdog scheduled function
 * Runs every 1 minute (D-FIX-2: Adjusted for faster self-heal SLA)
 * 
 * Cloud Scheduler format: '* * * * *' = every minute
 */
export const paymentWatchdogScheduled = pubsubV1
  .schedule('* * * * *') // Every 1 minute (Cloud Scheduler cron format)
  .timeZone('Asia/Bangkok')
  .onRun(async () => {
    try {
      const { runPaymentWatchdog } = await import('../services/paymentWatchdogService');
      const stats = await runPaymentWatchdog();
      
      if (stats.scanned > 0) {
        console.log(
          `[paymentWatchdogScheduled] Run complete: scanned=${stats.scanned}, fixed=${stats.fixed}, flagged=${stats.flagged}`
        );
      }
    } catch (error) {
      console.error('[paymentWatchdogScheduled] Error:', error);
    }
    
    return null;
  });

