import * as functions from 'firebase-functions/v1';
import admin from 'firebase-admin';
import fetch from 'node-fetch';
import { getDeliveryTaskAudience, getLineChannelAccessToken } from '../shared/config';
import { buildLineDeliveryMessage, BusinessData, DocData } from '../line/messages';
import { buildShortUrl, getOrCreateShortLink } from '../shared/pdfFlexMessage';
import { OAuth2Client } from 'google-auth-library';
import { assertTransition, logStatusTransition, DocumentState } from '../core/stateMachine'; // Spec v1.0
import { getDb } from '../core/firebaseAdmin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const REGION = 'asia-southeast1';
const PROJECT_ID = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || 'ezdoc-v1-th';

// Backoff schedule (seconds)
const BACKOFF = [10, 60, 5 * 60, 30 * 60, 60 * 60]; // upto 5 attempts recommended

function getBackoffForAttempt(attempt: number) {
  return BACKOFF[Math.min(attempt - 1, BACKOFF.length - 1)] || 60;
}

// Error classification for LINE API responses
type LineErrorReason = 'INVALID_TO' | 'BLOCKED' | 'INVALID_PAYLOAD' | 'AUTH_ERROR' | 'UNKNOWN';

interface LineErrorClassification {
  reason: LineErrorReason;
  message: string;
  isRetryable: boolean;
}

function classifyLineError(status: number, text: string): LineErrorClassification {
  // 400 Bad Request - multiple causes
  if (status === 400) {
    // Invalid 'to' field (user doesn't exist or invalid format)
    if (text.includes('The property') && text.includes('\'to\'')) {
      return {
        reason: 'INVALID_TO',
        message: 'Recipient userId is invalid, expired, or no longer exists',
        isRetryable: false
      };
    }
    // User blocked bot or is not a friend
    if (text.match(/blocked|not found|target/i)) {
      return {
        reason: 'BLOCKED',
        message: 'User blocked bot or is no longer a friend',
        isRetryable: false
      };
    }
    // Message payload is malformed
    if (text.includes('Message') || text.includes('message')) {
      return {
        reason: 'INVALID_PAYLOAD',
        message: 'Message template or content is malformed',
        isRetryable: false
      };
    }
  }

  // 401/403 Unauthorized - token issue
  if (status === 401 || status === 403) {
    return {
      reason: 'AUTH_ERROR',
      message: 'Channel Access Token is invalid or expired',
      isRetryable: true
    };
  }

  // Unknown error
  return {
    reason: 'UNKNOWN',
    message: `HTTP ${status}: ${text.slice(0, 100)}`,
    isRetryable: status >= 500 || status === 429
  };
}

