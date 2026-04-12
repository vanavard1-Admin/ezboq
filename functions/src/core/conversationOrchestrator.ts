/**
 * Conversation Orchestrator
 * 
 * State Machine for LINE-based document creation
 * Flow: IDLE → DRAFTING → AWAIT_CONFIRM → ISSUING
 * 
 * CRITICAL RULES:
 * - RECEIPT ONLY counts as revenue (not QUO or INVOICE)
 * - RECEIPT must have source_doc_id pointing to INVOICE
 * - INVOICE must have source_doc_id pointing to QUO (optional but recommended)
 * - No floating RECEIPTs - must audit source_doc_id chain
 * - All state transitions are IMMUTABLE (cannot go backward)
 * 
 * NEW: Conversational Document Creation
 * - Supports natural Thai language commands
 * - Incremental draft editing (add/remove items)
 * - Two-step confirmation (ยืนยัน → ยืนยันอีกครั้ง)
 * - Paste-to-edit support
 */

import { Timestamp } from 'firebase-admin/firestore';
import { parseCommand, CommandType, getHelpText } from './commandParser';
import * as draftManager from './draftManager';
import type { ConversationalDraft } from './draftManager';
import { formatResponse, formatConfirmationSummary, formatError } from './responseFormatter';

// ============================================================================
// STATE ENUMS
// ============================================================================

export enum ConversationState {
  IDLE = 'IDLE',
  DRAFTING_QUO = 'DRAFTING_QUO',
  DRAFTING_INVOICE = 'DRAFTING_INVOICE',
  DRAFTING_RECEIPT = 'DRAFTING_RECEIPT',
  AWAIT_CONFIRM = 'AWAIT_CONFIRM',
  ISSUING = 'ISSUING',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PAYMENT_CONFIRMATION_PENDING = 'PAYMENT_CONFIRMATION_PENDING', // NEW: Explicit confirm required
  COMPLETED = 'COMPLETED',
}

export enum DocumentType {
  QUOTATION = 'QUO',
  INVOICE = 'BILL',
  RECEIPT = 'RECEIPT',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  AWAITING_CONFIRM = 'AWAITING_CONFIRM',
  ISSUED = 'ISSUED',
  PAID = 'PAID',
}

// ============================================================================
// DRAFT ITEM SCHEMA
// ============================================================================

export interface DraftItem {
  description_th: string;
  description_en?: string;
  quantity: number;
  unit_price: number;
  amount: number; // quantity * unit_price
  tax_percent?: number;
  tax_amount?: number;
}

export interface DraftData {
  // Identity
  conversationId: string;
  userId: string; // Firebase UID
  businessId: string;

  // Document type and source
  docType: DocumentType;
  sourceDocId?: string; // QUO → INVOICE, INVOICE → RECEIPT chain

  // Customer info
  customerId?: string;
  customerName: string;
  customerTaxId?: string;
  customerLegalName?: string;
  customerBranch?: string;
  customerAddress?: string;
  customerContactName?: string;

  // Items
  items: DraftItem[];

  // Calculations
  subTotal: number;
  vatPercent: number;
  vatAmount: number;
  whtPercent?: number;
  whtAmount?: number;
  totalAmount: number;
  netReceiveAmount?: number; // For RECEIPT: total - WHT

  // Payment info (for RECEIPT)
  paymentDate?: Timestamp;
  paymentMethod?: string;
  referenceNo?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp; // 7 days TTL for abandoned drafts
}

// ============================================================================
// CONVERSATION STATE SCHEMA
// ============================================================================

export interface ConversationSnapshot {
  userId: string;
  businessId: string;
  conversationId: string;

  currentState: ConversationState;
  currentDraft?: DraftData;

  // Last issued document reference
  lastIssuedDocId?: string;
  lastIssuedDocType?: DocumentType;

  // Audit trail
  stateHistory: {
    state: ConversationState;
    timestamp: Timestamp;
    action: string;
  }[];

  updatedAt: Timestamp;
}

// ============================================================================
// STATE TRANSITION RULES
// ============================================================================

export interface StateTransition {
  from: ConversationState;
  to: ConversationState;
  action: string;
}

/**
 * IMMUTABLE state transition rules
 * Do NOT modify without migration plan and team approval
 */
const VALID_TRANSITIONS: StateTransition[] = [
  // Start document creation
  { from: ConversationState.IDLE, to: ConversationState.DRAFTING_QUO, action: 'start_quo' },
  { from: ConversationState.IDLE, to: ConversationState.DRAFTING_INVOICE, action: 'start_invoice' },
  { from: ConversationState.IDLE, to: ConversationState.DRAFTING_RECEIPT, action: 'start_receipt' },

  // Edit draft
  { from: ConversationState.DRAFTING_QUO, to: ConversationState.DRAFTING_QUO, action: 'edit_quo' },
  { from: ConversationState.DRAFTING_INVOICE, to: ConversationState.DRAFTING_INVOICE, action: 'edit_invoice' },
  { from: ConversationState.DRAFTING_RECEIPT, to: ConversationState.DRAFTING_RECEIPT, action: 'edit_receipt' },

  // Move to confirmation
  { from: ConversationState.DRAFTING_QUO, to: ConversationState.AWAIT_CONFIRM, action: 'confirm_quo_draft' },
  { from: ConversationState.DRAFTING_INVOICE, to: ConversationState.AWAIT_CONFIRM, action: 'confirm_invoice_draft' },
  { from: ConversationState.DRAFTING_RECEIPT, to: ConversationState.AWAIT_CONFIRM, action: 'confirm_receipt_draft' },

  // Edit from confirmation
  { from: ConversationState.AWAIT_CONFIRM, to: ConversationState.DRAFTING_QUO, action: 'edit_from_confirm_quo' },
  { from: ConversationState.AWAIT_CONFIRM, to: ConversationState.DRAFTING_INVOICE, action: 'edit_from_confirm_invoice' },
  { from: ConversationState.AWAIT_CONFIRM, to: ConversationState.DRAFTING_RECEIPT, action: 'edit_from_confirm_receipt' },

  // Issue document
  { from: ConversationState.AWAIT_CONFIRM, to: ConversationState.ISSUING, action: 'confirm_and_issue' },

  // Post-issue workflows
  { from: ConversationState.ISSUING, to: ConversationState.AWAITING_PAYMENT, action: 'issued_quo_ask_invoice' },
  { from: ConversationState.ISSUING, to: ConversationState.AWAITING_PAYMENT, action: 'issued_invoice_ask_payment' },
  { from: ConversationState.ISSUING, to: ConversationState.COMPLETED, action: 'issued_receipt' },

  // Payment flow (NEW - explicit confirmation required)
  { from: ConversationState.AWAITING_PAYMENT, to: ConversationState.PAYMENT_CONFIRMATION_PENDING, action: 'user_indicates_payment' },
  { from: ConversationState.PAYMENT_CONFIRMATION_PENDING, to: ConversationState.COMPLETED, action: 'user_confirms_payment' },
  { from: ConversationState.PAYMENT_CONFIRMATION_PENDING, to: ConversationState.AWAITING_PAYMENT, action: 'user_cancels_payment_confirm' },

  // Cancel payment from awaiting
  { from: ConversationState.AWAITING_PAYMENT, to: ConversationState.IDLE, action: 'cancel_payment' },

  // Complete
  { from: ConversationState.COMPLETED, to: ConversationState.IDLE, action: 'reset' },
];

