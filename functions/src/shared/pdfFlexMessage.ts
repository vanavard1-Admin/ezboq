import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Shared PDF Flex Message Builder
 *
 * Provides consistent UI for PDF delivery across:
 * - onPdfJobCompleted (push)
 * - REQUEST_PDF (reply)
 * - deliverPdfTaskHandler (Cloud Tasks)
 */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Short link configuration
const SHORT_URL_BASE = process.env.SHORT_URL_BASE || 'https://ezdoc-v1-th.web.app';
const SHORT_LINK_EXPIRY_DAYS = 90;

/**
 * Document type info for display
 */
export interface DocTypeInfo {
  label: string;
  emoji: string;
  color: string;
}

/**
 * Normalize document type to standard format and get display label
 */
export function getDocTypeInfo(docType: string | undefined): DocTypeInfo {
  const normalized = (docType || '').toUpperCase();

  // Quotation variants
  if (['QUOTATION', 'QUO', 'QT', 'QU'].includes(normalized)) {
    return { label: 'ใบเสนอราคา', emoji: '📋', color: '#1DB446' };
  }

  // Invoice/Bill variants
  if (['INVOICE', 'INV', 'BILL', 'WB'].includes(normalized)) {
    return { label: 'ใบวางบิล', emoji: '📄', color: '#0066CC' };
  }

  // Receipt variants
  if (['RECEIPT', 'REC', 'RC', 'RCP', 'RCPT'].includes(normalized)) {
    return { label: 'ใบเสร็จรับเงิน', emoji: '✅', color: '#00AA00' };
  }

  if (['CREDIT_NOTE', 'CN'].includes(normalized)) {
    return { label: 'ใบลดหนี้', emoji: '↘️', color: '#C2410C' };
  }

  if (['DEBIT_NOTE', 'DN'].includes(normalized)) {
    return { label: 'ใบเพิ่มหนี้', emoji: '↗️', color: '#7C2D12' };
  }

  // Tax summary reports
  if (['TAX_SUMMARY', 'VAT_SUMMARY', 'TAX'].includes(normalized)) {
    return { label: 'สรุปภาษี', emoji: '🧾', color: '#7C3AED' };
  }

  // WHT certificate (50 ทวิ)
  if (['WHT_CERT', 'WHT', 'WHT_CERTIFICATE', '50TW', '50TWI'].includes(normalized)) {
    return { label: 'หนังสือรับรองหัก ณ ที่จ่าย', emoji: '📑', color: '#F97316' };
  }

  // Default
  return { label: 'เอกสาร', emoji: '📄', color: '#666666' };
}

/**
 * Generate a cryptographically secure token
 */
function generateSecureToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Get or create a short link token for a document
 *
 * Uses deterministic token based on docId to enable idempotent lookups
 * without requiring a composite index.
 */
export async function getOrCreateShortLink(params: {
  docId: string;
  docNo: string;
  docType: string;
  pdfPath: string;
  userId: string;
  businessId: string;
}): Promise<string> {
  const { docId, docNo, docType, pdfPath, userId, businessId } = params;
  const db = getDb();

  // Use deterministic token ID based on docId for simple idempotent lookup
  // This avoids complex composite index requirements
  const deterministicId = `doc_${docId}`;
  const existingDoc = await db.collection('pdf_short_links').doc(deterministicId).get();

  if (existingDoc.exists) {
    const existing = existingDoc.data()!;
    const expiresAt = existing.expires_at?.toDate();

    // Return existing token if not expired (with 1 day buffer)
    // and pdf_path matches (in case file was regenerated)
    if (
      existing.pdf_path === pdfPath &&
      expiresAt &&
      expiresAt.getTime() > Date.now() + 24 * 60 * 60 * 1000
    ) {
      return existing.token;
    }
  }

  // Create or update short link
  const token = existingDoc.exists ? existingDoc.data()!.token : generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SHORT_LINK_EXPIRY_DAYS);

  await db.collection('pdf_short_links').doc(deterministicId).set({
    token,
    doc_id: docId,
    doc_no: docNo,
    doc_type: docType,
    pdf_path: pdfPath,
    user_id: userId,
    business_id: businessId,
    document_ref: `users/${userId}/businesses/${businessId}/documents/${docId}`,
    created_at: existingDoc.exists
      ? existingDoc.data()!.created_at
      : admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
    revoked_at: null,
  });

  // Also ensure the token-based lookup document exists
  await db.collection('pdf_short_links').doc(token).set({
    token,
    doc_id: docId,
    doc_no: docNo,
    doc_type: docType,
    pdf_path: pdfPath,
    user_id: userId,
    business_id: businessId,
    document_ref: `users/${userId}/businesses/${businessId}/documents/${docId}`,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
    revoked_at: null,
  });

  console.log(`[ShortLink] Created/Updated: /p/${token} -> ${pdfPath}`);
  return token;
}

