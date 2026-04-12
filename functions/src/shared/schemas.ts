/**
 * Shared schema constants across EzDoc system
 * Single source of truth for document types, statuses, and enums
 */

/**
 * Draft document types (user-facing)
 */
export const DocTypeQuotation = 'QUO';
export const DocTypeInvoice = 'BILL';
export const DocTypeReceipt = 'RECEIPT';

export const DocTypeCreditNote = 'CN';
export const DocTypeDebitNote = 'DN';

export const DraftDocTypes = [DocTypeQuotation, DocTypeInvoice, DocTypeReceipt, DocTypeCreditNote, DocTypeDebitNote] as const;
export type DraftDocType = typeof DraftDocTypes[number];

/**
 * Issued document types (Firestore storage)
 */
export const IssuedDocTypeQuotation = 'QUOTATION';
export const IssuedDocTypeInvoice = 'INVOICE';
export const IssuedDocTypeReceipt = 'RECEIPT';

export const IssuedDocTypeCreditNote = 'CREDIT_NOTE';
export const IssuedDocTypeDebitNote = 'DEBIT_NOTE';

export const IssuedDocTypes = [
  IssuedDocTypeQuotation,
  IssuedDocTypeInvoice,
  IssuedDocTypeReceipt,
  IssuedDocTypeCreditNote,
  IssuedDocTypeDebitNote,
] as const;
export type IssuedDocType = typeof IssuedDocTypes[number];

/**
 * Mapping: Draft type → Issued type
 */
export const DraftToIssuedDocTypeMap: Record<DraftDocType, IssuedDocType> = {
  QUO: IssuedDocTypeQuotation,
  BILL: IssuedDocTypeInvoice,
  RECEIPT: IssuedDocTypeReceipt,
  CN: IssuedDocTypeCreditNote,
  DN: IssuedDocTypeDebitNote,
};

/**
 * Mapping: Issued type → Draft type (reverse)
 */
export const IssuedToDraftDocTypeMap: Record<IssuedDocType, DraftDocType> = {
  QUOTATION: DocTypeQuotation,
  INVOICE: DocTypeInvoice,
  RECEIPT: DocTypeReceipt,
  CREDIT_NOTE: DocTypeCreditNote,
  DEBIT_NOTE: DocTypeDebitNote,
};

/**
 * Document numbering prefixes
 */
export const DocNumberPrefixes: Record<DraftDocType, string> = {
  QUO: 'QUO',
  BILL: 'INV',
  RECEIPT: 'RCP',
  CN: 'CN',
  DN: 'DN',
};

/**
 * Document statuses (for issued documents)
 */
export const DocStatusIssued = 'ISSUED';
export const DocStatusUnpaid = 'UNPAID';
export const DocStatusAwaitingPayment = 'AWAITING_PAYMENT';
export const DocStatusPaid = 'PAID';
export const DocStatusCancelled = 'CANCELLED';

export const DocStatuses = [
  DocStatusIssued,
  DocStatusUnpaid,
  DocStatusAwaitingPayment,
  DocStatusPaid,
  DocStatusCancelled,
] as const;
export type DocStatus = typeof DocStatuses[number];

/**
 * Unpaid statuses (used in payment confirmation flow)
 */
export const UnpaidStatuses: DocStatus[] = [
  DocStatusIssued,
  DocStatusUnpaid,
  DocStatusAwaitingPayment,
];

/**
 * Draft statuses
 */
export const DraftStatusEditing = 'editing';
export const DraftStatusPendingConfirmation = 'pending_confirmation';
export const DraftStatusConfirmed = 'confirmed';

export const DraftStatuses = [
  DraftStatusEditing,
  DraftStatusPendingConfirmation,
  DraftStatusConfirmed,
] as const;
export type DraftStatus = typeof DraftStatuses[number];

/**
 * PDF generation job statuses
 */
export const PdfJobStatusPending = 'PENDING';
export const PdfJobStatusProcessing = 'PROCESSING';
export const PdfJobStatusDone = 'DONE';
export const PdfJobStatusFailed = 'FAILED';

export const PdfJobStatuses = [
  PdfJobStatusPending,
  PdfJobStatusProcessing,
  PdfJobStatusDone,
  PdfJobStatusFailed,
] as const;
export type PdfJobStatus = typeof PdfJobStatuses[number];

/**
 * Payment confirmation statuses
 */
export const PaymentStatusPending = 'PENDING';
export const PaymentStatusConfirmed = 'CONFIRMED';
export const PaymentStatusFailed = 'FAILED';

export const PaymentStatuses = [
  PaymentStatusPending,
  PaymentStatusConfirmed,
  PaymentStatusFailed,
] as const;
export type PaymentStatus = typeof PaymentStatuses[number];

/**
 * Intent types (for message recognition)
 */
export const IntentCreateQuotation = 'CREATE_QUOTATION';
export const IntentCreateInvoice = 'CREATE_INVOICE';
export const IntentCreateReceipt = 'CREATE_RECEIPT';
export const IntentEdit = 'EDIT';
export const IntentConfirm = 'CONFIRM';
export const IntentCancel = 'CANCEL';
export const IntentPaid = 'PAID';
export const IntentConfirmPayment = 'CONFIRM_PAYMENT';
export const IntentUnknown = 'UNKNOWN';
export const IntentReport = 'REPORT';

export const Intents = [
  IntentCreateQuotation,
  IntentCreateInvoice,
  IntentCreateReceipt,
  IntentEdit,
  IntentConfirm,
  IntentCancel,
  IntentPaid,
  IntentConfirmPayment,
  IntentUnknown,
  IntentReport,
] as const;
export type Intent = typeof Intents[number];

/**
 * Validation helpers
 */
export function isValidDocType(value: string): value is DraftDocType {
  return DraftDocTypes.includes(value as DraftDocType);
}

export function isValidDocStatus(value: string): value is DocStatus {
  return DocStatuses.includes(value as DocStatus);
}

export function isValidDraftStatus(value: string): value is DraftStatus {
  return DraftStatuses.includes(value as DraftStatus);
}

export function isValidPdfJobStatus(value: string): value is PdfJobStatus {
  return PdfJobStatuses.includes(value as PdfJobStatus);
}

export function isValidPaymentStatus(value: string): value is PaymentStatus {
  return PaymentStatuses.includes(value as PaymentStatus);
}

export function isUnpaidStatus(status: string): boolean {
  return UnpaidStatuses.includes(status as DocStatus);
}
