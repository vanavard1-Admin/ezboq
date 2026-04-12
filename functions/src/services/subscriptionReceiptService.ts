import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import { getDb } from '../core/firebaseAdmin';
import { getLineLink } from '../core/lineLinkService';
import { getPdfRenderUrl, getPdfServiceAudience } from '../shared/config';
import { buildShortUrl, getOrCreateShortLinkForReport } from '../shared/pdfFlexMessage';
import type { CreditPurchase } from './purchaseService';
import { getPackageDefinition } from './purchaseService';
import { getAdminFirebaseUids, getAdminLineUserIds } from './adminAuthService';
import {
  getPaymentSuccessMessage,
  getPaymentSuccessQuickReply,
  getPaymentThankYouMessage,
} from './paymentUXCopy';
import { pushLineMessage, pushLineMessages } from './lineService';

const db = getDb();
const auth = new GoogleAuth();

const EZDOC_LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Flogo%20icon.png?alt=media&token=033785a0-0a9c-40d0-8acb-fa406803600d';

const EZDOC_ISSUER = {
  name: 'EzDOC',
  address: '',
  tax_id: '',
  phone: '',
  email: 'admin@ezboq.com',
  logo_url: EZDOC_LOGO_URL,
  signatory_name: 'ทีมงาน EzDOC',
  signatory_title: 'Customer Success',
  pdfTheme: 'executive',
} as const;

type PdfServiceResult = {
  pdfBuffer: Buffer;
};

type ReceiptAsset = {
  businessId: string;
  docNo: string;
  pdfPath: string;
  shortUrl: string;
  downloadUrl: string;
  customerName: string;
};

async function resolveBusinessIdForPurchase(purchase: CreditPurchase): Promise<string> {
  try {
    const link = await getLineLink(purchase.lineUserId);
    if (link?.uid === purchase.userId && link.businessId) {
      return link.businessId;
    }
  } catch (error) {
    console.warn('[subscriptionReceipt] Failed to resolve line link for businessId:', error);
  }

  const businessQuery = await db
    .collection(`users/${purchase.userId}/businesses`)
    .limit(1)
    .get();

  if (!businessQuery.empty) {
    return businessQuery.docs[0].id;
  }

  return 'default';
}

function getPdfServiceBaseUrl(): string {
  const renderUrl = getPdfRenderUrl();
  return renderUrl.replace(/\/jobs\/render-buffer.*$/, '');
}

function buildReceiptDocNo(purchase: CreditPurchase, purchaseId: string): string {
  const ref = String(purchase.referenceId || purchaseId).replace(/[^A-Za-z0-9_-]/g, '');
  return `EZDOC-REC-${ref.slice(0, 24)}`;
}

function getPackageReceiptLabel(packageType: CreditPurchase['packageType']): string {
  const pkg = getPackageDefinition(packageType);
  if (!pkg) return 'ค่าสมาชิก EzDOC';
  const duration = pkg.durationMonths >= 12 ? 'รายปี' : 'รายเดือน';
  const planName = pkg.plan === 'TEAM' ? 'EzDOC Team' : 'EzDOC Pro';
  return `${planName} ${duration}`;
}

function formatReceiptDate(value: unknown): string {
  const date =
    value instanceof admin.firestore.Timestamp
      ? value.toDate()
      : value instanceof Date
        ? value
        : new Date();

  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function callPdfService(payload: Record<string, unknown>): Promise<PdfServiceResult> {
  const baseUrl = getPdfServiceBaseUrl();
  const url = `${baseUrl}/jobs/render-buffer`;
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
    throw new Error(`Receipt PDF buffer too small (${buffer.length} bytes)`);
  }

  return { pdfBuffer: buffer };
}

async function uploadReceiptPdf(path: string, buffer: Buffer): Promise<void> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(path);
  await file.save(buffer, {
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'private, max-age=0, no-transform',
    },
  });
}

