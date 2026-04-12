/**
 * EzDoc - Scheduled Retention Function
 * 
 * Runs daily to send lifecycle engagement messages to users after onboarding.
 */

import * as functions from 'firebase-functions/v1';
import { processRetentionMessages } from '../services/retentionService';
import { getLineChannelAccessToken } from '../shared/config';

export const retentionScheduled = functions
  .region('asia-southeast1')
  .runWith({ secrets: ['LINE_CHANNEL_ACCESS_TOKEN'] })
  .pubsub.schedule('0 14 * * *') // Daily at 2:00 PM Asia/Bangkok
  .timeZone('Asia/Bangkok')
  .onRun(async (_context) => {
    void _context;
    console.log('[SCHEDULED_RETENTION] Running retention flow process...');
    
    const accessToken = getLineChannelAccessToken();
    if (!accessToken) {
      console.error('[SCHEDULED_RETENTION] LINE_CHANNEL_ACCESS_TOKEN not configured');
      return null;
    }

    const result = await processRetentionMessages(accessToken);
    console.log(`[SCHEDULED_RETENTION] Completed: ${result.sent} sent, ${result.skipped} skipped`);
    
    return null;
  });
