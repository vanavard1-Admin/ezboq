/**
 * EzDoc - Tax Reminder Scheduled Trigger
 *
 * Sends monthly tax reminders to LINE for businesses that enabled it.
 */

import * as functions from 'firebase-functions/v1';
import { getLineChannelAccessToken } from '../shared/config';
import { processTaxReminders } from '../services/taxReminderService';

export const taxReminderScheduled = functions
  .region('asia-southeast1')
  .runWith({ secrets: ['LINE_CHANNEL_ACCESS_TOKEN'] })
  .pubsub.schedule('0 9 * * *') // Daily 09:00 Asia/Bangkok
  .timeZone('Asia/Bangkok')
  .onRun(async () => {
    console.log('[SCHEDULED_TAX_REMINDER] Running tax reminder process...');

    const accessToken = getLineChannelAccessToken();
    if (!accessToken) {
      console.error('[SCHEDULED_TAX_REMINDER] LINE_CHANNEL_ACCESS_TOKEN not configured');
      return null;
    }

    const result = await processTaxReminders(accessToken);
    console.log(
      `[SCHEDULED_TAX_REMINDER] Completed: sent=${result.sent}, skipped=${result.skipped}, errors=${result.errors}`
    );

    return null;
  });
