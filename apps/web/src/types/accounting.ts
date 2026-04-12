export type PaymentMethod = 'transfer' | 'cash' | 'cheque';
export type TransactionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';
export type ExpenseCategory = 'material' | 'labor' | 'operating' | 'other';

export interface IncomeRecord {
  id: string;
  installmentNo: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  paymentProofUrl?: string;
  invoiceRef?: string;
  note?: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  category: ExpenseCategory;
  subcategory?: string;
  description: string;
  amount: number;
  vatAmount: number;
  whtAmount: number;
  netAmount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  status: TransactionStatus;
  linkedPoCategory?: string;
  linkedContractorId?: string;
  supplierName?: string;
  taxInvoiceNumber?: string;
  note?: string;
  createdAt: string;
}

export interface ExpenseVoucher {
  id: string;
  voucherNumber: string;
  contractorId: string;
  contractorName: string;
  categoryKey: string;
  categoryLabel: string;
  installmentNo: number;
  amount: number;
  description: string;
  status: TransactionStatus;
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
}

export interface PaymentVoucher {
  id: string;
  voucherNumber: string;
  payeeName: string;
  amount: number;
  vatAmount: number;
  whtAmount: number;
  netAmount: number;
  paymentMethod: PaymentMethod;
  description: string;
  linkedExpenseId?: string;
  status: TransactionStatus;
  paidAt?: string;
  createdAt: string;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  categoryKey: string;
  supplierName: string;
  items: GoodsReceiptItem[];
  receivedDate: string;
  receivedBy: string;
  note?: string;
  createdAt: string;
}

export interface GoodsReceiptItem {
  boqNo: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  unitPrice: number;
}

export interface TaxRecord {
  id: string;
  type: 'vat-input' | 'vat-output' | 'wht-deducted' | 'wht-withheld';
  amount: number;
  taxInvoiceNumber?: string;
  counterpartyName: string;
  date: string;
  linkedTransactionId: string;
  period: string; // "2569-03"
}

export interface CategoryPO {
  categoryKey: string;
  categoryLabel: string;
  poNumber: string;
  supplierName?: string;
  status: 'draft' | 'sent' | 'received' | 'partial';
  createdAt: string;
}

export interface ProjectAccounting {
  incomeRecords: IncomeRecord[];
  expenseRecords: ExpenseRecord[];
  expenseVouchers: ExpenseVoucher[];
  paymentVouchers: PaymentVoucher[];
  goodsReceipts: GoodsReceipt[];
  taxRecords: TaxRecord[];
  poByCategory: Record<string, CategoryPO>;
  documentCounters: Record<string, number>;
}

export const EMPTY_ACCOUNTING: ProjectAccounting = {
  incomeRecords: [],
  expenseRecords: [],
  expenseVouchers: [],
  paymentVouchers: [],
  goodsReceipts: [],
  taxRecords: [],
  poByCategory: {},
  documentCounters: {},
};
