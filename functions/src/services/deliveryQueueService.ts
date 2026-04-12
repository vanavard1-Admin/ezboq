/**
 * Delivery Queue Service
 * Enqueues LINE message delivery tasks for PDF documents
 */

import { CloudTasksClient } from '@google-cloud/tasks';
import {
  getDeliveryServiceAccount,
  getDeliveryTaskAudience,
  getDeliveryTaskUrl,
  getProjectId,
} from '../shared/config';

const client = new CloudTasksClient();

// Configuration (resolved at runtime to avoid param evaluation during deploy)
const REGION = 'asia-southeast1';
const DELIVERY_QUEUE = 'line-delivery';

const resolveProjectId = (): string =>
  getProjectId() || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'ezdoc-v1-th';

const resolveDeliveryFunctionUrl = (): string =>
  getDeliveryTaskUrl() ||
  process.env.DELIVERY_FUNCTION_URL ||
  `https://${REGION}-${resolveProjectId()}.cloudfunctions.net/deliverPdfTaskHandler`;

const resolveDeliveryAudience = (): string =>
  getDeliveryTaskAudience() || resolveDeliveryFunctionUrl();

export interface LineDeliveryPayload {
  userId: string;
  docId: string;
  docType: string;
  docNo: string;
  pdfUrl: string;
}

/**
 * Enqueue LINE delivery task
 * 
 * Creates a Cloud Tasks task to deliver PDF link via LINE
 * Task is idempotent: same docId = same task name
 * 
 * @param payload - Delivery information
 */
export async function enqueueLineDelivery(
  payload: LineDeliveryPayload
): Promise<void> {
  try {
    const projectId = resolveProjectId();
    const deliverySa =
      getDeliveryServiceAccount() || `${projectId}@appspot.gserviceaccount.com`;
    const { userId, docId, docType, docNo, pdfUrl } = payload;
    
    console.log(`[Delivery Queue] Enqueueing LINE delivery for doc ${docId}`);
    
    // Build queue path
    const queuePath = client.queuePath(projectId, REGION, DELIVERY_QUEUE);
    
    // Build task
    const task = {
      httpRequest: {
        httpMethod: 'POST' as const,
        url: resolveDeliveryFunctionUrl(),
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({
          userId,
          docId,
          docType,
          docNo,
          pdfUrl,
        })).toString('base64'),
        oidcToken: {
          serviceAccountEmail: deliverySa,
          audience: resolveDeliveryAudience(),
        },
      },
    };
    
    // Idempotent task naming: delivery-{docId}
    const taskName = `delivery-${docId}`;
    const taskPath = client.taskPath(projectId, REGION, DELIVERY_QUEUE, taskName);
    
    // Create task (idempotent)
    try {
      await client.createTask({
        parent: queuePath,
        task: {
          name: taskPath,
          ...task,
        },
      });
      
      console.log(`[Delivery Queue] Task created: ${taskName}`);
    } catch (error: any) {
      // If task already exists, that's fine (idempotent)
      if (error.code === 6) { // ALREADY_EXISTS
        console.log(`[Delivery Queue] Task already exists: ${taskName}`);
      } else {
        throw error;
      }
    }
    
  } catch (error: any) {
    console.error(`[Delivery Queue] Failed to enqueue delivery:`, error);
    throw error;
  }
}

/**
 * Create the delivery queue if it doesn't exist
 * Call this during setup/deployment
 */
export async function ensureDeliveryQueue(): Promise<void> {
  try {
    const projectId = resolveProjectId();
    const queuePath = client.queuePath(projectId, REGION, DELIVERY_QUEUE);
    
    // Try to get queue
    try {
      await client.getQueue({ name: queuePath });
      console.log(`[Delivery Queue] Queue already exists: ${DELIVERY_QUEUE}`);
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        // Create queue
        const parent = client.locationPath(projectId, REGION);
        await client.createQueue({
          parent,
          queue: {
            name: queuePath,
            retryConfig: {
              maxAttempts: 5,
              maxRetryDuration: { seconds: 3600 }, // 1 hour
            },
            rateLimits: {
              maxDispatchesPerSecond: 10,
              maxConcurrentDispatches: 5,
            },
          },
        });
        console.log(`[Delivery Queue] Queue created: ${DELIVERY_QUEUE}`);
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error(`[Delivery Queue] Failed to ensure queue:`, error);
    throw error;
  }
}
