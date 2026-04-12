import { getDb } from './firebaseAdmin';
/**
 * Report Service
 * 
 * Generates business reports from Firestore documents
 * CRITICAL RULE: Only RECEIPT documents count as revenue
 * 
 * Reports:
 * 1. Monthly Sales (revenue tracking)
 * 2. Overdue Invoices (collection focus)
 * 3. Top Customers (business insights)
 * 4. Popular Services (product performance)
 */

import type * as FirebaseFirestore from 'firebase-admin/firestore';

const db = getDb();
const DOCUMENTS_COLLECTION = 'documents';
const RECEIPT_DOC_TYPES = new Set(['RECEIPT', 'RCP']);
const QUOTATION_DOC_TYPES = new Set(['QUO', 'QUOTATION']);
const INVOICE_DOC_TYPES = new Set(['BILL', 'INVOICE', 'INV']);
const EXCLUDED_STATUSES = new Set(['DRAFT', 'READY', 'CANCELLED', 'VOID']);
const UNPAID_STATUSES = new Set(['UNPAID', 'AWAITING_PAYMENT']);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MonthlySalesReport {
  month: string; // Format: "ธ.ค. 2568"
  monthKey: string; // Format: "2568_12"
  receiptCount: number;
  totalRevenue: number;
  netReceived: number;
  averagePerReceipt: number;
  issuedDocCount: number;
  issuedDocTotal: number;
  issuedQuoCount: number;
  issuedBillCount: number;
}

export interface OverdueInvoice {
  docNo: string;
  customerName: string;
  amount: number;
  overdueByDays: number;
  issuedDate: Date;
  dueDate: Date;
}

export interface TopCustomer {
  customerName: string;
  customerId?: string;
  receiptCount: number;
  totalSpent: number;
  percentOfTotal: number;
}

export interface PopularService {
  description: string;
  itemCount: number;
  totalRevenue: number;
  percentOfTotal: number;
}

export interface FinancialReport {
  period: string; // e.g., "Jan 2026"
  revenue: number;
  expenses: number;
  netProfit: number;
  vatOutput: number; // Sale VAT
  vatInput: number; // Expense VAT
  whtDeducted: number; // WHT we deducted from expenses
  expenseBreakdown: { category: string; amount: number }[];
}

type ReportSnapshots = FirebaseFirestore.QueryDocumentSnapshot[];

interface ReportComputationOptions {
  docs?: ReportSnapshots;
  expenses?: ReportSnapshots;
}

export async function preloadBusinessDocuments(
  userId: string,
  businessId: string
): Promise<ReportSnapshots> {
  return fetchBusinessDocuments(userId, businessId);
}

export async function preloadBusinessExpenses(
  userId: string,
  businessId: string
): Promise<ReportSnapshots> {
  return fetchBusinessExpenses(userId, businessId);
}

// ============================================================================
// 1. MONTHLY SALES REPORT
// ============================================================================

export async function getMonthlySalesReport(
  userId: string,
  businessId: string,
  monthKey?: string, // Format: "2568_12", default = current month
  options: ReportComputationOptions = {}
): Promise<MonthlySalesReport | null> {
  try {
    // Determine month to report
    const targetMonth = monthKey || getCurrentMonthKey();

    const { start, end } = monthKeyToDateRange(targetMonth);
    const docs = options.docs ?? await fetchBusinessDocuments(userId, businessId);

    let receiptCount = 0;
    let totalRevenue = 0;
    let netReceived = 0;
    let issuedDocCount = 0;
    let issuedDocTotal = 0;
    let issuedQuoCount = 0;
    let issuedBillCount = 0;

    docs.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const docDate = getDocDate(data);
      if (!isDateInRange(docDate, start, end)) return;

      const normalizedType = normalizeDocType(data);
      if (!normalizedType) return;

      const status = normalizeStatus(data.status);

      if (normalizedType === 'RECEIPT') {
        if (!isReceiptStatus(status)) return;
        receiptCount += 1;
        const total = getDocTotal(data);
        totalRevenue += total;
        netReceived += getDocNetReceived(data, total);
        return;
      }

      if (!isIssuedStatus(status)) return;
      issuedDocCount += 1;
      issuedDocTotal += getDocTotal(data);
      if (normalizedType === 'QUO') issuedQuoCount += 1;
      if (normalizedType === 'BILL') issuedBillCount += 1;
    });

    return {
      month: monthKeyToThaiMonth(targetMonth),
      monthKey: targetMonth,
      receiptCount,
      totalRevenue,
      netReceived,
      averagePerReceipt: receiptCount > 0 ? Math.round(totalRevenue / receiptCount) : 0,
      issuedDocCount,
      issuedDocTotal,
      issuedQuoCount,
      issuedBillCount,
    };
  } catch (error: unknown) {
    console.error('Error generating monthly sales report:', error);
    // Check if error is due to index building
    const err = error as { code?: number | string; message?: string };
    if (err.code === 9 || err.message?.includes('index is currently building')) {
      console.error('Index is building, query will work once index is ready');
    }
    return null;
  }
}