// ============================================================================
// TRANSITION VALIDATOR
// ============================================================================

export function isValidTransition(
  from: ConversationState,
  to: ConversationState,
  action: string
): boolean {
  return VALID_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.action === action
  );
}

export function canTransition(
  from: ConversationState,
  to: ConversationState
): boolean {
  return VALID_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

// ============================================================================
// DRAFT VALIDATION
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export function validateDraft(draft: Partial<DraftData>, docType: DocumentType): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!draft.customerName || draft.customerName.trim() === '') {
    errors.push({ field: 'customerName', message: 'ต้องระบุชื่อลูกค้า' });
  }

  if (!draft.items || draft.items.length === 0) {
    errors.push({ field: 'items', message: 'ต้องมีรายการสินค้า/บริการอย่างน้อย 1 รายการ' });
  }

  // Validate items
  if (draft.items) {
    draft.items.forEach((item, idx) => {
      if (!item.description_th) {
        errors.push({
          field: `items[${idx}].description_th`,
          message: 'รายการต้องมีคำอธิบาย',
        });
      }
      if (item.quantity <= 0) {
        errors.push({
          field: `items[${idx}].quantity`,
          message: 'จำนวนต้องมากกว่า 0',
        });
      }
      if (item.unit_price <= 0) {
        errors.push({
          field: `items[${idx}].unit_price`,
          message: 'ราคาต้องมากกว่า 0',
        });
      }
    });
  }

  // RECEIPT specific: must have sourceDocId
  if (docType === DocumentType.RECEIPT && !draft.sourceDocId) {
    errors.push({
      field: 'sourceDocId',
      message: 'ใบเสร็จต้องอ้างอิงจากใบวางบิล',
    });
  }

  // RECEIPT specific: payment info required
  if (docType === DocumentType.RECEIPT) {
    if (!draft.paymentDate) {
      errors.push({
        field: 'paymentDate',
        message: 'ต้องระบุวันที่ชำระเงิน',
      });
    }
  }

  return errors;
}

// ============================================================================
// DOCUMENT TYPE SPECIFIC RULES
// ============================================================================

export function canCreateReceiptFromInvoice(invoiceId: string): boolean {
  // Only allow RECEIPT creation from issued INVOICE
  return !!invoiceId;
}

export function getSourceDocIdChain(docType: DocumentType, sourceDocId?: string): string {
  if (docType === DocumentType.QUOTATION) {
    return 'QUO'; // Root
  }
  if (docType === DocumentType.INVOICE && sourceDocId) {
    return `QUO → INVOICE`; // From QUO
  }
  if (docType === DocumentType.INVOICE && !sourceDocId) {
    return 'INVOICE'; // Standalone
  }
  if (docType === DocumentType.RECEIPT && sourceDocId) {
    return `INVOICE → RECEIPT`; // Must have source
  }
  throw new Error('Invalid document type or source');
}

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

export function calculateDraftTotals(
  items: DraftItem[],
  vatPercent: number,
  whtPercent: number = 0
): {
  subTotal: number;
  vatAmount: number;
  whtAmount: number;
  totalAmount: number;
  netReceiveAmount: number;
} {
  const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = (subTotal * vatPercent) / 100;
  const whtAmount = (subTotal * whtPercent) / 100;
  const totalAmount = subTotal + vatAmount;
  const netReceiveAmount = totalAmount - whtAmount;

  return {
    subTotal,
    vatAmount,
    whtAmount,
    totalAmount,
    netReceiveAmount,
  };
}

// ============================================================================
// INTENT RECOGNITION (Thai)
// ============================================================================

