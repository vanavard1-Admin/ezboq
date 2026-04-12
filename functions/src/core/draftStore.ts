import { Timestamp } from 'firebase-admin/firestore';
import { DraftDocType } from '../shared/schemas';
import { getDb } from './firebaseAdmin';

/**
 * Draft document structure for LINE-based document creation.
 * Stores temporary state while user builds document via conversation.
 */
export interface LineDraft {
  firebaseUid?: string;  // Firebase UID (not LINE user ID)
  businessId?: string;
  docType: DraftDocType;
  priceType?: 'ITEMIZED' | 'LUMP_SUM';
  lumpSumAmount?: number;
  scopeOfWork?: string[];
  paymentMilestones?: Array<{
    label?: string | null;
    percent?: number | null;
    amount?: number | null;
    note?: string | null;
  }>;
  customerName?: string;
  customerId?: string | null;
  customerLegalName?: string;
  customerBranch?: string;
  customerAddress?: string;
  customerContactName?: string;
  customerTaxId?: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    description?: string;
  }>;
  notes?: string;
  discountType?: 'AMOUNT' | 'PERCENT';
  discountValue?: number;
  discountAmount?: number;
  subtotal: number;
  vat?: number;
  wht?: number;
  total: number;
  createdAt?: Timestamp | number;
  updatedAt?: Timestamp | number;
  expiresAt?: Timestamp;
  status?: 'editing' | 'pending_confirmation' | 'confirmed';
  // Source document link (for QUO → INV → RECEIPT chain)
  source_doc_type?: 'QUO' | 'BILL' | null;
  source_doc_id?: string | null;
  source_doc_no?: string | null;
  // Installment info (for multi-installment billing)
  installment_no?: number | null;
  installment_total?: number | null;
  installment_remaining?: number | null;
  installment_issued_total?: number | null;
  // Locked fields (cannot be edited by user)
  locked_fields?: string[];
}

// In-memory cache (per instance) to reduce hot-path reads.
const DRAFT_CACHE_TTL_MS = 8000; // short TTL to avoid stale data
type DraftCacheEntry = { draft: LineDraft; cachedAt: number };
const draftCache = new Map<string, DraftCacheEntry>();

const getCachedDraft = (uid: string): LineDraft | null => {
  const entry = draftCache.get(uid);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > DRAFT_CACHE_TTL_MS) {
    draftCache.delete(uid);
    return null;
  }
  return entry.draft;
};

const setCachedDraft = (uid: string, draft: LineDraft): void => {
  draftCache.set(uid, { draft, cachedAt: Date.now() });
};

const clearCachedDraft = (uid: string): void => {
  draftCache.delete(uid);
};

/**
 * Get or create draft for user
 * @param uid Firebase UID (not LINE user ID)
 */
export async function getOrCreateDraft(
  uid: string,
  businessId: string,
  docType: 'QUO' | 'BILL' | 'RECEIPT'
): Promise<LineDraft> {
  const db = getDb();
  const draftRef = db.collection('line_drafts').doc(uid);
  const snap = await draftRef.get();

  if (snap.exists) {
    const draft = snap.data() as LineDraft;
    const now = Date.now();
    const expiresAt = (draft.expiresAt as Timestamp).toMillis() || 0;

    if (expiresAt > now && draft.docType === docType) {
      console.log(`[draftStore] Reusing existing draft for ${uid}`);
      setCachedDraft(uid, draft);
      return draft;
    }

    if (expiresAt <= now) {
      console.log(`[draftStore] Draft expired, deleting for ${uid}`);
      await draftRef.delete();
    }
  }

  const now = Timestamp.now();
  const newDraft: LineDraft = {
    firebaseUid: uid,
    businessId,
    docType,
    priceType: 'ITEMIZED',
    items: [],
    subtotal: 0,
    total: 0,
    createdAt: now,
    updatedAt: now,
    expiresAt: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
    status: 'editing',
  };

  await draftRef.set(newDraft);
  console.log(`[DRAFT_CREATED] 📝 uid=${uid}, business=${businessId}, docType=${docType}`);
  setCachedDraft(uid, newDraft);
  return newDraft;
}

