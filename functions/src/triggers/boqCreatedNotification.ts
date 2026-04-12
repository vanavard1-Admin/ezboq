/**
 * EzDoc - BOQ Created Notification Trigger
 *
 * Firestore trigger: When a new QUO (Quotation/BOQ) document is created,
 * send an email notification to admin.
 */

import * as functions from 'firebase-functions/v1';
import { getAdminEmailRecipients } from '../services/adminAuthService';
import { getSendgridApiKey, getSendgridFromEmail, isEmailDeliveryEnabled } from '../shared/config';

function formatThaiDate(value: { toDate?: () => Date } | Date | null | undefined): string {
  if (!value) return '-';
  const date = typeof (value as { toDate?: () => Date }).toDate === 'function'
    ? (value as { toDate: () => Date }).toDate()
    : (value as Date);
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  });
}

export const boqCreatedNotification = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
    memory: '256MB',
    timeoutSeconds: 30,
  })
  .firestore.document('documents/{docId}')
  .onCreate(async (snap, context) => {
    const docId = context.params.docId as string;
    const data = snap.data();

    if (!data || data.doc_type !== 'QUO') {
      return;
    }

    if (!isEmailDeliveryEnabled()) {
      console.log('[boqCreatedNotification] Email delivery disabled, skipping');
      return;
    }

    const apiKey = getSendgridApiKey();
    const fromEmail = getSendgridFromEmail();
    const recipients = getAdminEmailRecipients();

    if (!apiKey || !fromEmail || recipients.length === 0) {
      console.warn('[boqCreatedNotification] SendGrid not configured or no recipients');
      return;
    }

    const docNo = String(data.doc_no || docId);
    const businessName = String(data.business_snapshot?.name || data.business_id || '-');
    const customerName = String(data.customer_snapshot?.name || data.customer_name || '-');
    const createdAt = formatThaiDate(data.created_at || null);
    const totalAmount = Number(data.total_amount ?? data.money?.total_amount ?? data.money?.total ?? 0) || 0;

    const subject = `EzBOQ: ใบเสนอราคาใหม่ ${docNo}`;
    const text = [
      `📋 มีใบเสนอราคาใหม่สร้างในระบบ`,
      `เลขที่: ${docNo}`,
      `ธุรกิจ: ${businessName}`,
      `ลูกค้า: ${customerName}`,
      `มูลค่า: ${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
      `เวลา: ${createdAt}`,
      `ID: ${docId}`,
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6">
        <h2 style="margin:0 0 12px">📋 ใบเสนอราคาใหม่</h2>
        <p style="margin:0">เลขที่: <strong>${docNo}</strong></p>
        <p style="margin:0">ธุรกิจ: <strong>${businessName}</strong></p>
        <p style="margin:0">ลูกค้า: <strong>${customerName}</strong></p>
        <p style="margin:0 0 16px">มูลค่า: <strong>${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</strong></p>
        <p style="margin:0;color:#6b7280;font-size:12px">เวลา: ${createdAt} | ID: ${docId}</p>
      </div>
    `.trim();

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: recipients.map((email) => ({ email })) }],
        from: { email: fromEmail },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn('[boqCreatedNotification] SendGrid error:', response.status, body.slice(0, 200));
      return;
    }

    console.log(`[boqCreatedNotification] Admin notified for new BOQ: docId=${docId}`);
  });
