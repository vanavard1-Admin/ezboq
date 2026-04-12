import { getDb } from './firebaseAdmin';
/**
 * Draft Manager
 * 
 * Handles CRUD operations for conversational drafts in Firestore
 * Collection: drafts/{draftId}
 */

import { Timestamp } from 'firebase-admin/firestore';
import {
  DocumentType,
  DraftItem,
  DraftData,
} from './conversationOrchestrator';

// ============================================================================
// DRAFT STATE (extends existing DraftData)
// ============================================================================

export interface ConversationalDraft extends Omit<DraftData, 'items'> {
  // Core fields
  draftId: string;
  userId: string;
  businessId: string;
  docType: DocumentType;

  // Conversational state
  status: 'DRAFT' | 'PENDING_CONFIRM' | 'CONFIRMED' | 'EXPORTED';

  // Customer
  customerName: string;
  customerTaxId?: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerLegalName?: string;
  customerBranch?: string;
  customerContactName?: string;

  // Items
  items: DraftItem[];

  // Discount
  discountType?: 'AMOUNT' | 'PERCENT';
  discountValue?: number;
  discountAmount: number;

  // Calculations
  subTotal: number;
  vatPercent: number;
  vatAmount: number;
  whtPercent: number;
  whtAmount: number;
  totalAmount: number;
  netReceiveAmount: number;

  // Additional fields
  dueDate?: string;
  issueDate?: string;

  // Payment (for receipts)
  paymentDate?: Timestamp;
  paymentMethod?: string;
  referenceNo?: string;

  // Source document
  sourceDocId?: string;

  // Paste-to-edit support
  lastSummaryText?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}

// ============================================================================
// COLLECTION REFERENCE
// ============================================================================

const DRAFTS_COLLECTION = 'drafts';
const DRAFT_TTL_DAYS = 7;

function getDraftsCollection() {
  const db = getDb();
  return db.collection(DRAFTS_COLLECTION);
}

function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// CREATE DRAFT
// ============================================================================

