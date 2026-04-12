import { getDb } from './firebaseAdmin';
import type * as FirebaseFirestore from 'firebase-admin/firestore';
import { getFinancialReport } from './reportService';

const db = getDb();
const DOCUMENTS_COLLECTION = 'documents';
const RECEIPT_DOC_TYPES = new Set(['RECEIPT', 'RCP']);
const EXCLUDED_STATUSES = new Set(['DRAFT', 'READY', 'CANCELLED', 'VOID']);
const UNPAID_STATUSES = new Set(['UNPAID', 'AWAITING_PAYMENT']);

export type FilingStatus = 'FILED' | 'PENDING';

export interface VatSummary {
  monthKey: string;
  month: string;
  output: {
    vat: number;
    base: number;
    docCount: number;
  };
  input: {
    vat: number;
    base: number;
    expenseCount: number;
  };
  payable: number;
}

export interface WhtSupplierSummary {
  supplierName: string;
  supplierTaxId?: string | null;
  baseAmount: number;
  whtAmount: number;
  ratePercent: number;
}

export interface WhtRateSummary {
  ratePercent: number;
  baseAmount: number;
  whtAmount: number;
  suppliers: WhtSupplierSummary[];
}

export interface WhtSummary {
  monthKey: string;
  month: string;
  totalBase: number;
  totalWht: number;
  rateGroups: WhtRateSummary[];
}

export interface WhtCertificateSummary {
  monthKey: string;
  month: string;
  supplierName: string;
  supplierTaxId?: string | null;
  supplierAddress?: string | null;
  totalBase: number;
  totalWht: number;
  rateGroups: WhtRateSummary[];
  itemCount: number;
}

export interface TaxFilingRecord {
  type: 'VAT' | 'WHT';
  monthKey: string;
  status: FilingStatus;
  filedAt?: string | null;
  filedBy?: string | null;
}

export interface TaxStatusReport {
  monthKey: string;
  month: string;
  vat: TaxFilingRecord;
  wht: TaxFilingRecord;
}

export interface AnnualTaxSummaryRow {
  monthKey: string;
  month: string;
  vatOutput: number;
  vatInput: number;
  vatPayable: number;
  whtDeducted: number;
}

export interface AnnualTaxSummary {
  year: string;
  months: AnnualTaxSummaryRow[];
  totals: {
    vatOutput: number;
    vatInput: number;
    vatPayable: number;
    whtDeducted: number;
  };
}

export async function getVatSummary(
  userId: string,
  businessId: string,
  monthKey?: string
): Promise<VatSummary | null> {
  try {
    const targetMonth = monthKey || getCurrentMonthKey();
    const { start, end } = monthKeyToDateRange(targetMonth);

    const docs = await fetchBusinessDocuments(userId, businessId);
    let outputVat = 0;
    let outputBase = 0;
    let outputCount = 0;

    docs.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const docDate = getDocDate(data);
      if (!isDateInRange(docDate, start, end)) return;

      const docType = normalizeDocType(data);
      if (docType !== 'RECEIPT') return;

      const status = normalizeStatus(data.status);
      if (!isReceiptStatus(status)) return;

      const money = (data.money || {}) as Record<string, unknown>;
      const vat = Number(money.vat_amount || money.vatAmount || 0);
      const total = getDocTotal(data);
      const base = Number(money.before_vat || money.beforeVat || total - vat || 0);

      outputVat += vat;
      outputBase += base;
      outputCount += 1;
    });

    const expenses = await fetchBusinessExpenses(userId, businessId);
    let inputVat = 0;
    let inputBase = 0;
    let inputCount = 0;

    expenses.forEach((expense) => {
      const data = expense.data() as Record<string, unknown>;
      const dateStr = (data.date as string) || '';
      const date = new Date(dateStr);
      if (!isDateInRange(date, start, end)) return;
      if (String(data.status || '').toUpperCase() === 'CANCELLED') return;

      const amount = Number(data.amount || 0);
      const vatAmount = Number(data.vatAmount || data.vat_amount || 0);

      inputBase += amount;
      inputVat += vatAmount;
      if (vatAmount > 0 || amount > 0) inputCount += 1;
    });

    return {
      monthKey: targetMonth,
      month: monthKeyToThaiMonth(targetMonth),
      output: {
        vat: roundNumber(outputVat),
        base: roundNumber(outputBase),
        docCount: outputCount,
      },
      input: {
        vat: roundNumber(inputVat),
        base: roundNumber(inputBase),
        expenseCount: inputCount,
      },
      payable: roundNumber(outputVat - inputVat),
    };
  } catch (error) {
    console.error('[taxReportService] getVatSummary error:', error);
    return null;
  }
}

