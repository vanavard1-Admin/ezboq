import { getDb } from '../core/firebaseAdmin';
/**
 * PDF Delivery Task Handler
 * Delivers PDF link to LINE user after generation
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import * as crypto from 'crypto';
import { incrementPdfDelivery } from '../core/statsMonthly';
import { getSignedUrlDays, signPdfPath } from '../shared/pdfSigning';
import { getDeliveryTaskAudience, getLineChannelAccessToken } from '../shared/config';
import { buildPdfFlexMessage, getDocTypeInfo } from '../shared/pdfFlexMessage';
import { OAuth2Client } from 'google-auth-library';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';
// Note: LINE_CHANNEL_ACCESS_TOKEN must be read inside function, not at module level
// because secrets are injected at runtime, not build time

// Short link config
const SHORT_LINK_EXPIRY_DAYS = 90; // Links expire after 90 days
// Single source of truth for PDF signed URL policy (Option B)

/**
 * Generate cryptographically secure random token
 * 16 bytes = 128 bits = 22 characters base64url
 */
function generateSecureToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}



interface PdfDeliveryPayload {
  userId: string;
  docId: string;
  docType: string;
  docNo: string;
  pdfUrl?: string;      // Optional - can generate from pdf_path
  businessId?: string;  // REQUIRED for nested system-of-record (legacy payloads will be rejected)
}

// ✅ Base URL for short links (Firebase Hosting)
const SHORT_URL_BASE = process.env.SHORT_URL_BASE || 'https://ezdoc-v1-th.web.app';
const REGION = 'asia-southeast1';
const PROJECT_ID = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || 'ezdoc-v1-th';

/**
 * Send PDF link via LINE Flex Message with premium card
 * ✅ Uses shared buildPdfFlexMessage (gradient, share, next-step)
 * ✅ Tokenized short URLs (secure + shareable)
 */
async function sendPdfToLine(
  lineUserId: string,
  docType: string,
  docNo: string,
  shortToken: string  // ← Secure random token (not docId)
): Promise<void> {
  const lineToken = getLineChannelAccessToken();
  console.log(`[LINE] token present: ${!!lineToken}, len: ${lineToken.length}`);

  if (!lineToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
  }

  // ✅ Build URLs from short token
  const viewUrl = `${SHORT_URL_BASE}/p/${shortToken}`;
  const downloadUrl = `${SHORT_URL_BASE}/p/${shortToken}?download=1`;

  // ✅ Use shared premium Flex builder (gradient header, share button, next-step)
  const docTypeInfo = getDocTypeInfo(docType);
  const flexMessage = buildPdfFlexMessage({
    documentNo: docNo,
    downloadUrl,
    docTypeInfo,
    rawDocType: docType,
    shareUrl: viewUrl,
  });

  const response = await fetch(LINE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lineToken}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [flexMessage],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LINE API error ${response.status}: ${errorText}`);
  }

  console.log(`[PDF Delivery] Flex message sent to LINE user ${lineUserId}`);
}

/**
 * Send error notification via LINE push message
 * ✅ Safety net: inform user when PDF delivery fails
 */
async function sendErrorToLine(
  lineUserId: string,
  errorMessage: string
): Promise<void> {
  const token = getLineChannelAccessToken();

  if (!token) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
  }

  const message = {
    type: 'text',
    text: errorMessage,
  };

  const response = await fetch(LINE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [message],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LINE API error ${response.status}: ${errorText}`);
  }
}

/**
 * Cloud Function handler for PDF delivery tasks
 * 
 * Triggered by Cloud Tasks from deliveryQueueService
 * 
 * Payload:
 *   {
 *     userId: string,      // Firestore userId (not LINE userId)
 *     docId: string,
 *     docType: string,
 *     docNo: string,
 *     pdfUrl: string
 *   }
 */
