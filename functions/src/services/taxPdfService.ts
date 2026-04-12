import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import { getPdfRenderUrl, getPdfServiceAudience, getDefaultSignedUrlExpireDays } from '../shared/config';
import { getVatSummary, getWhtSummary, getWhtCertificateSummary } from '../core/taxReportService';
import { getDb } from '../core/firebaseAdmin';
import { pushLineMessage, pushLineMessages } from './lineService';
import { buildReportFlexMessageWithShortLink } from '../shared/pdfFlexMessage';
import {
  saveTaxSummaryVerificationRecord,
  saveWhtCertificateVerificationRecord,
} from './verificationService';

const auth = new GoogleAuth();
const db = getDb();

type PdfServiceResult = {
  pdfBuffer: Buffer;
  fingerprint?: string;
  renderVersion?: string;
  templateVersion?: string;
};

const getCurrentMonthKey = (): string => {
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${thaiYear}_${month}`;
};

const monthKeyToLabel = (monthKey: string): string => {
  const [yearStr, monthStr] = monthKey.split('_');
  const monthIdx = Math.max(1, Math.min(12, Number(monthStr))) - 1;
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${thaiMonths[monthIdx]} ${yearStr}`;
};

const parseMonthKeyFromText = (text: string): string => {
  const normalized = text.trim();
  const lower = normalized.toLowerCase();
  if (lower.includes('เดือนนี้')) {
    return getCurrentMonthKey();
  }
  if (lower.includes('เดือนก่อน')) {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thaiYear = prev.getFullYear() + 543;
    const month = String(prev.getMonth() + 1).padStart(2, '0');
    return `${thaiYear}_${month}`;
  }

  const numericMatch = normalized.match(/(\d{1,2})[/-](\d{2,4})/);
  if (numericMatch) {
    const month = parseInt(numericMatch[1], 10);
    let year = parseInt(numericMatch[2], 10);
    if (year < 100) year = 2500 + year;
    if (year < 2400) year += 543;
    if (month >= 1 && month <= 12) {
      return `${year}_${String(month).padStart(2, '0')}`;
    }
  }

  const thaiMonthAliases: Array<{ idx: number; keys: string[] }> = [
    { idx: 1, keys: ['ม.ค.', 'มกราคม'] },
    { idx: 2, keys: ['ก.พ.', 'กุมภาพันธ์'] },
    { idx: 3, keys: ['มี.ค.', 'มีนาคม'] },
    { idx: 4, keys: ['เม.ย.', 'เมษายน'] },
    { idx: 5, keys: ['พ.ค.', 'พฤษภาคม'] },
    { idx: 6, keys: ['มิ.ย.', 'มิถุนายน'] },
    { idx: 7, keys: ['ก.ค.', 'กรกฎาคม'] },
    { idx: 8, keys: ['ส.ค.', 'สิงหาคม'] },
    { idx: 9, keys: ['ก.ย.', 'กันยายน'] },
    { idx: 10, keys: ['ต.ค.', 'ตุลาคม'] },
    { idx: 11, keys: ['พ.ย.', 'พฤศจิกายน'] },
    { idx: 12, keys: ['ธ.ค.', 'ธันวาคม'] },
  ];

  for (const { idx, keys } of thaiMonthAliases) {
    if (keys.some((key) => normalized.includes(key))) {
      const yearMatch = normalized.match(/(25\d{2})/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear() + 543;
      return `${year}_${String(idx).padStart(2, '0')}`;
    }
  }

  return getCurrentMonthKey();
};

function getPdfServiceBaseUrl(): string {
  const renderUrl = getPdfRenderUrl();
  return renderUrl.replace(/\/jobs\/render-buffer.*$/, '');
}

async function callPdfService(endpointPath: string, payload: Record<string, unknown>): Promise<PdfServiceResult> {
  const baseUrl = getPdfServiceBaseUrl();
  const url = `${baseUrl}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`;
  const audience = getPdfServiceAudience() || baseUrl;
  const client = await auth.getIdTokenClient(audience);

  const resp = await client.request<ArrayBuffer>({
    url,
    method: 'POST',
    data: payload,
    responseType: 'arraybuffer',
    timeout: 120_000,
    validateStatus: (status) => status < 500,
  });

  const contentType = resp.headers['content-type'] || resp.headers['Content-Type'] || '';
  const isPdf = contentType.includes('application/pdf');
  if (resp.status >= 400 || !isPdf) {
    const errorText = Buffer.from(resp.data).toString('utf-8');
    throw new Error(`PDF service error (${resp.status}): ${errorText}`);
  }

  const buffer = Buffer.from(resp.data);
  if (buffer.length < 1000) {
    throw new Error(`PDF buffer too small (${buffer.length} bytes)`);
  }

  const headerValue = (key: string): string | undefined => {
    const lower = key.toLowerCase();
    const value = (resp.headers as Record<string, string | undefined>)[lower];
    return value || (resp.headers as Record<string, string | undefined>)[key] || undefined;
  };

  return {
    pdfBuffer: buffer,
    fingerprint: headerValue('x-pdf-fingerprint'),
    renderVersion: headerValue('x-pdf-render-version'),
    templateVersion: headerValue('x-pdf-template-version'),
  };
}

async function uploadPdf(path: string, buffer: Buffer): Promise<string> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(path);

  await file.save(buffer, {
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'private, max-age=0, no-transform',
    },
  });

  const expires = Date.now() + getDefaultSignedUrlExpireDays() * 24 * 60 * 60 * 1000;
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires,
  });

  return signedUrl;
}