export async function getWhtSummary(
  userId: string,
  businessId: string,
  monthKey?: string
): Promise<WhtSummary | null> {
  try {
    const targetMonth = monthKey || getCurrentMonthKey();
    const { start, end } = monthKeyToDateRange(targetMonth);
    const expenses = await fetchBusinessExpenses(userId, businessId);

    const rateMap = new Map<number, Map<string, WhtSupplierSummary>>();
    let totalBase = 0;
    let totalWht = 0;

    expenses.forEach((expense) => {
      const data = expense.data() as Record<string, unknown>;
      const dateStr = (data.date as string) || '';
      const date = new Date(dateStr);
      if (!isDateInRange(date, start, end)) return;
      if (String(data.status || '').toUpperCase() === 'CANCELLED') return;

      const amount = Number(data.amount || 0);
      const whtAmount = Number(data.whtAmount || data.wht_amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) return;
      if (!Number.isFinite(whtAmount) || whtAmount <= 0) return;

      let rate = Math.round((whtAmount / amount) * 100);
      if (![1, 3, 5].includes(rate)) {
        rate = Number.isFinite(rate) ? rate : 0;
      }

      const supplierName = String(data.supplierName || data.supplier_name || data.description || 'ไม่ระบุ');
      const supplierTaxId = data.supplierTaxId || data.supplier_tax_id || null;

      if (!rateMap.has(rate)) {
        rateMap.set(rate, new Map<string, WhtSupplierSummary>());
      }

      const supplierKey = `${supplierName}::${supplierTaxId || ''}`;
      const supplierBucket = rateMap.get(rate)!;
      const existing = supplierBucket.get(supplierKey) || {
        supplierName,
        supplierTaxId: supplierTaxId ? String(supplierTaxId) : null,
        baseAmount: 0,
        whtAmount: 0,
        ratePercent: rate,
      };

      existing.baseAmount += amount;
      existing.whtAmount += whtAmount;
      supplierBucket.set(supplierKey, existing);

      totalBase += amount;
      totalWht += whtAmount;
    });

    const rateGroups: WhtRateSummary[] = Array.from(rateMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([rate, supplierMap]) => {
        const suppliers = Array.from(supplierMap.values())
          .map((s) => ({
            ...s,
            baseAmount: roundNumber(s.baseAmount),
            whtAmount: roundNumber(s.whtAmount),
          }))
          .sort((a, b) => b.whtAmount - a.whtAmount);

        const baseAmount = suppliers.reduce((sum, item) => sum + item.baseAmount, 0);
        const whtAmount = suppliers.reduce((sum, item) => sum + item.whtAmount, 0);

        return {
          ratePercent: rate,
          baseAmount: roundNumber(baseAmount),
          whtAmount: roundNumber(whtAmount),
          suppliers,
        };
      });

    return {
      monthKey: targetMonth,
      month: monthKeyToThaiMonth(targetMonth),
      totalBase: roundNumber(totalBase),
      totalWht: roundNumber(totalWht),
      rateGroups,
    };
  } catch (error) {
    console.error('[taxReportService] getWhtSummary error:', error);
    return null;
  }
}

