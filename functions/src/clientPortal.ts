import { getDb } from './core/firebaseAdmin';
/**
 * Client Portal - View/Confirm/Pay (MVP)
 *
 * GET /portal/:token - show document summary + actions
 * GET /portal/:token/confirm - mark client_confirmed
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { recordDocumentOpened } from './services/documentOpenedService';

if (!admin.apps.length) {
  admin.initializeApp();
}

const SHORT_URL_BASE = process.env.SHORT_URL_BASE || 'https://ezdoc-v1-th.web.app';

interface ShortLinkData {
  token: string;
  doc_id: string;
  doc_no: string;
  doc_type: string;
  pdf_path: string;
  user_id: string;
  business_id?: string | null;
  document_ref: string;
  created_at: admin.firestore.Timestamp;
  expires_at?: admin.firestore.Timestamp;
  revoked_at?: admin.firestore.Timestamp | null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractToken(path: string): { token: string; action?: 'confirm' | 'pay' } | null {
  const match = path.match(/^\/portal\/([A-Za-z0-9_-]+)(?:\/(confirm|pay))?$/);
  if (!match) return null;
  return { token: match[1], action: match[2] as 'confirm' | 'pay' | undefined };
}

async function lookupShortLink(token: string): Promise<ShortLinkData | null> {
  const db = getDb();
  const linkDoc = await db.collection('pdf_short_links').doc(token).get();
  if (!linkDoc.exists) return null;
  const data = linkDoc.data() as ShortLinkData;
  if (data.revoked_at) return null;
  if (data.expires_at && new Date() > data.expires_at.toDate()) return null;
  return data;
}

async function generatePromptPayQrBase64(amount: number): Promise<string | null> {
  try {
    const generatePayload = require("promptpay-qr");
    const QRCode = require("qrcode");
    const PROMPTPAY_ID = "0933299990";
    let ppId = PROMPTPAY_ID.replace(/-/g, "");
    if (ppId.startsWith("0") && ppId.length === 10) {
      ppId = "+66" + ppId.substring(1);
    }
    const payload = generatePayload(ppId, { amount });
    const dataUrl: string = await QRCode.toDataURL(payload, { width: 300, margin: 2 });
    return dataUrl;
  } catch {
    return null;
  }
}

function renderPortalPage(params: {
  docNo: string;
  docType: string;
  customerName: string;
  total: string;
  pdfUrl: string;
  confirmUrl: string;
  paymentLines: string[];
  qrDataUrl?: string | null;
  payUrl?: string;
  status?: string;
  totalAmount?: number;
}): string {
  const { docNo, docType, customerName, total, pdfUrl, confirmUrl, paymentLines, qrDataUrl, payUrl, status } = params;
  const paymentHtml = paymentLines.map((line) => escapeHtml(line)).join('<br>');
  const isUnpaid = status !== "PAID" && status !== "CANCELLED";
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EzDoc Portal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f6fb;
      color: #1a1a1a;
      padding: 20px;
    }
    .card {
      max-width: 560px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    }
    h1 { font-size: 20px; margin-bottom: 8px; }
    .muted { color: #666; font-size: 14px; }
    .row { margin: 12px 0; }
    .label { font-size: 13px; color: #888; }
    .value { font-size: 16px; }
    .actions { display: grid; gap: 10px; margin-top: 20px; }
    .actions form { margin: 0; }
    .btn {
      display: block;
      text-align: center;
      padding: 12px 16px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
    }
    button.btn {
      width: 100%;
      font: inherit;
      cursor: pointer;
    }
    .btn-primary { background: #1DB446; color: #fff; }
    .btn-outline { border: 1px solid #d0d7de; color: #1a1a1a; background: #fff; }
    .note {
      margin-top: 16px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 10px;
      font-size: 14px;
      color: #444;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>เอกสาร: ${escapeHtml(docType)} ${escapeHtml(docNo)}</h1>
    <div class="muted">ดู/ยืนยัน/ชำระเงินได้จากหน้านี้</div>

    <div class="row">
      <div class="label">ลูกค้า</div>
      <div class="value">${escapeHtml(customerName)}</div>
    </div>
    <div class="row">
      <div class="label">ยอดรวม</div>
      <div class="value">${escapeHtml(total)} บาท</div>
    </div>

    <div class="actions">
      <a class="btn btn-primary" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noreferrer">ดูเอกสาร (PDF)</a>
      <form method="POST" action="${escapeHtml(confirmUrl)}">
        <button type="submit" class="btn btn-outline">ยืนยันรับเอกสาร</button>
      </form>
    </div>

    ${isUnpaid && qrDataUrl ? `
    <div class="note" style="text-align:center;">
      <strong>ชำระเงิน PromptPay</strong><br>
      <img src="${qrDataUrl}" alt="PromptPay QR" style="max-width:250px; margin:12px auto;"><br>
      <div style="font-size:18px; font-weight:bold; color:#FF6F00;">฿${escapeHtml(total)}</div>
      <div style="font-size:13px; color:#666; margin-top:4px;">นายฉัตรดนัย จิตต์เพ็ชร (KBANK)</div>
    </div>
    <div class="note">
      <strong>ส่งสลิปการโอน</strong><br>
      <form id="slipForm" enctype="multipart/form-data" method="POST" action="${escapeHtml(payUrl || '')}">
        <input type="file" name="slip" accept="image/*" required
          style="margin:8px 0; width:100%;"><br>
        <button type="submit" class="btn btn-primary" style="margin-top:8px;">ส่งสลิป</button>
      </form>
      <div id="slipStatus" style="margin-top:8px; font-size:14px;"></div>
    </div>
    ` : isUnpaid ? `
    <div class="note">
      <strong>ช่องทางชำระเงิน</strong><br>
      ${paymentHtml}
    </div>
    ` : `
    <div class="note" style="text-align:center; color:#4CAF50;">
      <strong>✅ ชำระเงินแล้ว</strong>
    </div>
    `}
  </div>
</body>
</html>`;
}

function renderConfirmPromptPage(docNo: string, confirmUrl: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ยืนยันรับเอกสาร - EzDoc</title>
  <style>
    body { font-family: 'Sarabun', sans-serif; background:#f5f6fb; padding:24px; }
    .card { max-width:480px; margin:0 auto; background:#fff; border-radius:12px; padding:24px; }
    button {
      width: 100%;
      margin-top: 16px;
      padding: 12px 16px;
      border: none;
      border-radius: 10px;
      background: #1DB446;
      color: #fff;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>ยืนยันรับเอกสาร</h2>
    <p>กดยืนยันเพื่อบันทึกว่าได้รับเอกสาร ${escapeHtml(docNo)} แล้ว</p>
    <form method="POST" action="${escapeHtml(confirmUrl)}">
      <button type="submit">ยืนยันรับเอกสาร</button>
    </form>
  </div>
</body>
</html>`;
}

function renderConfirmPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ยืนยันแล้ว - EzDoc</title>
  <style>
    body { font-family: 'Sarabun', sans-serif; background:#f5f6fb; padding:24px; }
    .card { max-width:480px; margin:0 auto; background:#fff; border-radius:12px; padding:24px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>✅ ยืนยันแล้ว</h2>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

export const clientPortal = functions.https.onRequest(
  {
    region: 'asia-southeast1',
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (req, res) => {
    const parsed = extractToken(req.path);
    if (!parsed) {
      res.status(400).send('Invalid URL');
      return;
    }

    const isConfirmAction = parsed.action === 'confirm';
    const isPayAction = parsed.action === 'pay';

    // Method validation
    if (!isConfirmAction && !isPayAction && req.method !== 'GET') {
      res.status(405).send('Method not allowed');
      return;
    }
    if ((isConfirmAction || isPayAction) && req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const link = await lookupShortLink(parsed.token);
    if (!link) {
      res.status(404).send('Link not found or expired');
      return;
    }

    const db = getDb();
    const docRef = link.document_ref
      ? db.doc(link.document_ref)
      : db.collection('documents').doc(link.doc_id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      res.status(404).send('Document not found');
      return;
    }

    const data = docSnap.data() as Record<string, unknown>;
    const docNo = String(data.doc_no || data.docNo || link.doc_no || link.doc_id);
    const docType = String(data.doc_type || data.docType || link.doc_type || 'DOCUMENT');
    const customerSnapshot = (data.customer_snapshot || data.customerSnapshot || {}) as Record<string, unknown>;
    const customerName = String(data.customer_name || customerSnapshot.displayName || customerSnapshot.name || 'ไม่ระบุ');
    const totalAmount = Number(data.total || data.total_amount || (data.money as Record<string, unknown>)?.total_amount || 0) || 0;
    const total = totalAmount.toLocaleString('th-TH', { maximumFractionDigits: 0 });
    const status = String(data.status || '');

    // ============ /portal/:token/pay — Slip upload & verification ============
    if (isPayAction && req.method === 'POST') {
      try {
        // Parse multipart form data (slip image)
        const busboy = require('busboy');
        const bb = busboy({ headers: req.headers, limits: { fileSize: 5 * 1024 * 1024 } });
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
          bb.on('file', (_fieldname: string, file: NodeJS.ReadableStream) => {
            file.on('data', (chunk: Buffer) => chunks.push(chunk));
            file.on('end', () => {});
          });
          bb.on('finish', () => resolve());
          bb.on('error', (err: Error) => reject(err));
          bb.end(req.rawBody);
        });

        const imageBuffer = Buffer.concat(chunks);
        if (imageBuffer.length < 1000) {
          res.send(renderConfirmPage('❌ ไฟล์สลิปไม่ถูกต้อง กรุณาลองใหม่'));
          return;
        }

        // OCR the slip
        const { ImageAnnotatorClient } = await import('@google-cloud/vision');
        const visionClient = new ImageAnnotatorClient();
        const [ocrResult] = await visionClient.textDetection({ image: { content: imageBuffer } });
        const fullText = ocrResult.textAnnotations?.[0]?.description || '';

        // Parse and verify
        const { parseThaiSlipText } = await import('./services/slipOcrService');
        const parsed2 = parseThaiSlipText(fullText);
        const amountMatch = parsed2.amount !== null && Math.abs(parsed2.amount - totalAmount) <= 1;

        if (!amountMatch) {
          const detail = parsed2.amount !== null
            ? `ยอดในสลิป ฿${parsed2.amount} ไม่ตรงกับ ฿${totalAmount}`
            : 'อ่านยอดจากสลิปไม่ได้';
          res.send(renderConfirmPage(`❌ ตรวจสอบสลิปไม่ผ่าน: ${detail}\n\nกรุณาลองใหม่`));
          return;
        }

        // Update document status to PAID
        await docRef.set({
          status: 'PAID',
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          paid_via: 'PORTAL_SLIP',
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Notify business owner via LINE push
        const userId = String(link.user_id || data.user_id || '');
        if (userId) {
          try {
            const lineLinkSnap = await db.collection('line_links')
              .where('uid', '==', userId)
              .limit(1)
              .get();
            if (!lineLinkSnap.empty) {
              const ownerLineId = lineLinkSnap.docs[0].id;
              const { getLineChannelAccessToken } = await import('./shared/config');
              const accessToken = getLineChannelAccessToken();
              if (accessToken && ownerLineId) {
                await fetch('https://api.line.me/v2/bot/message/push', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({
                    to: ownerLineId,
                    messages: [{
                      type: 'text',
                      text: `💰 ลูกค้า ${customerName} ชำระเงิน ฿${total} แล้ว!\n📄 เอกสาร: ${docNo}\n✅ สถานะอัพเดทเป็น "ชำระแล้ว"`,
                    }],
                  }),
                });
              }
            }
          } catch (notifyErr) {
            console.error('[CLIENT_PORTAL] LINE notify failed:', notifyErr);
          }
        }

        res.set('Cache-Control', 'no-store');
        res.send(renderConfirmPage(`✅ ชำระเงินสำเร็จ!\n\nเอกสาร ${docNo}\nยอด ฿${total}\n\nขอบคุณครับ`));
        return;
      } catch (payErr) {
        console.error('[CLIENT_PORTAL] Pay error:', payErr);
        res.send(renderConfirmPage('❌ เกิดข้อผิดพลาด กรุณาลองใหม่'));
        return;
      }
    }

    // ============ /portal/:token/confirm ============
    if (parsed.action === 'confirm') {
      const confirmUrl = `${SHORT_URL_BASE}/portal/${parsed.token}/confirm`;
      if (req.method === 'GET') {
        res.set('Cache-Control', 'no-store');
        res.send(renderConfirmPromptPage(docNo, confirmUrl));
        return;
      }

      await docRef.set({
        client_confirmed: true,
        client_confirmed_at: admin.firestore.FieldValue.serverTimestamp(),
        client_confirmed_via: 'PORTAL',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      res.set('Cache-Control', 'no-store');
      res.send(renderConfirmPage(`รับเอกสาร ${docNo} แล้ว ขอบคุณครับ`));
      return;
    }

    // ============ /portal/:token — Main portal page ============
    const userId = String(link.user_id || data.user_id || '');
    const businessId = String(link.business_id || data.business_id || '');
    if (userId && businessId) {
      await recordDocumentOpened(link.doc_id, userId, businessId, true);
    }

    const paymentSnapshot = (data.payment_snapshot || {}) as Record<string, unknown>;
    const promptpay = paymentSnapshot.promptpay_account || '';
    const bankName = paymentSnapshot.bank_code || paymentSnapshot.bank_name || '';
    const bankAccount = paymentSnapshot.bank_account || '';
    const bankAccountName = paymentSnapshot.bank_account_name || '';
    const paymentLines = [
      promptpay ? `พร้อมเพย์: ${promptpay}` : '',
      bankName && bankAccount ? `โอนธนาคาร: ${bankName} ${bankAccount}` : '',
      bankAccountName ? `ชื่อบัญชี: ${bankAccountName}` : '',
    ].filter(Boolean);

    // Generate PromptPay QR for unpaid invoices
    const isUnpaid = status !== 'PAID' && status !== 'CANCELLED';
    const qrDataUrl = isUnpaid && totalAmount > 0 ? await generatePromptPayQrBase64(totalAmount) : null;

    const pdfUrl = `${SHORT_URL_BASE}/p/${parsed.token}`;
    const confirmUrl = `${SHORT_URL_BASE}/portal/${parsed.token}/confirm`;
    const payUrl = `${SHORT_URL_BASE}/portal/${parsed.token}/pay`;

    res.set('Cache-Control', 'no-store');
    res.send(renderPortalPage({
      docNo,
      docType,
      customerName,
      total,
      pdfUrl,
      confirmUrl,
      paymentLines,
      qrDataUrl,
      payUrl,
      status,
      totalAmount,
    }));
  }
);