export enum Intent {
  CREATE_QUOTATION = 'CREATE_QUOTATION',
  CREATE_INVOICE = 'CREATE_INVOICE',
  CREATE_RECEIPT = 'CREATE_RECEIPT',
  CREATE_INV_FROM_QUO = 'CREATE_INV_FROM_QUO', // "สร้างใบวางบิลจาก QUO-xxxx"
  CREATE_REC_FROM_INV = 'CREATE_REC_FROM_INV', // "สร้างใบเสร็จจาก INV-xxxx"
  INSTALLMENT_SUMMARY = 'INSTALLMENT_SUMMARY', // "สรุปงวดของ QUO-xxxx"
  INSTALLMENT_DASHBOARD = 'INSTALLMENT_DASHBOARD', // "แดชบอร์ด QUO-xxxx"
  CONFIRM = 'CONFIRM',
  CONFIRM_PAYMENT = 'CONFIRM_PAYMENT', // "ยืนยันรับเงิน"
  CONFIRM_CREDIT_PAYMENT = 'CONFIRM_CREDIT_PAYMENT', // "ยืนยันการชำระเงิน" (credit purchase)
  CONFIRM_RENEWAL = 'CONFIRM_RENEWAL', // "ยืนยันต่ออายุแพ็ก"
  EDIT = 'EDIT',
  CANCEL = 'CANCEL',
  PAID = 'PAID',
  NOT_PAID = 'NOT_PAID',
  REPORT = 'REPORT',
  TAX_VAT_SUMMARY = 'TAX_VAT_SUMMARY', // "สรุปภาษี เดือนนี้"
  TAX_WHT_SUMMARY = 'TAX_WHT_SUMMARY', // "สรุปหัก ณ ที่จ่าย"
  TAX_STATUS = 'TAX_STATUS', // "ภาษีค้าง"
  TAX_CERTIFICATE = 'TAX_CERTIFICATE', // "ออกหนังสือรับรองหัก ณ ที่จ่าย"
  TAX_ANNUAL = 'TAX_ANNUAL', // "สรุปภาษีทั้งปี"
  TAX_REMINDER_ON = 'TAX_REMINDER_ON', // "เปิดเตือนภาษี"
  TAX_AUDIT = 'TAX_AUDIT', // "ตรวจภาษี"
  BUY_PACKAGE_199 = 'BUY_PACKAGE_199', // "ซื้อแพ็ค 99"
  BUY_PACKAGE_279 = 'BUY_PACKAGE_279', // "ซื้อแพ็ค 279"
  BUY_PACKAGE_3990 = 'BUY_PACKAGE_3990', // "ซื้อแพ็ค Team รายปี"
  REQUEST_PDF = 'REQUEST_PDF', // "ขอ PDF"
  SETTINGS = 'SETTINGS', // "ตั้งค่าธุรกิจ" / "ตั้งค่าพร้อมเพย์" / "ตั้งค่าธนาคาร"
  CREDIT_PURCHASE_HISTORY = 'CREDIT_PURCHASE_HISTORY', // "ประวัติการซื้อเครดิต"
  // UX & Onboarding
  USAGE_GUIDE = 'USAGE_GUIDE', // "วิธีใช้งาน"
  HELP = 'HELP', // "ช่วยเหลือ"
  BUSINESS_SETUP = 'BUSINESS_SETUP', // "ตั้งค่าธุรกิจ" (checklist)
  CREDIT_REPORT = 'CREDIT_REPORT', // Admin: "รายงานเครดิต"
  CREDIT_INVOICE = 'CREDIT_INVOICE', // "ขอใบกำกับภาษีเครดิต"
  APPLY_PROMO_CODE = 'APPLY_PROMO_CODE', // "ใช้โค้ดส่วนลด <code>"
  TEAM_INVITE = 'TEAM_INVITE', // "เชิญทีม" / "ชวนเพื่อน"
  JOIN_TEAM = 'JOIN_TEAM', // "เข้าทีม <code>"
  AFFILIATE_INFO = 'AFFILIATE_INFO', // "affiliate" / "เอฟฟิลิเอต"
  IMAGE_LABEL = 'IMAGE_LABEL', // "โลโก้" / "ลายเซ็น" / "ตราประทับ"
  // ✅ FIX 5: Delivery retry commands
  RESEND_DOCUMENT = 'RESEND_DOCUMENT', // "ส่งเอกสารอีกครั้ง" / "send again"
  GET_DOCUMENT_LINK = 'GET_DOCUMENT_LINK', // "ขอลิงก์เอกสาร" / "get link"
  // ✅ FIX 1: Payment status commands
  CHECK_PAYMENT_STATUS = 'CHECK_PAYMENT_STATUS', // "ตรวจสอบสถานะการชำระเงิน"
  RESEND_SLIP = 'RESEND_SLIP', // "ส่งสลิปใหม่"
  CANCEL_PAYMENT = 'CANCEL_PAYMENT', // "ยกเลิกการชำระเงิน"
  // Wizard navigation
  WIZARD_BACK = 'WIZARD_BACK', // "ย้อนกลับ"
  WIZARD_SKIP = 'WIZARD_SKIP', // "ข้าม"
  WIZARD_CANCEL = 'WIZARD_CANCEL', // "ยกเลิก"
  // Document viewing
  VIEW_LATEST_DOCUMENT = 'VIEW_LATEST_DOCUMENT', // "ดูเอกสารล่าสุด"
  // Account linking
  LINK_ACCOUNT = 'LINK_ACCOUNT', // "เชื่อมต่อ" / "เชื่อมต่อบัญชี"
  // Admin review commands (must start with "admin ")
  ADMIN_LIST_PENDING = 'ADMIN_LIST_PENDING', // "admin งานค้าง"
  ADMIN_VIEW_SLIP = 'ADMIN_VIEW_SLIP', // "admin ดู <purchaseId>"
  ADMIN_APPROVE_SLIP = 'ADMIN_APPROVE_SLIP', // "admin ยืนยัน <purchaseId>"
  ADMIN_REJECT_SLIP = 'ADMIN_REJECT_SLIP', // "admin ปฏิเสธ <purchaseId> <reason>"
  ADMIN_CONFIRM_EMAIL = 'ADMIN_CONFIRM_EMAIL', // "admin ยืนยันอีเมล <purchaseId>"
  ADMIN_EXPORT_CSV = 'ADMIN_EXPORT_CSV', // "admin export เครดิต csv"
  ADMIN_ADD_CREDITS = 'ADMIN_ADD_CREDITS', // "admin เติมเครดิต <userId> <amount>"
  ADMIN_RERENDER_PDF = 'ADMIN_RERENDER_PDF', // "admin rerender <docId>"
  ADMIN_TEMPLATE_REPORT = 'ADMIN_TEMPLATE_REPORT', // "admin รายงานเทมเพลต"
  REPORT_ISSUE = 'REPORT_ISSUE', // "รายงานปัญหา <ข้อความ>"
  PAYMENT_CLAIM = 'PAYMENT_CLAIM', // "จ่ายแล้ว/โอนแล้ว/ทำไมยังฟรี" — user claims they paid
  UNKNOWN = 'UNKNOWN',
}

/**
 * Recognize intent from message text
 * 
 * CRITICAL: Button actions are checked FIRST to ensure they are NEVER rejected.
 * This prevents "ไม่เข้าใจคำสั่ง" responses for button clicks.
 * 
 * ✅ FIX: Input normalization applied BEFORE intent recognition
 * - Handles Thai typo variants (แพค/แพ็ค, ลูกค้า/ลุกค้า)
 * - Normalizes spaces and punctuation
 * - Canonicalizes numbers (99 บาท → 99บาท)
 */