export async function getWhtCertificateSummary(
  userId: string,
  businessId: string,
  supplierNameInput: string,
  monthKey?: string
): Promise<WhtCertificateSummary | null> {
  try {
    const targetMonth = monthKey || getCurrentMonthKey();
    const { start, end } = monthKeyToDateRange(targetMonth);
    const expenses = await fetchBusinessExpenses(userId, businessId);

    const normalizedTarget = supplierNameInput.trim().toLowerCase();
    if (!normalizedTarget) return null;

    const rateMap = new Map<number, Map<string, WhtSupplierSummary>>();
    let totalBase = 0;
    let totalWht = 0;
    let itemCount = 0;
    let supplierName = supplierNameInput.trim();
    let supplierTaxId: string | null | undefined = null;
    let supplierAddress: string | null | undefined = null;

    expenses.forEach((expense) => {
      const data = expense.data() as Record<string, unknown>;
      const dateStr = (data.date as string) || '';
      const date = new Date(dateStr);
      if (!isDateInRange(date, start, end)) return;
      if (String(data.status || '').toUpperCase() === 'CANCELLED') return;

      const name = String(data.supplierName || data.supplier_name || data.description || '').trim();
      if (!name.toLowerCase().includes(normalizedTarget)) return;

      const amount = Number(data.amount || 0);
      const whtAmount = Number(data.whtAmount || data.wht_amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) return;
      if (!Number.isFinite(whtAmount) || whtAmount <= 0) return;

      let rate = Math.round((whtAmount / amount) * 100);
      if (![1, 3, 5].includes(rate)) {
        rate = Number.isFinite(rate) ? rate : 0;
      }

      if (!supplierName && name) supplierName = name;
      supplierTaxId = supplierTaxId || (data.supplierTaxId as string) || (data.supplier_tax_id as string) || null;
      supplierAddress = supplierAddress || (data.supplierAddress as string) || (data.supplier_address as string) || null;

      if (!rateMap.has(rate)) {
        rateMap.set(rate, new Map<string, WhtSupplierSummary>());
      }

      const supplierKey = `${name}::${supplierTaxId || ''}`;
      const supplierBucket = rateMap.get(rate)!;
      const existing = supplierBucket.get(supplierKey) || {
        supplierName: name || supplierNameInput,
        supplierTaxId: supplierTaxId ? String(supplierTaxId) : null,
        baseAmount: 0,
        whtAmount: 0,
        ratePercent: rate,
      };

      existing.baseAmount += amount;
      existing.whtAmount += whtAmount;
      supplierBucket.set(supplierKey, existing);

      totalBase += amount;
      totalWht += whtAmount;
      itemCount += 1;
    });

    if (itemCount === 0) return null;

    const rateGroups: WhtRateSummary[] = Array.from(rateMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([rate, supplierMap]) => {
        const suppliers = Array.from(supplierMap.values())
          .map((s) => ({
            ...s,
            baseAmount: roundNumber(s.baseAmount),
            whtAmount: roundNumber(s.whtAmount),
          }))
          .sort((a, b) => b.whtAmount - a.whtAmount);

        const baseAmount = suppliers.reduce((sum, item) => sum + item.baseAmount, 0);
        const whtAmount = suppliers.reduce((sum, item) => sum + item.whtAmount, 0);

        return {
          ratePercent: rate,
          baseAmount: roundNumber(baseAmount),
          whtAmount: roundNumber(whtAmount),
          suppliers,
        };
      });

    return {
      monthKey: targetMonth,
      month: monthKeyToThaiMonth(targetMonth),
      supplierName: supplierName || supplierNameInput,
      supplierTaxId: supplierTaxId ? String(supplierTaxId) : null,
      supplierAddress: supplierAddress ? String(supplierAddress) : null,
      totalBase: roundNumber(totalBase),
      totalWht: roundNumber(totalWht),
      rateGroups,
      itemCount,
    };
  } catch (error) {
    console.error('[taxReportService] getWhtCertificateSummary error:', error);
    return null;
  }
}

