import { getDb } from '../core/firebaseAdmin';
import { getPdfServiceAccount, getPdfServiceUrl } from '../shared/config';
// Cloud Tasks Service for enqueuing PDF generation jobs

import { CloudTasksClient } from "@google-cloud/tasks";

const client = new CloudTasksClient();

// Environment variables
const PROJECT_ID = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || "ezdoc-v1-th";
const LOCATION = "asia-southeast1";
const QUEUE_NAME = "pdf-generate";

// PDF Service configuration (params/env only; avoid runtime config dependency)
const getPdfServiceAccountSafe = (): string =>
  getPdfServiceAccount() || `pdf-service@${PROJECT_ID}.iam.gserviceaccount.com`;
const DEBUG_LOGS = process.env.LOG_LEVEL === 'debug';
const debugLog = (...args: unknown[]) => {
  if (DEBUG_LOGS) {
    console.log(...args);
  }
};

export interface PdfGenerationTask {
  docId: string;
}

/**
 * Enqueue PDF generation task to Cloud Tasks
 * 
 * Flow:
 * 1. Cloud Functions enqueues task with docId
 * 2. Cloud Tasks calls Cloud Run with OIDC auth
 * 3. Cloud Run generates PDF and calls Backend API
 * 
 * Auth: OIDC token with audience = Cloud Run URL
 * Idempotency: Task name = pdf-{docId} (only one task per docId)
 * 
 * @param task - PDF generation task payload (only docId needed)
 * @returns Task name
 */
export async function enqueuePdfGeneration(task: PdfGenerationTask): Promise<string> {
  const pdfServiceUrl = getPdfServiceUrl();
  const pdfServiceAccount = getPdfServiceAccountSafe();
  // ✅ KILL-SWITCH: Check global PDF generation feature flag
  try {
    const db = getDb();
    const pdfFlag = await db.collection('feature_flags').doc('global_pdf_generation_enabled').get();
    if (pdfFlag.exists) {
      const flagData = pdfFlag.data();
      if (flagData?.enabled === false) {
        console.log(`[Cloud Tasks] PDF generation disabled by kill-switch for docId=${task.docId}`);
        throw new Error('PDF_GENERATION_DISABLED: PDF generation temporarily disabled via feature flag');
      }
    }
    // If flag doesn't exist or enabled=true, continue (default: allow)
  } catch (error: any) {
    // If error is kill-switch, re-throw it
    if (error.message?.includes('PDF_GENERATION_DISABLED')) {
      throw error;
    }
    // Otherwise, log warning but continue (fail-safe: don't block on flag read error)
    console.warn(`[enqueuePdfGeneration] Error checking feature flag (non-blocking):`, error);
  }

  if (!pdfServiceUrl) {
    throw new Error("PDF_SERVICE_URL not configured. Set env: PDF_SERVICE_URL=<Cloud Run URL>");
  }

  const parent = client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);

  // Idempotent task name: pdf-{docId}
  // If task with same name exists, it won't be duplicated
  const taskId = `pdf-${task.docId}`;
  const taskName = client.taskPath(PROJECT_ID, LOCATION, QUEUE_NAME, taskId);

  // Task payload: only docId (minimal contract)
  const payload = {
    docId: task.docId,
  };

  // Create task with OIDC authentication
  // audience MUST be the Cloud Run URL (full URL)
  const taskRequest = {
    parent,
    task: {
      name: taskName,
      httpRequest: {
        httpMethod: "POST" as const,
        url: `${pdfServiceUrl}/pdf/generate`,
        headers: {
          "Content-Type": "application/json",
        },
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        oidcToken: {
          serviceAccountEmail: pdfServiceAccount,
          audience: pdfServiceUrl, // CRITICAL: Must match Cloud Run URL
        },
      },
      // Schedule immediately (or add delay if needed)
      scheduleTime: {
        seconds: Math.floor(Date.now() / 1000) + 2, // 2 seconds delay
      },
    },
  };

  try {
    debugLog(`[Cloud Tasks] Enqueueing PDF generation: docId=${task.docId}`);
    debugLog(`[Cloud Tasks] Queue: ${parent}`);
    debugLog(`[Cloud Tasks] Task ID: ${taskId}`);
    debugLog(`[Cloud Tasks] URL: ${pdfServiceUrl}/pdf/generate`);
    debugLog(`[Cloud Tasks] Audience: ${pdfServiceUrl}`);

    const [response] = await client.createTask(taskRequest);
    debugLog(`[Cloud Tasks] Task created: ${response.name}`);
    return response.name || taskId;

  } catch (error: any) {
    console.error("[Cloud Tasks] Error creating task:", error);

    // Handle common errors
    if (error.code === 5) { // NOT_FOUND
      console.error(`[Cloud Tasks] Queue not found: ${QUEUE_NAME}`);
      console.error(`Run: gcloud tasks queues create ${QUEUE_NAME} --location=${LOCATION}`);
    } else if (error.code === 6) { // ALREADY_EXISTS
      debugLog(`[Cloud Tasks] Task already exists (idempotent): ${taskId}`);
      return taskName;
    } else if (error.code === 7) { // PERMISSION_DENIED
      console.error(`[Cloud Tasks] Permission denied. Check IAM:`);
      console.error(`  1. Functions SA has roles/iam.serviceAccountTokenCreator on PDF SA`);
      console.error(`  2. Functions SA has roles/cloudtasks.enqueuer`);
      console.error(`  3. PDF SA has roles/run.invoker on Cloud Run service`);
    }

    throw error;
  }
}

/**
 * Check if Cloud Tasks queue exists
 */
export async function queueExists(): Promise<boolean> {
  try {
    const queuePath = client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
    await client.getQueue({ name: queuePath });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get queue configuration
 */
export async function getQueueInfo() {
  try {
    const queuePath = client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
    const [queue] = await client.getQueue({ name: queuePath });
    return queue;
  } catch {
    return null;
  }
}