export function recognizeIntent(message: string): Intent {
  // ✅ FIX 1: Normalize input FIRST (typo tolerance)
  const { normalizeInput } = require('../utils/inputNormalization');
  const normalized = normalizeInput(message);
  const text = normalized.toLowerCase().trim();

  // PRIORITY 1: Check if this is a button action (using normalized input)
  // Button actions bypass NLP and route directly to intent
  // This ensures buttons are NEVER rejected or misunderstood
  // CRITICAL: This check happens BEFORE any NLP parsing
  try {
    // Import synchronously (buttonActionMap is synchronous)
    const buttonActionMap = require('./buttonActionMap');
    // ✅ FIX 2: Check both original and normalized message
    let buttonAction = buttonActionMap.getButtonAction(message);
    if (!buttonAction) {
      buttonAction = buttonActionMap.getButtonAction(normalized);
    }
    if (buttonAction) {
      // This is a button action - return intent immediately
      // No NLP parsing, no fallback, no ambiguity
      console.log(`[recognizeIntent] ✅ Button action: "${message}" (normalized: "${normalized}") → ${buttonAction.intent}`);
      return buttonAction.intent;
    }
  } catch (err) {
    // If buttonActionMap not available, continue with NLP
    // This should not happen in production, but we handle gracefully
    console.warn('[recognizeIntent] ⚠️ Button action check failed, using NLP:', err);
  }

  // Admin commands (support leading bullets/numbering) - must be before "ยืนยัน" confirm
  const adminCandidate = text.replace(/^[^a-zA-Zก-๙]+/i, '');
  if (/^admin\b/i.test(adminCandidate)) {
    const adminCommand = adminCandidate.replace(/^admin\s*/i, '').trim();

    // "admin งานค้าง" - list pending reviews
    if (adminCommand === 'งานค้าง' || adminCommand === 'pending') {
      return Intent.ADMIN_LIST_PENDING;
    }

    // "admin ดู <purchaseId>" - view slip details
    if (/^(?:ดู|view)\s+([A-Za-z0-9_-]+)/i.test(adminCommand)) {
      return Intent.ADMIN_VIEW_SLIP;
    }

    // "admin ยืนยัน <purchaseId>" - approve slip
    if (/^(?:ยืนยัน|approve)\s+([A-Za-z0-9_-]+)/i.test(adminCommand)) {
      return Intent.ADMIN_APPROVE_SLIP;
    }

    // "admin ปฏิเสธ <purchaseId> <reason>" - reject slip
    if (/^(?:ปฏิเสธ|reject)\s+([A-Za-z0-9_-]+)/i.test(adminCommand)) {
      return Intent.ADMIN_REJECT_SLIP;
    }

    // "admin ยืนยันอีเมล <purchaseId> <email text>" - confirm via email
    if (/^(?:ยืนยันอีเมล|confirm email)\s+([A-Za-z0-9_-]+)/i.test(adminCommand)) {
      return Intent.ADMIN_CONFIRM_EMAIL;
    }

    // "admin rerender <docId>" - force PDF rerender
    if (/^(?:rerender|re-render|render)\s+(\S+)/i.test(adminCommand)) {
      return Intent.ADMIN_RERENDER_PDF;
    }

    // "admin เติมเครดิต <userId> <amount>" - manual credit adjustment
    if (/^(?:เติมเครดิต|add credits?)/i.test(adminCommand)) {
      return Intent.ADMIN_ADD_CREDITS;
    }

    // "admin รายงานแพ็กวันนี้/เมื่อวาน/เดือนนี้"
    if (
      adminCommand.includes('รายงานแพ็ก') ||
      adminCommand.includes('รายงานเครดิต') ||
      adminCommand.includes('credit report')
    ) {
      return Intent.CREDIT_REPORT;
    }

    // "admin export เครดิต csv"
    if (/^(?:export|ส่งออก)\s+(?:เครดิต|credit|แพ็ก|package)\s+(?:csv|ซีเอสวี)/i.test(adminCommand)) {
      return Intent.ADMIN_EXPORT_CSV;
    }

    // "admin รายงานเทมเพลต"
    if (
      adminCommand.includes('รายงานเทมเพลต') ||
      adminCommand.includes('template report') ||
      adminCommand.includes('report template')
    ) {
      return Intent.ADMIN_TEMPLATE_REPORT;
    }
  }

  // Issue report (must be before doc creation to avoid "ใบเสร็จ" trigger)
  if (/^(รายงานปัญหา|แจ้งปัญหา|ติดต่อแอดมิน)\b/i.test(text)) {
    return Intent.REPORT_ISSUE;
  }

  // Promo code / discount code
  if (/(ใช้โค้ด|โค้ดส่วนลด|ใส่โค้ด|promo\s*code|discount\s*code)/i.test(text)) {
    return Intent.APPLY_PROMO_CODE;
  }

  // Join team with invite code
  if (/(เข้าทีม|join\s*team|team\s*code)/i.test(text)) {
    return Intent.JOIN_TEAM;
  }

  // Team invite
  if (/(เชิญทีม|ชวนทีม|invite)/i.test(text)) {
    return Intent.TEAM_INVITE;
  }

  // Affiliate
  if (/(affiliate|เอฟฟิลิเอต|พาร์ทเนอร์|พันธมิตร|แนะนำเพื่อน|ชวนเพื่อน)/i.test(text)) {
    return Intent.AFFILIATE_INFO;
  }

  // Create Invoice FROM Quotation (with optional installment)
  // Pattern: "สร้างใบวางบิลจาก QUO-xxxx" or "สร้างใบวางบิลจาก QUO-xxxx งวด 1"
  if (
    /(?:สร้าง)?ใบวางบิลจาก\s*(?:quo|qou|ใบเสนอราคา)[\s-]*\d+/i.test(text) ||
    /(?:สร้าง)?invoice\s+from\s+quo/i.test(text) ||
    /ออกบิลจาก\s*quo/i.test(text)
  ) {
    return Intent.CREATE_INV_FROM_QUO;
  }
  // Create Invoice FROM latest Quotation (no doc number)
  // Pattern: "ใบวางบิล จากใบเสนอราคา", "ทำใบวางบิลจากเอกสารนี้"
  if (
    /(ทำ|สร้าง)?\s*ใบวางบิล\s*จาก\s*ใบเสนอราคา/i.test(text) ||
    /(ทำ|สร้าง)?\s*ใบวางบิล\s*จาก\s*เอกสาร(นี้)?/i.test(text) ||
    /ใบวางบิล.*ใบเสนอราคา/i.test(text) ||
    /ใบเสนอราคา.*ใบวางบิล/i.test(text)
  ) {
    return Intent.CREATE_INV_FROM_QUO;
  }

  // Create Receipt FROM Invoice
  // Pattern: "สร้างใบเสร็จจาก INV-xxxx" or "ใบเสร็จจาก INV-xxxx"
  if (
    /(?:สร้าง)?ใบเสร็จจาก\s*(?:inv|invoice|ใบวางบิล|บิล)[\s-]*\d+/i.test(text) ||
    /(?:สร้าง)?receipt\s+from\s+inv/i.test(text) ||
    /ออกใบเสร็จจาก\s*inv/i.test(text) ||
    /(ทำ|สร้าง)?\s*ใบเสร็จ\s*จาก\s*ใบวางบิล/i.test(text) ||
    /(ทำ|สร้าง)?\s*ใบเสร็จ\s*จาก\s*เอกสาร(นี้)?/i.test(text) ||
    /ใบเสร็จ.*ใบวางบิล/i.test(text) ||
    /ใบวางบิล.*ใบเสร็จ/i.test(text)
  ) {
    return Intent.CREATE_REC_FROM_INV;
  }

  // Installment Summary
  // Pattern: "สรุปงวดของ QUO-xxxx"
  if (
    /สรุปงวด(?:ของ)?\s*(?:quo|qou)[\s-]*\d+/i.test(text)
  ) {
    return Intent.INSTALLMENT_SUMMARY;
  }

  // Installment Dashboard
  // Pattern: "แดชบอร์ด QUO-xxxx"
  if (
    /แดชบอร์ด\s*(?:quo|qou)[\s-]*\d+/i.test(text)
  ) {
    return Intent.INSTALLMENT_DASHBOARD;
  }

  // Create Quotation
  if (
    text.includes('ทำใบเสนอราคา') ||
    text.includes('quotation') ||
    text.includes('ใบเสนอราคา')
  ) {
    return Intent.CREATE_QUOTATION;
  }

  // Create Invoice (blank draft - deprecated, still works)
  if (
    text.includes('ทำใบวางบิล') ||
    text.includes('ทำบิล') ||
    text.includes('ขอบิล') ||
    text.includes('ออกบิล') ||
    text.includes('สร้างบิล') ||
    text.includes('ทำ invoice') ||
    text.includes('invoice') ||
    text.includes('วางบิล') ||
    text.includes('ใบวางบิล')
  ) {
    return Intent.CREATE_INVOICE;
  }

  // Create Receipt
  if (
    text.includes('ทำใบเสร็จ') ||
    text.includes('receipt') ||
    text.includes('ใบเสร็จ') ||
    text.includes('ใบเสร็จรับเงิน')
  ) {
    return Intent.CREATE_RECEIPT;
  }

  // CREDIT PAYMENT CONFIRMATION (must be before regular confirm)
  // Pattern: "ยืนยันการชำระเงิน"
  if (text.includes('ยืนยันการชำระเงิน')) {
    return Intent.CONFIRM_CREDIT_PAYMENT;
  }

  // RENEWAL CONFIRMATION (must be before regular confirm)
  if (text.includes('ยืนยันต่ออายุแพ็ก') || text.includes('ยืนยันต่ออายุ')) {
    return Intent.CONFIRM_RENEWAL;
  }

  // PAYMENT CONFIRMATION (explicit - "ยืนยันรับเงิน")
  if (text.includes('ยืนยันรับเงิน')) {
    return Intent.CONFIRM_PAYMENT;
  }

  // Confirm (regular document confirmation)
  // Excludes: "รับเงิน" and "การชำระเงิน"
  // ✅ FIX: Support "ออกเอกสาร" as well as "ยืนยัน"
  if (
    (text.includes('ยืนยัน') || text.includes('ออกเอกสาร') || text.includes('ออกครบชุด')) &&
    !text.includes('รับเงิน') &&
    !text.includes('การชำระเงิน')
  ) {
    return Intent.CONFIRM;
  }

  // Edit
  if (text.includes('แก้ไข') || text.includes('edit')) {
    return Intent.EDIT;
  }

  // Cancel
  if (
    text.includes('ยกเลิก') ||
    text.includes('cancel') ||
    text === 'n' ||
    text === 'no'
  ) {
    return Intent.CANCEL;
  }

  // Not paid
  if (text.includes('ยังไม่ชำระ') || text.includes('not paid') || text.includes('ไม่ชำระ')) {
    return Intent.NOT_PAID;
  }

  // Purchase history
  if (text.includes('ประวัติการซื้อแพ็ก') || text.includes('ประวัติการซื้อเครดิต') || text.includes('ประวัติเครดิต')) {
    return Intent.CREDIT_PURCHASE_HISTORY;
  }

  // Buy packages (support new prices + legacy aliases)
  const compactText = text.replace(/\s+/g, '');

  if (
    compactText.includes('3990') ||
    /(?:ทีม|team)(?:รายปี|ปี)/i.test(compactText) ||
    /รายปี(?:ทีม|team)/i.test(compactText)
  ) {
    return Intent.BUY_PACKAGE_3990;
  }

  if (
    text.includes('ซื้อแพ็ค 279') ||
    text.includes('แพ็ค 279') ||
    text === '279' ||
    text.includes('ซื้อ 279') ||
    text.includes('ซื้อแพ็ค 399') ||
    text.includes('แพ็ค 399') ||
    text === '399' ||
    text.includes('ซื้อ 399') ||
    text.includes('ซื้อแพ็ค 299') ||
    text.includes('แพ็ค 299') ||
    text === '299' ||
    text.includes('ซื้อ 299')
  ) {
    return Intent.BUY_PACKAGE_279;
  }

  if (
    text.includes('ซื้อแพ็ค 199') ||
    text.includes('แพ็ค 199') ||
    text === '199' ||
    text.includes('ซื้อ 199') ||
    text.includes('ซื้อแพ็ค 99') ||
    text.includes('แพ็ค 99') ||
    text === '99' ||
    text.includes('ซื้อ 99')
  ) {
    return Intent.BUY_PACKAGE_199;
  }

  // Draft edit commands (customer/items) => route to EDIT handler
  // รองรับ:
  // - ลูกค้า (FIX A2: allow single keyword)
  // - ลูกค้า บลู
  // - เพิ่มรายการ ค่าออกแบบ 30000
  // - เพิ่มรายการ ค่าออกแบบ|30000
  // - เพิ่มรายการ ค่าออกแบบ 1 30000 (ถ้าจะขยายทีหลัง)
  // - ลบรายการ <ชื่อ/ลำดับ>
  if (
    /^ลูกค้า(?:\s+.+)?$/i.test(text) ||  // FIX A2: Allow "ลูกค้า" alone or with text
    /^เพิ่มรายการ(?:\s+.+)?$/i.test(text) ||
    /^ลบรายการ(?:\s+.+)?$/i.test(text) ||
    /^แก้ไขรายการ(?:\s+.+)?$/i.test(text)
  ) {
    return Intent.EDIT;
  }

  // Package report (must be before general report)
  if (
    text.includes('รายงานแพ็ก') ||
    text.includes('รายงานเครดิต') ||
    text.includes('credit report')
  ) {
    return Intent.CREDIT_REPORT;
  }

  // Report shortcuts (accept menu labels without "รายงาน")
  if (/^(บริการขายดี|ลูกค้ายอดสูง|บิลค้าง)$/i.test(text)) {
    return Intent.REPORT;
  }

  // Tax commands (must be before generic report)
  if (
    /สรุปภาษี|ภาษี\s*เดือน|vat\s*summary|vat/i.test(text)
  ) {
    return Intent.TAX_VAT_SUMMARY;
  }

  if (
    /หัก\s*ณ\s*ที่จ่าย|สรุปหัก|wht|ภงด\s*3|ภงด\s*53/i.test(text)
  ) {
    return Intent.TAX_WHT_SUMMARY;
  }

  if (/ภาษีค้าง|ภาษีต้องจ่าย|ค้างภาษี/i.test(text)) {
    return Intent.TAX_STATUS;
  }

  if (/ออกหนังสือรับรองหัก|50\s*ทวิ|หนังสือรับรองหัก\s*ณ\s*ที่จ่าย/i.test(text)) {
    return Intent.TAX_CERTIFICATE;
  }

  if (/สรุปภาษีทั้งปี|ภาษีทั้งปี|รายงานภาษีทั้งปี/i.test(text)) {
    return Intent.TAX_ANNUAL;
  }

  if (/เปิดเตือนภาษี|เตือนภาษี/i.test(text)) {
    return Intent.TAX_REMINDER_ON;
  }

  if (/ตรวจภาษี|เช็คภาษี/i.test(text)) {
    return Intent.TAX_AUDIT;
  }

  // Reports
  if (
    text.includes('รายงาน') ||
    text.includes('report') ||
    text.includes('สรุป') ||
    text.includes('ยอด')
  ) {
    return Intent.REPORT;
  }

  // ✅ FIX 5: Delivery retry commands
  if (
    text.includes('ส่งเอกสารอีกครั้ง') ||
    text.includes('ส่งอีกครั้ง') ||
    text.includes('send again') ||
    text.includes('resend')
  ) {
    return Intent.RESEND_DOCUMENT;
  }

  if (
    text.includes('ขอลิงก์เอกสาร') ||
    text.includes('ลิงก์เอกสาร') ||
    text.includes('get link') ||
    text.includes('get document link')
  ) {
    return Intent.GET_DOCUMENT_LINK;
  }

  // ✅ FIX 7: Resume command
  if (
    text.includes('resume') ||
    text.includes('resume draft') ||
    text.includes('ทำต่อ') ||
    text.includes('กลับมาทำต่อ')
  ) {
    return Intent.EDIT; // Route to EDIT handler which can check for draft
  }

  // ✅ FIX 1: Payment status commands
  if (
    text.includes('ตรวจสอบสถานะการชำระเงิน') ||
    text.includes('สถานะการชำระ') ||
    text.includes('เช็คสถานะชำระ') ||
    text.includes('payment status')
  ) {
    return Intent.CHECK_PAYMENT_STATUS;
  }

  if (
    text.includes('ส่งสลิปใหม่') ||
    text.includes('ส่งสลิปอีกครั้ง') ||
    text.includes('resend slip')
  ) {
    return Intent.RESEND_SLIP;
  }

  if (
    text.includes('ยกเลิกการชำระเงิน') ||
    text.includes('ยกเลิกชำระ') ||
    text.includes('cancel payment')
  ) {
    return Intent.CANCEL_PAYMENT;
  }

  // Request PDF
  if (
    text.includes('ขอ pdf') ||
    text.includes('ขอไฟล์') ||
    text.includes('ขอเอกสาร') ||
    text.includes('pdf ')
  ) {
    return Intent.REQUEST_PDF;
  }

  // Business setup checklist (standalone "ตั้งค่าธุรกิจ")
  if (
    text === 'ตั้งค่าธุรกิจ' ||
    text === 'เช็คข้อมูลธุรกิจ' ||
    text === 'ข้อมูลธุรกิจ'
  ) {
    return Intent.BUSINESS_SETUP;
  }

  // Settings commands (with specific field)
  if (
    /^ตั้งค่าธุรกิจ\s+.+/i.test(text) ||
    text.includes('ตั้งค่าพร้อมเพย์') ||
    text.includes('ตั้งค่าธนาคาร') ||
    text.includes('ที่อยู่ธุรกิจ') ||
    text.includes('เลขผู้เสียภาษี') ||
    text.includes('ตั้งลายเซ็น') ||
    text.includes('ตั้งตราประทับ') ||
    text.includes('ตั้งผู้ลงนาม') ||
    text.includes('เงื่อนไขใบเสนอราคา') ||
    text.includes('เงื่อนไขใบวางบิล') ||
    text.includes('เงื่อนไขใบเสร็จ') ||
    /^ชื่อธุรกิจ\s+/i.test(text) ||
    /^ที่อยู่\s+/i.test(text) ||
    /^โทร\s+/i.test(text) ||
    /^อีเมล\s+/i.test(text) ||
    /^ลายเซ็น\s+/i.test(text) ||
    /^ตราประทับ\s+/i.test(text) ||
    /^ผู้ลงนาม\s+/i.test(text)
  ) {
    return Intent.SETTINGS;
  }

  // Usage guide - "วิธีใช้งาน" / "วิธีใช้"
  if (
    text.includes('วิธีใช้งาน') ||
    text.includes('วิธีใช้') ||
    text.includes('how to use') ||
    text === 'วิธี' ||
    text === 'สอนใช้'
  ) {
    return Intent.USAGE_GUIDE;
  }

  // Help - "ช่วยเหลือ" / "help"
  if (
    text.includes('ช่วยเหลือ') ||
    text.includes('help') ||
    text === 'คำสั่ง' ||
    text === 'menu' ||
    text === 'เมนู'
  ) {
    return Intent.HELP;
  }

  // Link account - "เชื่อมต่อ" / "เชื่อมต่อบัญชี"
  if (
    text === 'เชื่อมต่อ' ||
    text.includes('เชื่อมต่อบัญชี') ||
    text.includes('เชื่อมต่อ account') ||
    text === 'link'
  ) {
    return Intent.LINK_ACCOUNT;
  }

  // Package invoice - "ขอใบกำกับภาษีแพ็ก"
  if (
    text.includes('ใบกำกับภาษีแพ็ก') ||
    text.includes('ใบกำกับภาษีเครดิต') ||
    text.includes('ใบกำกับเครดิต')
  ) {
    return Intent.CREDIT_INVOICE;
  }

  // Image label keywords (after image upload)
  if (
    text === 'โลโก้' ||
    text === 'logo' ||
    text === 'ลายเซ็น' ||
    text === 'signature' ||
    text === 'ตราประทับ' ||
    text === 'stamp'
  ) {
    return Intent.IMAGE_LABEL;
  }

  // ✅ PAYMENT CLAIM: User says they already paid / asks why still free
  // CRITICAL: Must be before UNKNOWN to prevent misrouting to forgiving parser
  if (
    /(จ่าย|โอน|ชำระ)(ซื้อ|เงิน|ค่า)?.*แล้ว/i.test(text) ||
    /(จ่าย|โอน|ชำระ).*(ไปแล้ว|เรียบร้อย|เมื่อ|ตอน|วันที่)/i.test(text) ||
    /^(อ้าว|เอ๊ะ|เห้ย|แล้ว|ก็).*(จ่าย|โอน|ชำระ)/i.test(text) ||
    /(ซื้อ|สมัคร)(ไป)?แล้ว.*(ทำไม|นะ|แต่|แล้ว)/i.test(text) ||
    /ทำไม.*(ฟรี|free|ไม่ขึ้น|ไม่อัพเกรด|ไม่เปลี่ยน|ยังเหมือนเดิม)/i.test(text)
  ) {
    return Intent.PAYMENT_CLAIM;
  }

  return Intent.UNKNOWN;
}