export async function getTaxStatusReport(
  businessId: string,
  monthKey?: string
): Promise<TaxStatusReport> {
  const targetMonth = monthKey || getCurrentMonthKey();
  const month = monthKeyToThaiMonth(targetMonth);

  const vat = await getTaxFilingRecord(businessId, 'VAT', targetMonth);
  const wht = await getTaxFilingRecord(businessId, 'WHT', targetMonth);

  return {
    monthKey: targetMonth,
    month,
    vat,
    wht,
  };
}

export async function setTaxFilingStatus(params: {
  userId: string;
  businessId: string;
  type: 'VAT' | 'WHT';
  monthKey: string;
  status: FilingStatus;
}): Promise<TaxFilingRecord> {
  const { userId, businessId, type, monthKey, status } = params;
  const docId = `${type}_${monthKey}`;
  const ref = db.collection(`businesses/${businessId}/tax_filings`).doc(docId);
  const now = new Date();
  const payload: TaxFilingRecord = {
    type,
    monthKey,
    status,
    filedAt: status === 'FILED' ? now.toISOString() : null,
    filedBy: status === 'FILED' ? userId : null,
  };

  await ref.set(
    {
      ...payload,
      updatedAt: now.toISOString(),
    },
    { merge: true }
  );

  return payload;
}

export async function getAnnualTaxSummary(
  userId: string,
  businessId: string,
  year: number
): Promise<AnnualTaxSummary> {
  const yearStr = String(year);
  const months: AnnualTaxSummaryRow[] = [];
  let vatOutputTotal = 0;
  let vatInputTotal = 0;
  let vatPayableTotal = 0;
  let whtTotal = 0;

  for (let month = 1; month <= 12; month += 1) {
    const monthKey = `${yearStr}_${String(month).padStart(2, '0')}`;
    const financial = await getFinancialReport(userId, businessId, { monthKey });
    const vatOutput = Number(financial?.vatOutput || 0);
    const vatInput = Number(financial?.vatInput || 0);
    const vatPayable = vatOutput - vatInput;
    const whtDeducted = Number(financial?.whtDeducted || 0);

    months.push({
      monthKey,
      month: monthKeyToThaiMonth(monthKey),
      vatOutput: roundNumber(vatOutput),
      vatInput: roundNumber(vatInput),
      vatPayable: roundNumber(vatPayable),
      whtDeducted: roundNumber(whtDeducted),
    });

    vatOutputTotal += vatOutput;
    vatInputTotal += vatInput;
    vatPayableTotal += vatPayable;
    whtTotal += whtDeducted;
  }

  return {
    year: yearStr,
    months,
    totals: {
      vatOutput: roundNumber(vatOutputTotal),
      vatInput: roundNumber(vatInputTotal),
      vatPayable: roundNumber(vatPayableTotal),
      whtDeducted: roundNumber(whtTotal),
    },
  };
}

async function getTaxFilingRecord(
  businessId: string,
  type: 'VAT' | 'WHT',
  monthKey: string
): Promise<TaxFilingRecord> {
  const docId = `${type}_${monthKey}`;
  const ref = db.collection(`businesses/${businessId}/tax_filings`).doc(docId);
  const snap = await ref.get();

  if (!snap.exists) {
    return {
      type,
      monthKey,
      status: 'PENDING',
      filedAt: null,
      filedBy: null,
    };
  }

  const data = snap.data() || {};
  return {
    type,
    monthKey,
    status: (data.status as FilingStatus) || 'PENDING',
    filedAt: data.filedAt || null,
    filedBy: data.filedBy || null,
  };
}

// -----------------------------------------------------------------------------
// Helpers (copied to keep tax module self-contained)
// -----------------------------------------------------------------------------