async function getCustomerProfile(purchase: CreditPurchase): Promise<{
  businessId: string;
  customer: {
    name: string;
    address: string;
    tax_id: string;
    phone: string;
    email: string;
  };
}> {
  const businessId = await resolveBusinessIdForPurchase(purchase);

  const businessSnap = await db.doc(`users/${purchase.userId}/businesses/${businessId}`).get();
  const businessData = businessSnap.data() || {};

  let fallbackEmail = '';
  try {
    const authUser = await admin.auth().getUser(purchase.userId);
    fallbackEmail = authUser.email || '';
  } catch {
    fallbackEmail = '';
  }

  return {
    businessId,
    customer: {
      name: String(businessData.name || 'สมาชิก EzDOC').trim(),
      address: String(businessData.address || '').trim(),
      tax_id: String(businessData.taxId || businessData.tax_id || '').trim(),
      phone: String(businessData.phone || '').trim(),
      email: String(businessData.email || fallbackEmail || '').trim(),
    },
  };
}

function buildReceiptFlexMessage(params: {
  docNo: string;
  packageLabel: string;
  amount: number;
  paidAt: unknown;
  shortUrl: string;
  downloadUrl: string;
}): Record<string, unknown> {
  return {
    type: 'flex',
    altText: `🧾 ใบเสร็จ EzDOC ${params.docNo}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        background: {
          type: 'linearGradient',
          angle: '135deg',
          startColor: '#103f2a',
          endColor: '#1f8a5b',
        },
        contents: [
          {
            type: 'text',
            text: 'EzDOC',
            color: '#FFFFFFCC',
            size: 'xs',
            weight: 'bold',
          },
          {
            type: 'text',
            text: '🧾 ใบเสร็จรับเงิน',
            color: '#FFFFFF',
            size: 'xl',
            weight: 'bold',
            margin: 'md',
          },
          {
            type: 'text',
            text: params.docNo,
            color: '#FFFFFFDD',
            size: 'sm',
            margin: 'sm',
          },
        ],
        paddingAll: '18px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'baseline',
            contents: [
              { type: 'text', text: 'แพ็กเกจ', size: 'sm', color: '#6B7280', flex: 3 },
              { type: 'text', text: params.packageLabel, size: 'sm', color: '#111827', weight: 'bold', flex: 5, wrap: true },
            ],
          },
          {
            type: 'box',
            layout: 'baseline',
            contents: [
              { type: 'text', text: 'ยอดชำระ', size: 'sm', color: '#6B7280', flex: 3 },
              { type: 'text', text: `฿${params.amount.toLocaleString('th-TH')}`, size: 'sm', color: '#111827', weight: 'bold', flex: 5 },
            ],
          },
          {
            type: 'box',
            layout: 'baseline',
            contents: [
              { type: 'text', text: 'วันที่ชำระ', size: 'sm', color: '#6B7280', flex: 3 },
              { type: 'text', text: formatReceiptDate(params.paidAt), size: 'sm', color: '#111827', flex: 5 },
            ],
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'text',
            text: 'เอกสารฉบับนี้ออกโดย EzDOC เพื่อยืนยันการรับชำระค่าสมาชิกของคุณ',
            size: 'xs',
            color: '#6B7280',
            wrap: true,
          },
        ],
        paddingAll: '16px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#1f8a5b',
            action: {
              type: 'uri',
              label: '👁️ เปิดใบเสร็จ',
              uri: params.shortUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📥 ดาวน์โหลด PDF',
              uri: params.downloadUrl,
            },
          },
        ],
        paddingAll: '16px',
      },
    },
  };
}

function buildAdminReceiptText(params: {
  purchaseId: string;
  docNo: string;
  packageLabel: string;
  amount: number;
  customerName: string;
  paidAt: unknown;
  shortUrl: string;
}): string {
  return [
    '🧾 มีใบเสร็จค่าสมาชิก EzDOC ออกใหม่',
    `เลขที่: ${params.docNo}`,
    `Purchase ID: ${params.purchaseId}`,
    `ลูกค้า: ${params.customerName || '-'}`,
    `แพ็กเกจ: ${params.packageLabel}`,
    `ยอดชำระ: ฿${params.amount.toLocaleString('th-TH')}`,
    `วันที่ชำระ: ${formatReceiptDate(params.paidAt)}`,
    `เปิดเอกสาร: ${params.shortUrl}`,
  ].join('\n');
}

async function resolveAdminLineUserIds(): Promise<string[]> {
  const adminLineUserIds = new Set<string>(getAdminLineUserIds());
  const adminFirebaseUids = getAdminFirebaseUids();

  for (const uid of adminFirebaseUids) {
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      const lineUserId = userDoc.exists ? String(userDoc.data()?.lineUserId || '') : '';
      if (lineUserId.startsWith('U')) {
        adminLineUserIds.add(lineUserId);
      }
    } catch (error) {
      console.warn('[subscriptionReceipt] Failed to resolve admin lineUserId:', error);
    }
  }

  return Array.from(adminLineUserIds);
}

async function ensureSubscriptionReceiptAsset(purchaseId: string, purchase: CreditPurchase): Promise<ReceiptAsset> {
  const existingDocNo = purchase.subscription_receipt_doc_no;
  const existingPath = purchase.subscription_receipt_pdf_path;
  const packageLabel = getPackageReceiptLabel(purchase.packageType);

  const { businessId, customer } = await getCustomerProfile(purchase);
  const docNo = existingDocNo || buildReceiptDocNo(purchase, purchaseId);
  const pdfPath = existingPath || `platform-receipts/${purchase.userId}/${purchaseId}/${docNo}.pdf`;

  if (!existingPath) {
    const paidAt =
      purchase.paidAt ||
      purchase.payment_verified_at ||
      admin.firestore.Timestamp.now();

    const payload = {
      doc: {
        id: purchaseId,
        type: 'RECEIPT',
        no: docNo,
        status: 'PAID',
        issue_date: paidAt,
        created_at: purchase.createdAt,
        title_th: 'ใบเสร็จรับเงิน',
        title_en: 'Receipt',
        subject_th: `ค่าสมาชิก ${packageLabel}`,
        subject_en: `${packageLabel} subscription fee`,
        language_mode: 'BILINGUAL',
        theme: 'executive',
        notes: 'ขอบพระคุณที่ไว้วางใจและสนับสนุน EzDOC',
        terms: 'เอกสารฉบับนี้เป็นหลักฐานการรับชำระค่าสมาชิกของ EzDOC',
      },
      business: EZDOC_ISSUER,
      customer,
      items: [
        {
          name: packageLabel,
          description: 'ค่าบริการสมาชิก EzDOC',
          qty: 1,
          unit: 'แพ็ก',
          price: purchase.amount,
          amount: purchase.amount,
        },
      ],
      totals: {
        sub_total: purchase.amount,
        vat: 0,
        vat_percent: 0,
        discount: 0,
        wht: 0,
        total: purchase.amount,
      },
      payment: {
        method: 'PROMPTPAY',
        promptpay_name: String(purchase.promptpayName || ''),
        promptpay_account: String(purchase.promptpayId || ''),
        amount: purchase.amount,
        lock_amount: true,
        paid_at: paidAt,
        reference_no: String(purchase.referenceId || purchaseId),
      },
      assets: {
        business_logo_url: EZDOC_LOGO_URL,
      },
    };

    const { pdfBuffer } = await callPdfService(payload);
    await uploadReceiptPdf(pdfPath, pdfBuffer);

    await db.collection('credit_purchases').doc(purchaseId).set({
      subscription_receipt_doc_no: docNo,
      subscription_receipt_pdf_path: pdfPath,
    }, { merge: true });
  }

  const token = await getOrCreateShortLinkForReport({
    reportId: `subscription_receipt_${purchaseId}`,
    reportName: docNo,
    reportType: 'RECEIPT',
    pdfPath,
    userId: purchase.userId,
    businessId,
  });

  const shortUrl = buildShortUrl(token);
  const downloadUrl = buildShortUrl(token, true);

  return {
    businessId,
    docNo,
    pdfPath,
    shortUrl,
    downloadUrl,
    customerName: customer.name,
  };
}

async function sendSubscriptionReceiptToAdmins(
  purchaseId: string,
  purchase: CreditPurchase,
  asset: ReceiptAsset,
  packageLabel: string
): Promise<number> {
  if (purchase.subscription_receipt_admin_sent_at) {
    return 0;
  }

  const adminLineUserIds = await resolveAdminLineUserIds();
  if (adminLineUserIds.length === 0) {
    return 0;
  }

  const paidAt = purchase.paidAt || purchase.payment_verified_at || purchase.createdAt;
  const summaryMessage = {
    type: 'text',
    text: buildAdminReceiptText({
      purchaseId,
      docNo: asset.docNo,
      packageLabel,
      amount: purchase.amount,
      customerName: asset.customerName,
      paidAt,
      shortUrl: asset.shortUrl,
    }),
  };
  const flexMessage = buildReceiptFlexMessage({
    docNo: asset.docNo,
    packageLabel,
    amount: purchase.amount,
    paidAt,
    shortUrl: asset.shortUrl,
    downloadUrl: asset.downloadUrl,
  });

  let sentCount = 0;
  for (const lineUserId of adminLineUserIds) {
    try {
      await pushLineMessages(lineUserId, [summaryMessage, flexMessage]);
      sentCount += 1;
    } catch (error) {
      console.warn('[subscriptionReceipt] Failed to send admin receipt notification:', error);
    }
  }

  if (sentCount > 0) {
    await db.collection('credit_purchases').doc(purchaseId).set({
      subscription_receipt_admin_sent_at: admin.firestore.FieldValue.serverTimestamp(),
      subscription_receipt_admin_line_sent_count: sentCount,
    }, { merge: true });
  }

  return sentCount;
}

export async function sendSubscriptionSuccessExperience(purchaseId: string): Promise<{
  successMessageSent: boolean;
  receiptSent: boolean;
  adminReceiptSent: boolean;
}> {
  const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
  const purchaseDoc = await purchaseRef.get();

  if (!purchaseDoc.exists) {
    throw new Error(`Purchase not found: ${purchaseId}`);
  }

  const purchase = purchaseDoc.data() as CreditPurchase;
  const packageLabel = getPackageReceiptLabel(purchase.packageType);

  let successMessageSent = false;
  let receiptSent = false;
  let adminReceiptSent = false;

  if (!purchase.subscription_success_message_sent_at) {
    const text =
      `${getPaymentSuccessMessage(packageLabel)}\n\n` +
      `${getPaymentThankYouMessage()}\n\n` +
      'เพื่อความเรียบร้อย ผมได้จัดทำใบเสร็จรับเงินของ EzDOC และแนบไว้ให้ด้านล่างแล้วครับ';

    await pushLineMessage(
      purchase.lineUserId,
      text,
      undefined,
      getPaymentSuccessQuickReply()
    );

    await purchaseRef.set({
      subscription_success_message_sent_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    successMessageSent = true;
  }

  if (!purchase.subscription_receipt_sent_at) {
    const asset = await ensureSubscriptionReceiptAsset(purchaseId, purchase);
    const flexMessage = buildReceiptFlexMessage({
      docNo: asset.docNo,
      packageLabel,
      amount: purchase.amount,
      paidAt: purchase.paidAt || purchase.payment_verified_at || purchase.createdAt,
      shortUrl: asset.shortUrl,
      downloadUrl: asset.downloadUrl,
    });

    await pushLineMessages(purchase.lineUserId, [flexMessage]);

    await purchaseRef.set({
      subscription_receipt_doc_no: asset.docNo,
      subscription_receipt_pdf_path: asset.pdfPath,
      subscription_receipt_short_url: asset.shortUrl,
      subscription_receipt_sent_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    receiptSent = true;
  }

  try {
    const refreshedSnap = await purchaseRef.get();
    const refreshedPurchase = (refreshedSnap.data() || purchase) as CreditPurchase;
    const asset = await ensureSubscriptionReceiptAsset(purchaseId, refreshedPurchase);
    const adminSentCount = await sendSubscriptionReceiptToAdmins(
      purchaseId,
      refreshedPurchase,
      asset,
      packageLabel
    );
    adminReceiptSent = adminSentCount > 0;
  } catch (error) {
    console.warn('[subscriptionReceipt] Failed to notify admin about subscription receipt:', error);
  }

  return { successMessageSent, receiptSent, adminReceiptSent };
}