export const deliverPdfTaskHandler = functions.https.onRequest(
  {
    region: 'asia-southeast1',
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: ['LINE_CHANNEL_ACCESS_TOKEN'], // ← Add secret access
  },
  async (req, res) => {
    try {
      // Only accept POST
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const authHeader = (req.get('authorization') || req.get('Authorization') || '') as string;
      if (!authHeader) {
        res.status(401).json({ error: 'Missing Authorization header' });
        return;
      }
      const match = authHeader.match(/^Bearer\s+(.*)$/i);
      if (!match) {
        res.status(401).json({ error: 'Invalid Authorization header' });
        return;
      }
      const idToken = match[1];
      const defaultAudience = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/deliverPdfTaskHandler`;
      const audience = getDeliveryTaskAudience() || defaultAudience;
      const client = new OAuth2Client();
      try {
        await client.verifyIdToken({ idToken, audience });
      } catch (err) {
        console.warn('[PDF Delivery] OIDC verification failed', err);
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const payload = req.body as PdfDeliveryPayload;
      const { userId, docId, docType, docNo, businessId } = payload;
      const { pdfUrl } = payload;

      console.info({ message: 'Task received for doc', docId, severity: 'INFO' });

      // Validate payload (pdfUrl is optional - can generate from pdf_path)
      if (!userId || !docId || !docType || !docNo) {
        res.status(400).json({
          error: 'INVALID_PAYLOAD',
          message: 'Missing required fields (userId, docId, docType, docNo)',
        });
        return;
      }

      // Get LINE userId from user account
      const db = getDb();
      const userSnap = await db.collection('users').doc(userId).get();

      if (!userSnap.exists) {
        console.error({ message: 'User not found', userId, severity: 'ERROR' });
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message: `User ${userId} not found`,
        });
        return;
      }

      const userData = userSnap.data()!;
      const lineUserId = userData.lineUserId;

      if (!lineUserId) {
        console.error({ message: 'User has no LINE account linked', userId, severity: 'ERROR' });
        res.status(400).json({
          error: 'NO_LINE_ACCOUNT',
          message: 'User has no LINE account linked',
        });
        return;
      }

      // Send PDF link via LINE
      try {
        // ✅ System of Record: nested documents only
        if (!businessId) {
          res.status(400).json({
            error: 'MISSING_BUSINESS_ID',
            message: 'businessId is required (nested documents are the only source of truth)',
          });
          return;
        }

        const docRef = db.doc(`users/${userId}/businesses/${businessId}/documents/${docId}`);

        console.debug({ message: 'Document path', path: docRef.path });

        let canDeliver = false;
        let currentAttempts = 0;
        let shouldNotifyError = false;  // ✅ Safety net: flag to send error notification
        let errorNotifyMessage = '';    // ✅ Error message to send to user
        let finalPdfUrl = pdfUrl; // May be generated from pdf_path

        await db.runTransaction(async (transaction) => {
          const docSnap = await transaction.get(docRef);

          if (!docSnap.exists) {
            throw new Error(`Document ${docId} not found`);
          }

          const docData = docSnap.data()!;
          const status = docData.pdf_delivery_status;

          // ✅ If no pdfUrl provided, generate from pdf_path
          if (!finalPdfUrl && docData.pdf_path) {
            console.debug({ message: 'Generating signed URL', pdf_path: docData.pdf_path });
            const bucket = admin.storage().bucket();
            const file = bucket.file(docData.pdf_path);

            // ✅ HARD GUARD 1: Check if file exists before signing
            const [exists] = await file.exists();
            if (!exists) {
              const errorMsg = `PDF object not found: gs://${bucket.name}/${docData.pdf_path}`;
              console.error({ message: errorMsg, severity: 'ERROR' });

              // Update status to FAILED and exit transaction
              transaction.update(docRef, {
                pdf_delivery_status: 'FAILED',
                pdf_delivery_error: 'PDF_OBJECT_NOT_FOUND',
                pdf_delivery_error_detail: errorMsg,
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
              });

              // ✅ SAFETY NET: Flag to send error notification to user
              shouldNotifyError = true;
              errorNotifyMessage = 'โอ๊ะ! ไฟล์ PDF ยังไม่พร้อมครับเจ้านาย\nลองใหม่ได้เลย หรือติดต่อแอดมินนะครับ';

              canDeliver = false;
              return; // Exit transaction - do NOT send LINE with dead link
            }

            // ✅ HARD GUARD 2: Check file size (must be > 1KB to be a valid PDF)
            // 1KB is enough to catch 68-byte placeholders while allowing small but valid PDFs
            const MIN_PDF_BYTES = 1000; // 1KB minimum for a real PDF
            const [metadata] = await file.getMetadata();
            const fileSize = parseInt(metadata.size as string, 10) || 0;

            console.debug({ message: 'File size check', fileSize });

            if (fileSize < MIN_PDF_BYTES) {
              const errorMsg = `PDF file too small (${fileSize} bytes < ${MIN_PDF_BYTES}): gs://${bucket.name}/${docData.pdf_path}`;
              console.error({ message: errorMsg, severity: 'ERROR' });

              // Update status to FAILED and exit transaction
              transaction.update(docRef, {
                pdf_delivery_status: 'FAILED',
                pdf_delivery_error: 'PDF_INVALID_SIZE',
                pdf_delivery_error_detail: errorMsg,
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
              });

              // ✅ SAFETY NET: Flag to send error notification to user
              shouldNotifyError = true;
              errorNotifyMessage = 'โอ๊ะ! ระบบสร้างไฟล์ PDF ไม่สำเร็จครับเจ้านาย\nลองใหม่ได้เลย หรือติดต่อแอดมินนะครับ';

              canDeliver = false;
              return; // Exit transaction - do NOT send LINE with invalid PDF
            }

            // ✅ Safe to sign - file exists AND has valid size
            // Use shared helper (single source of truth)
            finalPdfUrl = await signPdfPath(String(docData.pdf_path), { days: getSignedUrlDays() });
          }

          if (!finalPdfUrl) {
            throw new Error(`No pdfUrl and no pdf_path for document ${docId}`);
          }

          // ✅ A2: Guard - If delivery_sent=true (from credit_purchases), skip push
          // Note: Delivery idempotency is handled in slipOcrService
          // The main guard is the pdf_delivery_status check below

          // ✅ Check if already delivered (idempotent)
          if (status === 'SENT') {
            console.info({ message: 'Doc already SENT - skipping', docId, severity: 'INFO' });

            // ✅ A2: Log event for skipped delivery
            try {
              const { appendPaymentEvent } = await import('../services/paymentEvents');
              await appendPaymentEvent(docId, {
                event: 'PDF_DELIVERY_SKIPPED_ALREADY_SENT',
                handler: 'deliverPdfTaskHandler',
                result_code: 'SKIPPED',
                from_status: 'SENT',
                to_status: 'SENT',
                meta: {
                  reason: 'already_delivered',
                  docId,
                  docNo,
                },
              }).catch((err: any) => {
                console.warn({ message: 'Failed to log skip event (non-blocking)', error: err });
              });
            } catch {
              // Non-blocking
            }

            canDeliver = false;
            return;
          }

          // ✅ Check if stale SENDING (stuck for > 5 minutes)
          if (status === 'SENDING') {
            const claimedAt = docData.pdf_delivery_claimed_at?.toDate();
            const now = new Date();
            const staleThresholdMs = 5 * 60 * 1000; // 5 minutes

            // ✅ ถ้าไม่มี claimed_at → skip (อาจเป็น concurrent claim)
            if (!claimedAt) {
              console.warn({ message: 'SENDING without claimed_at - skipping', docId, severity: 'WARNING' });
              canDeliver = false;
              return;
            }

            // ✅ Check if fresh claim (< 5 min)
            if ((now.getTime() - claimedAt.getTime()) < staleThresholdMs) {
              console.info({ message: 'Already SENDING by another task (fresh)', docId, severity: 'INFO' });
              canDeliver = false;
              return;
            }

            // ✅ Stale claim (> 5 min) → takeover
            console.warn({ message: 'Stale SENDING (> 5 min) - taking over', docId, severity: 'WARNING' });
            // Fall through to claim SENDING again (override stale)
          }

          // ✅ Claim SENDING status (atomic lock) - use Timestamp.now() for immediate value
          currentAttempts = (docData.pdf_delivery_attempts || 0) + 1;
          const claimTime = admin.firestore.Timestamp.now();
          transaction.update(docRef, {
            pdf_delivery_status: 'SENDING',
            pdf_delivery_claimed_at: claimTime, // ← Use Timestamp.now() - immediate value
            pdf_delivery_attempts: currentAttempts,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });

          canDeliver = true;
        });

        // ✅ SAFETY NET: Send error notification to user if file was missing
        if (shouldNotifyError && errorNotifyMessage) {
          console.info({ message: 'Sending error notification to user', userId });
          try {
            await sendErrorToLine(lineUserId, errorNotifyMessage);
            console.info({ message: 'Error notification sent successfully' });
          } catch (notifyErr) {
            console.error({ message: 'Failed to send error notification', error: notifyErr });
            // Don't fail the whole request - error is already logged
          }
        }

        // ✅ If transaction failed to claim, return early
        if (!canDeliver) {
          res.json({
            success: true,
            message: 'PDF already delivered or being delivered (idempotent)',
            docId,
          });
          return;
        }

        // ✅ Check DRY_RUN mode (for testing without actual LINE delivery)
        const isDryRun = req.query.dryRun === '1' || req.headers['x-dry-run'] === '1';

        if (isDryRun) {
          console.info({ message: 'DRY_RUN mode - skipping LINE API call', docId });

          // ✅ Update status to SENT immediately (no actual delivery)
          await docRef.update({
            pdf_delivered_at: admin.firestore.FieldValue.serverTimestamp(),
            pdf_delivery_status: 'SENT',
            pdf_delivery_error: admin.firestore.FieldValue.delete(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });

          res.json({
            success: true,
            message: 'PDF delivery simulated (DRY_RUN)',
            docId,
            dryRun: true,
          });
          return;
        }

        // ✅ Now safe to send LINE message (only 1 task reaches here)
        console.info({ message: 'Sending to LINE', attempt: currentAttempts, docId });

        // Final guard: ensure we have a valid PDF path (URL generation verified earlier)
        if (!finalPdfUrl) {
          console.error({ message: 'No PDF URL available', docId, severity: 'ERROR' });
          await docRef.update({
            pdf_delivery_status: 'FAILED',
            pdf_delivery_error: 'NO_PDF_URL',
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
          res.status(500).json({
            error: 'NO_PDF_URL',
            message: 'Failed to generate PDF URL',
          });
          return;
        }

        try {
          // ✅ Get document data for short link
          const docSnap = await docRef.get();
          const docData = docSnap.data();
          const pdfPath = docData?.pdf_path;

          // ✅ Generate secure random token for short link
          const shortToken = generateSecureToken();

          // ✅ Calculate expiry date
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + SHORT_LINK_EXPIRY_DAYS);

          // ✅ Create tokenized short link mapping
          const db = getDb();
          await db.collection('pdf_short_links').doc(shortToken).set({
            token: shortToken,
            doc_id: docId,
            doc_no: docNo,
            doc_type: docType,
            pdf_path: pdfPath,
            user_id: userId,
            business_id: businessId || null,
            document_ref: docRef.path,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
            revoked_at: null,
          });

          console.info({
            message: 'Created secure short link',
            shortToken,
            path: pdfPath,
            expires: expiresAt.toISOString()
          });

          // ✅ Send LINE message with tokenized short URL
          await sendPdfToLine(lineUserId, docType, docNo, shortToken);

          console.info({ message: 'Successfully delivered to LINE', docId, userId });

          // ✅ A2: Update status to SENT + store token reference + log event
          await docRef.update({
            pdf_delivered_at: admin.firestore.FieldValue.serverTimestamp(),
            pdf_delivery_status: 'SENT',
            pdf_short_token: shortToken,  // Store token for reference
            pdf_delivery_error: admin.firestore.FieldValue.delete(), // Clear any previous error
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });

          // ✅ A2: Log delivery event
          try {
            const { appendPaymentEvent } = await import('../services/paymentEvents');
            await appendPaymentEvent(docId, {
              event: 'PDF_DELIVERY_SENT',
              handler: 'deliverPdfTaskHandler',
              result_code: 'OK',
              from_status: 'SENDING',
              to_status: 'SENT',
              meta: {
                docId,
                docNo,
                docType,
                shortToken,
                attempt: currentAttempts,
              },
            }).catch((err: any) => {
              console.warn({ message: 'Failed to log delivery event', error: err });
            });
          } catch {
            // Non-blocking
          }

          // ✅ Write-through stats update (non-blocking, idempotent by docId)
          if (businessId) {
            incrementPdfDelivery(businessId, true, docId).catch(err => {
              console.error({ message: 'Stats update failed', error: err });
            });
          }

          res.json({
            success: true,
            message: 'PDF delivered successfully',
            docId,
            shortUrl: `${SHORT_URL_BASE}/p/${shortToken}`,
          });

        } catch (lineError: any) {
          console.error({ message: 'LINE API error', error: lineError, severity: 'ERROR' });

          // ✅ Update status to FAILED (so it can be retried)
          await docRef.update({
            pdf_delivery_status: 'FAILED',
            pdf_delivery_error: lineError.message,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });

          // ✅ Write-through stats update for failure (non-blocking, idempotent by docId)
          if (businessId) {
            incrementPdfDelivery(businessId, false, docId).catch(err => {
              console.error({ message: 'Stats update failed (non-blocking)', error: err });
            });
          }

          // Return 500 to trigger retry by Cloud Tasks
          res.status(500).json({
            error: 'LINE_API_ERROR',
            message: lineError.message,
          });
        }

      } catch (transactionError: any) {
        console.error({ message: 'Transaction error', error: transactionError, severity: 'ERROR' });
        res.status(500).json({
          error: 'TRANSACTION_ERROR',
          message: transactionError.message,
        });
      }

    } catch (error: any) {
      console.error({ message: 'Task handler error', error: error.message, severity: 'ERROR' });
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error.message,
      });
    }
  }
);
