// EzDoc/functions/src/index.ts
// Minimal exports for Firebase Functions entrypoint

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: process.env.STORAGE_BUCKET || 'ezdoc-v1-th.firebasestorage.app',
  });
}

import { onPdfJobCompleted as onPdfJobCompletedHandler } from './workers/pdfDelivery';

export { lineWebhookV1 } from './lineWebhookV1';
export { deliverLineTaskHandler, deliverPdfTaskHandler } from './tasks';
export { api } from './api';
export { pdfWorkerScheduled, pdfWorkerManual } from './workers/pdfWorker';
export { pdfJobOnCreate } from './workers/pdfJobTrigger';
export { voiceMessageJobOnCreate } from './workers/voiceMessageTrigger';
export { pdfTimeoutTaskHandler } from './workers/pdfTimeoutTask';
export { linkLineStart } from './linkLineStart';
export { linkLineConsume } from './linkLineConsume';
export { checkLineLink } from './checkLineLink';
export { unlinkLine } from './unlinkLine';
export { adminAuditLogs } from './adminAuditLogs';
export { authLineVerify } from './authLineVerify';
export { linkLineComplete } from './linkLineComplete';
export { pdfRedirect } from './pdfRedirect';
export { clientPortal } from './clientPortal';
export { pushMonthlyReport } from './pushMonthlyReport';
export { cleanupStatsEvents } from './cleanupStatsEvents';
export { processAsyncFailures, cleanupOldFailures } from './scheduled/processAsyncFailures';
export { cleanupProcessedEvents } from './scheduled/cleanupProcessedEvents';
export { retryTimeoutPushesScheduled } from './scheduled/retryTimeoutPushes';
export { processSlipOcrTask } from './tasks/processSlipOcrTask';
export * from './automations/scheduler';
export * from './automations/receipts';

// Rich Menu setup (admin function)
export { setupRichMenu } from './admin/setupRichMenu';

// Manual settlement (server-only, for war-room fixes)
export { manualSettlement } from './admin/manualSettlement';
export { projectMemoryIngest } from './admin/projectMemoryIngest';
export { projectMemoryAdmin } from './admin/projectMemoryAdmin';

// Credit purchase scheduled triggers
export * from './triggers/purchaseScheduled';
export { paymentWatchdogScheduled } from './triggers/paymentWatchdogScheduled';
export { taxReminderScheduled } from './triggers/taxReminderScheduled';

// UX lifecycle scheduled triggers
export { nudgeScheduled } from './triggers/nudgeScheduled';
export { retentionScheduled } from './triggers/retentionScheduled';

// Monitoring scheduled triggers
export { monitoringReportScheduled } from './scheduled/monitoringReport';
export { projectMemoryRefreshScheduled } from './scheduled/projectMemoryRefresh';

// EzDoc AI scheduled triggers
export { dailySummaryPush, smartFollowUp } from './scheduled/docSummaryAndFollowup';

// Discord Interactions Endpoint (Approval Buttons)
export { discordInteractions } from './discordInteractions';

// EzBOQ AI — Gemini Flash + RAG Construction Knowledge
export { ezboqAi } from './callable/ezboqAi';

/**
 * Firestore trigger: When pdf_generation_jobs/{jobId} status changes to DONE
 * Delivers PDF link to user via LINE push API
 */
export const onPdfJobCompleted = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['LINE_CHANNEL_ACCESS_TOKEN'],
    memory: '256MB',
    timeoutSeconds: 60,
  })
  .firestore.document('pdf_generation_jobs/{jobId}')
  .onUpdate(async (change: functions.Change<admin.firestore.DocumentSnapshot>) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // ✅ PHASE 2: Check for PDF timeout (PROCESSING > 60-120s)
    const { checkPdfTimeout } = await import('./workers/pdfTimeout');
    await checkPdfTimeout(change).catch((err) => {
      console.error('[onPdfJobCompleted] PDF timeout check failed:', err);
      // Non-blocking - continue to completion handler
    });

    // Only trigger on transition to DONE
    if (beforeData?.status !== 'DONE' && afterData?.status === 'DONE') {
      await onPdfJobCompletedHandler(change.after as unknown as admin.firestore.DocumentSnapshot);
      }
  });
export { ezboqLineCallback } from "./ezboqLineCallback";


// Email Notification Triggers
export { boqCreatedNotification } from './triggers/boqCreatedNotification';
export { onUserCreatedEmail, onUserDeletedEmail } from './triggers/authEmailNotifications';

// Subscription Payment (slip upload + OCR + admin notification)
export { onSubscriptionPayment, onSubscriptionPaymentUpdate } from './triggers/subscriptionPaymentTrigger';

// Subscription callable (web frontend instant verification)
export { verifySubscriptionSlip } from './callable/verifySubscriptionSlip';

// Subscription sync (LINE bot → web subscription collection)
export { onCreditPurchasePaid } from './triggers/subscriptionSyncTrigger';

// EzBOQ Discord Server Notifications (signup, subscription activated)
export { onUserSignupDiscord, onSubscriptionActivated } from './triggers/ezboqDiscordNotifications';