// ============================================================================
// 2. OVERDUE INVOICES REPORT
// ============================================================================

export async function getOverdueInvoicesReport(
  userId: string,
  businessId: string,
  options: ReportComputationOptions = {}
): Promise<OverdueInvoice[]> {
  try {
    const now = new Date();
    const docs = options.docs ?? await fetchBusinessDocuments(userId, businessId);

    const overdueList: OverdueInvoice[] = [];

    docs.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const docType = normalizeDocType(data);
      if (docType !== 'BILL') return;

      const status = normalizeStatus(data.status);
      if (status === 'PAID' || EXCLUDED_STATUSES.has(status)) return;

      const issueDate = getDocDate(data);
      if (!issueDate) return;

      const dueDate = getDueDate(data, issueDate);

      // Check if overdue
      if (dueDate < now) {
        const overdueByDays = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        overdueList.push({
          docNo: String(data.doc_no || data.docNo || doc.id || ''),
          customerName: String(data.customer_name || data.customerName || 'Unknown'),
          amount: getDocTotal(data),
          overdueByDays,
          issuedDate: issueDate,
          dueDate,
        });
      }
    });

    // Sort by overdue days (descending)
    overdueList.sort((a, b) => b.overdueByDays - a.overdueByDays);

    return overdueList;
  } catch (error) {
    console.error('Error generating overdue invoices report:', error);
    return [];
  }
}

// ============================================================================
// 3. TOP CUSTOMERS REPORT
// ============================================================================

export async function getTopCustomersReport(
  userId: string,
  businessId: string,
  limit: number = 5,
  monthKey?: string, // Optional: limit to specific month
  options: ReportComputationOptions = {}
): Promise<TopCustomer[]> {
  try {
    const docs = options.docs ?? await fetchBusinessDocuments(userId, businessId);
    const range = monthKey ? monthKeyToDateRange(monthKey) : null;

    // Aggregate by customer
    const customerMap = new Map<
      string,
      { name: string; id?: string; total: number; count: number }
    >();

    let grandTotal = 0;

    docs.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const docType = normalizeDocType(data);
      if (docType !== 'RECEIPT') return;
      const status = normalizeStatus(data.status);
      if (!isReceiptStatus(status)) return;

      const docDate = getDocDate(data);
      if (range && !isDateInRange(docDate, range.start, range.end)) return;

      const customerName = String(data.customer_name || data.customerName || 'Unknown');
      const customerId = data.customer_id || data.customerId;
      const amount = getDocTotal(data);

      grandTotal += amount;

      const key = `${customerName}|${String(customerId || '')}`;
      const existing = customerMap.get(key) || {
        name: customerName,
        id: customerId ? String(customerId) : undefined,
        total: 0,
        count: 0,
      };

      existing.total += amount;
      existing.count += 1;
      customerMap.set(key, existing);
    });

    // Convert to array and sort by total (descending)
    const customers = Array.from(customerMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map((c) => ({
        customerName: c.name,
        customerId: c.id,
        receiptCount: c.count,
        totalSpent: c.total,
        percentOfTotal: grandTotal > 0 ? Math.round((c.total / grandTotal) * 100) : 0,
      }));

    return customers;
  } catch (error) {
    console.error('Error generating top customers report:', error);
    return [];
  }
}

// ============================================================================
// 4. POPULAR SERVICES REPORT
// ============================================================================

