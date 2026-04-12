/**
 * Slip OCR Task Service
 * 
 * Enqueues OCR processing via Cloud Tasks for reliable async processing
 */

import { CloudTasksClient } from '@google-cloud/tasks';
import { getOcrTaskHandlerUrl, getProjectId } from '../shared/config';

const client = new CloudTasksClient();

const LOCATION = 'asia-southeast1';
const QUEUE_NAME = 'slip-ocr';

export interface SlipOcrTaskPayload {
  userId: string;
  lineUserId: string;
  messageId: string;
  purchaseId: string;
}

/**
 * Enqueue slip OCR processing task
 */
export async function enqueueSlipOcrTask(
  payload: SlipOcrTaskPayload
): Promise<string> {
  const projectId =
    getProjectId() ||
    process.env.GCP_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    'ezdoc-v1-th';
  const ocrTaskHandlerUrl =
    getOcrTaskHandlerUrl() ||
    `https://${LOCATION}-${projectId}.cloudfunctions.net/processSlipOcrTask`;
  const parent = client.queuePath(projectId, LOCATION, QUEUE_NAME);
  
  // Sanitize IDs to ensure valid task name (only alphanumeric, dash, underscore allowed)
  const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "_");
  
  // Idempotent task name: slip-ocr-{purchaseId}-{messageId} (allows retry with different messageId)
  const taskId = `slip-ocr-${safe(payload.purchaseId)}-${safe(payload.messageId)}`;
  const taskName = client.taskPath(projectId, LOCATION, QUEUE_NAME, taskId);
  
  const taskRequest = {
    parent,
    task: {
      name: taskName,
      httpRequest: {
        httpMethod: 'POST' as const,
        url: ocrTaskHandlerUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify(payload)).toString('base64'),
        // OIDC authentication
        oidcToken: {
          serviceAccountEmail: `${projectId}@appspot.gserviceaccount.com`,
          audience: ocrTaskHandlerUrl,
        },
      },
      // Schedule immediately
      scheduleTime: {
        seconds: Math.floor(Date.now() / 1000),
      },
    },
  };

  try {
    const [response] = await client.createTask(taskRequest);
    console.log(`[SLIP_JOB_ENQUEUED] Task created: ${taskName}, purchaseId=${payload.purchaseId}`);
    return response.name || taskName;
  } catch (error: any) {
    if (error.code === 6) { // ALREADY_EXISTS
      console.log(`[SLIP_JOB_ENQUEUED] Task already exists (idempotent): ${taskId}`);
      return taskName;
    }
    console.error('[SLIP_JOB_ENQUEUED] Error creating task:', error);
    throw error;
  }
}
