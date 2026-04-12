/**
 * EzDoc - Scheduled Nudge Function
 * 
 * Runs daily to send polite reminders to users with incomplete business setup.
 */

import * as functions from 'firebase-functions/v1';
import { processNudges } from '../services/nudgeService';
import { getLineChannelAccessToken } from '../shared/config';

export const nudgeScheduled = functions
  .region('asia-southeast1')
  .runWith({ secrets: ['LINE_CHANNEL_ACCESS_TOKEN'] })
  .pubsub.schedule('0 10 * * *') // Daily at 10:00 AM Asia/Bangkok
  .timeZone('Asia/Bangkok')
  .onRun(async (_context) => {
    void _context;
    console.log('[SCHEDULED_NUDGE] Running daily nudge process...');
    
    const accessToken = getLineChannelAccessToken();
    if (!accessToken) {
      console.error('[SCHEDULED_NUDGE] LINE_CHANNEL_ACCESS_TOKEN not configured');
      return null;
    }

    const result = await processNudges(accessToken);
    console.log(`[SCHEDULED_NUDGE] Completed: ${result.sent} sent, ${result.skipped} skipped`);
    
    return null;
  });