/**
 * Get or create a short link token for report PDFs (tax summaries, 50 ทวิ, etc.)
 */
export async function getOrCreateShortLinkForReport(params: {
  reportId: string;
  reportName: string;
  reportType: string;
  pdfPath: string;
  userId: string;
  businessId: string;
}): Promise<string> {
  const { reportId, reportName, reportType, pdfPath, userId, businessId } = params;
  const db = getDb();

  const deterministicId = `report_${reportId}`;
  const existingDoc = await db.collection('pdf_short_links').doc(deterministicId).get();

  if (existingDoc.exists) {
    const existing = existingDoc.data()!;
    const expiresAt = existing.expires_at?.toDate();
    if (
      existing.pdf_path === pdfPath &&
      expiresAt &&
      expiresAt.getTime() > Date.now() + 24 * 60 * 60 * 1000
    ) {
      return existing.token;
    }
  }

  const token = existingDoc.exists ? existingDoc.data()!.token : generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SHORT_LINK_EXPIRY_DAYS);

  await db.collection('pdf_short_links').doc(deterministicId).set({
    token,
    doc_id: reportId,
    doc_no: reportName,
    doc_type: reportType,
    pdf_path: pdfPath,
    user_id: userId,
    business_id: businessId,
    document_ref: `users/${userId}/businesses/${businessId}/reports/${reportId}`,
    created_at: existingDoc.exists
      ? existingDoc.data()!.created_at
      : admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
    revoked_at: null,
  });

  await db.collection('pdf_short_links').doc(token).set({
    token,
    doc_id: reportId,
    doc_no: reportName,
    doc_type: reportType,
    pdf_path: pdfPath,
    user_id: userId,
    business_id: businessId,
    document_ref: `users/${userId}/businesses/${businessId}/reports/${reportId}`,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
    revoked_at: null,
  });

  console.log(`[ShortLink] Created/Updated report: /p/${token} -> ${pdfPath}`);
  return token;
}

export async function buildReportFlexMessageWithShortLink(params: {
  reportId: string;
  reportName: string;
  reportType: string;
  pdfPath: string;
  userId: string;
  businessId: string;
}): Promise<{ flexMessage: Record<string, unknown>; shortUrl: string }> {
  const token = await getOrCreateShortLinkForReport(params);
  const downloadUrl = buildShortUrl(token, true);
  const shortUrl = buildShortUrl(token);
  const docTypeInfo = getDocTypeInfo(params.reportType);

  const flexMessage = buildPdfFlexMessage({
    documentNo: params.reportName,
    downloadUrl,
    docTypeInfo,
  });

  return { flexMessage, shortUrl };
}

/**
 * Build short URL from token
 */
export function buildShortUrl(token: string, download = false): string {
  const base = `${SHORT_URL_BASE}/p/${token}`;
  return download ? `${base}?download=1` : base;
}

/**
 * Gradient color pairs for each doc type (start → end)
 */
