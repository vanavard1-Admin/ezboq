import { getDb } from '../core/firebaseAdmin';
/**
 * Admin Notification Service
 *
 * Sends slip review notifications to admin LINE + email.
 */

import * as admin from 'firebase-admin';
import { pushLineMessage, pushLineFlexAdminSlipReview } from './lineService';
import { getAdminEmailRecipients, getAdminFirebaseUids, getAdminLineUserIds } from './adminAuthService';
import { getSendgridApiKey, getSendgridFromEmail, isEmailDeliveryEnabled } from '../shared/config';

const db = getDb();
const PACKAGE_LABELS: Record<number, string> = {
  99: 'แพ็ก 99',
  199: 'แพ็ก 99',
  299: 'แพ็ก Team',
  279: 'แพ็ก Team',
  399: 'แพ็ก Team',
};

type AdminNotifyResult = {
  skipped: boolean;
  lineSent: number;
  emailSent: boolean;
};

function formatThaiDateTime(value: admin.firestore.Timestamp | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : value.toDate();
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildAdminSlipMessage(params: {
  purchaseId: string;
  referenceId?: string | null;
  amount?: number | null;
  packageType?: number | null;
  createdAt?: admin.firestore.Timestamp | Date | null;
  userId?: string | null;
  lineUserId?: string | null;
  slipImageUrl?: string | null;
}): { text: string; quickReply: Array<{ type: 'action'; action: { type: 'message'; label: string; text: string } }> } {
  const pkgLabel = params.packageType ? PACKAGE_LABELS[params.packageType] : null;
  const amountText = typeof params.amount === 'number' ? `${params.amount} บาท` : '-';
  const refText = params.referenceId || '-';
  const createdText = formatThaiDateTime(params.createdAt || null);
  const slipUrl = params.slipImageUrl || '-';

  const text = [
    '📥 มีสลิปใหม่รอตรวจสอบ',
    `ID: ${params.purchaseId}`,
    `Ref: ${refText}`,
    `ยอด: ${amountText}`,
    `แพ็ก: ${pkgLabel || params.packageType || '-'}`,
    `เวลา: ${createdText}`,
    `UID: ${params.userId || '-'}`,
    `LINE: ${params.lineUserId || '-'}`,
    `สลิป: ${slipUrl}`,
    '',
    'คำสั่งด่วน:',
    `• admin ดู ${params.purchaseId}`,
    `• admin ยืนยัน ${params.purchaseId}`,
    `• admin ปฏิเสธ ${params.purchaseId} <เหตุผล>`,
    `• admin เติมเครดิต <userId> <จำนวน>`,
  ].join('\n');

  const quickReply: Array<{ type: 'action'; action: { type: 'message'; label: string; text: string } }> = [
    { type: 'action', action: { type: 'message', label: '🔎 ดู', text: `admin ดู ${params.purchaseId}` } },
    { type: 'action', action: { type: 'message', label: '✅ อนุมัติ', text: `admin ยืนยัน ${params.purchaseId}` } },
    { type: 'action', action: { type: 'message', label: '❌ ปฏิเสธ', text: `admin ปฏิเสธ ${params.purchaseId} สลิปไม่ชัด` } },
  ];

  return { text, quickReply };
}

async function sendAdminEmail(subject: string, text: string, to: string[]): Promise<boolean> {
  if (!isEmailDeliveryEnabled()) {
    return false;
  }
  const apiKey = getSendgridApiKey();
  const fromEmail = getSendgridFromEmail();
  if (!apiKey || !fromEmail || to.length === 0) {
    return false;
  }

  const payload = {
    personalizations: [{ to: to.map((email) => ({ email })) }],
    from: { email: fromEmail },
    subject,
    content: [{ type: 'text/plain', value: text }],
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('[adminNotification] SendGrid failed:', response.status, errorText);
    return false;
  }

  return true;
}

/**
 * Notify admin when a slip is uploaded.
 * Idempotent: uses admin_notified_at to avoid duplicates.
 */
export async function notifyAdminsForSlip(purchaseId: string): Promise<AdminNotifyResult> {
  const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
  const purchaseDoc = await purchaseRef.get();

  if (!purchaseDoc.exists) {
    return { skipped: false, lineSent: 0, emailSent: false };
  }

  const purchase = purchaseDoc.data() as any;
  if (purchase.admin_notified_at) {
    return { skipped: true, lineSent: 0, emailSent: false };
  }

  const { text, quickReply } = buildAdminSlipMessage({
    purchaseId,
    referenceId: purchase.referenceId || null,
    amount: purchase.amount || null,
    packageType: purchase.packageType || null,
    createdAt: purchase.createdAt || null,
    userId: purchase.userId || null,
    lineUserId: purchase.lineUserId || null,
    slipImageUrl: purchase.slip_image_url || null,
  });

  const adminLineUserIds = new Set<string>(getAdminLineUserIds());
  const adminFirebaseUids = getAdminFirebaseUids();
  const pkgLabel = purchase.packageType ? PACKAGE_LABELS[purchase.packageType] : null;

  for (const uid of adminFirebaseUids) {
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      const lineUserId = userDoc.exists ? String(userDoc.data()?.lineUserId || '') : '';
      if (lineUserId.startsWith('U')) {
        adminLineUserIds.add(lineUserId);
      }
    } catch (error) {
      console.warn('[adminNotification] Failed to resolve lineUserId for admin uid:', error);
    }
  }
  let lineSent = 0;
  for (const lineUserId of adminLineUserIds) {
    try {
      if (purchase.slip_image_url) {
        await pushLineFlexAdminSlipReview(lineUserId, {
          purchaseId,
          amount: purchase.amount || 0,
          packageLabel: pkgLabel || String(purchase.packageType || ''),
          refId: purchase.referenceId || '-',
          slipImageUrl: purchase.slip_image_url,
          createdAt: formatThaiDateTime(purchase.createdAt || null),
          userId: purchase.userId || '-',
          lineUserId: purchase.lineUserId || '-',
        });
      } else {
        await pushLineMessage(lineUserId, text, undefined, quickReply);
      }
      lineSent += 1;
    } catch (error) {
      console.warn('[adminNotification] Failed to push LINE message:', error);
    }
  }

  let emailSent = false;
  try {
    const recipients = getAdminEmailRecipients();
    const subject = `EzDoc: Slip review required (${purchaseId})`;
    emailSent = await sendAdminEmail(subject, text, recipients);
  } catch (error) {
    console.warn('[adminNotification] Failed to send email:', error);
  }

  if (lineSent > 0 || emailSent) {
    await purchaseRef.update({
      admin_notified_at: admin.firestore.FieldValue.serverTimestamp(),
      admin_notified_via: {
        line: lineSent > 0,
        email: emailSent,
      },
    });
  }

  return { skipped: false, lineSent, emailSent };
}