async function getBusinessProfile(userId: string, businessId: string) {
  const snap = await db.doc(`users/${userId}/businesses/${businessId}`).get();
  const data = snap.data() || {};
  return {
    name: String(data.name || 'EzDoc'),
    tax_id: String(data.taxId || data.tax_id || ''),
    address: String(data.address || ''),
    phone: String(data.phone || ''),
    email: String(data.email || ''),
  };
}

export async function generateTaxSummaryPdf(
  userId: string,
  businessId: string,
  monthKey: string
): Promise<{ url: string; storagePath: string }> {
  const [vatSummary, whtSummary, business] = await Promise.all([
    getVatSummary(userId, businessId, monthKey),
    getWhtSummary(userId, businessId, monthKey),
    getBusinessProfile(userId, businessId),
  ]);

  if (!vatSummary) {
    throw new Error('VAT summary not available');
  }

  const payload = {
    business,
    month: {
      key: monthKey,
      label: monthKeyToLabel(monthKey),
    },
    vat: {
      output_base: vatSummary.output.base,
      output_vat: vatSummary.output.vat,
      input_base: vatSummary.input.base,
      input_vat: vatSummary.input.vat,
      payable: vatSummary.payable,
    },
    wht: {
      total_base: whtSummary?.totalBase || 0,
      total_wht: whtSummary?.totalWht || 0,
      rate_groups: whtSummary?.rateGroups || [],
    },
    generated_at: new Date().toISOString(),
  };

  const { pdfBuffer, fingerprint, renderVersion, templateVersion } = await callPdfService('/jobs/render-tax-summary', payload);
  const storagePath = `tax-reports/${businessId}/${monthKey}/tax-summary.pdf`;
  const url = await uploadPdf(storagePath, pdfBuffer);
  if (fingerprint) {
    try {
      await saveTaxSummaryVerificationRecord({
        fingerprint,
        businessId,
        businessName: business.name,
        businessTaxId: business.tax_id || null,
        monthKey,
        monthLabel: monthKeyToLabel(monthKey),
        storagePath,
        renderVersion: renderVersion || null,
        templateVersion: templateVersion || null,
        payableVat: vatSummary.payable,
        outputVat: vatSummary.output.vat,
        inputVat: vatSummary.input.vat,
        totalWht: whtSummary?.totalWht || 0,
      });
    } catch (verificationError) {
      console.warn('[taxPdfService] Failed to save tax summary verification record:', verificationError);
    }
  }
  return { url, storagePath };
}

