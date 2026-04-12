import * as admin from 'firebase-admin';
import { createHash } from 'crypto';

import { getDb } from '../core/firebaseAdmin';

const VERIFICATION_COLLECTION = 'verification_records';
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export type VerificationKind = 'document' | 'tax-summary' | 'wht-certificate';

type LookupQuery = {
  kind: VerificationKind;
  fingerprint: string;
  documentId?: string;
  documentNo?: string;
  monthKey?: string;
  periodKey?: string;
};

type StoredVerificationRecord = {
  kind: VerificationKind;
  fingerprint: string;
  source: string;
  businessId?: string | null;
  businessName?: string | null;
  businessTaxId?: string | null;
  renderVersion?: string | null;
  templateVersion?: string | null;
  storagePath?: string | null;
  documentId?: string | null;
  documentNo?: string | null;
  documentType?: string | null;
  documentStatus?: string | null;
  issueDate?: string | null;
  totalAmount?: number | null;
  monthKey?: string | null;
  monthLabel?: string | null;
  periodKey?: string | null;
  periodLabel?: string | null;
  supplierName?: string | null;
  payableVat?: number | null;
  outputVat?: number | null;
  inputVat?: number | null;
  totalWht?: number | null;
  totalBase?: number | null;
  itemCount?: number | null;
  recordedAt?: admin.firestore.Timestamp | null;
  updatedAt?: admin.firestore.Timestamp | null;
};

type PublicVerificationRecord = {
  kind: VerificationKind;
  fingerprint: string;
  businessName: string | null;
  renderVersion: string | null;
  templateVersion: string | null;
  recordedAt: string | null;
  documentId?: string | null;
  documentNo?: string | null;
  documentType?: string | null;
  documentStatus?: string | null;
  issueDate?: string | null;
  totalAmount?: number | null;
  monthKey?: string | null;
  monthLabel?: string | null;
  periodKey?: string | null;
  periodLabel?: string | null;
  supplierName?: string | null;
  payableVat?: number | null;
  outputVat?: number | null;
  inputVat?: number | null;
  totalWht?: number | null;
  totalBase?: number | null;
  itemCount?: number | null;
};

export type VerificationLookupResult =
  | {
      verified: true;
      source: 'record' | 'document-fallback';
      record: PublicVerificationRecord;
    }
  | {
      verified: false;
      code: 'NOT_FOUND' | 'FINGERPRINT_MISMATCH' | 'QUERY_MISMATCH';
      message: string;
    };

export function normalizeVerificationKind(value: unknown): VerificationKind | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'document') return 'document';
  if (normalized === 'tax-summary' || normalized === 'tax_summary' || normalized === 'tax') {
    return 'tax-summary';
  }
  if (
    normalized === 'wht-certificate' ||
    normalized === 'wht_certificate' ||
    normalized === 'wht'
  ) {
    return 'wht-certificate';
  }
  return null;
}

export function normalizeFingerprint(value: unknown): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '');
}

