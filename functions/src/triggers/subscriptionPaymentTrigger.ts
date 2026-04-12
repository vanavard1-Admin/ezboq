/**
 * Firestore Trigger: subscription_requests/{workspaceId}
 *
 * When a new subscription request with slipUrl is created:
 * 1. Notify admin via Discord + LINE
 * 2. Run Google Vision OCR on the slip
 * 3. Auto-approve if OCR passes, otherwise mark for manual review
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { parseThaiSlipText } from '../services/slipOcrService';
import { sendSubscriptionConfirmationEmail } from '../services/subscriptionEmailService';

const ADMIN_LINE_USER_ID = 'Uc044c147f51798d1fb71560fa48acecb';
const DISCORD_ADMIN_CHANNEL_ID = '1484941156906434616';
// EzBOQ Server channels
const EZBOQ_PAYMENT_CHANNEL = '1491009305917259927';

interface SubscriptionRequest {
  plan: 'solo' | 'team' | null;
  status: string;
  userName?: string;
  userEmail?: string;
  workspaceId?: string;
  slipUrl?: string;
  slipPath?: string;
  createdAt: string;
  paymentHistory?: Array<{ amount: number }>;
}

/**
 * Send Discord notification to admin
 */
async function notifyDiscord(data: SubscriptionRequest, workspaceId: string): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.warn('[subPayment] DISCORD_BOT_TOKEN not set, skipping Discord notification');
    return;
  }

  const planName = data.plan === 'team' ? 'Business (฿279)' : 'Pro (฿99)';
  const amount = data.paymentHistory?.[0]?.amount || 0;

  const embed = {
    title: '💳 สลิปชำระเงินใหม่',
    color: 0xf59e0b, // amber
    fields: [
      { name: 'แพ็กเกจ', value: planName, inline: true },
      { name: 'จำนวนเงิน', value: `฿${amount}`, inline: true },
      { name: 'ผู้ใช้', value: data.userName || '-', inline: true },
      { name: 'อีเมล', value: data.userEmail || '-', inline: false },
      { name: 'Workspace', value: workspaceId, inline: false },
    ],
    image: data.slipUrl ? { url: data.slipUrl } : undefined,
    timestamp: new Date().toISOString(),
  };

  const channels = [DISCORD_ADMIN_CHANNEL_ID, EZBOQ_PAYMENT_CHANNEL];
  for (const channelId of channels) {
    try {
      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[subPayment] Discord notification failed (${channelId}):`, res.status, body.slice(0, 200));
      }
    } catch (err) {
      console.warn(`[subPayment] Discord notification error (${channelId}):`, err);
    }
  }
}

/**
 * Send LINE notification to admin
 */
async function notifyAdminLine(data: SubscriptionRequest, workspaceId: string): Promise<void> {
  const { getLineChannelAccessToken } = await import('../shared/config');
  const token = getLineChannelAccessToken();
  if (!token) return;

  const planName = data.plan === 'team' ? 'Business' : 'Pro';
  const amount = data.paymentHistory?.[0]?.amount || 0;

  const message = `💳 สลิปชำระเงินใหม่
แพ็กเกจ: ${planName} (฿${amount})
ผู้ใช้: ${data.userName || '-'}
อีเมล: ${data.userEmail || '-'}
Workspace: ${workspaceId}
สถานะ: รอตรวจสอบ`;

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: ADMIN_LINE_USER_ID,
        messages: [{ type: 'text', text: message }],
      }),
    });
    if (!res.ok) {
      console.warn('[subPayment] LINE admin notification failed:', res.status);
    }
  } catch (err) {
    console.warn('[subPayment] LINE admin notification error:', err);
  }
}

/**
 * Run OCR on slip and auto-verify
 */
async function processSlipOcr(
  data: SubscriptionRequest,
  workspaceId: string,
): Promise<{ verified: boolean; reason: string }> {
  if (!data.slipUrl) {
    return { verified: false, reason: 'No slip URL' };
  }

  try {
    const { ImageAnnotatorClient } = await import('@google-cloud/vision');
    const client = new ImageAnnotatorClient();

    // Download slip image
    const imageRes = await fetch(data.slipUrl);
    if (!imageRes.ok) {
      return { verified: false, reason: 'Failed to download slip image' };
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // Run Vision OCR
    const [result] = await client.textDetection({ image: { content: imageBuffer } });
    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      return { verified: false, reason: 'No text detected in slip image' };
    }

    const rawText = detections[0].description || '';
    const parsed = parseThaiSlipText(rawText);
    const expectedAmount = data.paymentHistory?.[0]?.amount || 0;

    // Update the request with OCR results
    const db = admin.firestore();
    const ocrData = {
      ocrRawText: rawText.slice(0, 2000),
      ocrParsedAmount: parsed.amount,
      ocrReceiverMatched: parsed.receiverMatched,
      ocrSuffixMatched: parsed.suffixMatched,
      ocrRef: parsed.ref,
      ocrProcessedAt: new Date().toISOString(),
    };

    await db.collection('subscription_requests').doc(workspaceId).update(ocrData);

    // Auto-verify: amount matches + receiver matched
    const amountMatches = parsed.amount !== null && Math.abs(parsed.amount - expectedAmount) <= 1;
    const isVerified = amountMatches && parsed.receiverMatched;

    if (isVerified) {
      // Auto-approve subscription
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 30);

      const approvalData = {
        status: 'active',
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        approvedBy: 'ocr_auto',
        approvedAt: now.toISOString(),
      };

      const subRef = db.collection('workspaces').doc(workspaceId)
        .collection('subscription').doc('current');

      await db.collection('subscription_requests').doc(workspaceId).update(approvalData);
      await subRef.update(approvalData);

      return { verified: true, reason: `OCR verified: ฿${parsed.amount}, receiver matched` };
    }

    const reasons: string[] = [];
    if (!amountMatches) reasons.push(`amount ${parsed.amount ?? 'N/A'} vs expected ${expectedAmount}`);
    if (!parsed.receiverMatched) reasons.push('receiver not matched');

    return { verified: false, reason: `OCR incomplete: ${reasons.join(', ')}` };
  } catch (err) {
    console.error('[subPayment] OCR error:', err);
    return { verified: false, reason: `OCR error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Firestore trigger: subscription_requests/{workspaceId} onCreate
 */
export const onSubscriptionPayment = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['LINE_CHANNEL_ACCESS_TOKEN', 'DISCORD_BOT_TOKEN', 'SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
    memory: '512MB',
    timeoutSeconds: 120,
  })
  .firestore.document('subscription_requests/{workspaceId}')
  .onCreate(async (snap, context) => {
    const data = snap.data() as SubscriptionRequest;
    const workspaceId = context.params.workspaceId;

    if (!data.slipUrl) {
      console.log('[subPayment] No slipUrl, skipping');
      return;
    }

    console.log(`[subPayment] New payment slip: workspace=${workspaceId}, plan=${data.plan}`);

    // 1. Notify admin (Discord + LINE) in parallel
    await Promise.allSettled([
      notifyDiscord(data, workspaceId),
      notifyAdminLine(data, workspaceId),
    ]);

    // 2. Run OCR verification
    const ocrResult = await processSlipOcr(data, workspaceId);
    console.log(`[subPayment] OCR result: verified=${ocrResult.verified}, reason=${ocrResult.reason}`);

    // 3. Notify admin of OCR result
    if (ocrResult.verified) {
      // Update Discord with approval
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken) {
        await fetch(`https://discord.com/api/v10/channels/${DISCORD_ADMIN_CHANNEL_ID}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: `✅ **อนุมัติอัตโนมัติ** — ${data.userName} (${data.plan === 'team' ? 'Business' : 'Pro'})\nOCR: ${ocrResult.reason}`,
          }),
        }).catch(() => {});
      }

      // Send confirmation email to user
      if (data.userEmail) {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 30);
        await sendSubscriptionConfirmationEmail({
          email: data.userEmail,
          name: data.userName || data.userEmail,
          plan: data.plan || 'solo',
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
          amount: data.paymentHistory?.[0]?.amount || 0,
        }).catch((err) => console.warn('[subPayment] Confirmation email failed:', err));
      }
    } else {
      // Update subscription request with review needed
      await admin.firestore().collection('subscription_requests').doc(workspaceId).update({
        ocrVerified: false,
        ocrReason: ocrResult.reason,
        needsManualReview: true,
      });
    }
  });

/**
 * Firestore trigger: subscription_requests/{workspaceId} onUpdate
 * Handles re-submission (slip update on existing request)
 */
export const onSubscriptionPaymentUpdate = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['LINE_CHANNEL_ACCESS_TOKEN', 'DISCORD_BOT_TOKEN', 'SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
    memory: '512MB',
    timeoutSeconds: 120,
  })
  .firestore.document('subscription_requests/{workspaceId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as SubscriptionRequest;
    const after = change.after.data() as SubscriptionRequest;
    const workspaceId = context.params.workspaceId;

    // Only process if slipUrl changed (new slip uploaded)
    if (!after.slipUrl || after.slipUrl === before.slipUrl) return;
    if (after.status === 'active') return;

    console.log(`[subPayment] Slip updated: workspace=${workspaceId}`);

    await Promise.allSettled([
      notifyDiscord(after, workspaceId),
      notifyAdminLine(after, workspaceId),
    ]);

    const ocrResult = await processSlipOcr(after, workspaceId);
    console.log(`[subPayment] OCR update result: verified=${ocrResult.verified}, reason=${ocrResult.reason}`);

    if (ocrResult.verified) {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken) {
        await fetch(`https://discord.com/api/v10/channels/${DISCORD_ADMIN_CHANNEL_ID}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: `✅ **อนุมัติอัตโนมัติ** — ${after.userName} (${after.plan === 'team' ? 'Business' : 'Pro'})\nOCR: ${ocrResult.reason}`,
          }),
        }).catch(() => {});
      }

      // Send confirmation email to user
      if (after.userEmail) {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 30);
        await sendSubscriptionConfirmationEmail({
          email: after.userEmail,
          name: after.userName || after.userEmail,
          plan: after.plan || 'solo',
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
          amount: after.paymentHistory?.[0]?.amount || 0,
        }).catch((err) => console.warn('[subPaymentUpdate] Confirmation email failed:', err));
      }
    }
  });