function getCurrentMonthKey(): string {
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${thaiYear}_${month}`;
}

function monthKeyToDateRange(monthKey: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = monthKey.split('_');
  const gregorianYear = parseInt(yearStr, 10) - 543;
  const month = parseInt(monthStr, 10) - 1;
  const start = new Date(gregorianYear, month, 1);
  const end = new Date(gregorianYear, month + 1, 1);
  return { start, end };
}

function monthKeyToThaiMonth(monthKey: string): string {
  const thaiMonths = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];
  const [yearStr, monthStr] = monthKey.split('_');
  const year = yearStr;
  const monthIdx = parseInt(monthStr, 10) - 1;
  return `${thaiMonths[monthIdx]} ${year}`;
}

async function fetchBusinessDocuments(
  userId: string,
  businessId: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  const seen = new Set<string>();

  const pushDocs = (items: FirebaseFirestore.QueryDocumentSnapshot[]) => {
    items.forEach((doc) => {
      const key = doc.ref.path;
      if (seen.has(key)) return;
      seen.add(key);
      docs.push(doc);
    });
  };

  try {
    const snap = await db
      .collection(`users/${userId}/businesses/${businessId}/documents`)
      .get();
    pushDocs(snap.docs);
  } catch (error) {
    console.warn('[taxReportService] business path query failed:', error);
  }

  if (docs.length > 0) return docs;

  try {
    const snap = await db
      .collection(DOCUMENTS_COLLECTION)
      .where('business_id', '==', businessId)
      .get();
    pushDocs(snap.docs);
  } catch (error) {
    console.warn('[taxReportService] root collection business_id failed:', error);
  }

  try {
    const snap = await db
      .collection(DOCUMENTS_COLLECTION)
      .where('businessId', '==', businessId)
      .get();
    pushDocs(snap.docs);
  } catch (error) {
    console.warn('[taxReportService] root collection businessId failed:', error);
  }

  return docs;
}

async function fetchBusinessExpenses(
  _userId: string,
  businessId: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  try {
    const snap = await db
      .collection(`businesses/${businessId}/expenses`)
      .get();
    return snap.docs;
  } catch (error) {
    console.warn('[taxReportService] fetchBusinessExpenses failed:', error);
    return [];
  }
}

function normalizeDocType(data: Record<string, unknown>): 'RECEIPT' | null {
  const raw = String(data.doc_type || data.docType || '').toUpperCase();
  if (RECEIPT_DOC_TYPES.has(raw)) return 'RECEIPT';

  const docNo = String(data.doc_no || data.docNo || '').toUpperCase();
  const prefix = docNo.split('-')[0];
  if (prefix === 'RCP' || prefix === 'REC') return 'RECEIPT';

  return null;
}

function normalizeStatus(status: unknown): string {
  if (typeof status !== 'string') return '';
  return status.trim().toUpperCase();
}

function isReceiptStatus(status: string): boolean {
  if (!status) return true;
  if (EXCLUDED_STATUSES.has(status)) return false;
  if (UNPAID_STATUSES.has(status)) return false;
  return true;
}

function getDocDate(data: Record<string, unknown>): Date | null {
  return (
    toDateSafe(data.issue_date) ||
    toDateSafe(data.issued_at) ||
    toDateSafe(data.issueDate) ||
    toDateSafe(data.created_at) ||
    toDateSafe(data.createdAt) ||
    null
  );
}

function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object') {
    const ts = value as { _seconds?: number; toDate?: () => Date };
    if (typeof ts.toDate === 'function') {
      const d = ts.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts._seconds === 'number') {
      const d = new Date(ts._seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

function isDateInRange(date: Date | null, start: Date, end: Date): boolean {
  if (!date) return false;
  return date >= start && date < end;
}

function getDocTotal(data: Record<string, unknown>): number {
  const money = (data.money || {}) as Record<string, unknown>;
  const raw =
    data.total_amount ??
    data.total ??
    money.total_amount ??
    money.grand_total ??
    money.total ??
    0;
  return Number(raw) || 0;
}

function roundNumber(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
