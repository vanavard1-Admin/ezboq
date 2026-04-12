import * as admin from 'firebase-admin';
import { getDb } from '../core/firebaseAdmin';
import { DocData } from '../line/messages';
import { getSendgridApiKey, getSendgridFromEmail, isEmailDeliveryEnabled } from '../shared/config';
import { buildShortUrl } from '../shared/pdfFlexMessage';

const db = getDb();

const DOC_LABELS: Record<string, { th: string; en: string }> = {
  QUO: { th: 'ใบเสนอราคา', en: 'Quotation' },
  QUOTATION: { th: 'ใบเสนอราคา', en: 'Quotation' },
  BILL: { th: 'ใบวางบิล', en: 'Billing Note' },
  INVOICE: { th: 'ใบวางบิล', en: 'Invoice' },
  RECEIPT: { th: 'ใบเสร็จรับเงิน', en: 'Receipt' },
  RCP: { th: 'ใบเสร็จรับเงิน', en: 'Receipt' },
  RCPT: { th: 'ใบเสร็จรับเงิน', en: 'Receipt' },
  CN: { th: 'ใบลดหนี้', en: 'Credit Note' },
  CREDIT_NOTE: { th: 'ใบลดหนี้', en: 'Credit Note' },
  DN: { th: 'ใบเพิ่มหนี้', en: 'Debit Note' },
  DEBIT_NOTE: { th: 'ใบเพิ่มหนี้', en: 'Debit Note' },
};

type NotificationResult = {
  skipped: boolean;
  sent: boolean;
  reason?: string;
};

function resolveLanguage(business: Record<string, unknown> | null | undefined): 'th' | 'en' {
  return business?.language === 'en' ? 'en' : 'th';
}

