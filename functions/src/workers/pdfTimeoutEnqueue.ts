import { getDb } from '../core/firebaseAdmin';
/**
 * PDF Timeout Task Enqueue Service
 * 
 * Enqueues a Cloud Task with delay to check for PDF job timeout.
 * This ensures timeout notifications are sent even if the job gets stuck
 * and doesn't trigger Firestore onUpdate events.
 */

import { CloudTasksClient } from '@google-cloud/tasks';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import {
  getProjectId,
  getCloudTasksQueue,
  getCloudTasksLocation,
  getTimeoutTaskServiceAccount,
} from '../shared/config';

const tasksClient = new CloudTasksClient();
const TIMEOUT_DELAY_SECONDS = 90; // Check after 90 seconds

/**
 * Get the timeout task handler URL and audience
 * This should be the deployed Cloud Function URL for pdfTimeoutTaskHandler
 */
function getTimeoutTaskUrl(): string {
  const projectId =
    getProjectId() ||
    process.env.GCP_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    'ezdoc-v1-th';
  const location = getCloudTasksLocation();
  const functionName = 'pdfTimeoutTaskHandler';

  // Construct Cloud Function URL
  return `https://${location}-${projectId}.cloudfunctions.net/${functionName}`;
}

/**
 * Get service account email for timeout task
 * Uses TIMEOUT_TASK_SERVICE_ACCOUNT if configured, otherwise defaults to compute service account
 */
function resolveTimeoutTaskServiceAccount(): string {
  const configured = getTimeoutTaskServiceAccount();
  if (configured) return configured;
  const projectId =
    getProjectId() ||
    process.env.GCP_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    'ezdoc-v1-th';
  return `${projectId}@appspot.gserviceaccount.com`;
}

/**
 * Enqueue a Cloud Task to check for PDF job timeout after delay
 * 
 * @param jobId - PDF job ID to check
 * @param jobData - Optional job data (if not provided, will be fetched from Firestore)
 * @returns Task name if successful, null if failed (non-blocking)
 */
export async function enqueuePdfTimeoutTask(
  jobId: string,
  jobData?: Record<string, unknown>
): Promise<string | null> {
  let taskId: string | undefined; // Declare in outer scope for error handler

  try {
    const client = tasksClient;
    const queuePath = client.queuePath(
      getProjectId() ||
        process.env.GCP_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        'ezdoc-v1-th',
      getCloudTasksLocation(),
      getCloudTasksQueue()
    );

    const timeoutTaskUrl = getTimeoutTaskUrl();
    const serviceAccountEmail = resolveTimeoutTaskServiceAccount();

    // ✅ FIX 2: Deterministic task name for idempotency
    // Format: pdf-timeout:{jobId}:{processingStartedAt}
    // This ensures same job + same start time = same task name (prevents duplicates)
    let processingStartedAt: admin.firestore.Timestamp | undefined;

    if (jobData) {
      processingStartedAt = jobData.processing_started_at as admin.firestore.Timestamp | undefined;
    } else {
      // Fetch job data from Firestore if not provided
      const db = getDb();
      const jobRef = db.collection('pdf_generation_jobs').doc(jobId);
      const jobSnap = await jobRef.get();
      if (jobSnap.exists) {
        const fetchedData = jobSnap.data() as Record<string, unknown>;
        processingStartedAt = fetchedData.processing_started_at as admin.firestore.Timestamp | undefined;
      }
    }

    // ✅ FIX 2: Deterministic task name for idempotency
    // Use epoch millis (safe, no invalid chars), ensure non-null
    // Use hash(jobId) to handle edge cases with very long jobIds
    if (!processingStartedAt) {
      // No timestamp - use current time (shouldn't happen in normal flow)
      const { secureError } = await import('../utils/secureConsole');
      secureError({
        tag: '[PDF_TIMEOUT_ENQUEUE_NO_TIMESTAMP]',
        job_id: jobId,
        timestamp: new Date().toISOString(),
      });
      // Fallback: use current time (but this indicates a problem)
      processingStartedAt = admin.firestore.Timestamp.fromMillis(Date.now());
    }

    // Use epoch millis (safe format, no special chars, fixed length)
    const startTimeMillis = processingStartedAt.toMillis();
    const startTimeStr = startTimeMillis.toString();

    // ✅ FIX 2: Hash jobId to handle edge cases with very long jobIds
    // Cloud Tasks constraints: alphanumeric, hyphens, underscores only; max 500 chars for full path
    // Hash ensures fixed length (32 chars for MD5, 64 for SHA256) regardless of jobId length
    const jobIdHash = crypto.createHash('sha256').update(jobId).digest('hex').substring(0, 16); // First 16 chars (sufficient for uniqueness)

    // Task name format: pdf-timeout-{hash(jobId)}-{epochMillis}
    // Total length: ~40 chars (safe, well under 200 char limit)
    taskId = `pdf-timeout-${jobIdHash}-${startTimeStr}`;
    const taskName = client.taskPath(
      getProjectId() ||
        process.env.GCP_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        'ezdoc-v1-th',
      getCloudTasksLocation(),
      getCloudTasksQueue(),
      taskId
    );

    const task = {
      name: taskName,
      httpRequest: {
        httpMethod: 'POST' as const,
        url: timeoutTaskUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({ jobId })).toString('base64'),
        // ✅ SECURITY: Add OIDC token for authentication
        oidcToken: {
          serviceAccountEmail,
          audience: timeoutTaskUrl, // Audience must match function URL
        },
      },
      scheduleTime: {
        seconds: Math.floor(Date.now() / 1000) + TIMEOUT_DELAY_SECONDS,
      },
    };

    const [response] = await client.createTask({
      parent: queuePath,
      task,
    });

    // ✅ FIX 3: Use secure logging
    const { secureLog } = await import('../utils/secureConsole');
    secureLog({
      tag: '[PDF_TIMEOUT_TASK_ENQUEUED]',
      job_id: jobId,
      task_name: response.name,
      task_id: taskId,
      timestamp: new Date().toISOString(),
    });
    return response.name || taskName;
  } catch (error: any) {
    // Non-blocking: Log error but don't fail the main operation
    const { secureError, secureLog } = await import('../utils/secureConsole');

    // If task already exists (ALREADY_EXISTS = code 6), that's fine - idempotent
    if (error.code === 6) {
      secureLog({
        tag: '[PDF_TIMEOUT_TASK_ALREADY_EXISTS]',
        job_id: jobId,
        task_id: taskId,
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    secureError({
      tag: '[PDF_TIMEOUT_TASK_ENQUEUE_FAILED]',
      job_id: jobId,
      task_id: taskId,
      error_code: error.code,
      timestamp: new Date().toISOString(),
    }, error);

    return null;
  }
}
