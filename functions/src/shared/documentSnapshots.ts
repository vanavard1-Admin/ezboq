import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Document Snapshot Builder
 *
 * Creates immutable, audit-safe snapshots of business/customer/payment data
 * at the time of document issuance.
 *
 * These snapshots are stored with the document and never change,
 * ensuring the PDF always reflects the exact state at issuance time.
 */

import { buildPaymentSnapshot, PaymentSnapshot } from './paymentAssets';

/**
 * Business snapshot (frozen at document creation)
 * Includes signature/stamp for document signing
 */
export interface BusinessSnapshot {
  id: string;
  name: string;
  address: string | null;
  tax_id: string | null;
  branch: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  // Signature and stamp for document signing
  signature_url: string | null;
  stamp_url: string | null;
  signatory_name: string | null; // ชื่อผู้ลงนาม
  signatory_title: string | null; // ตำแหน่ง เช่น "กรรมการผู้จัดการ"
  promptpayAccount?: string | null;
  promptpayName?: string | null;
  promptpayQrUrl?: string | null;
}

/**
 * Customer snapshot (frozen at document creation)
 */
export interface CustomerSnapshot {
  id: string | null;
  name: string;
  legal_name?: string | null;
  branch?: string | null;
  contact_name?: string | null;
  address: string | null;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
}

/**
 * Tax configuration snapshot
 */
export interface TaxSnapshot {
  vat_enabled: boolean;
  vat_percent: number;
  wht_enabled: boolean;
  wht_percent: number;
}

/**
 * Document terms/conditions by type
 */
export interface DocumentTerms {
  // Default terms per document type
  quotation_terms: string | null;  // เช่น "ราคานี้มีอายุ 30 วัน"
  invoice_terms: string | null;    // เช่น "กรุณาชำระภายในกำหนด"
  receipt_terms: string | null;    // เช่น "ขอบคุณที่ใช้บริการ"
  // Custom terms (overrides default)
  custom_terms: string | null;
}

/**
 * Complete document snapshot data
 */
export interface DocumentSnapshots {
  business_snapshot: BusinessSnapshot;
  customer_snapshot: CustomerSnapshot;
  tax_snapshot: TaxSnapshot;
  payment_snapshot: PaymentSnapshot | null;
  terms: DocumentTerms;
}

/**
 * Default terms by document type
 */
const DEFAULT_TERMS: Record<string, string> = {
  QUOTATION: 'ราคานี้มีอายุ 30 วันนับจากวันที่ออกเอกสาร',
  QUO: 'ราคานี้มีอายุ 30 วันนับจากวันที่ออกเอกสาร',
  INVOICE: 'กรุณาชำระเงินภายในวันที่กำหนด หากมีข้อสงสัยกรุณาติดต่อเรา',
  BILL: 'กรุณาชำระเงินภายในวันที่กำหนด หากมีข้อสงสัยกรุณาติดต่อเรา',
  RECEIPT: 'ขอบคุณที่ใช้บริการ',
  CREDIT_NOTE: 'ใบลดหนี้',
  CN: 'ใบลดหนี้',
  DEBIT_NOTE: 'ใบเพิ่มหนี้',
  DN: 'ใบเพิ่มหนี้',
};

/**
 * Load business profile from Firestore
 */
async function loadBusinessProfile(
  userId: string,
  businessId: string
): Promise<Record<string, unknown>> {
  const db = getDb();
  const bizRef = db.doc(`users/${userId}/businesses/${businessId}`);
  const bizSnap = await bizRef.get();

  if (!bizSnap.exists) {
    console.warn(`[documentSnapshots] Business not found: ${businessId}`);
    return { name: 'ไม่ระบุชื่อธุรกิจ' };
  }

  return bizSnap.data() || {};
}

/**
 * Load payment settings from Firestore
 * Tries businesses/{bid}/settings/payment first, then falls back to business profile
 */