export async function getPopularServicesReport(
  userId: string,
  businessId: string,
  limit: number = 5,
  monthKey?: string, // Optional: limit to specific month
  options: ReportComputationOptions = {}
): Promise<PopularService[]> {
  try {
    const docs = options.docs ?? await fetchBusinessDocuments(userId, businessId);
    const range = monthKey ? monthKeyToDateRange(monthKey) : null;

    // Aggregate items
    const serviceMap = new Map<
      string,
      { description: string; count: number; revenue: number }
    >();

    let grandTotal = 0;

    docs.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const docType = normalizeDocType(data);
      if (docType !== 'RECEIPT') return;
      const status = normalizeStatus(data.status);
      if (!isReceiptStatus(status)) return;

      const docDate = getDocDate(data);
      if (range && !isDateInRange(docDate, range.start, range.end)) return;

      const items = data.items && Array.isArray(data.items) ? data.items : [];

      items.forEach((item: Record<string, unknown>) => {
        const description = String(
          item.description_th || item.description_en || item.name || item.description || 'Unknown'
        );
        const qty = Number(item.qty || item.quantity || 1);
        const unitPrice = Number(item.unit_price || item.unitPrice || item.price || 0);
        const amount = Number(item.amount || qty * unitPrice || 0);

        grandTotal += amount;

        const existing = serviceMap.get(description) || {
          description,
          count: 0,
          revenue: 0,
        };

        existing.count += 1;
        existing.revenue += amount;
        serviceMap.set(description, existing);
      });
    });

    // Convert to array and sort by revenue (descending)
    const services = Array.from(serviceMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((s) => ({
        description: s.description,
        itemCount: s.count,
        totalRevenue: s.revenue,
        percentOfTotal: grandTotal > 0 ? Math.round((s.revenue / grandTotal) * 100) : 0,
      }));

    return services;
  } catch (error) {
    console.error('Error generating popular services report:', error);
    return [];
  }
}

// ============================================================================
// 5. FINANCIAL REPORT (Profit/Loss)
// ============================================================================

