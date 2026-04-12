/**
 * Callable Cloud Function: verifySubscriptionSlip
 *
 * Called by the web frontend after uploading a payment slip.
 * Runs server-side OCR, verifies the payment, and auto-activates
 * the subscription if verification passes.
 *
 * Input: { workspaceId, slipPath }
 * Output: { status: 'active' | 'pending_review' | 'error', reason: string }
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { parseThaiSlipText } from '../services/slipOcrService';

interface VerifyRequest {
  workspaceId: string;
  slipPath: string;
}

interface VerifyResponse {
  status: 'active' | 'pending_review' | 'error';
  reason: string;
}

export const verifySubscriptionSlip = functions
  .region('asia-southeast1')
  .runWith({
    memory: '512MB',
    timeoutSeconds: 60,
  })
  .https.onCall(async (data: VerifyRequest, context): Promise<VerifyResponse> => {
    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }

    const { workspaceId, slipPath } = data;
    if (!workspaceId || !slipPath) {
      throw new functions.https.HttpsError('invalid-argument', 'workspaceId and slipPath required');
    }

    const db = admin.firestore();
    const uid = context.auth.uid;

    // 2. Verify user belongs to this workspace
    const wsDoc = await db.collection('workspaces').doc(workspaceId).get();
    const wsData = wsDoc.data();
    const members: string[] = wsData?.members ?? [];
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    if (!wsData || (!members.includes(uid) && userData?.workspaceId !== workspaceId)) {
      throw new functions.https.HttpsError('permission-denied', 'Not your workspace');
    }

    // 3. Get subscription request
    const subRef = db.collection('workspaces').doc(workspaceId)
      .collection('subscription').doc('current');
    const subSnap = await subRef.get();
    if (!subSnap.exists) {
      return { status: 'error', reason: 'No subscription request found' };
    }

    const subData = subSnap.data();
    if (!subData) {
      return { status: 'error', reason: 'Subscription data is empty' };
    }
    if (subData.status === 'active') {
      return { status: 'active', reason: 'Already active' };
    }

    const expectedAmount = subData.paymentHistory?.[0]?.amount || 0;
    const planId = subData.plan as string;

    // 4. Download slip from Storage
    let imageBuffer: Buffer;
    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(slipPath);
      const [exists] = await file.exists();
      if (!exists) {
        return { status: 'error', reason: 'Slip file not found in storage' };
      }
      const [buffer] = await file.download();
      imageBuffer = buffer;
    } catch (err) {
      console.error('[verifySubscriptionSlip] Download error:', err);
      return { status: 'error', reason: 'Failed to download slip' };
    }

    // 5. Run OCR
    let ocrText = '';
    let ocrParsed: { amount: number | null; receiverMatched: boolean; suffixMatched: boolean; ref: string | null } | null = null;
    try {
      const { ImageAnnotatorClient } = await import('@google-cloud/vision');
      const client = new ImageAnnotatorClient();
      const [result] = await client.textDetection({ image: { content: imageBuffer } });
      const detections = result.textAnnotations;

      if (detections && detections.length > 0) {
        ocrText = detections[0].description || '';
        ocrParsed = parseThaiSlipText(ocrText);
      }
    } catch (err) {
      console.warn('[verifySubscriptionSlip] Vision API error, falling back to manual review:', err);
      // Vision API not available — mark for manual review but still save what we have
    }

    // 6. Save OCR results
    const ocrData: Record<string, unknown> = {
      ocrProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      ocrRawText: ocrText.slice(0, 2000),
    };
    if (ocrParsed) {
      ocrData.ocrParsedAmount = ocrParsed.amount;
      ocrData.ocrReceiverMatched = ocrParsed.receiverMatched;
      ocrData.ocrSuffixMatched = ocrParsed.suffixMatched;
      ocrData.ocrRef = ocrParsed.ref;
    }

    // 7. Verify: amount matches + receiver matched
    const amountMatches = ocrParsed?.amount != null && Math.abs(ocrParsed.amount - expectedAmount) <= 1;
    const receiverOk = ocrParsed?.receiverMatched === true;
    const isVerified = amountMatches && receiverOk;

    if (isVerified) {
      // Auto-approve!
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 30);

      const approvalData = {
        status: 'active',
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        approvedBy: 'ocr_auto',
        approvedAt: now.toISOString(),
        ...ocrData,
      };

      // Update both subscription docs atomically
      const batch = db.batch();
      batch.update(subRef, approvalData);

      const reqRef = db.collection('subscription_requests').doc(workspaceId);
      const reqSnap = await reqRef.get();
      if (reqSnap.exists) {
        batch.update(reqRef, approvalData);
      }

      // Also update user plan
      const userRef = db.collection('users').doc(uid);
      const planMap: Record<string, string> = { solo: 'PRO', team: 'TEAM' };
      batch.update(userRef, {
        plan: planMap[planId] || 'PRO',
        canExportAll: true,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      console.log(`[verifySubscriptionSlip] Auto-approved: workspace=${workspaceId}, plan=${planId}, amount=${ocrParsed?.amount}`);
      return { status: 'active', reason: `ยืนยันสำเร็จ: ฿${ocrParsed?.amount}` };
    }

    // 8. Not verified — save OCR data and mark for manual review
    await subRef.update({
      ...ocrData,
      needsManualReview: true,
    });

    const reqRef = db.collection('subscription_requests').doc(workspaceId);
    const reqSnap = await reqRef.get();
    if (reqSnap.exists) {
      await reqRef.update({
        ...ocrData,
        ocrVerified: false,
        needsManualReview: true,
      });
    }

    const reasons: string[] = [];
    if (!ocrParsed) reasons.push('OCR ไม่สามารถอ่านสลิปได้');
    else {
      if (!amountMatches) reasons.push(`จำนวนเงิน ${ocrParsed.amount ?? 'อ่านไม่ได้'} ≠ ${expectedAmount}`);
      if (!receiverOk) reasons.push('ชื่อผู้รับไม่ตรง');
    }

    console.log(`[verifySubscriptionSlip] Manual review needed: workspace=${workspaceId}, reasons=${reasons.join(', ')}`);
    return {
      status: 'pending_review',
      reason: reasons.length > 0 ? reasons.join(', ') : 'รอแอดมินตรวจสอบ',
    };
  });