async function loadPaymentSettings(
  userId: string,
  businessId: string,
  businessProfile: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const db = getDb();

  // Try dedicated payment settings document
  const paymentRef = db.doc(`users/${userId}/businesses/${businessId}/settings/payment`);
  const paymentSnap = await paymentRef.get();

  if (paymentSnap.exists) {
    const paymentData = paymentSnap.data() || {};
    const qrUrl = (paymentData.promptpay_qr_url as string | undefined) ||
      (businessProfile.promptpayQrUrl as string | undefined) ||
      (businessProfile.promptpay_qr_url as string | undefined);
    return qrUrl ? { ...paymentData, promptpay_qr_url: qrUrl } : paymentData;
  }

  // Fallback to business profile fields
  return {
    method: businessProfile.paymentMethod || businessProfile.payment_method || 'PROMPTPAY',
    promptpay_account: businessProfile.promptpayAccount || businessProfile.promptpay_account || businessProfile.taxId || null,
    promptpay_name: businessProfile.promptpayName || businessProfile.promptpay_name || businessProfile.name || null,
    promptpay_qr_url: businessProfile.promptpayQrUrl || businessProfile.promptpay_qr_url || null,
    bank_code: businessProfile.bankCode || businessProfile.bank_code || businessProfile.bankName || null,
    bank_account: businessProfile.bankAccountNo || businessProfile.bank_account || null,
    bank_account_name: businessProfile.bankAccountName || businessProfile.bank_account_name || null,
  };
}

/**
 * Load document terms/conditions settings
 */
async function loadDocumentTerms(
  userId: string,
  businessId: string
): Promise<Record<string, unknown>> {
  const db = getDb();

  const termsRef = db.doc(`users/${userId}/businesses/${businessId}/settings/terms`);
  const termsSnap = await termsRef.get();

  if (termsSnap.exists) {
    return termsSnap.data() || {};
  }

  return {};
}

/**
 * Load customer data from Firestore (if customerId provided)
 */
async function loadCustomerProfile(
  userId: string,
  businessId: string,
  customerId: string | null | undefined
): Promise<Record<string, unknown> | null> {
  if (!customerId) return null;

  const db = getDb();
  const custRef = db.doc(`users/${userId}/businesses/${businessId}/customers/${customerId}`);
  const custSnap = await custRef.get();

  if (!custSnap.exists) {
    return null;
  }

  return custSnap.data() || {};
}

/**
 * Build all document snapshots from database
 *
 * @param userId - Firebase UID
 * @param businessId - Business ID
 * @param customerName - Customer display name
 * @param customerId - Optional customer ID for loading profile
 * @param docType - Document type for default terms
 * @param customTerms - Optional custom terms to override defaults
 */
