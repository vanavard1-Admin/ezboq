import * as admin from 'firebase-admin';
import { getLineUserIdFromFirebaseUid } from '../core/lineUserMapping';
import { getDb } from '../core/firebaseAdmin';
import {
  getDocTypeInfo,
  buildPdfFlexMessageWithShortLink,
} from '../shared/pdfFlexMessage';
import { getLineChannelAccessToken } from '../shared/config';
import {
  GeneratedDocDeliveryPayload,
  LineGeneratedDocDeliveryAdapter,
  AdapterAcceptResponse,
} from '../services/lineDeliveryAdapter';
import { orchestrateGeneratedDocLineDelivery } from '../services/generatedDocLineOrchestrator';

/**
 * Deliver PDF to LINE user via push message
 * Called after pdf_generation_jobs reaches DONE status
 * Sends PDF link to user via LINE push or reply
 *
 * Security: Uses short links (pdfRedirect tokens) instead of raw signed URLs
 * Idempotency: Skips if delivery_status == DONE
 */

const LINE_API_PUSH = 'https://api.line.me/v2/bot/message/push';

export interface PdfDeliveryPayload {
  userId: string; // Firebase UID
  businessId: string;
  documentNo: string;
  documentId: string;
  pdfPath: string;
  documentType?: string;
  traceId?: string; // ✅ Add traceId to payload
}

function buildLinePushMessages(documentType: string | undefined, documentNo: string, flexMessage: Record<string, unknown>) {
  const normalizedType = (documentType || '').toUpperCase();
  const isQuotation = ['QUOTATION', 'QUO', 'QT'].includes(normalizedType);

  const messages: Array<Record<string, unknown>> = [flexMessage];
  if (isQuotation) {
    messages.push({
      type: 'text',
      text:
        `บี๊บ! เอกสารพร้อมแล้วครับเจ้านาย\n` +
        `จะทำใบวางบิลหรือออกครบชุดจาก ${documentNo} ต่อเลยมั้ยครับ?`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: 'ทำใบวางบิลต่อ',
              text: `ใบวางบิลจาก ${documentNo}`,
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: 'ออกครบชุด',
              text: `ออกครบชุดจาก ${documentNo}`,
            },
          },
        ],
      },
    });
  }

  return messages;
}

class LinePushGeneratedDocAdapter implements LineGeneratedDocDeliveryAdapter {
  readonly channel = 'LINE' as const;
  readonly adapterName = 'line-messaging-api-v1';

  async sendGeneratedDocument(payload: GeneratedDocDeliveryPayload): Promise<AdapterAcceptResponse> {
    const {
      lineUserId,
      docNo,
      docType,
      docId,
      pdfPath,
      userId,
      businessId,
    } = payload;

    const accessToken = getLineChannelAccessToken();
    if (!accessToken) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
    }

    const docTypeInfo = getDocTypeInfo(docType);
    const flexMessage = await buildPdfFlexMessageWithShortLink({
      docId,
      docNo,
      docType,
      pdfPath,
      userId,
      businessId,
    });

    const requestBody = {
      to: lineUserId,
      messages: buildLinePushMessages(docType, docNo, flexMessage),
    };

    // Security: Log only doc_no and pdf_path, NOT signed URL
    console.log(`[pdfDelivery] Pushing ${docTypeInfo.label} to LINE: doc_no=${docNo}, pdf_path=${pdfPath}`);

    const response = await fetch(LINE_API_PUSH, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`LINE API error: ${response.status} ${errorBody}`);
    }

    console.log(`[pdfDelivery] Successfully delivered ${docTypeInfo.label}: doc_no=${docNo}`);

    return {
      acceptedAt: new Date().toISOString(),
      providerRequestId: response.headers.get('x-line-request-id') || undefined,
      providerStatus: 'ACCEPTED',
    };
  }
}

/**
 * Push PDF link to LINE user via Flex message with short link
 */
export async function deliverPdfToLine(payload: PdfDeliveryPayload): Promise<void> {
  const { userId, businessId, documentNo, documentId, pdfPath, documentType, traceId } = payload;

  const lineUserId = await getLineUserIdFromFirebaseUid(userId);
  if (!lineUserId) {
    console.warn(`[pdfDelivery] No LINE user ID linked to Firebase UID ${userId}`);
    return;
  }

  const adapter = new LinePushGeneratedDocAdapter();
  await adapter.sendGeneratedDocument({
    lineUserId,
    docId: documentId,
    docNo: documentNo,
    docType: documentType || '',
    pdfPath,
    businessId,
    userId,
    traceId,
  });
}

/**
 * Cloud Firestore trigger: When pdf_generation_jobs.status → DONE
 * Automatically send notification to LINE user
 *
 * Idempotency: Skips if delivery_status == DONE
 */
export async function onPdfJobCompleted(
  snap: admin.firestore.DocumentSnapshot
): Promise<void> {
  const job = snap.data() as Record<string, unknown>;
  const jobId = snap.id;

  if (job.status !== 'DONE') {
    return;
  }

  // Idempotency guard: skip if already delivered
  if (job.delivery_status === 'DONE') {
    console.log(`[onPdfJobCompleted] Job ${jobId} already delivered, skipping`);
    return;
  }

  const db = getDb();
  const jobRef = db.collection('pdf_generation_jobs').doc(jobId);

  try {
    // Mark as delivering (prevent duplicate deliveries)
    await jobRef.update({
      delivery_status: 'DELIVERING',
      delivery_started_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get pdf_path (required for short link)
    const pdfPath = (job.pdf_path as string | undefined) || null;
    if (!pdfPath) {
      console.warn(`[onPdfJobCompleted] Job ${jobId} DONE but no pdf_path; skip delivery`);
      await jobRef.update({ delivery_status: 'SKIPPED', delivery_error: 'NO_PDF_PATH' });
      return;
    }

    // Extract doc_type from job or infer from document_no prefix
    let docType = (job.doc_type as string | undefined) || (job.document_type as string | undefined);
    if (!docType) {
      const docNo = job.document_no as string;
      const prefix = docNo?.split('-')[0]?.toUpperCase();
      if (prefix) {
        docType = prefix;
      }
    }

    const traceId = (job.traceId || job.correlationId) as string | undefined;
    console.log(`[onPdfJobCompleted] Delivering: jobId=${jobId}, doc_no=${job.document_no}, doc_type=${docType || 'inferred'}, traceId=${traceId || 'n/a'}`);

    const lineUserId = await getLineUserIdFromFirebaseUid(job.user_id as string);
    if (!lineUserId) {
      console.warn(`[onPdfJobCompleted] No LINE link found for uid=${job.user_id as string}`);
      await jobRef.update({
        delivery_status: 'SKIPPED',
        delivery_error: 'NO_LINE_USER_ID',
      });
      return;
    }

    await orchestrateGeneratedDocLineDelivery({
      jobId,
      adapter: new LinePushGeneratedDocAdapter(),
      payload: {
        lineUserId,
        docId: job.document_id as string,
        docNo: job.document_no as string,
        docType: docType || '',
        pdfPath,
        userId: job.user_id as string,
        businessId: job.business_id as string,
        traceId,
      },
    });

    console.log(`[onPdfJobCompleted] Delivery complete: jobId=${jobId}`);
  } catch (err) {
    console.error(`[onPdfJobCompleted] Error for job ${jobId}:`, err);

    // Mark as failed (don't throw - job is DONE, delivery is best-effort)
    await jobRef
      .update({
        delivery_status: 'FAILED',
        delivery_error: String(err),
      })
      .catch(() => {});
  }
}
