import { getDb } from '../core/firebaseAdmin';
/**
 * Trust Commands Service (PHASE 1 - SEV-0)
 * 
 * 4 critical commands to prevent user panic:
 * 1. เอกสารล่าสุด - Latest document status
 * 2. ส่ง PDF อีกครั้ง - Resend PDF (no re-render)
 * 3. สถานะแพ็ค - Subscription status
 * 4. เช็คสลิป - Check slip OCR status
 */

import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { buildPdfFlexMessageWithShortLink } from '../shared/pdfFlexMessage';
import { getLineChannelAccessToken } from '../shared/config';
import type { QuickReplyAction } from '../shared/lineQuickReply';

const db = getDb();

/**
 * Get latest document for user with PDF status
 */
export async function getLatestDocument(
  userId: string,
  businessId: string
): Promise<{
  doc_no: string;
  status: string; // Document status (ISSUED, PDF_READY, etc.)
  pdf_status?: 'DONE' | 'PROCESSING' | 'FAILED' | 'PENDING' | 'NONE'; // PDF job status
  pdf_path?: string;
  pdf_short_token?: string;
  pdf_delivery_status?: string;
  pdf_generated_at?: admin.firestore.Timestamp;
  created_at?: admin.firestore.Timestamp;
  doc_id?: string;
} | null> {
  const docsRef = db
    .collection(`users/${userId}/businesses/${businessId}/documents`)
    .orderBy('created_at', 'desc')
    .limit(1);

  const snapshot = await docsRef.get();
  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  const docId = doc.id;
  const docNo = data.doc_no || docId;

  // Check PDF generation job status
  let pdfJobStatus: 'DONE' | 'PROCESSING' | 'FAILED' | 'PENDING' | 'NONE' = 'NONE';
  if (data.pdf_path) {
    pdfJobStatus = 'DONE';
  } else {
    // Check if there's a PDF job
    const jobQuery = await db
      .collection('pdf_generation_jobs')
      .where('user_id', '==', userId)
      .where('business_id', '==', businessId)
      .where('document_id', '==', docId)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (!jobQuery.empty) {
      const job = jobQuery.docs[0].data();
      const jobStatus = job.status;
      if (jobStatus === 'DONE') {
        pdfJobStatus = 'DONE';
      } else if (jobStatus === 'PROCESSING') {
        pdfJobStatus = 'PROCESSING';
      } else if (jobStatus === 'FAILED') {
        pdfJobStatus = 'FAILED';
      } else if (jobStatus === 'PENDING') {
        pdfJobStatus = 'PENDING';
      }
    }
  }

  return {
    doc_no: docNo,
    status: data.status || 'UNKNOWN',
    pdf_status: pdfJobStatus,
    pdf_path: data.pdf_path,
    pdf_short_token: data.pdf_short_token,
    pdf_delivery_status: data.pdf_delivery_status,
    pdf_generated_at: data.pdf_generated_at,
    created_at: data.created_at,
    doc_id: docId,
  };
}

/**
 * Resend PDF using existing short token (no re-render)
 */
export async function resendPdf(
  userId: string,
  businessId: string,
  lineUserId: string
): Promise<{ success: boolean; message: string }> {
  const latest = await getLatestDocument(userId, businessId);
  if (!latest) {
    return {
      success: false,
      message: 'โอ๊ะ! ยังไม่พบเอกสารล่าสุดครับเจ้านาย',
    };
  }

  if (!latest.pdf_path) {
    return {
      success: false,
      message: `ติ๊ดๆ เอกสาร ${latest.doc_no} ยังไม่มี PDF ครับ\nรอสักครู่แล้วพิมพ์ "เอกสารล่าสุด" อีกครั้งนะเจ้านาย`,
    };
  }

  // Get document to find docType
  const docId = latest.doc_id || latest.doc_no;
  const docRef = db.doc(`users/${userId}/businesses/${businessId}/documents/${docId}`);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return {
      success: false,
      message: 'โอ๊ะ! ไม่พบเอกสารครับเจ้านาย',
    };
  }

  const docData = docSnap.data()!;
  const docType = docData.doc_type || 'DOCUMENT';

  // Resend using existing token - use buildPdfFlexMessageWithShortLink and send directly
  const flexMessage = await buildPdfFlexMessageWithShortLink({
    docId: docSnap.id,
    docNo: latest.doc_no,
    docType,
    pdfPath: latest.pdf_path,
    userId,
    businessId,
  });

  // Send via LINE push API
  const accessToken = getLineChannelAccessToken();
  if (!accessToken) {
    return {
      success: false,
      message: 'โอ๊ะ! ระบบส่งข้อความยังไม่พร้อมครับ ลองใหม่อีกครั้งนะเจ้านาย',
    };
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [flexMessage],
      }),
    });

    if (!response.ok) {
      throw new Error(`LINE API error: ${response.status}`);
    }

    return {
      success: true,
      message: `ติ๊ดๆ ส่ง PDF ${latest.doc_no} แล้วครับเจ้านาย`,
    };
  } catch (err) {
    console.error('[resendPdf] Error:', err);
    return {
      success: false,
      message: `โอ๊ะ! ส่ง PDF ยังไม่สำเร็จครับ\nลองใหม่อีกครั้งได้เลยนะเจ้านาย`,
    };
  }
}