const GRADIENT_COLORS: Record<string, { start: string; end: string }> = {
  '#1DB446': { start: '#1DB446', end: '#009624' }, // Quotation: green
  '#0066CC': { start: '#0066CC', end: '#004999' }, // Invoice: blue
  '#00AA00': { start: '#00AA00', end: '#007700' }, // Receipt: green
  '#C2410C': { start: '#C2410C', end: '#9A3412' }, // Credit Note: orange
  '#7C2D12': { start: '#7C2D12', end: '#5C1D0E' }, // Debit Note: brown
  '#7C3AED': { start: '#7C3AED', end: '#5B21B6' }, // Tax: purple
  '#F97316': { start: '#F97316', end: '#C2410C' }, // WHT: orange
  '#666666': { start: '#555555', end: '#333333' }, // Default: gray
};

/**
 * Get the smart "next step" message action label + text based on doc type
 */
function getNextStepAction(rawDocType: string, documentNo: string): { label: string; text: string } | null {
  const normalized = (rawDocType || '').toUpperCase();

  // Quotation → Invoice
  if (['QUOTATION', 'QUO', 'QT', 'QU'].includes(normalized)) {
    return {
      label: '🧾 ออกใบวางบิลต่อ',
      text: `ใบวางบิลจาก ${documentNo}`,
    };
  }

  // Invoice → Receipt
  if (['INVOICE', 'INV', 'BILL', 'WB'].includes(normalized)) {
    return {
      label: '💰 ออกใบเสร็จต่อ',
      text: `ใบเสร็จจาก ${documentNo}`,
    };
  }

  // Receipt, Credit Note, etc. → no next step
  return null;
}

/**
 * Build a premium LINE Flex Message for PDF delivery.
 *
 * ✅ Gradient header with EzDoc branding
 * ✅ Customer name + amount info rows (optional)
 * ✅ 3 action buttons: View / Download / Share
 * ✅ Smart "next step" button based on doc type
 */
