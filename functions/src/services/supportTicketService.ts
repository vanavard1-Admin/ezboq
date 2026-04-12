import * as admin from 'firebase-admin';
import { getDb } from '../core/firebaseAdmin';
import { getAdminEmailRecipients } from './adminAuthService';
import { getSendgridApiKey, getSendgridFromEmail, isEmailDeliveryEnabled } from '../shared/config';

const db = getDb();

type TicketInput = {
  userId: string;
  businessId: string;
  lineUserId?: string | null;
  message: string;
  traceId?: string | null;
  channel?: 'LINE' | 'WEB' | 'SYSTEM';
  context?: Record<string, unknown> | null;
};

type TicketResult = {
  ticketId: string;
  emailSent: boolean;
};

function sanitizeMessage(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function sanitizeContext(input: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  const allowedKeys = ['pagePath', 'userAgent', 'locale', 'appVersion'];
  const result: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    const value = input[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      result[key] = value.trim().slice(0, 512);
    }
  }
  return Object.keys(result).length > 0 ? result : null;
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
    console.warn('[supportTicket] SendGrid failed:', response.status, errorText);
    return false;
  }

  return true;
}

export async function sendAdminAlert(subject: string, text: string): Promise<boolean> {
  const recipients = getAdminEmailRecipients();
  if (recipients.length === 0) return false;
  return sendAdminEmail(subject, text, recipients);
}

export async function createSupportTicket(input: TicketInput): Promise<TicketResult> {
  const message = sanitizeMessage(input.message);
  const channel = input.channel || 'LINE';
  const context = sanitizeContext(input.context);
  const ticketRef = db.collection('support_tickets').doc();
  const ticketId = ticketRef.id;

  await ticketRef.set({
    user_id: input.userId,
    business_id: input.businessId,
    line_user_id: input.lineUserId || null,
    message,
    channel,
    status: 'OPEN',
    trace_id: input.traceId || null,
    context,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  const emailBody = [
    'EzDoc: มีรายงานปัญหาใหม่',
    `Ticket: ${ticketId}`,
    `User: ${input.userId}`,
    `Business: ${input.businessId}`,
    `LINE: ${input.lineUserId || '-'}`,
    `Channel: ${channel}`,
    `Trace: ${input.traceId || '-'}`,
    '',
    context ? `Context: ${JSON.stringify(context)}` : null,
    context ? '' : null,
    'ข้อความจากผู้ใช้:',
    message,
  ].filter(Boolean).join('\n');

  const recipients = getAdminEmailRecipients();
  const emailSent = await sendAdminEmail(`EzDoc: Support ticket ${ticketId}`, emailBody, recipients);

  await ticketRef.update({
    notified_at: admin.firestore.FieldValue.serverTimestamp(),
    notified_via: {
      email: emailSent,
    },
  });

  return { ticketId, emailSent };
}