export async function buildDocumentSnapshots(params: {
  userId: string;
  businessId: string;
  customerName: string;
  customerId?: string | null;
  customerLegalName?: string | null;
  customerBranch?: string | null;
  customerAddress?: string | null;
  customerContactName?: string | null;
  customerTaxId?: string | null;
  docType?: string;
  customTerms?: string | null;
}): Promise<DocumentSnapshots> {
  const {
    userId,
    businessId,
    customerName,
    customerId,
    customerLegalName,
    customerBranch,
    customerAddress,
    customerContactName,
    customerTaxId,
    customTerms,
  } = params;
  // docType is passed in params but currently not used - terms are loaded from settings

  // Load business profile
  const bizProfile = await loadBusinessProfile(userId, businessId);

  // Load payment settings
  const paymentSettings = await loadPaymentSettings(userId, businessId, bizProfile);

  // Load document terms
  const termsSettings = await loadDocumentTerms(userId, businessId);

  // Load customer profile if available
  const custProfile = await loadCustomerProfile(userId, businessId, customerId);

  // Build business snapshot with signature/stamp
  const businessName = String(bizProfile.name || 'ไม่ระบุชื่อธุรกิจ');
  // ✅ DEBUG: Log business name for PDF debugging
  console.log(`[documentSnapshots] Building snapshot: businessId=${businessId}, name="${businessName}"`);

  const business_snapshot: BusinessSnapshot = {
    id: businessId,
    name: businessName,
    address: bizProfile.address ? String(bizProfile.address) : null,
    tax_id: bizProfile.taxId ? String(bizProfile.taxId) : (bizProfile.tax_id ? String(bizProfile.tax_id) : null),
    branch: bizProfile.branch ? String(bizProfile.branch) : null,
    phone: bizProfile.phone ? String(bizProfile.phone) : null,
    email: bizProfile.email ? String(bizProfile.email) : null,
    logo_url: bizProfile.logoUrl ? String(bizProfile.logoUrl) : (bizProfile.logo_url ? String(bizProfile.logo_url) : null),
    // Signature and stamp
    signature_url: bizProfile.signatureUrl ? String(bizProfile.signatureUrl) : (bizProfile.signature_url ? String(bizProfile.signature_url) : null),
    stamp_url: bizProfile.stampUrl ? String(bizProfile.stampUrl) : (bizProfile.stamp_url ? String(bizProfile.stamp_url) : null),
    signatory_name: bizProfile.signatoryName ? String(bizProfile.signatoryName) : (bizProfile.signatory_name ? String(bizProfile.signatory_name) : null),
    signatory_title: bizProfile.signatoryTitle ? String(bizProfile.signatoryTitle) : (bizProfile.signatory_title ? String(bizProfile.signatory_title) : null),
    promptpayAccount: bizProfile.promptpayAccount ? String(bizProfile.promptpayAccount) : (bizProfile.promptpay_account ? String(bizProfile.promptpay_account) : null),
    promptpayName: bizProfile.promptpayName ? String(bizProfile.promptpayName) : (bizProfile.promptpay_name ? String(bizProfile.promptpay_name) : null),
    promptpayQrUrl: bizProfile.promptpayQrUrl ? String(bizProfile.promptpayQrUrl) : (bizProfile.promptpay_qr_url ? String(bizProfile.promptpay_qr_url) : null),
  };

  // Build customer snapshot
  const customer_snapshot: CustomerSnapshot = {
    id: customerId || null,
    name: custProfile?.name ? String(custProfile.name) : customerName,
    legal_name: custProfile?.legal_name
      ? String(custProfile.legal_name)
      : (customerLegalName ? String(customerLegalName) : null),
    branch: custProfile?.branch
      ? String(custProfile.branch)
      : (customerBranch ? String(customerBranch) : null),
    contact_name: custProfile?.contact_name
      ? String(custProfile.contact_name)
      : (customerContactName ? String(customerContactName) : null),
    address: custProfile?.address
      ? String(custProfile.address)
      : (customerAddress ? String(customerAddress) : null),
    tax_id: custProfile?.taxId
      ? String(custProfile.taxId)
      : (custProfile?.tax_id ? String(custProfile.tax_id) : (customerTaxId ? String(customerTaxId) : null)),
    phone: custProfile?.phone ? String(custProfile.phone) : null,
    email: custProfile?.email ? String(custProfile.email) : null,
  };

  // Build tax snapshot
  const tax_snapshot: TaxSnapshot = {
    vat_enabled: Boolean(bizProfile.defaultVatEnabled ?? bizProfile.vat_enabled ?? false),
    vat_percent: Number(bizProfile.defaultVatRate ?? bizProfile.vat_percent ?? 7),
    wht_enabled: Boolean(bizProfile.defaultWhtEnabled ?? bizProfile.wht_enabled ?? false),
    wht_percent: Number(bizProfile.defaultWhtRate ?? bizProfile.wht_percent ?? 3),
  };

  // Build payment snapshot
  const payment_snapshot = buildPaymentSnapshot({
    method: paymentSettings.method as string,
    promptpay_account: paymentSettings.promptpay_account as string,
    promptpay_name: paymentSettings.promptpay_name as string,
    promptpay_qr_url: paymentSettings.promptpay_qr_url as string,
    bank_code: paymentSettings.bank_code as string,
    bank_account: paymentSettings.bank_account as string,
    bank_account_name: paymentSettings.bank_account_name as string,
  });

  // Build document terms
  const terms: DocumentTerms = {
    quotation_terms: termsSettings.quotation_terms
      ? String(termsSettings.quotation_terms)
      : DEFAULT_TERMS.QUOTATION,
    invoice_terms: termsSettings.invoice_terms
      ? String(termsSettings.invoice_terms)
      : DEFAULT_TERMS.INVOICE,
    receipt_terms: termsSettings.receipt_terms
      ? String(termsSettings.receipt_terms)
      : DEFAULT_TERMS.RECEIPT,
    custom_terms: customTerms || (termsSettings.custom_terms ? String(termsSettings.custom_terms) : null),
  };

  return {
    business_snapshot,
    customer_snapshot,
    tax_snapshot,
    payment_snapshot,
    terms,
  };
}

/**
 * Get terms for a specific document type
 */
export function getTermsForDocType(terms: DocumentTerms, docType: string): string {
  // Custom terms take priority
  if (terms.custom_terms) {
    return terms.custom_terms;
  }

  const normalized = docType.toUpperCase();

  if (normalized === 'QUOTATION' || normalized === 'QUO') {
    return terms.quotation_terms || DEFAULT_TERMS.QUOTATION;
  }
  if (normalized === 'INVOICE' || normalized === 'BILL') {
    return terms.invoice_terms || DEFAULT_TERMS.INVOICE;
  }
  if (normalized === 'RECEIPT') {
    return terms.receipt_terms || DEFAULT_TERMS.RECEIPT;
  }

  return '';
}