function resolveOwnerEmail(
  userData: Record<string, unknown> | undefined,
  businessData: Record<string, unknown> | null | undefined
): string | null {
  const candidates = [
    userData?.email,
    businessData?.notificationEmail,
    businessData?.email,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function formatMoney(amount: number, lang: 'th' | 'en'): string {
  return new Intl.NumberFormat(lang === 'th' ? 'th-TH' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function getPdfUrl(doc: DocData): string | null {
  if (doc.pdf_short_token) {
    return buildShortUrl(doc.pdf_short_token);
  }

  const raw = doc.pdfUrl || doc.pdf_path || doc.pdfPath || '';
  return raw.startsWith('http') ? raw : null;
}

function buildMessage(params: {
  lang: 'th' | 'en';
  businessName: string;
  docNo: string;
  docType: string;
  customerName: string;
  total: number;
  pdfUrl: string | null;
}): { subject: string; text: string; html: string } {
  const { lang, businessName, docNo, docType, customerName, total, pdfUrl } = params;
  const labels = DOC_LABELS[docType] || { th: 'เอกสาร', en: 'Document' };
  const docLabel = lang === 'th' ? labels.th : labels.en;
  const amount = formatMoney(total, lang);

  if (lang === 'en') {
    const subject = `${docLabel} delivered: ${docNo}`;
    const lines = [
      `Your ${docLabel.toLowerCase()} has been delivered via EzDOC.`,
      `Business: ${businessName || '-'}`,
      `Document No.: ${docNo}`,
      `Customer: ${customerName || '-'}`,
      `Amount: THB ${amount}`,
      pdfUrl ? `PDF: ${pdfUrl}` : '',
    ].filter(Boolean);

    return {
      subject,
      text: lines.join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6">
          <h2 style="margin:0 0 12px">Your ${docLabel.toLowerCase()} has been delivered</h2>
          <p style="margin:0 0 12px">Business: <strong>${businessName || '-'}</strong></p>
          <p style="margin:0">Document No.: <strong>${docNo}</strong></p>
          <p style="margin:0">Customer: <strong>${customerName || '-'}</strong></p>
          <p style="margin:0 0 16px">Amount: <strong>THB ${amount}</strong></p>
          ${pdfUrl ? `<p style="margin:0"><a href="${pdfUrl}" style="color:#059669">Open PDF</a></p>` : ''}
        </div>
      `.trim(),
    };
  }

  const subject = `ส่ง${docLabel}แล้ว: ${docNo}`;
  const lines = [
    `EzDOC ส่ง${docLabel}เรียบร้อยแล้ว`,
    `ธุรกิจ: ${businessName || '-'}`,
    `เลขที่เอกสาร: ${docNo}`,
    `ลูกค้า: ${customerName || '-'}`,
    `ยอดรวม: ${amount} บาท`,
    pdfUrl ? `PDF: ${pdfUrl}` : '',
  ].filter(Boolean);

  return {
    subject,
    text: lines.join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6">
        <h2 style="margin:0 0 12px">EzDOC ส่ง${docLabel}เรียบร้อยแล้ว</h2>
        <p style="margin:0 0 12px">ธุรกิจ: <strong>${businessName || '-'}</strong></p>
        <p style="margin:0">เลขที่เอกสาร: <strong>${docNo}</strong></p>
        <p style="margin:0">ลูกค้า: <strong>${customerName || '-'}</strong></p>
        <p style="margin:0 0 16px">ยอดรวม: <strong>${amount} บาท</strong></p>
        ${pdfUrl ? `<p style="margin:0"><a href="${pdfUrl}" style="color:#059669">เปิด PDF</a></p>` : ''}
      </div>
    `.trim(),
  };
}

async function markJobNotification(
  jobRef: FirebaseFirestore.DocumentReference,
  update: Record<string, unknown>
): Promise<void> {
  await jobRef.set({
    ownerEmailNotification: {
      ...update,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  }, { merge: true });
}

export async function sendOwnerDocumentNotificationEmail(params: {
  jobRef: FirebaseFirestore.DocumentReference;
  docRef: FirebaseFirestore.DocumentReference;
  userId: string;
  businessId: string;
  business?: Record<string, unknown> | null;
  doc: DocData;
}): Promise<NotificationResult> {
  const { jobRef, docRef, userId, businessId, business, doc } = params;

  const existing = (await jobRef.get()).data()?.ownerEmailNotification as Record<string, unknown> | undefined;
  if (existing?.status === 'SENT') {
    return { skipped: true, sent: false, reason: 'already-sent' };
  }

  const businessRef = db.doc(`users/${userId}/businesses/${businessId}`);
  const [userSnap, businessSnap] = await Promise.all([
    db.doc(`users/${userId}`).get(),
    business ? Promise.resolve(null) : businessRef.get(),
  ]);

  const userData = (userSnap.data() || {}) as Record<string, unknown>;
  const businessData = (business || businessSnap?.data() || {}) as Record<string, unknown>;

  if (businessData.emailNotifications === false) {
    await markJobNotification(jobRef, { status: 'SKIPPED', reason: 'disabled' });
    return { skipped: true, sent: false, reason: 'disabled' };
  }

  const toEmail = resolveOwnerEmail(userData, businessData);
  if (!toEmail) {
    await markJobNotification(jobRef, { status: 'SKIPPED', reason: 'missing-email' });
    return { skipped: true, sent: false, reason: 'missing-email' };
  }

  if (!isEmailDeliveryEnabled()) {
    await markJobNotification(jobRef, { status: 'SKIPPED', reason: 'email-disabled' });
    return { skipped: true, sent: false, reason: 'email-disabled' };
  }

  const apiKey = getSendgridApiKey();
  const fromEmail = getSendgridFromEmail();
  if (!apiKey || !fromEmail) {
    await markJobNotification(jobRef, { status: 'SKIPPED', reason: 'sendgrid-not-configured' });
    return { skipped: true, sent: false, reason: 'sendgrid-not-configured' };
  }

  const lang = resolveLanguage(businessData);
  const docType = String(doc.docType || '').trim().toUpperCase() || 'DOCUMENT';
  const docNo = String(doc.docNo || '').trim() || (lang === 'th' ? 'รอเลขที่เอกสาร' : 'Pending document number');
  const customerName = String(doc.customerSnapshot?.displayName || '').trim() || (lang === 'th' ? 'ไม่ระบุ' : 'N/A');
  const total = Number(doc.money?.total_amount ?? doc.money?.net_receive_amount ?? doc.money?.total ?? 0) || 0;
  const pdfUrl = getPdfUrl(doc);

  const { subject, text, html } = buildMessage({
    lang,
    businessName: String(businessData.name || ''),
    docNo,
    docType,
    customerName,
    total,
    pdfUrl,
  });

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
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
    await markJobNotification(jobRef, {
      status: 'FAILED',
      reason: `sendgrid-${response.status}`,
      detail: body.slice(0, 300),
      to: toEmail,
    });
    throw new Error(`SendGrid ${response.status}: ${body.slice(0, 120)}`);
  }

  await Promise.all([
    markJobNotification(jobRef, {
      status: 'SENT',
      to: toEmail,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
    docRef.set({
      ownerEmailNotification: {
        to: toEmail,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    }, { merge: true }),
  ]);

  return { skipped: false, sent: true };
}
