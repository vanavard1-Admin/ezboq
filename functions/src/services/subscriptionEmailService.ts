/**
 * EzBOQ — Subscription Email Notifications
 *
 * 1. Payment confirmation — เมื่อชำระเงินสำเร็จ
 * 2. Expiring soon — แจ้งก่อนหมดอายุ 3 วัน
 */

import { getSendgridApiKey, getSendgridFromEmail, isEmailDeliveryEnabled } from '../shared/config';

const PLAN_LABELS: Record<string, { th: string; price: string }> = {
  solo: { th: 'Pro', price: '99' },
  team: { th: 'Business', price: '279' },
};

function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
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
    console.warn('[subscriptionEmail] SendGrid error:', response.status, body.slice(0, 200));
  }
}

/**
 * ส่งอีเมลยืนยันการชำระเงิน + เปิดใช้งานแพ็กเกจ
 */
export async function sendSubscriptionConfirmationEmail(params: {
  email: string;
  name: string;
  plan: string;
  startDate: string;
  endDate: string;
  amount: number;
}): Promise<void> {
  if (!isEmailDeliveryEnabled()) return;

  const { email, name, plan, startDate, endDate, amount } = params;
  const planLabel = PLAN_LABELS[plan] || { th: plan, price: String(amount) };

  await sendEmail(
    email,
    `EzBOQ: ยืนยันการชำระเงินแพ็กเกจ ${planLabel.th} ✅`,
    `
    <div style="font-family:'Noto Sans Thai',Arial,sans-serif;color:#111827;line-height:1.8;max-width:560px;margin:0 auto;padding:24px">
      <div style="text-align:center;margin-bottom:24px;padding:16px;background:#f0fdf4;border-radius:12px">
        <div style="font-size:40px">✅</div>
        <h1 style="margin:8px 0 4px;font-size:22px;color:#166534">ชำระเงินสำเร็จ!</h1>
        <p style="color:#15803d;margin:0">แพ็กเกจของคุณพร้อมใช้งานแล้ว</p>
      </div>

      <p>สวัสดีคุณ <strong>${name}</strong>,</p>
      <p>การชำระเงินแพ็กเกจ <strong>EzBOQ ${planLabel.th}</strong> ของคุณได้รับการยืนยันแล้วครับ</p>

      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:20px 0">
        <h3 style="margin:0 0 12px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">รายละเอียดการสมัคร</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#6b7280;width:140px">แพ็กเกจ</td>
            <td style="padding:6px 0;font-weight:600">EzBOQ ${planLabel.th}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">จำนวนเงิน</td>
            <td style="padding:6px 0;font-weight:600">฿${amount.toLocaleString('th-TH')}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">วันเริ่มต้น</td>
            <td style="padding:6px 0">${formatThaiDate(startDate)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">วันหมดอายุ</td>
            <td style="padding:6px 0;font-weight:600;color:#dc2626">${formatThaiDate(endDate)}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin:24px 0">
        <a href="https://ezboq.com/dashboard" style="background:#111827;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">เริ่มใช้งานเลย →</a>
      </div>

      <p style="color:#9ca3af;font-size:13px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
        หากมีปัญหาหรือคำถาม ติดต่อเราได้ที่ admin@ezboq.com<br>
        — ทีมงาน EzBOQ
      </p>
    </div>
    `.trim(),
  );

  console.log(`[subscriptionEmail] Confirmation sent to ${email} (${plan}, until ${endDate})`);
}

/**
 * ส่งอีเมลแจ้งเตือนใกล้หมดอายุ (3 วัน)
 */
export async function sendSubscriptionExpiringSoonEmail(params: {
  email: string;
  name: string;
  plan: string;
  endDate: string;
}): Promise<void> {
  if (!isEmailDeliveryEnabled()) return;

  const { email, name, plan, endDate } = params;
  const planLabel = PLAN_LABELS[plan] || { th: plan, price: '99' };

  await sendEmail(
    email,
    `EzBOQ: แพ็กเกจ ${planLabel.th} ของคุณจะหมดอายุใน 3 วัน ⚠️`,
    `
    <div style="font-family:'Noto Sans Thai',Arial,sans-serif;color:#111827;line-height:1.8;max-width:560px;margin:0 auto;padding:24px">
      <div style="text-align:center;margin-bottom:24px;padding:16px;background:#fffbeb;border-radius:12px">
        <div style="font-size:40px">⚠️</div>
        <h1 style="margin:8px 0 4px;font-size:22px;color:#92400e">แพ็กเกจใกล้หมดอายุ</h1>
        <p style="color:#b45309;margin:0">กรุณาต่ออายุเพื่อใช้งานต่อเนื่อง</p>
      </div>

      <p>สวัสดีคุณ <strong>${name}</strong>,</p>
      <p>แพ็กเกจ <strong>EzBOQ ${planLabel.th}</strong> ของคุณจะหมดอายุในวันที่ <strong>${formatThaiDate(endDate)}</strong> (อีก 3 วัน)</p>
      <p>เพื่อไม่ให้การทำงานสะดุด กรุณาต่ออายุแพ็กเกจก่อนหมดเวลาครับ</p>

      <div style="text-align:center;margin:24px 0">
        <a href="https://ezboq.com/dashboard/subscription" style="background:#f59e0b;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">ต่ออายุแพ็กเกจ →</a>
      </div>

      <p style="color:#9ca3af;font-size:13px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
        หากมีปัญหาหรือคำถาม ติดต่อเราได้ที่ admin@ezboq.com<br>
        — ทีมงาน EzBOQ
      </p>
    </div>
    `.trim(),
  );

  console.log(`[subscriptionEmail] Expiring soon sent to ${email} (${plan}, expires ${endDate})`);
}