// ============================================================================
// CONVERSATIONAL DOCUMENT CREATION (NEW)
// ============================================================================

export interface ConversationalResponse {
  success: boolean;
  message: string;
  draft?: ConversationalDraft;
  summary?: string;
  nextCommands?: string[];
  error?: string;
}

/**
 * Process conversational command for document creation
 * Main entry point for natural language document editing
 */
export async function processConversationalCommand(
  userId: string,
  businessId: string,
  message: string
): Promise<ConversationalResponse> {
  try {
    // Check for active draft first (needed for flex pattern context)
    let draft = await draftManager.getActiveDraft(userId);
    const hasActiveDraft = !!draft;
    
    // Parse command with context
    const command = parseCommand(message, { hasActiveDraft });

    // Handle HELP / MENU
    if (command.type === CommandType.HELP || command.type === CommandType.MENU) {
      return {
        success: true,
        message: getHelpText(),
        nextCommands: ['ทำใบเสนอราคา', 'ทำใบวางบิล', 'ทำใบเสร็จ'],
      };
    }

    // Handle TEMPLATE
    if (command.type === CommandType.TEMPLATE) {
      const { getCopyEditTemplate } = await import('../services/uxCopy');
      return {
        success: true,
        message: getCopyEditTemplate(),
        nextCommands: ['ออกเอกสาร', 'แก้ไข'],
      };
    }

    // Handle UNKNOWN
    if (command.type === CommandType.UNKNOWN) {
      return {
        success: false,
        message: 'โอ๊ะ! ด๊อกๆ ยังไม่เข้าใจคำสั่งนี้นะครับเจ้านาย',
        error: 'UNKNOWN_COMMAND',
      };
    }

    // START_DOC - Create new draft
    if (command.type === CommandType.START_DOC) {
      const docType = command.payload!.docType as DocumentType;
      draft = await draftManager.createDraft(userId, businessId, docType);

      const docTypeText =
        docType === DocumentType.QUOTATION
          ? 'ใบเสนอราคา'
          : docType === DocumentType.INVOICE
            ? 'ใบวางบิล'
            : 'ใบเสร็จ';

      return {
        success: true,
        message: `บี๊บ! เริ่มทำ${docTypeText}ให้แล้วครับเจ้านาย`,
        draft,
        ...formatResponse('', draft, true, true),
      };
    }

    // All other commands require existing draft
    if (!draft) {
      return {
        success: false,
        message: formatError('NO_DRAFT'),
        nextCommands: ['เริ่ม ใบเสนอราคา', 'เริ่ม ใบวางบิล', 'เริ่ม ใบเสร็จ'],
      };
    }

    // Handle different command types
    switch (command.type) {
      case CommandType.SET_CUSTOMER:
        // Validate payload
        if (!command.payload || !command.payload.name || typeof command.payload.name !== 'string' || command.payload.name.trim().length === 0) {
          return {
            success: false,
            message: 'โอ๊ะ! ยังไม่เห็นชื่อลูกค้านะครับ\n\nตัวอย่าง: ลูกค้า บริษัท ABC จำกัด',
            draft: draft!,
            ...formatResponse('', draft!, true, true),
          };
        }
        
        await draftManager.setCustomer(draft.draftId, command.payload.name.trim());
        draft = await draftManager.getDraft(draft.draftId);
        return {
          success: true,
          message: `ติ๊ดๆ ตั้งชื่อลูกค้าแล้วครับ ${command.payload.name.trim()}`,
          draft: draft!,
          ...formatResponse('', draft!, true, true),
        };

      case CommandType.ADD_ITEM:
        // CRITICAL: Validate payload before mutating state
        if (!command.payload || command.payload._invalid) {
          const errorMsg = command.payload?._error || 'ยังขาดชื่อรายการหรือราคาอยู่';
          return {
            success: false,
            message: `โอ๊ะ! ${errorMsg}\n\nตัวอย่างครับ\nเพิ่มรายการ ค่าก่ออิฐ 30000\nเพิ่มรายการ ค่าแรง 2 x 5000`,
            draft: draft!,
            ...formatResponse('', draft!, true, true),
          };
        }
        
        // Validate required fields
        if (!command.payload.name || typeof command.payload.name !== 'string' || command.payload.name.trim().length === 0) {
          return {
            success: false,
            message: 'โอ๊ะ! ยังไม่เห็นชื่อรายการนะครับ\n\nตัวอย่าง: เพิ่มรายการ ค่าก่ออิฐ 30000',
            draft: draft!,
            ...formatResponse('', draft!, true, true),
          };
        }
        
        if (command.payload.unitPrice === undefined || command.payload.unitPrice === null || isNaN(command.payload.unitPrice) || command.payload.unitPrice <= 0) {
          return {
            success: false,
            message: 'โอ๊ะ! ราคายังไม่ถูกต้องนะครับ\n\nตัวอย่าง: เพิ่มรายการ ค่าก่ออิฐ 30000',
            draft: draft!,
            ...formatResponse('', draft!, true, true),
          };
        }
        
        if (command.payload.qty === undefined || command.payload.qty === null || isNaN(command.payload.qty) || command.payload.qty <= 0) {
          return {
            success: false,
            message: 'โอ๊ะ! จำนวนยังไม่ถูกต้องนะครับ\n\nตัวอย่าง: เพิ่มรายการ ค่าแรง 2 x 5000',
            draft: draft!,
            ...formatResponse('', draft!, true, true),
          };
        }
        
        // All validations passed - proceed with mutation
        await draftManager.addItem(
          draft.draftId,
          command.payload.name.trim(),
          command.payload.qty,
          command.payload.unitPrice
        );
        draft = await draftManager.getDraft(draft.draftId);
        return {
          success: true,
          message: `ติ๊ดๆ เพิ่มรายการแล้วครับ ${command.payload.name.trim()}`,
          draft: draft!,
          ...formatResponse('', draft!, true, true),
        };

      case CommandType.UPDATE_ITEM:
        // CRITICAL: Validate payload before mutating state
        if (!command.payload || command.payload._invalid) {
          const errorMsg = command.payload?._error || 'ยังขาดชื่อรายการหรือราคาอยู่';
          return {
            success: false,
            message: `โอ๊ะ! ${errorMsg}\n\nตัวอย่างครับ\nแก้ ค่าก่ออิฐ 35000\nแก้ ค่าแรง 2 x 5000`,
            draft: draft!,
            ...formatResponse('', draft!, true, true),
          };
        }
        
        // Validate required fields
        if (!command.payload.name || typeof command.payload.name !== 'string' || command.payload.name.trim().length === 0) {
          return {
            success: false,
            message: 'โอ๊ะ! ยังไม่เห็นชื่อรายการที่จะแก้ไขนะครับ\n\nตัวอย่าง: แก้ ค่าก่ออิฐ 35000',
            draft: draft!,
            ...formatResponse('', draft!, true, true),
          };
        }
        
        if (command.payload.unitPrice !== undefined && (isNaN(command.payload.unitPrice) || command.payload.unitPrice <= 0)) {
          return {
            success: false,
            message: 'โอ๊ะ! ราคายังไม่ถูกต้องนะครับ\n\nตัวอย่าง: แก้ ค่าก่ออิฐ 35000',
            draft: draft!,
            ...formatResponse('', draft!, true, true),
          };
        }
        
        // All validations passed - proceed with mutation
        await draftManager.updateItem(
          draft.draftId,
          command.payload.name.trim(),
          command.payload.qty,
          command.payload.unitPrice
        );
        draft = await draftManager.getDraft(draft.draftId);
        return {
          success: true,
          message: `ติ๊ดๆ แก้ไขรายการแล้วครับ ${command.payload.name.trim()}`,
          draft: draft!,
          ...formatResponse('', draft!, true, true),
        };

      case CommandType.REMOVE_ITEM:
        // CRITICAL: Validate payload before mutating state
        if (!command.payload || command.payload._invalid) {
          const errorMsg = command.payload?._error || 'ยังไม่เห็นชื่อรายการที่จะลบ';
          return {
            success: false,
            message: `โอ๊ะ! ${errorMsg}\n\nตัวอย่าง: ลบ ค่าก่ออิฐ`,
            draft: draft!,
            ...formatResponse('', draft!, true, true),
          };
        }
        
        // Validate required fields
        if (!command.payload.name || typeof command.payload.name !== 'string' || command.payload.name.trim().length === 0) {
          return {
            success: false,
            message: 'โอ๊ะ! ยังไม่เห็นชื่อรายการที่ต้องการลบนะครับ\n\nตัวอย่าง: ลบ ค่าก่ออิฐ',
            draft: draft!,
            ...formatResponse('', draft!, true, true),
          };
        }
        
        // All validations passed - proceed with mutation
        await draftManager.removeItem(draft.draftId, command.payload.name.trim());
        draft = await draftManager.getDraft(draft.draftId);
        return {
          success: true,
          message: `ติ๊ดๆ ลบรายการแล้วครับ ${command.payload.name.trim()}`,
          draft: draft!,
          ...formatResponse('', draft!, true, true),
        };

      case CommandType.SET_DISCOUNT: {
        await draftManager.setDiscount(
          draft.draftId,
          command.payload!.type,
          command.payload!.value
        );
        draft = await draftManager.getDraft(draft.draftId);
        const discountText =
          command.payload!.type === 'PERCENT'
            ? `${command.payload!.value}%`
            : `${command.payload!.value} บาท`;
        return {
          success: true,
          message: `ติ๊ดๆ ตั้งส่วนลดแล้วครับ ${discountText}`,
          draft: draft!,
          ...formatResponse('', draft!, true, true),
        };
      }

      case CommandType.SET_VAT:
        await draftManager.setVAT(draft.draftId, command.payload!.rate);
        draft = await draftManager.getDraft(draft.draftId);
        return {
          success: true,
          message: `ติ๊ดๆ ตั้ง VAT แล้วครับ ${command.payload!.rate}%`,
          draft: draft!,
          ...formatResponse('', draft!, true, true),
        };

      case CommandType.SET_DUE_DATE:
        await draftManager.setDueDate(draft.draftId, command.payload!.date);
        draft = await draftManager.getDraft(draft.draftId);
        return {
          success: true,
          message: `ติ๊ดๆ ตั้งกำหนดชำระแล้วครับ ${command.payload!.date}`,
          draft: draft!,
          ...formatResponse('', draft!, true, true),
        };

      case CommandType.CONFIRM_STEP1: {
        // Validate before confirm
        const errors = validateDraft(draft, draft.docType);

        // Check for missing customer
        if (!draft.customerName || draft.customerName.trim() === '') {
          return {
            success: false,
            message: 'โอ๊ะ! ยังไม่มีชื่อลูกค้านะครับเจ้านาย\n\nตัวอย่าง: ลูกค้า บริษัท ABC จำกัด',
            draft,
            ...formatResponse('', draft, true, true),
            error: 'VALIDATION_FAILED',
          };
        }

        // Check for zero items
        if (!draft.items || draft.items.length === 0) {
          return {
            success: false,
            message: 'โอ๊ะ! ยังไม่มีรายการนะครับ\n\nตัวอย่าง: เพิ่มรายการ ค่าก่ออิฐ 30000',
            draft,
            ...formatResponse('', draft, true, true),
            error: 'VALIDATION_FAILED',
          };
        }

        // Check for WB-specific dueDate
        if (draft.docType === DocumentType.INVOICE && !draft.dueDate) {
          return {
            success: false,
            message: formatError('MISSING_DUE_DATE'),
            draft,
            ...formatResponse('⚠️ ใบวางบิลต้องระบุวันครบกำหนด', draft, true, true),
          };
        }

        if (errors.length > 0) {
          const errorMessages = errors.map((e, i) => `${i + 1}. ${e.message}`).join('\n');
          return {
            success: false,
            message: `โอ๊ะ! ยังมีข้อมูลต้องแก้ไขนิดนึงครับ\n${errorMessages}`,
            draft,
            ...formatResponse('', draft, true, true),
            error: 'VALIDATION_FAILED',
          };
        }

        // Move to PENDING_CONFIRM
        await draftManager.moveToPendingConfirm(draft.draftId);
        draft = await draftManager.getDraft(draft.draftId);

        return {
          success: true,
          message: formatConfirmationSummary(draft!),
          draft: draft!,
          nextCommands: ['ยืนยันอีกครั้ง', 'แก้ไข', 'ยกเลิก'],
        };
      }

      case CommandType.CONFIRM_STEP2:
        // Check status
        if (draft.status !== 'PENDING_CONFIRM') {
          return {
            success: false,
            message: 'โอ๊ะ! ยังไม่ได้ยืนยันรอบแรกนะครับเจ้านาย',
            draft,
            nextCommands: ['ยืนยัน'],
          };
        }

        // Lock draft
        await draftManager.confirmDraft(draft.draftId);
        draft = await draftManager.getDraft(draft.draftId);

        return {
          success: true,
          message: 'บี๊บ! ยืนยันแล้วครับ กำลังสร้างเอกสารให้เจ้านาย...',
          draft: draft!,
          nextCommands: [],
        };

      case CommandType.CANCEL:
        await draftManager.deleteDraft(draft.draftId);
        return {
          success: true,
          message: 'ติ๊ดๆ ยกเลิกเอกสารแล้วครับเจ้านาย',
          nextCommands: ['เริ่ม ใบเสนอราคา', 'เริ่ม ใบวางบิล', 'เริ่ม ใบเสร็จ'],
        };

      case CommandType.RESET:
        await draftManager.deleteDraft(draft.draftId);
        return {
          success: true,
          message: 'ติ๊ดๆ เริ่มใหม่แล้วครับเจ้านาย',
          nextCommands: ['เริ่ม ใบเสนอราคา', 'เริ่ม ใบวางบิล', 'เริ่ม ใบเสร็จ'],
        };

      default:
        return {
          success: false,
          message: 'โอ๊ะ! คำสั่งนี้ยังไม่พร้อมนะครับเจ้านาย',
          draft,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `โอ๊ะ! มีข้อผิดพลาดครับเจ้านาย\nลองใหม่อีกครั้งได้เลยนะ`,
      error: error.message,
    };
  }
}

// ============================================================================
// EXPORT ALL TYPES & FUNCTIONS
// ============================================================================
