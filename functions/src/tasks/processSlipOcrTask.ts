/**
 * Cloud Task Handler: Process Slip OCR
 * 
 * Called by Cloud Tasks to process slip image OCR asynchronously
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { processSlipUpload } from '../services/imageUploadService';
import { logWithTrace } from '../utils/asyncSafety';
import { OAuth2Client } from 'google-auth-library';
import { getLineChannelAccessToken, getOcrTaskAudience, getOcrTaskHandlerUrl, getProjectId } from '../shared/config';

const REGION = 'asia-southeast1';

interface SlipOcrTaskPayload {
  userId: string;
  lineUserId: string;
  messageId: string;
  purchaseId: string;
}

export const processSlipOcrTask = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['LINE_CHANNEL_ACCESS_TOKEN'],
    timeoutSeconds: 540,
  })
  .https.onRequest(async (req, res) => {
    const projectId =
      getProjectId() ||
      process.env.GCP_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      'ezdoc-v1-th';
    const ocrTaskAudience =
      getOcrTaskAudience() ||
      getOcrTaskHandlerUrl() ||
      `https://${REGION}-${projectId}.cloudfunctions.net/processSlipOcrTask`;
    // Verify OIDC token from Cloud Tasks
    const authHeader = (req.headers.authorization || req.headers.Authorization || '') as string;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization' });
      return;
    }
    const idToken = authHeader.substring(7);
    const client = new OAuth2Client();
    try {
      await client.verifyIdToken({ idToken, audience: ocrTaskAudience });
    } catch (err) {
      console.warn('[processSlipOcrTask] OIDC verification failed', err);
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const traceId = `ocr-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const context = {
      traceId,
      lineUserId: 'system',
      eventType: 'slip_ocr_task',
      stage: 'task_received',
    };

    logWithTrace("[OCR_STARTED]", context, "OCR task received");

    try {
      const payload = req.body as SlipOcrTaskPayload;
      const { userId, lineUserId, messageId, purchaseId } = payload;

      if (!userId || !lineUserId || !messageId || !purchaseId) {
        throw new Error('Missing required fields in payload');
      }

      const accessToken = getLineChannelAccessToken();
      if (!accessToken) {
        throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
      }

      logWithTrace("[OCR_STARTED]", { ...context, lineUserId, stage: 'processing' }, 
        `Processing OCR: userId=${userId}, purchaseId=${purchaseId}, messageId=${messageId}`);

      // Task D2: Log OCR_TASK_RECEIVED event (non-blocking)
      const { logPaymentEvent } = await import('../services/paymentTelemetry');
      logPaymentEvent({
        userId,
        purchaseId,
        eventType: 'ocr_started',
        timestamp: admin.firestore.Timestamp.now(),
        imageUrl: `line://message/${messageId}`,
        expectedAmount: 0, // Will be updated by OCR service
      }).catch(err => {
        console.warn(`[processSlipOcrTask] Failed to log OCR_TASK_RECEIVED:`, err);
      });

      // Task D2: Process slip upload with purchaseId (deterministic)
      const result = await processSlipUpload(userId, lineUserId, messageId, accessToken, purchaseId);

      if (result.success) {
        logWithTrace("[OCR_DONE]", { ...context, lineUserId, stage: 'completed' }, 
          `OCR completed successfully: purchaseId=${purchaseId}`);
        
        // Task D2: Log OCR_TASK_DONE event (non-blocking)
        logPaymentEvent({
          userId,
          purchaseId,
          eventType: 'ocr_started', // Reuse ocr_started for task completion
          timestamp: admin.firestore.Timestamp.now(),
          imageUrl: `line://message/${messageId}`,
          expectedAmount: 0,
        }).catch(err => {
          console.warn(`[processSlipOcrTask] Failed to log OCR_TASK_DONE:`, err);
        });
      } else {
        logWithTrace("[OCR_FAILED]", { ...context, lineUserId, stage: 'failed' }, 
          `OCR failed: purchaseId=${purchaseId}, message=${result.message}`);

        // ✅ Notify user on slip upload failure with quick replies
        if (lineUserId && result.message) {
          try {
            const { pushLineMessage } = await import('../services/lineService');
            const { getPaymentRetryButtons } = await import('../ui/quickReplies');
            await pushLineMessage(lineUserId, result.message, accessToken, getPaymentRetryButtons());
          } catch (notifyErr) {
            console.warn('[processSlipOcrTask] Failed to notify user on slip upload failure:', notifyErr);
          }
        }
        
        // Task D2: Log OCR_TASK_FAILED event (non-blocking)
        const { logOcrFailed } = await import('../services/paymentTelemetry');
        logOcrFailed(
          userId,
          purchaseId,
          result.message || 'Unknown error',
          0, // retryCount unknown at this stage
          undefined // confidence unknown
        ).catch(err => {
          console.warn(`[processSlipOcrTask] Failed to log OCR_TASK_FAILED:`, err);
        });
      }

      // Clear SLIP mode after processing
      const { setUserImageMode } = await import('../services/userStateService');
      await setUserImageMode(userId, null);

      res.status(200).json({ success: result.success, message: result.message });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logWithTrace("[OCR_FAILED]", { ...context, stage: 'error' }, 
        `OCR task error: ${errorMsg}`);
      res.status(500).json({ error: errorMsg });
    }
  });