export function buildPdfFlexMessage(params: {
  documentNo: string;
  downloadUrl: string;
  docTypeInfo: DocTypeInfo;
  createdAt?: Date;
  customerName?: string;
  totalAmount?: number;
  rawDocType?: string;
  shareUrl?: string;
}): Record<string, unknown> {
  const {
    documentNo,
    downloadUrl,
    docTypeInfo,
    createdAt,
    customerName,
    totalAmount,
    rawDocType,
    shareUrl,
  } = params;

  // Format date if provided
  const dateText = createdAt
    ? new Date(createdAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  // Build view URL (without download param)
  const viewUrl = downloadUrl.includes('?download=1')
    ? downloadUrl.replace('?download=1', '')
    : downloadUrl;

  // Gradient colors for header
  const gradient = GRADIENT_COLORS[docTypeInfo.color] || GRADIENT_COLORS['#666666'];

  // Share URL for the share button
  const effectiveShareUrl = shareUrl || viewUrl;
  const shareText = `${docTypeInfo.emoji} ${docTypeInfo.label} ${documentNo}\n🔗 ${effectiveShareUrl}`;
  const shareUri = `https://line.me/R/share?text=${encodeURIComponent(shareText)}`;

  // Smart next step
  const nextStep = rawDocType ? getNextStepAction(rawDocType, documentNo) : null;

  // --- Build info rows for body ---
  const infoRows: Record<string, unknown>[] = [];

  // Customer name row
  if (customerName) {
    infoRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '👤',
          size: 'sm',
          flex: 0,
        },
        {
          type: 'text',
          text: customerName,
          size: 'sm',
          color: '#333333',
          weight: 'bold',
          margin: 'sm',
          flex: 1,
        },
      ],
      margin: 'md',
    });
  }

  // Amount row
  if (totalAmount !== undefined && totalAmount !== null) {
    infoRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '💰',
          size: 'sm',
          flex: 0,
        },
        {
          type: 'text',
          text: `฿${totalAmount.toLocaleString('th-TH')}`,
          size: 'sm',
          color: '#333333',
          weight: 'bold',
          margin: 'sm',
          flex: 1,
        },
      ],
      margin: 'sm',
    });
  }

  // Date row
  if (dateText) {
    infoRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '📅',
          size: 'xs',
          flex: 0,
        },
        {
          type: 'text',
          text: dateText,
          size: 'xs',
          color: '#888888',
          margin: 'sm',
          flex: 1,
        },
      ],
      margin: 'sm',
    });
  }

  // --- Build footer buttons ---
  const footerButtons: Record<string, unknown>[] = [
    // Row 1: View + Download (horizontal)
    {
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: {
            type: 'uri',
            label: '👁️ เปิดดู',
            uri: viewUrl,
          },
          flex: 1,
        },
        {
          type: 'button',
          style: 'primary',
          height: 'sm',
          action: {
            type: 'uri',
            label: '📥 ดาวน์โหลด',
            uri: downloadUrl,
          },
          color: gradient.start,
          flex: 1,
        },
      ],
    },
    // Row 2: Share button (full width)
    {
      type: 'button',
      style: 'secondary',
      height: 'sm',
      action: {
        type: 'uri',
        label: '📤 ส่งให้ลูกค้า',
        uri: shareUri,
      },
    },
  ];

  // Row 3: Smart next-step button (if applicable)
  if (nextStep) {
    footerButtons.push({
      type: 'button',
      style: 'primary',
      height: 'sm',
      action: {
        type: 'message',
        label: nextStep.label,
        text: nextStep.text,
      },
      color: '#555555',
    });
  }

  return {
    type: 'flex',
    altText: `${docTypeInfo.emoji} ${docTypeInfo.label} ${documentNo} พร้อมแล้ว`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          // Branding row
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'EzDoc',
                weight: 'bold',
                size: 'xs',
                color: '#FFFFFF',
                flex: 0,
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '✓ ยืนยันแล้ว',
                    size: 'xxs',
                    color: '#FFFFFFCC',
                    align: 'end',
                  },
                ],
                flex: 1,
              },
            ],
          },
          // Doc type display
          {
            type: 'text',
            text: `${docTypeInfo.emoji} ${docTypeInfo.label}`,
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF',
            margin: 'md',
          },
          // Document number
          {
            type: 'text',
            text: documentNo,
            weight: 'bold',
            size: 'md',
            color: '#FFFFFFDD',
            margin: 'sm',
          },
        ],
        paddingAll: '18px',
        paddingBottom: '16px',
        background: {
          type: 'linearGradient',
          angle: '135deg',
          startColor: gradient.start,
          endColor: gradient.end,
        },
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          // Info rows (customer, amount, date)
          ...(infoRows.length > 0
            ? [
                ...infoRows,
                { type: 'separator', margin: 'lg' },
              ]
            : []),
          // Security badge
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '🔒 ลิงก์ปลอดภัย',
                size: 'xxs',
                color: '#00AA00',
                flex: 0,
              },
            ],
            margin: infoRows.length > 0 ? 'md' : 'none',
          },
        ],
        paddingAll: '15px',
        paddingTop: infoRows.length > 0 ? '15px' : '12px',
        paddingBottom: '10px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: footerButtons,
        paddingAll: '15px',
        paddingTop: '8px',
      },
    },
  };
}

/**
 * Build Flex message with short link (preferred for security)
 * ✅ Premium design with gradient, share, and smart next-step
 */
export async function buildPdfFlexMessageWithShortLink(params: {
  docId: string;
  docNo: string;
  docType: string;
  pdfPath: string;
  userId: string;
  businessId: string;
  createdAt?: Date | admin.firestore.Timestamp;
  customerName?: string;
  totalAmount?: number;
}): Promise<Record<string, unknown>> {
  const { docNo, docType, createdAt, customerName, totalAmount } = params;

  // Get or create short link
  const token = await getOrCreateShortLink(params);
  const downloadUrl = buildShortUrl(token, true);
  const shareUrl = buildShortUrl(token);

  // Get doc type info
  const docTypeInfo = getDocTypeInfo(docType);

  // Convert Firestore Timestamp to Date if needed
  const createdAtDate = createdAt
    ? (createdAt instanceof admin.firestore.Timestamp
        ? createdAt.toDate()
        : createdAt instanceof Date
          ? createdAt
          : null)
    : null;

  return buildPdfFlexMessage({
    documentNo: docNo,
    downloadUrl,
    docTypeInfo,
    createdAt: createdAtDate || undefined,
    customerName,
    totalAmount,
    rawDocType: docType,
    shareUrl,
  });
}