/**
 * Update draft with partial fields
 * @param uid Firebase UID (not LINE user ID)
 */
export async function updateDraft(
  uid: string,
  patch: Partial<LineDraft>
): Promise<LineDraft> {
  return updateDraftWithTransaction(uid, () => patch);
}

/**
 * Check duplicate input within a short window and update lastInputHash/lastInputAt
 * Returns true if duplicate should be skipped.
 */

/**
 * Fetch draft for user
 * @param uid Firebase UID (not LINE user ID)
 */
export async function getDraft(uid: string): Promise<LineDraft | null> {
  const cached = getCachedDraft(uid);
  if (cached) {
    const expiresAt = (cached.expiresAt as Timestamp).toMillis() || 0;
    if (expiresAt > Date.now()) {
      return cached;
    }
    clearCachedDraft(uid);
  }

  const db = getDb();
  const snap = await db.collection('line_drafts').doc(uid).get();

  if (!snap.exists) {
    return null;
  }

  const draft = snap.data() as LineDraft;
  const now = Date.now();
  const expiresAt = (draft.expiresAt as Timestamp).toMillis() || 0;

  if (expiresAt <= now) {
    console.log(`[draftStore] Draft expired for ${uid}, cleaning up`);
    await db.collection('line_drafts').doc(uid).delete();
    clearCachedDraft(uid);
    return null;
  }

  setCachedDraft(uid, draft);
  return draft;
}

/**
 * Clear draft for user
 * @param uid Firebase UID (not LINE user ID)
 */
export async function clearDraft(uid: string): Promise<void> {
  const db = getDb();
  await db.collection('line_drafts').doc(uid).delete();
  clearCachedDraft(uid);
  console.log(`[draftStore] Cleared draft for ${uid}`);
}

/**
 * Format draft for display in LINE message
 */
