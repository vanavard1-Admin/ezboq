/**
 * EzBOQ — Auth Email Notifications (Free tier: เฉพาะสำคัญๆ)
 *
 * 1. Welcome email — สมัครสมาชิกสำเร็จ
 * 2. Account deletion — ลบบัญชี
 *
 * Note: Firebase Auth handles password reset emails natively (ไม่กิน SendGrid quota)
 */

import * as functions from 'firebase-functions/v1';
import { getSendgridApiKey, getSendgridFromEmail, isEmailDeliveryEnabled } from '../shared/config';

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const apiKey = getSendgridApiKey();
  const fromEmail = getSendgridFromEmail();

  if (!apiKey || !fromEmail) return;

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: 'EzBOQ' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.warn('[authEmail] SendGrid error:', response.status, body.slice(0, 200));
  }
}

// ── Welcome Email (สมัครสมาชิกสำเร็จ) ──────────────────────

export const onUserCreatedEmail = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
    memory: '256MB',
    timeoutSeconds: 30,
  })
  .auth.user()
  .onCreate(async (user) => {
    if (!isEmailDeliveryEnabled()) return;

    const email = user.email;
    if (!email) return;

    const displayName = user.displayName || email.split('@')[0];

    await sendEmail(
      email,
      'ยินดีต้อนรับสู่ EzBOQ! 🎉',
      `
      <div style="font-family:'Noto Sans Thai',Arial,sans-serif;color:#111827;line-height:1.8;max-width:560px;margin:0 auto;padding:24px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="margin:0;font-size:28px">ยินดีต้อนรับสู่ EzBOQ 🎉</h1>
          <p style="color:#6b7280;margin:8px 0 0">Easy Business Online &amp; Quality</p>
        </div>
        <p>สวัสดีคุณ <strong>${displayName}</strong>,</p>
        <p>ขอบคุณที่สมัครใช้งาน EzBOQ! ตอนนี้คุณสามารถ:</p>
        <ul>
          <li>สร้างใบเสนอราคาได้ใน 5 นาที</li>
          <li>จัดการเอกสารครบ BOQ → Invoice → Receipt</li>
          <li>ส่ง PDF ผ่าน LINE ได้เลย</li>
        </ul>
        <div style="text-align:center;margin:24px 0">
          <a href="https://ezboq.com" style="background:#111827;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">เริ่มใช้งาน EzBOQ</a>
        </div>
        <p style="color:#9ca3af;font-size:13px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
          หากมีคำถามหรือต้องการความช่วยเหลือ ตอบกลับอีเมลนี้ได้เลยครับ<br>
          — ทีมงาน EzBOQ
        </p>
      </div>
      `.trim(),
    );

    console.log(`[authEmail] Welcome email sent to ${email}`);
  });

// ── Account Deletion Email (ลบบัญชี) ──────────────────────

export const onUserDeletedEmail = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
    memory: '256MB',
    timeoutSeconds: 30,
  })
  .auth.user()
  .onDelete(async (user) => {
    if (!isEmailDeliveryEnabled()) return;

    const email = user.email;
    if (!email) return;

    const displayName = user.displayName || email.split('@')[0];

    await sendEmail(
      email,
      'บัญชี EzBOQ ของคุณถูกลบแล้ว',
      `
      <div style="font-family:'Noto Sans Thai',Arial,sans-serif;color:#111827;line-height:1.8;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">บัญชีของคุณถูกลบแล้ว</h2>
        <p>สวัสดีคุณ <strong>${displayName}</strong>,</p>
        <p>บัญชี EzBOQ ของคุณ (${email}) ถูกลบเรียบร้อยแล้ว ข้อมูลทั้งหมดจะถูกลบภายใน 30 วัน</p>
        <p>หากคุณไม่ได้ทำรายการนี้ กรุณาติดต่อเราทันทีที่ admin@ezboq.com</p>
        <p style="color:#9ca3af;font-size:13px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
          — ทีมงาน EzBOQ
        </p>
      </div>
      `.trim(),
    );

    console.log(`[authEmail] Deletion email sent to ${email}`);
  });