export async function generateWhtCertificatePdf(
  userId: string,
  businessId: string,
  supplierName: string,
  monthKey: string
): Promise<{ url: string; storagePath: string }> {
  const [certificate, business] = await Promise.all([
    getWhtCertificateSummary(userId, businessId, supplierName, monthKey),
    getBusinessProfile(userId, businessId),
  ]);

  if (!certificate) {
    throw new Error('ไม่พบข้อมูลหัก ณ ที่จ่ายสำหรับผู้รับนี้');
  }

  const payload = {
    business,
    supplier: {
      name: certificate.supplierName,
      tax_id: certificate.supplierTaxId || '',
      address: certificate.supplierAddress || '',
    },
    period: {
      key: certificate.monthKey,
      label: certificate.month,
    },
    wht: {
      total_base: certificate.totalBase,
      total_wht: certificate.totalWht,
      rate_groups: certificate.rateGroups,
      item_count: certificate.itemCount,
    },
    generated_at: new Date().toISOString(),
  };

  const { pdfBuffer, fingerprint, renderVersion, templateVersion } = await callPdfService('/jobs/render-wht-certificate', payload);
  const safeSupplier = certificate.supplierName.replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
  const storagePath = `tax-reports/${businessId}/${monthKey}/wht-${safeSupplier}.pdf`;
  const url = await uploadPdf(storagePath, pdfBuffer);
  if (fingerprint) {
    try {
      await saveWhtCertificateVerificationRecord({
        fingerprint,
        businessId,
        businessName: business.name,
        businessTaxId: business.tax_id || null,
        periodKey: certificate.monthKey,
        periodLabel: certificate.month,
        supplierName: certificate.supplierName,
        storagePath,
        renderVersion: renderVersion || null,
        templateVersion: templateVersion || null,
        totalWht: certificate.totalWht,
        totalBase: certificate.totalBase,
        itemCount: certificate.itemCount,
      });
    } catch (verificationError) {
      console.warn('[taxPdfService] Failed to save WHT verification record:', verificationError);
    }
  }
  return { url, storagePath };
}

export async function sendTaxSummaryPdfToLine(params: {
  userId: string;
  businessId: string;
  lineUserId: string;
  messageText?: string;
}): Promise<void> {
  const monthKey = parseMonthKeyFromText(params.messageText || '');
  try {
    await pushLineMessage(params.lineUserId, '⏳ กำลังสร้าง PDF สรุปภาษี จะส่งให้เมื่อพร้อม');
    const { storagePath } = await generateTaxSummaryPdf(params.userId, params.businessId, monthKey);
    const reportName = `สรุปภาษี ${monthKeyToLabel(monthKey)}`;
    const reportId = `tax_summary_${params.businessId}_${monthKey}`;
    const { flexMessage, shortUrl } = await buildReportFlexMessageWithShortLink({
      reportId,
      reportName,
      reportType: 'TAX_SUMMARY',
      pdfPath: storagePath,
      userId: params.userId,
      businessId: params.businessId,
    });
    await pushLineMessages(params.lineUserId, [
      flexMessage,
      { type: 'text', text: `🔗 ลิงก์สั้นสำหรับแชร์: ${shortUrl}` },
    ]);
  } catch (error) {
    console.error('[taxPdfService] Failed to send tax summary PDF:', error);
    await pushLineMessage(params.lineUserId, 'โอ๊ะ! สร้าง PDF สรุปภาษีไม่สำเร็จ\nลองใหม่ได้เลยอีกครั้ง');
  }
}

export async function sendWhtCertificatePdfToLine(params: {
  userId: string;
  businessId: string;
  lineUserId: string;
  supplierName: string;
  messageText?: string;
}): Promise<void> {
  const monthKey = parseMonthKeyFromText(params.messageText || '');
  try {
    await pushLineMessage(params.lineUserId, `⏳ กำลังสร้าง PDF 50 ทวิ ให้ ${params.supplierName}`);
    const { storagePath } = await generateWhtCertificatePdf(params.userId, params.businessId, params.supplierName, monthKey);
    const safeSupplier = params.supplierName.replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
    const reportName = `50 ทวิ ${params.supplierName} (${monthKeyToLabel(monthKey)})`;
    const reportId = `wht_${params.businessId}_${monthKey}_${safeSupplier}`;
    const { flexMessage, shortUrl } = await buildReportFlexMessageWithShortLink({
      reportId,
      reportName,
      reportType: 'WHT_CERT',
      pdfPath: storagePath,
      userId: params.userId,
      businessId: params.businessId,
    });
    await pushLineMessages(params.lineUserId, [
      flexMessage,
      { type: 'text', text: `🔗 ลิงก์สั้นสำหรับแชร์: ${shortUrl}` },
    ]);
  } catch (error) {
    console.error('[taxPdfService] Failed to send WHT certificate PDF:', error);
    await pushLineMessage(params.lineUserId, 'โอ๊ะ! สร้าง PDF 50 ทวิไม่สำเร็จ\nตรวจชื่อผู้รับ แล้วลองใหม่ได้เลย');
  }
}
