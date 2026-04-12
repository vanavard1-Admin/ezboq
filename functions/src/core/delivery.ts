import { CloudTasksClient } from '@google-cloud/tasks';
import admin from 'firebase-admin';
import { getDb } from './firebaseAdmin';
import {
  getProjectId,
  getCloudTasksQueue,
  getCloudTasksLocation,
  getDeliveryTaskUrl,
  getDeliveryServiceAccount,
} from '../shared/config';

const tasksClient = new CloudTasksClient();

export type DeliveryJob = {
  docId: string;
  channel: 'LINE';
  to: { lineUserId: string };
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  attempt: number;
  resendCount: number;
  nextRunAt?: admin.firestore.Timestamp | null;
  lastError?: { code?: string; message?: string } | null;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  sentAt?: admin.firestore.Timestamp | null;
};

/**
 * Upsert a delivery job with deterministic jobId = `line:{docId}:{lineUserId}`
 * Idempotent: repeated calls will not create duplicates. If job exists and is FAILED,
 * calling this will reset to PENDING and increment resendCount.
 */
export async function upsertDeliveryJob(params: {
  docId: string;
  lineUserId: string;
}) {
  const { docId, lineUserId } = params;
  const jobId = `line:${docId}:${lineUserId}`;
  const db = getDb();
  const ref = db.doc(`deliveryJobs/${jobId}`);

  const now = admin.firestore.Timestamp.now();

  const snap = await ref.get();
  if (!snap.exists) {
    const job: Partial<DeliveryJob> = {
      docId,
      channel: 'LINE',
      to: { lineUserId },
      status: 'PENDING',
      attempt: 0,
      resendCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(job);
    return jobId;
  }

  // If exists, decide update policy
  const data = snap.data() as Partial<DeliveryJob> | undefined;
  const status = data?.status;

  if (status === 'SENT' || status === 'PENDING') {
    // nothing to do - idempotent
    return jobId;
  }

  // If FAILED or CANCELLED, reset to PENDING and increment resendCount
  const resendCount = (data?.resendCount as number | undefined) ?? 0;
  await ref.set(
    {
      status: 'PENDING',
      resendCount: resendCount + 1,
      updatedAt: now,
    },
    { merge: true }
  );

  return jobId;
}

/**
 * Enqueue delivery task to Cloud Tasks with deterministic task name.
 */
export async function enqueueDeliveryTask(jobId: string, traceId?: string) {
  const deliveryTaskUrl = getDeliveryTaskUrl();
  if (!deliveryTaskUrl) {
    throw new Error('DELIVERY_TASK_URL not configured');
  }
  const projectId = getProjectId();
  const deliveryServiceAccount =
    getDeliveryServiceAccount() || `${projectId}@appspot.gserviceaccount.com`;

  const client = tasksClient;
  const queuePath = client.queuePath(
    projectId,
    getCloudTasksLocation(),
    getCloudTasksQueue()
  );

  const task = {
    httpRequest: {
      httpMethod: 'POST' as const,
      url: deliveryTaskUrl,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify({ 
        jobId,
        traceId: traceId || null, // ✅ Propagate correlation ID
      })).toString('base64'),
      oidcToken: {
        serviceAccountEmail: deliveryServiceAccount,
        audience: deliveryTaskUrl,
      },
    },
    name: undefined as string | undefined,
    dispatchDeadline: { seconds: 600 },
  };

  const taskName = `deliver-line-${jobId}`;
  task.name = `${queuePath}/tasks/${taskName}`;

  const [resp] = await client.createTask({ parent: queuePath, task });
  return resp.name || '';
}