export function formatDraftForDisplay(draft: LineDraft): string {
  const typeLabels: Record<string, string> = {
    QUO: '📋 ใบเสนอราคา',
    BILL: '📄 ใบวางบิล',
    RECEIPT: '✅ ใบเสร็จรับเงิน',
    CN: '📑 ใบลดหนี้',
    DN: '📑 ใบเพิ่มหนี้',
  };
  const typeLabel = typeLabels[draft.docType] || '📄 เอกสาร';

  const isLumpSum = draft.priceType === 'LUMP_SUM' && (draft.lumpSumAmount || 0) > 0;
  const itemsText = isLumpSum
    ? [
        `ราคาเหมารวม: ${(draft.lumpSumAmount || 0).toLocaleString('th-TH')}฿`,
        draft.scopeOfWork && draft.scopeOfWork.length > 0
          ? `รายละเอียดงาน:\n${draft.scopeOfWork.map((line) => `- ${line}`).join('\n')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n')
    : draft.items
        .map((item, i) => `${i + 1}. ${item.name} x${item.qty} @ ${item.price}฿ = ${item.qty * item.price}฿`)
        .join('\n');

  const totalsText = [
    `รวม: ${draft.subtotal.toLocaleString('th-TH')}฿`,
    draft.discountAmount ? `ส่วนลด: -${draft.discountAmount.toLocaleString('th-TH')}฿` : null,
    draft.vat ? `VAT: +${draft.vat.toLocaleString('th-TH')}฿` : null,
    draft.wht ? `WHT: -${draft.wht.toLocaleString('th-TH')}฿` : null,
    `รวมสุทธิ: ${draft.total.toLocaleString('th-TH')}฿`,
  ]
    .filter(Boolean)
    .join('\n');

  const customerPrimary = draft.customerLegalName || draft.customerName || '';
  const contactLine = draft.customerContactName
    ? `ผู้ติดต่อ: ${draft.customerContactName}`
    : null;
  const customerText = customerPrimary
    ? `ลูกค้า: ${customerPrimary}${contactLine ? `\n${contactLine}` : ''}`
    : 'ยังไม่ได้เลือกลูกค้า';

  const fallbackText = isLumpSum ? 'ยังไม่มีราคางาน' : 'ยังไม่มีรายการ';
  const notesText = String(draft.notes || '').trim();
  const notesBlock = notesText ? `\n\n📝 หมายเหตุ: ${notesText}` : '';
  return `${typeLabel}\n${customerText}\n\n${itemsText || fallbackText}\n\n${totalsText}${notesBlock}`;
}

/**
 * Transaction-safe draft edit: read-modify-write
 * @param uid Firebase UID (not LINE user ID)
 */
export async function updateDraftWithTransaction(
  uid: string,
  updater: (draft: LineDraft) => Partial<LineDraft>
): Promise<LineDraft> {
  const db = getDb();
  const draftRef = db.collection('line_drafts').doc(uid);

  return await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(draftRef);

    if (!snap.exists) {
      throw new Error(`Draft not found for ${uid}`);
    }

    const draft = snap.data() as LineDraft;
    const now = Date.now();
    const expiresAt = (draft.expiresAt as Timestamp).toMillis() || 0;

    if (expiresAt <= now) {
      throw new Error('Draft expired');
    }

    const patch = updater(draft);
    const updated = { ...draft, ...patch, updatedAt: Timestamp.now() };

    const nextPriceType = patch.priceType ?? updated.priceType ?? draft.priceType;
    const nextLumpSum = patch.lumpSumAmount ?? updated.lumpSumAmount ?? draft.lumpSumAmount;
    if (nextPriceType === 'LUMP_SUM' && Number.isFinite(Number(nextLumpSum)) && Number(nextLumpSum) > 0) {
      const nextVat = patch.vat ?? updated.vat;
      const nextWht = patch.wht ?? updated.wht;
      const nextDiscount = patch.discountAmount ?? updated.discountAmount;
      updated.subtotal = Number(nextLumpSum);
      updated.total = calculateTotal(updated.subtotal, nextDiscount, nextVat, nextWht);
    } else if (patch.items || patch.vat !== undefined || patch.wht !== undefined || patch.discountAmount !== undefined) {
      const itemsToCalculate = patch.items || draft.items;
      const nextVat = patch.vat ?? updated.vat;
      const nextWht = patch.wht ?? updated.wht;
      const nextDiscount = patch.discountAmount ?? updated.discountAmount;
      updated.subtotal = calculateSubtotal(itemsToCalculate);
      updated.total = calculateTotal(updated.subtotal, nextDiscount, nextVat, nextWht);
    }

    transaction.set(draftRef, updated);
    setCachedDraft(uid, updated);
    return updated;
  });
}

/**
 * Lock draft during confirmation
 * @param uid Firebase UID (not LINE user ID)
 */
export async function lockDraftForConfirm(uid: string): Promise<LineDraft> {
  const db = getDb();
  const draftRef = db.collection('line_drafts').doc(uid);

  return await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(draftRef);

    if (!snap.exists) {
      throw new Error('Draft not found');
    }

    const draft = snap.data() as LineDraft;

    if (draft.status === 'pending_confirmation') {
      throw new Error('Draft already being confirmed');
    }

    transaction.update(draftRef, {
      status: 'pending_confirmation',
      updatedAt: Timestamp.now(),
    });

    return draft;
  });
}

/**
 * Helper: Calculate subtotal
 */
function calculateSubtotal(items: LineDraft['items']): number {
  return items.reduce((sum, item) => sum + item.qty * item.price, 0);
}

/**
 * Helper: Calculate total
 */
function calculateTotal(subtotal: number, discountAmount?: number, vat?: number, wht?: number): number {
  const discount = Math.max(0, discountAmount || 0);
  let total = Math.max(0, subtotal - discount);
  if (vat) total += vat;
  if (wht) total -= wht;
  return Math.max(0, total);
}