export const deliverLineTaskHandler = functions
  .region('asia-southeast1')
  .runWith({
    timeoutSeconds: 300,
    memory: '256MB',
    // Bind secrets to ensure DELIVERY_* and LINE token are present in runtime
    secrets: [
      'DELIVERY_TASK_URL',
      'DELIVERY_TASK_AUDIENCE',
      'DELIVERY_SERVICE_ACCOUNT',
      'LINE_CHANNEL_ACCESS_TOKEN',
    ],
  })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    try {
      if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
      }

      // Verify OIDC token from Cloud Tasks (Authorization: Bearer <token>) if configured
      try {
        const authHeader = (req.get('authorization') || req.get('Authorization') || '') as string;
        if (!authHeader) {
          console.warn('Missing Authorization header on delivery task');
          res.status(401).send('Unauthorized');
          return;
        }
        const match = authHeader.match(/^Bearer\s+(.*)$/i);
        if (!match) {
          console.warn('Invalid Authorization header format');
          res.status(401).send('Unauthorized');
          return;
        }
        const idToken = match[1];
        const defaultAudience = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/deliverLineTaskHandler`;
        const audience = getDeliveryTaskAudience() || defaultAudience;
        if (!audience) {
          console.warn('No DELIVERY_TASK_AUDIENCE configured; skipping token verification');
        } else {
          const client = new OAuth2Client();
          try {
            await client.verifyIdToken({ idToken, audience });
          } catch (e) {
            console.warn('OIDC token verification failed', e);
            res.status(401).send('Unauthorized');
            return;
          }
        }
      } catch (e) {
        console.warn('Token verification error', e);
        res.status(401).send('Unauthorized');
        return;
      }

      const body = req.body || {};
      const jobId = body.jobId as string | undefined;
      const traceId = body.traceId as string | undefined; // ✅ Extract traceId from payload
      if (!jobId) {
        res.status(400).send('Missing jobId');
        return;
      }

      const logContext = { jobId, traceId };

      console.info({
        message: 'Processing delivery',
        severity: 'INFO',
        ...logContext
      });
      const db = getDb();
      const jobRef = db.doc(`deliveryJobs/${jobId}`);
      console.debug({ message: 'Fetching job document', ...logContext });
      const jobSnap = await jobRef.get();

      if (!jobSnap.exists) {
        // Nothing to do
        console.info({ message: 'Job not found, returning 200', ...logContext });
        res.status(200).send('Job not found');
        return;
      }

      type DeliveryJob = {
        status?: string;
        docPath?: string;
        docId?: string;
        userId?: string;
        businessId?: string;
        attempt?: number;
        to?: { lineUserId?: string } | null;
        lineUserId?: string | null;
      };

      // Atomic status check and claim (prevent duplicate delivery)
      type TransactionResult = {
        canSend: boolean;
        job: DeliveryJob;
        docRef: admin.firestore.DocumentReference;
      } | null;

      const result: TransactionResult = await db.runTransaction(async (tx) => {
        const jobSnap = await tx.get(jobRef);
        if (!jobSnap.exists) {
          return null;
        }

        const job = jobSnap.data() as DeliveryJob;

        // Check status INSIDE transaction
        if (job.status === 'SENT') {
          return null; // Already sent
        }

        // Resolve docRef
        let resolvedDocRef: admin.firestore.DocumentReference | null = null;
        if (job.docPath) {
          resolvedDocRef = db.doc(job.docPath);
        } else if (job.userId && job.businessId && job.docId) {
          const possibleRef = db.doc(`users/${job.userId}/businesses/${job.businessId}/documents/${job.docId}`);
          const possibleSnap = await tx.get(possibleRef);
          if (possibleSnap.exists) {
            resolvedDocRef = possibleRef;
          }
        }

        if (!resolvedDocRef) {
          // Mark as FAILED
          tx.update(jobRef, {
            status: 'FAILED',
            attempt: (job.attempt || 0) + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastError: { message: 'Document not found' },
            expiresAt: admin.firestore.Timestamp.fromDate(
              new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            ),
          });
          return null;
        }

        // Claim SENDING status (atomic)
        tx.update(jobRef, {
          status: 'SENDING',
          attempt: (job.attempt || 0) + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          canSend: true,
          job: { ...job },
          docRef: resolvedDocRef,
        };
      });

      if (!result || !result.canSend) {
        res.status(200).send('Already sent or processing');
        return;
      }

      const { job, docRef } = result;

      console.debug({ message: 'Fetching document', ...logContext });
      const docSnap = await docRef.get();

      type DocumentData = {
        docNo?: string;
        status?: string; // Spec v1.0
        pdfState?: string;
        pdfUrl?: string;
        pdfPath?: string;
        pdf_path?: string;
        supersedes_document_id?: string | null;
        origin_document_id?: string | null;
      };
      const doc = docSnap.data() as DocData & DocumentData;

      console.info({ message: 'Document status check', status: doc?.status, ...logContext });

      // Spec v1.0: Transition Guard using DocumentStatus (Source of Truth)
      // Check if document is in PDF_READY state
      // (Legacy fallback: check pdfState if status is missing?)
      const currentStatus = (doc.status as DocumentState) || (doc.pdfState === 'READY' ? DocumentState.PDF_READY : undefined);

      if (currentStatus !== DocumentState.PDF_READY && currentStatus !== DocumentState.DELIVERED) {
        // Strict Abort: If document is in a state that cannot progress to PDF_READY/DELIVERED (e.g. VOID, DRAFT), we MUST abort.
        // Spec Section 7: "abort if state mismatch" (Strict Determinism)
        if (currentStatus === DocumentState.VOID || currentStatus === DocumentState.DRAFT) {
          console.warn({ message: 'ABORTING: State mismatch', currentStatus, ...logContext });
          // Mark job FAILED, no retry
          await jobRef.set({
            status: 'FAILED',
            lastError: { message: `Aborted: Document is in ${currentStatus} state` },
            updatedAt: admin.firestore.Timestamp.now()
          }, { merge: true });
          res.status(200).send(`Aborted: State mismatch (${currentStatus})`);
          return;
        }

        // Not ready yet (e.g. PDF_RENDERING lag): schedule next run
        console.info({ message: 'Document not in PDF_READY state, scheduling retry', currentStatus, ...logContext });
        const nextAttempt = (job.attempt || 0) + 1;
        const backoff = getBackoffForAttempt(nextAttempt);
        const nextRun = admin.firestore.Timestamp.fromMillis(Date.now() + backoff * 1000);
        await jobRef.set({ nextRunAt: nextRun, attempt: nextAttempt, status: 'PENDING', updatedAt: admin.firestore.Timestamp.now() }, { merge: true });
        res.status(200).send('Not ready');
        return;
      }

      // Strict Guard: Can we transition to DELIVERED?
      try {
        assertTransition(currentStatus, DocumentState.DELIVERED);
      } catch (e: any) {
        if (currentStatus === DocumentState.DELIVERED) {
          console.info({ message: 'Document already DELIVERED, skipping logic', ...logContext });
          // If already delivered, maybe we shouldn't send again?
          // Idempotency: "job.status === 'SENT'" check happens earlier (line 162).
          // So if job isn't SENT, we assume we haven't sent it.
          // But what if document is DELIVERED (by another job)?
          // We should probably abort.
          res.status(200).send('Already delivered');
          return;
        }

        console.error({ message: 'Invalid transition attempt', error: e.message, ...logContext });
        // Rethrow if assert fails.
        throw e;
      }

      // Load business snapshot for language selection
      const businessRef = job.businessId ? db.doc(`users/${job.userId}/businesses/${job.businessId}`) : null;
      const businessSnap = businessRef ? await businessRef.get() : null;
      const business = businessSnap?.exists ? (businessSnap.data() as BusinessData) : ({} as BusinessData);

      // Send message via LINE push API
      const to = job.to?.lineUserId || job.lineUserId;
      console.info({ message: 'Recipient check', to, ...logContext });
      if (!to) {
        console.warn({ message: 'No recipient found', ...logContext });
        await jobRef.set({
          status: 'FAILED',
          attempt: (job.attempt || 0) + 1,
          updatedAt: admin.firestore.Timestamp.now(),
          lastError: { message: 'No recipient' },
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          )
        }, { merge: true });
        res.status(400).send('No recipient');
        return;
      }

      // Determine previous docNo if this doc supersedes another
      let prevDocNo: string | undefined = undefined;
      const supersedesId = doc.supersedes_document_id || doc.origin_document_id;
      if (supersedesId && job.userId && job.businessId) {
        try {
          const prevRef = db.doc(`users/${job.userId}/businesses/${job.businessId}/documents/${supersedesId}`);
          const prevSnap = await prevRef.get();
          if (prevSnap.exists) prevDocNo = (prevSnap.data() as DocumentData).docNo;
        } catch {
          // ignore
        }
      }

      // Prefer short link for PDF delivery (avoid long signed URLs)
      try {
        const pdfPath = doc.pdf_path || doc.pdfPath;
        const docNo = doc.docNo || (doc as any).doc_no || '';
        const docType = (doc as any).doc_type || doc.docType || '';
        if (pdfPath && job.userId && job.businessId && docNo && docType) {
          const token = await getOrCreateShortLink({
            docId: docRef.id,
            docNo: String(docNo),
            docType: String(docType),
            pdfPath: String(pdfPath),
            userId: job.userId,
            businessId: job.businessId,
          });
          (doc as any).pdfUrl = buildShortUrl(token);
          (doc as any).pdf_short_token = token;
        }
      } catch (err) {
        console.warn({ message: 'Short link generation failed (non-blocking)', error: err, ...logContext });
      }

      // Build messages using template builder
      const messages = buildLineDeliveryMessage(doc, business, prevDocNo);
      // console.log('[deliverLine] Built messages:', JSON.stringify(messages)); // Too verbose

      try {
        console.info({ message: 'Sending to LINE...', ...logContext });
        const resp = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getLineChannelAccessToken()}`,
          },
          body: JSON.stringify({ to, messages }),
        });

        if (!resp.ok) {
          const text = await resp.text();
          console.error({ message: 'LINE error response', status: resp.status, text, ...logContext });

          // Classify the error for better observability
          const errorClassification = classifyLineError(resp.status, text);
          console.warn({ message: 'Error classified', reason: errorClassification.reason, ...logContext });

          // If not retryable, mark as FAILED and stop
          if (!errorClassification.isRetryable) {
            console.error({
              message: 'Permanent failure',
              reason: errorClassification.reason,
              detail: errorClassification.message,
              ...logContext
            });
            const now = admin.firestore.Timestamp.now();
            await jobRef.set({
              status: 'FAILED',
              attempt: (job.attempt || 0) + 1,
              lastError: {
                reason: errorClassification.reason,
                message: errorClassification.message,
                details: text.slice(0, 500)  // Store first 500 chars of LINE response
              },
              updatedAt: now,
              // TTL: Keep FAILED jobs for 90 days for debugging
              expiresAt: admin.firestore.Timestamp.fromDate(
                new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              )
            }, { merge: true });
            await docRef.set({ deliveryState: 'FAILED', updatedAt: now }, { merge: true });
            res.status(200).send(`Delivery failed: ${errorClassification.reason}`);
            return;
          }

          // If retryable, throw to let Cloud Tasks handle retry
          console.info({ message: 'Transient error, will retry', ...logContext });
          throw new Error(`LINE push ${errorClassification.reason}: ${errorClassification.message}`);
        }

        // Success: mark job SENT and update document deliveryState
        console.info({ message: 'LINE push successful', ...logContext });
        const now = admin.firestore.Timestamp.now();
        await jobRef.set({
          status: 'SENT',
          sentAt: now,
          updatedAt: now,
          // TTL: Keep SENT jobs for 30 days for audit/debugging
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          )
        }, { merge: true });
        await docRef.update({
          status: DocumentState.DELIVERED, // Spec v1.0
          deliveryState: 'SENT', // Legacy
          updatedAt: now
        });

        // Audit Log
        if (job.docId && job.userId && job.businessId) {
          await logStatusTransition({
            docId: job.docId,
            docPath: docRef.path,
            userId: job.userId,
            businessId: job.businessId,
            fromStatus: DocumentState.PDF_READY,
            toStatus: DocumentState.DELIVERED,
            action: 'deliver',
            metadata: { source: 'LINE_WORKER', jobId }
          }).catch(e => console.error({ message: 'Audit log failed', error: e, ...logContext }));
        }

        res.status(200).send('OK');
        return;
      } catch (err: unknown) {
        // On failure, increment attempt and set nextRunAt for retry; throw to allow Cloud Tasks retry if desired
        const attempt = (job.attempt || 0) + 1;
        const backoff = getBackoffForAttempt(attempt);
        const nextRun = admin.firestore.Timestamp.fromMillis(Date.now() + backoff * 1000);
        await jobRef.set({
          attempt,
          status: 'FAILED',
          nextRunAt: nextRun,
          lastError: { message: String((err as Error)?.message ?? err) },
          updatedAt: admin.firestore.Timestamp.now(),
          // TTL: Keep FAILED jobs for 90 days for debugging
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          )
        }, { merge: true });
        await docRef.set({ deliveryState: 'FAILED', updatedAt: admin.firestore.Timestamp.now() }, { merge: true });
        console.error({ message: 'Delivery failed for job', error: err, ...logContext });
        // Throw so Cloud Tasks can apply retry policy if configured
        res.status(500).send('Delivery failed');
        return;
      }
    } catch (error) {
      console.error({ message: 'deliverLineTaskHandler error', error });
      res.status(500).send('Internal error');
    }
  });
