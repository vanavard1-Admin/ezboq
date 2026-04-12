import { getDb } from './core/firebaseAdmin';
/**
 * PDF Redirect Endpoint - Secure Tokenized Short URLs
 * 
 * GET /p/:token - Lookup token, validate expiry, generate signed URL, redirect
 * GET /p/:token?download=1 - Force download with Content-Disposition: attachment
 * 
 * Security features:
 * - Cryptographically random tokens (not guessable)
 * - Expiry checking (90 days default)
 * - Revocation support
 * - Proper download headers for mobile browsers
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { signPdfPath } from './shared/pdfSigning';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

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

/**
 * Extract token from path like /p/abc123xyz or /p/abc123xyz?download=1
 * Token format: base64url (letters, numbers, dash, underscore)
 */
function extractToken(path: string): string | null {
  // Match /p/:token pattern (base64url characters)
  const match = path.match(/^\/p\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Lookup short link by token and validate
 * Returns link data or error reason
 */
async function lookupShortLink(token: string): Promise<{
  success: true;
  data: ShortLinkData;
} | {
  success: false;
  reason: 'NOT_FOUND' | 'EXPIRED' | 'REVOKED';
  message: string;
}> {
  const db = getDb();

  const linkDoc = await db.collection('pdf_short_links').doc(token).get();

  if (!linkDoc.exists) {
    return {
      success: false,
      reason: 'NOT_FOUND',
      message: 'ลิงก์ไม่ถูกต้องหรือไม่มีอยู่',
    };
  }

  const data = linkDoc.data() as ShortLinkData;

  // Check if revoked
  if (data.revoked_at) {
    console.log(`[pdfRedirect] Token ${token} was revoked at ${data.revoked_at.toDate()}`);
    return {
      success: false,
      reason: 'REVOKED',
      message: 'ลิงก์นี้ถูกยกเลิกแล้ว',
    };
  }

  // Check if expired
  if (data.expires_at) {
    const now = new Date();
    const expiresAt = data.expires_at.toDate();

    if (now > expiresAt) {
      console.log(`[pdfRedirect] Token ${token} expired at ${expiresAt}`);
      return {
        success: false,
        reason: 'EXPIRED',
        message: 'ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่',
      };
    }
  }

  // Check if pdf_path exists
  if (!data.pdf_path) {
    return {
      success: false,
      reason: 'NOT_FOUND',
      message: 'ไม่พบไฟล์ PDF',
    };
  }

  return { success: true, data };
}

/**
 * Generate filename for PDF download
 */
function generateFilename(data: ShortLinkData): string {
  const docNo = data.doc_no || data.doc_id;
  const docType = data.doc_type || 'DOC';

  // Clean filename (remove special chars except dash and underscore)
  const cleanDocNo = docNo.replace(/[^A-Za-z0-9_-]/g, '_');

  return `EzDoc-${docType}-${cleanDocNo}.pdf`;
}

/**
 * Render HTML error page (user-friendly)
 */
function renderErrorPage(title: string, message: string, reason: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - EzDoc</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #333;
      font-size: 24px;
      margin-bottom: 12px;
    }
    p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
    }
    .code {
      background: #f5f5f5;
      padding: 8px 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      color: #999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${reason === 'EXPIRED' ? '⏰' : reason === 'REVOKED' ? '🚫' : '❓'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="code">Error: ${reason}</div>
  </div>
</body>
</html>`;
}

/**
 * PDF Redirect Handler
 * 
 * GET /p/:token - View PDF (inline)
 * GET /p/:token?download=1 - Download PDF (attachment)
 */
export const pdfRedirect = functions.https.onRequest(
  {
    region: 'asia-southeast1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (req, res) => {
    try {
      // Only accept GET
      if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Extract token from URL path
      const token = extractToken(req.path);

      if (!token) {
        res.status(400).send(renderErrorPage(
          'ลิงก์ไม่ถูกต้อง',
          'รูปแบบ URL ไม่ถูกต้อง',
          'INVALID_URL'
        ));
        return;
      }

      console.log(`[pdfRedirect] Request for token: ${token.substring(0, 8)}..., download: ${req.query.download}`);

      // Lookup and validate short link
      const result = await lookupShortLink(token);

      if (!result.success) {
        console.warn(`[pdfRedirect] Token validation failed: ${result.reason}`);

        const statusCode = result.reason === 'NOT_FOUND' ? 404 : 410; // 410 Gone for expired/revoked
        const title = result.reason === 'NOT_FOUND' ? 'ไม่พบเอกสาร' 
          : result.reason === 'EXPIRED' ? 'ลิงก์หมดอายุ' 
          : 'ลิงก์ถูกยกเลิก';

        res.status(statusCode).send(renderErrorPage(title, result.message, result.reason));
        return;
      }

      const { data } = result;

      // ✅ Document Opened Detection
      // Record that client opened this document (non-blocking, idempotent)
      // Only first open triggers notification to owner
      if (data.user_id && data.business_id && data.doc_id) {
        const { recordDocumentOpened } = await import('./services/documentOpenedService');
        recordDocumentOpened(
          data.doc_id,
          data.user_id,
          data.business_id,
          true // isClientAccess = true
        ).catch((err) => {
          // Non-blocking - log but don't fail the request
          console.warn(`[pdfRedirect] Document opened tracking failed:`, err);
        });
      }

      // Check if PDF exists in Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(data.pdf_path);

      const [exists] = await file.exists();
      if (!exists) {
        console.warn(`[pdfRedirect] PDF file not found in storage: ${data.pdf_path}`);
        res.status(404).send(renderErrorPage(
          'ไม่พบไฟล์ PDF',
          'ไฟล์ PDF ยังไม่พร้อมหรือถูกลบไปแล้ว',
          'PDF_NOT_FOUND'
        ));
        return;
      }

      // Determine content disposition based on query param
      const isDownload = req.query.download === '1';
      const filename = generateFilename(data);

      // Generate signed URL with proper disposition
      const disposition = isDownload 
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`;

      const signedUrl = await signPdfPath(data.pdf_path, {
        responseDisposition: disposition,
        responseType: 'application/pdf',
      });

      console.log(`[pdfRedirect] Redirecting token ${token.substring(0, 8)}... to signed URL (download=${isDownload})`);

      // Redirect to signed URL
      res.redirect(302, signedUrl);

    } catch (error: any) {
      console.error('[pdfRedirect] Error:', error);
      res.status(500).send(renderErrorPage(
        'เกิดข้อผิดพลาด',
        'กรุณาลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่',
        'INTERNAL_ERROR'
      ));
    }
  }
);