export async function createDraft(
  userId: string,
  businessId: string,
  docType: DocumentType,
  sourceDocId?: string
): Promise<ConversationalDraft> {
  const draftId = generateDraftId();
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(
    now.toMillis() + DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const draft: ConversationalDraft = {
    draftId,
    userId,
    businessId,
    docType,
    status: 'DRAFT',

    // Empty customer (to be filled)
    customerName: '',

    // Empty items
    items: [],

    // Default calculations
    discountAmount: 0,
    subTotal: 0,
    vatPercent: 7, // Default VAT
    vatAmount: 0,
    whtPercent: 0,
    whtAmount: 0,
    totalAmount: 0,
    netReceiveAmount: 0,

    // Optional fields
    sourceDocId,

    // Timestamps
    conversationId: '', // Legacy field
    customerId: undefined, // Legacy field
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  await getDraftsCollection().doc(draftId).set(draft);

  return draft;
}

// ============================================================================
// GET DRAFT
// ============================================================================

export async function getDraft(draftId: string): Promise<ConversationalDraft | null> {
  const doc = await getDraftsCollection().doc(draftId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as ConversationalDraft;
}

/**
 * Get active draft for user (most recent DRAFT or PENDING_CONFIRM)
 */
export async function getActiveDraft(userId: string): Promise<ConversationalDraft | null> {
  const snapshot = await getDraftsCollection()
    .where('userId', '==', userId)
    .where('status', 'in', ['DRAFT', 'PENDING_CONFIRM'])
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data() as ConversationalDraft;
}

// ============================================================================
// UPDATE DRAFT
// ============================================================================

export async function updateDraft(
  draftId: string,
  updates: Partial<ConversationalDraft>
): Promise<void> {
  const updateData = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  await getDraftsCollection().doc(draftId).update(updateData);
}

// ============================================================================
// RECALCULATE TOTALS
// ============================================================================

function recalculateTotals(draft: ConversationalDraft): ConversationalDraft {
  // Calculate item amounts
  draft.items.forEach(item => {
    item.amount = item.quantity * item.unit_price;
  });

  // Calculate subtotal
  const subTotal = draft.items.reduce((sum, item) => sum + item.amount, 0);

  // Calculate discount
  let discountAmount = 0;
  if (draft.discountType === 'AMOUNT' && draft.discountValue) {
    discountAmount = Math.min(draft.discountValue, subTotal);
  } else if (draft.discountType === 'PERCENT' && draft.discountValue) {
    discountAmount = Math.round((subTotal * draft.discountValue) / 100);
  }

  // Calculate tax base
  const taxBase = subTotal - discountAmount;

  // Calculate VAT
  const vatAmount = Math.round((taxBase * draft.vatPercent) / 100);

  // Calculate WHT
  const whtAmount = Math.round((taxBase * draft.whtPercent) / 100);

  // Calculate totals
  const totalAmount = taxBase + vatAmount;
  const netReceiveAmount = totalAmount - whtAmount;

  return {
    ...draft,
    subTotal,
    discountAmount,
    vatAmount,
    whtAmount,
    totalAmount,
    netReceiveAmount,
  };
}

// ============================================================================
// DRAFT OPERATIONS
// ============================================================================

/**
 * Set customer info
 */
export async function setCustomer(
  draftId: string,
  customerName: string,
  customerTaxId?: string,
  customerAddress?: string
): Promise<void> {
  await updateDraft(draftId, {
    customerName,
    customerTaxId,
    customerAddress,
  });
}

/**
 * Add item to draft
 */
export async function addItem(
  draftId: string,
  name: string,
  qty: number,
  unitPrice: number
): Promise<void> {
  const draft = await getDraft(draftId);
  if (!draft) throw new Error('Draft not found');

  const newItem: DraftItem = {
    description_th: name,
    quantity: qty,
    unit_price: unitPrice,
    amount: qty * unitPrice,
  };

  draft.items.push(newItem);

  const updated = recalculateTotals(draft);

  await updateDraft(draftId, {
    items: updated.items,
    subTotal: updated.subTotal,
    discountAmount: updated.discountAmount,
    vatAmount: updated.vatAmount,
    whtAmount: updated.whtAmount,
    totalAmount: updated.totalAmount,
    netReceiveAmount: updated.netReceiveAmount,
  });
}

/**
 * Update item in draft (find by name)
 */
export async function updateItem(
  draftId: string,
  name: string,
  qty?: number,
  unitPrice?: number
): Promise<void> {
  const draft = await getDraft(draftId);
  if (!draft) throw new Error('Draft not found');

  const itemIndex = draft.items.findIndex(
    item => item.description_th.toLowerCase() === name.toLowerCase()
  );

  if (itemIndex === -1) {
    throw new Error(`ไม่พบรายการ "${name}"`);
  }

  if (qty !== undefined) {
    draft.items[itemIndex].quantity = qty;
  }
  if (unitPrice !== undefined) {
    draft.items[itemIndex].unit_price = unitPrice;
  }

  draft.items[itemIndex].amount =
    draft.items[itemIndex].quantity * draft.items[itemIndex].unit_price;

  const updated = recalculateTotals(draft);

  await updateDraft(draftId, {
    items: updated.items,
    subTotal: updated.subTotal,
    discountAmount: updated.discountAmount,
    vatAmount: updated.vatAmount,
    whtAmount: updated.whtAmount,
    totalAmount: updated.totalAmount,
    netReceiveAmount: updated.netReceiveAmount,
  });
}

/**
 * Remove item from draft (find by name)
 */
export async function removeItem(draftId: string, name: string): Promise<void> {
  const draft = await getDraft(draftId);
  if (!draft) throw new Error('Draft not found');

  const itemIndex = draft.items.findIndex(
    item => item.description_th.toLowerCase() === name.toLowerCase()
  );

  if (itemIndex === -1) {
    throw new Error(`ไม่พบรายการ "${name}"`);
  }

  draft.items.splice(itemIndex, 1);

  const updated = recalculateTotals(draft);

  await updateDraft(draftId, {
    items: updated.items,
    subTotal: updated.subTotal,
    discountAmount: updated.discountAmount,
    vatAmount: updated.vatAmount,
    whtAmount: updated.whtAmount,
    totalAmount: updated.totalAmount,
    netReceiveAmount: updated.netReceiveAmount,
  });
}

/**
 * Set discount
 */
export async function setDiscount(
  draftId: string,
  type: 'AMOUNT' | 'PERCENT',
  value: number
): Promise<void> {
  const draft = await getDraft(draftId);
  if (!draft) throw new Error('Draft not found');

  draft.discountType = type;
  draft.discountValue = value;

  const updated = recalculateTotals(draft);

  await updateDraft(draftId, {
    discountType: type,
    discountValue: value,
    discountAmount: updated.discountAmount,
    totalAmount: updated.totalAmount,
    netReceiveAmount: updated.netReceiveAmount,
  });
}

/**
 * Set VAT rate
 */
export async function setVAT(draftId: string, rate: number): Promise<void> {
  const draft = await getDraft(draftId);
  if (!draft) throw new Error('Draft not found');

  draft.vatPercent = rate;

  const updated = recalculateTotals(draft);

  await updateDraft(draftId, {
    vatPercent: rate,
    vatAmount: updated.vatAmount,
    totalAmount: updated.totalAmount,
    netReceiveAmount: updated.netReceiveAmount,
  });
}

/**
 * Set due date (for invoices)
 */
export async function setDueDate(draftId: string, dueDate: string): Promise<void> {
  await updateDraft(draftId, { dueDate });
}

/**
 * Set payment info (for receipts)
 */
export async function setPayment(
  draftId: string,
  paymentDate?: Timestamp,
  paymentMethod?: string,
  referenceNo?: string
): Promise<void> {
  await updateDraft(draftId, {
    paymentDate,
    paymentMethod,
    referenceNo,
  });
}

/**
 * Move draft to PENDING_CONFIRM
 */
export async function moveToPendingConfirm(draftId: string): Promise<void> {
  await updateDraft(draftId, { status: 'PENDING_CONFIRM' });
}

/**
 * Move draft back to DRAFT (from PENDING_CONFIRM)
 */
export async function moveToDraft(draftId: string): Promise<void> {
  await updateDraft(draftId, { status: 'DRAFT' });
}

/**
 * Confirm and lock draft
 */
export async function confirmDraft(draftId: string): Promise<void> {
  await updateDraft(draftId, { status: 'CONFIRMED' });
}

/**
 * Delete draft
 */
export async function deleteDraft(draftId: string): Promise<void> {
  await getDraftsCollection().doc(draftId).delete();
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

export function generateShortSummary(draft: ConversationalDraft): string {
  const docTypeText =
    draft.docType === DocumentType.QUOTATION
      ? 'ใบเสนอราคา'
      : draft.docType === DocumentType.INVOICE
      ? 'ใบวางบิล'
      : 'ใบเสร็จ';

  const customerText = draft.customerName || '(ยังไม่ระบุ)';
  const itemCount = draft.items.length;
  const total = draft.totalAmount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
  });

  return `📄 ${docTypeText}
ลูกค้า: ${customerText}
รายการ: ${itemCount} รายการ
รวมสุทธิ: ${total} บาท`;
}

export function generateFullSummary(draft: ConversationalDraft): string {
  const docTypeText =
    draft.docType === DocumentType.QUOTATION
      ? 'ใบเสนอราคา (QT)'
      : draft.docType === DocumentType.INVOICE
      ? 'ใบวางบิล (WB)'
      : 'ใบเสร็จ (RC)';

  let summary = `📄 สรุป${docTypeText}\n`;
  summary += `ลูกค้า: ${draft.customerName}\n`;

  if (draft.dueDate) {
    summary += `กำหนดชำระ: ${draft.dueDate}\n`;
  }

  summary += `\nรายการ:\n`;
  draft.items.forEach((item, idx) => {
    const amount = item.amount.toLocaleString('th-TH');
    summary += `${idx + 1}) ${item.description_th} | ${item.quantity} | ${amount}\n`;
  });

  summary += `\nยอดรวม: ${draft.subTotal.toLocaleString('th-TH')}\n`;

  if (draft.discountAmount > 0) {
    const discountText =
      draft.discountType === 'PERCENT'
        ? `${draft.discountValue}%`
        : draft.discountAmount.toLocaleString('th-TH');
    summary += `ส่วนลด: ${discountText}\n`;
  }

  summary += `VAT (${draft.vatPercent}%): ${draft.vatAmount.toLocaleString('th-TH')}\n`;
  summary += `รวมสุทธิ: ${draft.totalAmount.toLocaleString('th-TH')}\n`;

  summary += `\nพิมพ์ "ยืนยันอีกครั้ง" เพื่อออกเอกสาร`;

  return summary;
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  createDraft,
  getDraft,
  getActiveDraft,
  updateDraft,
  setCustomer,
  addItem,
  updateItem,
  removeItem,
  setDiscount,
  setVAT,
  setDueDate,
  setPayment,
  moveToPendingConfirm,
  moveToDraft,
  confirmDraft,
  deleteDraft,
  generateShortSummary,
  generateFullSummary,
};