/**
 * Get credit balance for user
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<{
  plan: 'FREE' | 'PRO' | 'TEAM';
  status: string;
  seatTotal: number;
  seatUsed: number;
  periodEnd?: admin.firestore.Timestamp;
  autoRenew?: boolean;
}> {
  const { getOrCreateSubscription } = await import('../core/subscriptionService');
  const {
    getEffectiveSubscriptionPlan,
    getEffectiveSubscriptionStatus,
  } = await import('../core/planService');
  const subscription = await getOrCreateSubscription(userId);
  const plan = getEffectiveSubscriptionPlan(subscription);
  const status = getEffectiveSubscriptionStatus(subscription);

  return {
    plan,
    status,
    seatTotal: plan === 'TEAM' ? Math.max(subscription.seatTotal || 3, 1) : 1,
    seatUsed: plan === 'TEAM' ? Math.max(subscription.seatUsed || 1, 1) : 1,
    periodEnd: subscription.periodEnd,
    autoRenew: status === 'ACTIVE' ? subscription.autoRenew : false,
  };
}

/**
 * Get latest slip OCR status
 * Note: Uses credit_purchases collection (where slip images are stored)
 */
export async function getSlipOcrStatus(
  userId: string,
  lineUserId?: string | null
): Promise<{
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'NONE';
  message: string;
  quickReply?: QuickReplyAction[];
  creditsAdded?: number;
  error?: string;
  ocrDate?: admin.firestore.Timestamp;
}> {
  try {
    const purchasesRef = db
      .collection('credit_purchases')
      .where('user_id', '==', userId)
      .where('slip_image_url', '!=', null)
      .orderBy('slip_image_url')
      .orderBy('created_at', 'desc')
      .limit(1);

    let purchaseSnap = await purchasesRef.get().catch(() => null);
    if (!purchaseSnap || purchaseSnap.empty) {
      const simpleRef = db
        .collection('credit_purchases')
        .where('user_id', '==', userId)
        .orderBy('created_at', 'desc')
        .limit(5);

      purchaseSnap = await simpleRef.get();
      const withSlip = purchaseSnap.docs.filter(doc => {
        const data = doc.data();
        return data.slip_image_url;
      });

      if (withSlip.length === 0 && lineUserId) {
        const byLineRef = db
          .collection('credit_purchases')
          .where('lineUserId', '==', lineUserId)
          .orderBy('created_at', 'desc')
          .limit(5);

        const lineSnap = await byLineRef.get();
        const withSlipByLine = lineSnap.docs.filter(doc => {
          const data = doc.data();
          return data.slip_image_url;
        });

        if (withSlipByLine.length === 0) {
          return {
            status: 'NONE',
            message: 'ยังไม่เคยส่งสลิปนะครับเจ้านาย',
          };
        }

        purchaseSnap = { docs: [withSlipByLine[0]], empty: false } as typeof purchaseSnap;
      } else if (withSlip.length === 0) {
        return {
          status: 'NONE',
          message: 'ยังไม่เคยส่งสลิปนะครับเจ้านาย',
        };
      } else {
        purchaseSnap = { docs: [withSlip[0]], empty: false } as typeof purchaseSnap;
      }
    }

    const purchase = purchaseSnap.docs[0].data();
    const purchaseStatus = purchase.status;
    const ocrDate = purchase.created_at || purchase.uploaded_at;

  // Status mapping: PENDING_REVIEW = PENDING, COMPLETED = SUCCESS, REJECTED = FAILED
  if (purchaseStatus === 'PENDING_REVIEW' || purchaseStatus === 'PENDING') {
    return {
      status: 'PENDING',
      message: 'ติ๊ดๆ กำลังตรวจสอบสลิปครับ รอสักครู่นะเจ้านาย',
      ocrDate,
    };
  }

  if (purchaseStatus === 'COMPLETED' || purchaseStatus === 'SUCCESS') {
    const { getPackagePlan } = await import('./purchaseService');
    const planName = getPackagePlan(purchase.packageType) === 'TEAM' ? 'Team' : '99';
    return {
      status: 'SUCCESS',
      message: `บี๊บ! ตรวจสอบสลิปเรียบร้อยครับ\nเปิดใช้งานแพ็ก ${planName} แล้วเจ้านาย`,
      ocrDate,
    };
  }

    if (purchaseStatus === 'REJECTED' || purchaseStatus === 'FAILED') {
      const error = purchase.reject_reason || purchase.error || 'ไม่สามารถอ่านสลิปได้';
      const { getPaymentRetryButtons } = await import('../ui/quickReplies');
      return {
        status: 'FAILED',
        message: `โอ๊ะ! ตรวจสอบสลิปยังไม่ผ่านครับ\n${error}\n\nลองส่งสลิปใหม่ได้เลยนะเจ้านาย`,
        quickReply: getPaymentRetryButtons(),
        error,
        ocrDate,
      };
    }

    return {
      status: 'NONE',
      message: `สถานะ ${purchaseStatus || 'ไม่ทราบ'} ครับเจ้านาย`,
    };
  } catch (error: any) {
    console.error('[getSlipOcrStatus] Failed to check slip status:', error);
    const { getPaymentRetryButtons } = await import('../ui/quickReplies');
    return {
      status: 'FAILED',
      message: 'โอ๊ะ! ระบบขัดข้องชั่วคราวครับ\nลองใหม่ได้เลยนะเจ้านาย',
      quickReply: getPaymentRetryButtons(),
      error: error?.message || String(error),
    };
  }
}