export async function getFinancialReport(
  userId: string,
  businessId: string,
  options?: {
    monthKey?: string;
    startDate?: string;
    endDate?: string;
  },
  dataSources: ReportComputationOptions = {}
): Promise<FinancialReport | null> {
  try {
    let start: Date;
    let end: Date;
    let periodLabel = '';

    if (options?.startDate && options?.endDate) {
      start = new Date(options.startDate);
      end = new Date(options.endDate);
      // Set end of day for end date to be inclusive
      end.setHours(23, 59, 59, 999);
      periodLabel = `${options.startDate} - ${options.endDate}`;
    } else {
      const targetMonth = options?.monthKey || getCurrentMonthKey();
      const range = monthKeyToDateRange(targetMonth);
      start = range.start;
      end = range.end;
      periodLabel = targetMonth;
    }

    // 1. Calculate Revenue (Receipts)
    const docs = dataSources.docs ?? await fetchBusinessDocuments(userId, businessId);
    let revenue = 0;
    let vatOutput = 0;

    docs.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const docDate = getDocDate(data);
      if (!isDateInRange(docDate, start, end)) return;

      const normalizedType = normalizeDocType(data);
      if (normalizedType !== 'RECEIPT') return;
      const status = normalizeStatus(data.status);
      if (!isReceiptStatus(status)) return;

      const total = getDocTotal(data);
      const money = (data.money || {}) as Record<string, unknown>;
      const vat = Number(money.vat_amount || money.vatAmount || 0);

      revenue += total; // Total collected (inc VAT) or excl? Usually Profit = Revenue(excl VAT) - Expense(excl VAT).
      // Let's assume simplest: Net Profit = (Total In - VAT Out) - (Total Out - VAT In)
      // For now, let's track "Total" flow first.

      vatOutput += vat;
    });

    // 2. Calculate Expenses
    const expenses = dataSources.expenses ?? await fetchBusinessExpenses(userId, businessId);
    let totalExpense = 0;
    let vatInput = 0;
    let whtDeducted = 0;
    const categoryMap = new Map<string, number>();

    expenses.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const dateStr = (data.date as string) || '';
      const date = new Date(dateStr);

      if (!isDateInRange(date, start, end)) return;

      const status = (data.status as string) || 'PAID';
      if (status === 'CANCELLED') return;

      const amount = Number(data.amount || 0); // Excl VAT usually stored in amount?
      // In expense.types.ts: amount=excl, totalAmount=incl.
      // Net Profit calculation usually uses Excl VAT figures.

      const vAmount = Number(data.vatAmount || 0);
      const wAmount = Number(data.whtAmount || 0);

      totalExpense += amount;
      vatInput += vAmount;
      whtDeducted += wAmount;

      const cat = (data.category as string) || 'OTHER';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + amount);
    });

    // Revenue aggregation (adjust for VAT if needed, but let's stick to simple "money in" vs "money out" logic for now, or strict accounting?)
    // Strict accounting: Revenue = Grand Total - VAT Output. Expense = Amount (Excl VAT).
    return {
      period: periodLabel,
      revenue,
      expenses: totalExpense,
      netProfit: (revenue - vatOutput) - (totalExpense - vatInput), // Basic Net Profit
      vatOutput,
      vatInput,
      whtDeducted,
      expenseBreakdown: Array.from(categoryMap.entries()).map(([k, v]) => ({ category: k, amount: v })),
    };

  } catch (error) {
    console.error('Error generating financial report:', error);
    return null;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCurrentMonthKey(): string {
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${thaiYear}_${month}`;
}

function monthKeyToDateRange(monthKey: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = monthKey.split('_');
  const gregorianYear = parseInt(yearStr, 10) - 543;
  const month = parseInt(monthStr, 10) - 1; // 0-indexed

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
  const year = yearStr; // Thai year as-is
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
    console.warn('[reportService] business path query failed:', error);
  }

  if (docs.length > 0) return docs;

  try {
    const snap = await db
      .collection(DOCUMENTS_COLLECTION)
      .where('business_id', '==', businessId)
      .get();
    pushDocs(snap.docs);
  } catch (error) {
    console.warn('[reportService] root collection business_id failed:', error);
  }

  try {
    const snap = await db
      .collection(DOCUMENTS_COLLECTION)
      .where('businessId', '==', businessId)
      .get();
    pushDocs(snap.docs);
  } catch (error) {
    console.warn('[reportService] root collection businessId failed:', error);
  }

  return docs;
}

async function fetchBusinessExpenses(
  userId: string,
  businessId: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  try {
    const snap = await db
      .collection(`businesses/${businessId}/expenses`)
      .get();
    return snap.docs;
  } catch (error) {
    console.warn('[reportService] fetchBusinessExpenses failed:', error);
    return [];
  }
}

function normalizeDocType(data: Record<string, unknown>): 'QUO' | 'BILL' | 'RECEIPT' | null {
  const raw = String(data.doc_type || data.docType || '').toUpperCase();
  if (QUOTATION_DOC_TYPES.has(raw)) return 'QUO';
  if (INVOICE_DOC_TYPES.has(raw)) return 'BILL';
  if (RECEIPT_DOC_TYPES.has(raw)) return 'RECEIPT';

  const docNo = String(data.doc_no || data.docNo || '').toUpperCase();
  const prefix = docNo.split('-')[0];
  if (prefix === 'QUO' || prefix === 'QU') return 'QUO';
  if (prefix === 'INV' || prefix === 'BILL') return 'BILL';
  if (prefix === 'RCP' || prefix === 'RCPT' || prefix === 'REC') return 'RECEIPT';

  return null;
}

function normalizeStatus(status: unknown): string {
  if (typeof status !== 'string') return '';
  return status.trim().toUpperCase();
}

function isIssuedStatus(status: string): boolean {
  if (!status) return true;
  return !EXCLUDED_STATUSES.has(status);
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

function getDocNetReceived(data: Record<string, unknown>, fallbackTotal: number): number {
  const money = (data.money || {}) as Record<string, unknown>;
  const raw =
    data.net_receive_amount ??
    data.netReceived ??
    money.net_receive_amount ??
    money.net_received ??
    money.netReceived ??
    null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallbackTotal;
}

function getDueDate(data: Record<string, unknown>, issueDate: Date): Date {
  const due = toDateSafe(data.due_date || data.dueDate || data.payment_due_date || data.paymentDueDate);
  if (due) return due;
  const fallback = new Date(issueDate);
  fallback.setDate(fallback.getDate() + 30);
  return fallback;
}

function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && value && 'toDate' in value) {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  return null;
}