function verificationDocId(kind: VerificationKind, fingerprint: string): string {
  return `${kind}__${fingerprint}`;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object') {
    const timestamp = value as { toDate?: () => Date; _seconds?: number; seconds?: number };
    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const seconds = typeof timestamp._seconds === 'number' ? timestamp._seconds : timestamp.seconds;
    if (typeof seconds === 'number') {
      const date = new Date(seconds * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
  return null;
}

export function formatThaiDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return '';
  const year = date.getFullYear() + 543;
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${year}`;
}

export function buildVerificationFingerprint(
  parts: Array<string | number | undefined | null>
): string {
  const source = parts.map((part) => String(part || '')).join('|');
  return createHash('sha256').update(source).digest('hex').slice(0, 20).toUpperCase();
}

function monthKeyToLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('_');
  const monthIndex = Math.max(1, Math.min(12, Number(monthStr))) - 1;
  return `${THAI_MONTHS[monthIndex] || '-'} ${yearStr || ''}`.trim();
}

function serializeTimestamp(value: unknown): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return String(value || '').trim();
}

function asNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function snapshotRecord(record: StoredVerificationRecord): PublicVerificationRecord {
  return {
    kind: record.kind,
    fingerprint: record.fingerprint,
    businessName: record.businessName || null,
    renderVersion: record.renderVersion || null,
    templateVersion: record.templateVersion || null,
    recordedAt: serializeTimestamp(record.updatedAt || record.recordedAt || null),
    documentId: record.documentId || null,
    documentNo: record.documentNo || null,
    documentType: record.documentType || null,
    documentStatus: record.documentStatus || null,
    issueDate: record.issueDate || null,
    totalAmount: typeof record.totalAmount === 'number' ? record.totalAmount : null,
    monthKey: record.monthKey || null,
    monthLabel: record.monthLabel || null,
    periodKey: record.periodKey || null,
    periodLabel: record.periodLabel || null,
    supplierName: record.supplierName || null,
    payableVat: typeof record.payableVat === 'number' ? record.payableVat : null,
    outputVat: typeof record.outputVat === 'number' ? record.outputVat : null,
    inputVat: typeof record.inputVat === 'number' ? record.inputVat : null,
    totalWht: typeof record.totalWht === 'number' ? record.totalWht : null,
    totalBase: typeof record.totalBase === 'number' ? record.totalBase : null,
    itemCount: typeof record.itemCount === 'number' ? record.itemCount : null,
  };
}

function recordMatchesQuery(record: StoredVerificationRecord, query: LookupQuery): boolean {
  if (query.kind !== record.kind) return false;
  if (query.fingerprint !== record.fingerprint) return false;
  if (query.documentId && query.documentId !== record.documentId) return false;
  if (query.documentNo && query.documentNo !== record.documentNo) return false;
  if (query.monthKey && query.monthKey !== record.monthKey) return false;
  if (query.periodKey && query.periodKey !== record.periodKey) return false;
  return true;
}

export function buildDocumentFingerprintFromPayload(payload: Record<string, unknown>): string {
  const doc = asObject(payload.doc);
  const business = asObject(payload.business);
  const customer = asObject(payload.customer);
  const totals = asObject(payload.totals);

  return buildVerificationFingerprint([
    asString(doc.no),
    asString(doc.id),
    formatThaiDate(doc.issue_date || doc.created_at),
    asNumber(totals.total),
    asString(customer.tax_id),
    asString(business.tax_id),
    asString(doc.status),
  ]);
}

export function buildDocumentFingerprintFromSnapshot(
  documentId: string,
  docData: Record<string, unknown>
): string {
  const businessSnapshot = asObject(docData.business_snapshot || docData.businessSnapshot);
  const customerSnapshot = asObject(docData.customer_snapshot || docData.customerSnapshot);
  const money = asObject(docData.money);
  const issueDate =
    docData.issue_date ||
    docData.issued_at ||
    docData.issueDate ||
    docData.created_at ||
    docData.createdAt;

  return buildVerificationFingerprint([
    asString(docData.doc_no || docData.docNo),
    documentId,
    formatThaiDate(issueDate),
    asNumber(money.total_amount || docData.total_amount || docData.total),
    asString(customerSnapshot.tax_id || docData.customer_tax_id || docData.customerTaxId),
    asString(businessSnapshot.tax_id || businessSnapshot.taxId || docData.business_tax_id),
    asString(docData.status),
  ]);
}

export async function saveDocumentVerificationRecord(params: {
  fingerprint: string;
  userId: string;
  businessId: string;
  storagePath: string;
  renderVersion?: string | null;
  templateVersion?: string | null;
  source: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const payload = params.payload;
  const doc = asObject(payload.doc);
  const business = asObject(payload.business);
  const totals = asObject(payload.totals);
  const record: StoredVerificationRecord = {
    kind: 'document',
    fingerprint: params.fingerprint,
    source: params.source,
    businessId: params.businessId,
    businessName: asString(business.name) || null,
    businessTaxId: asString(business.tax_id) || null,
    renderVersion: params.renderVersion || null,
    templateVersion: params.templateVersion || null,
    storagePath: params.storagePath || null,
    documentId: asString(doc.id) || null,
    documentNo: asString(doc.no) || null,
    documentType: asString(doc.type) || null,
    documentStatus: asString(doc.status) || null,
    issueDate: formatThaiDate(doc.issue_date || doc.created_at) || null,
    totalAmount: asNumber(totals.total),
    recordedAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await getDb()
    .collection(VERIFICATION_COLLECTION)
    .doc(verificationDocId('document', params.fingerprint))
    .set(
      {
        ...record,
        userId: params.userId,
      },
      { merge: true }
    );
}

export async function saveDocumentVerificationRecordFromSnapshot(params: {
  fingerprint: string;
  userId: string;
  businessId: string;
  documentId: string;
  storagePath: string;
  renderVersion?: string | null;
  templateVersion?: string | null;
  source: string;
  docData: Record<string, unknown>;
}): Promise<void> {
  const docData = params.docData;
  const businessSnapshot = asObject(docData.business_snapshot || docData.businessSnapshot);
  const money = asObject(docData.money);
  const record: StoredVerificationRecord = {
    kind: 'document',
    fingerprint: params.fingerprint,
    source: params.source,
    businessId: params.businessId,
    businessName: asString(businessSnapshot.name) || null,
    businessTaxId:
      asString(businessSnapshot.tax_id || businessSnapshot.taxId || docData.business_tax_id) || null,
    renderVersion: params.renderVersion || null,
    templateVersion: params.templateVersion || null,
    storagePath: params.storagePath || null,
    documentId: params.documentId,
    documentNo: asString(docData.doc_no || docData.docNo) || null,
    documentType: asString(docData.doc_type || docData.docType) || null,
    documentStatus: asString(docData.status) || null,
    issueDate:
      formatThaiDate(
        docData.issue_date || docData.issued_at || docData.issueDate || docData.created_at
      ) || null,
    totalAmount: asNumber(money.total_amount || docData.total_amount || docData.total),
    recordedAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await getDb()
    .collection(VERIFICATION_COLLECTION)
    .doc(verificationDocId('document', params.fingerprint))
    .set(
      {
        ...record,
        userId: params.userId,
      },
      { merge: true }
    );
}

export async function saveTaxSummaryVerificationRecord(params: {
  fingerprint: string;
  businessId: string;
  businessName: string;
  businessTaxId?: string | null;
  monthKey: string;
  monthLabel?: string | null;
  storagePath: string;
  renderVersion?: string | null;
  templateVersion?: string | null;
  payableVat: number;
  outputVat: number;
  inputVat: number;
  totalWht: number;
}): Promise<void> {
  const record: StoredVerificationRecord = {
    kind: 'tax-summary',
    fingerprint: params.fingerprint,
    source: 'tax-pdf-service',
    businessId: params.businessId,
    businessName: params.businessName || null,
    businessTaxId: params.businessTaxId || null,
    renderVersion: params.renderVersion || null,
    templateVersion: params.templateVersion || null,
    storagePath: params.storagePath,
    monthKey: params.monthKey,
    monthLabel: params.monthLabel || monthKeyToLabel(params.monthKey),
    payableVat: asNumber(params.payableVat),
    outputVat: asNumber(params.outputVat),
    inputVat: asNumber(params.inputVat),
    totalWht: asNumber(params.totalWht),
    recordedAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await getDb()
    .collection(VERIFICATION_COLLECTION)
    .doc(verificationDocId('tax-summary', params.fingerprint))
    .set(record, { merge: true });
}

export async function saveWhtCertificateVerificationRecord(params: {
  fingerprint: string;
  businessId: string;
  businessName: string;
  businessTaxId?: string | null;
  periodKey: string;
  periodLabel?: string | null;
  supplierName: string;
  storagePath: string;
  renderVersion?: string | null;
  templateVersion?: string | null;
  totalWht: number;
  totalBase: number;
  itemCount: number;
}): Promise<void> {
  const record: StoredVerificationRecord = {
    kind: 'wht-certificate',
    fingerprint: params.fingerprint,
    source: 'tax-pdf-service',
    businessId: params.businessId,
    businessName: params.businessName || null,
    businessTaxId: params.businessTaxId || null,
    renderVersion: params.renderVersion || null,
    templateVersion: params.templateVersion || null,
    storagePath: params.storagePath,
    periodKey: params.periodKey,
    periodLabel: params.periodLabel || monthKeyToLabel(params.periodKey),
    supplierName: params.supplierName,
    totalWht: asNumber(params.totalWht),
    totalBase: asNumber(params.totalBase),
    itemCount: asNumber(params.itemCount),
    recordedAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await getDb()
    .collection(VERIFICATION_COLLECTION)
    .doc(verificationDocId('wht-certificate', params.fingerprint))
    .set(record, { merge: true });
}

async function lookupStoredRecord(query: LookupQuery): Promise<VerificationLookupResult | null> {
  const snap = await getDb()
    .collection(VERIFICATION_COLLECTION)
    .doc(verificationDocId(query.kind, query.fingerprint))
    .get();

  if (!snap.exists) return null;

  const record = snap.data() as StoredVerificationRecord;
  if (!recordMatchesQuery(record, query)) {
    return {
      verified: false,
      code: 'QUERY_MISMATCH',
      message: 'ข้อมูลใน QR ไม่ตรงกับ record ที่ออกจากระบบ EzDOC',
    };
  }

  return {
    verified: true,
    source: 'record',
    record: snapshotRecord(record),
  };
}

async function lookupDocumentFallback(query: LookupQuery): Promise<VerificationLookupResult> {
  if (!query.documentId && !query.documentNo) {
    return {
      verified: false,
      code: 'NOT_FOUND',
      message: 'ไม่พบ record นี้ในระบบ EzDOC',
    };
  }

  const docGroup = getDb().collectionGroup('documents');
  const queryTasks: Array<Promise<FirebaseFirestore.QuerySnapshot>> = [];
  if (query.documentNo) {
    queryTasks.push(docGroup.where('doc_no', '==', query.documentNo).limit(10).get());
    queryTasks.push(docGroup.where('docNo', '==', query.documentNo).limit(10).get());
  }

  let querySnaps: FirebaseFirestore.QuerySnapshot[];
  try {
    querySnaps = await Promise.all(queryTasks);
  } catch (error) {
    console.warn('[verification] document fallback query failed:', error);
    return {
      verified: false,
      code: 'NOT_FOUND',
      message: 'เอกสารนี้ยังไม่มี verification record ในระบบ หรือจำเป็นต้องออก PDF ใหม่อีกครั้ง',
    };
  }
  const candidates = querySnaps
    .flatMap((snap) => snap.docs)
    .filter((docSnap, index, allDocs) => allDocs.findIndex((item) => item.ref.path === docSnap.ref.path) === index)
    .filter((docSnap) => docSnap.ref.path.includes('/businesses/'));

  if (candidates.length === 0) {
    return {
      verified: false,
      code: 'NOT_FOUND',
      message: 'ไม่พบเอกสารอ้างอิงนี้ในระบบ EzDOC',
    };
  }

  const targetDoc =
    candidates.find((docSnap) => {
      if (query.documentId && docSnap.id !== query.documentId) return false;
      if (query.documentNo) {
        const currentDocNo = asString(docSnap.data()?.doc_no || docSnap.data()?.docNo);
        if (currentDocNo !== query.documentNo) return false;
      }
      return true;
    }) || candidates[0];
  const docData = (targetDoc.data() || {}) as Record<string, unknown>;
  const expectedFingerprint = buildDocumentFingerprintFromSnapshot(targetDoc.id, docData);

  if (expectedFingerprint !== query.fingerprint) {
    return {
      verified: false,
      code: 'FINGERPRINT_MISMATCH',
      message: 'Fingerprint ใน QR ไม่ตรงกับข้อมูลเอกสารปัจจุบันในระบบ EzDOC',
    };
  }

  const actualDocumentNo = asString(docData.doc_no || docData.docNo);
  if (query.documentNo && query.documentNo !== actualDocumentNo) {
    return {
      verified: false,
      code: 'QUERY_MISMATCH',
      message: 'เลขเอกสารใน QR ไม่ตรงกับข้อมูลเอกสารปัจจุบันในระบบ EzDOC',
    };
  }

  const businessSnapshot = asObject(docData.business_snapshot || docData.businessSnapshot);
  const money = asObject(docData.money);

  return {
    verified: true,
    source: 'document-fallback',
    record: {
      kind: 'document',
      fingerprint: expectedFingerprint,
      businessName: asString(businessSnapshot.name) || null,
      renderVersion: asString(docData.pdf_render_version) || null,
      templateVersion: asString(docData.pdf_template_version) || null,
      recordedAt: serializeTimestamp(docData.updated_at || docData.pdf_generated_at || docData.created_at),
      documentId: targetDoc.id,
      documentNo: actualDocumentNo || null,
      documentType: asString(docData.doc_type || docData.docType) || null,
      documentStatus: asString(docData.status) || null,
      issueDate: formatThaiDate(
        docData.issue_date || docData.issued_at || docData.issueDate || docData.created_at
      ) || null,
      totalAmount: asNumber(money.total_amount || docData.total_amount || docData.total),
    },
  };
}

export async function lookupVerification(query: LookupQuery): Promise<VerificationLookupResult> {
  const stored = await lookupStoredRecord(query);
  if (stored) return stored;

  if (query.kind === 'document') {
    return lookupDocumentFallback(query);
  }

  return {
    verified: false,
    code: 'NOT_FOUND',
    message: 'ไม่พบ record นี้ในระบบ EzDOC',
  };
}
