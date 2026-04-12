import { getDb } from './firebaseAdmin';
// functions/src/core/conversationHandler.ts
// EzDoc - Main conversation handler (5B-0 intent routing)
// Phase 5B-0.1: Quick reply integration
// Phase 5B-1: Payment confirmation integration

import * as admin from "firebase-admin";
import {
  type QuickReplyAction,
} from "../shared/lineQuickReply";
import {
  handlePaymentNotification,
  handlePaymentConfirmation,
} from "./paymentConfirmation";
import { getOrCreateDraft, updateDraft, updateDraftWithTransaction, getDraft, clearDraft, formatDraftForDisplay, type LineDraft } from "./draftStore";
import { buildDraftEditorQuickReply } from "../shared/lineDraftReply";
import {
  DraftToIssuedDocTypeMap,
  UnpaidStatuses,
  DocStatusIssued,
  DocNumberPrefixes,
} from "../shared/schemas";
import { buildPdfFlexMessageWithShortLink } from "../shared/pdfFlexMessage";
import { buildDocumentSnapshots } from "../shared/documentSnapshots";
import type { QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore";
import { getNextDocumentSequence } from './documentNumber';
import { getLineChannelAccessToken, getPdfTemplateVersion } from '../shared/config';

function isLikelyCopyEditBlock(text: string): boolean {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[|｜]/g, '\n');
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);

  const headerRegex = /(ลูกค้า|ชื่อลูกค้า|วันที่|เรื่อง|งาน|รายการ|ประเภทเอกสาร|หมายเหตุ|รายละเอียดงาน|ขอบเขตงาน|งวดเงิน|เงื่อนไขการชำระเงิน|ราคาเหมารวม|มูลค่างาน)/i;
  const headerRegexGlobal = /(ลูกค้า|ชื่อลูกค้า|วันที่|เรื่อง|งาน|รายการ|ประเภทเอกสาร|หมายเหตุ|รายละเอียดงาน|ขอบเขตงาน|งวดเงิน|เงื่อนไขการชำระเงิน|ราคาเหมารวม|มูลค่างาน)/gi;
  const hasHeader = lines.some((l) => headerRegex.test(l));
  const headerHits = (normalized.match(headerRegexGlobal) || []).length;
  const hasBullet = lines.some((l) => /^[•\-*]/.test(l));
  const hasAmountLine = lines.some((l) =>
    /(?:^|\\s)\\d[\\d,]*(?:\\.\\d+)?\\s*(บาท|฿)?\\s*$/.test(l) ||
    (/(ราคา|มูลค่า|รวม|งวด)/.test(l) && /\\d/.test(l))
  );
  const hasDigit = /\d/.test(normalized);

  if (lines.length < 2) {
    return headerHits >= 2 || (headerHits >= 1 && hasDigit);
  }

  return hasHeader || (hasAmountLine && (hasBullet || lines.length >= 3));
}

type NormalizedDocItem = { name: string; qty: number; price: number };

function normalizeDocItem(raw: Record<string, unknown>): NormalizedDocItem {
  const nameCandidate =
    raw.name ??
    raw.description_th ??
    raw.description_en ??
    raw.description ??
    raw.title ??
    raw.item_name ??
    raw.service ??
    '';
  const name = String(nameCandidate || '').trim() || 'รายการ';

  const qtyCandidate = raw.qty ?? raw.quantity ?? raw.count ?? raw.unit_qty ?? 1;
  let qty = Number(qtyCandidate);
  if (!Number.isFinite(qty) || qty <= 0) qty = 1;

  const priceCandidate =
    raw.price ??
    raw.unit_price ??
    raw.unitPrice ??
    raw.rate ??
    raw.unit_cost ??
    raw.unitCost ??
    null;
  let price = Number(priceCandidate);
  if (!Number.isFinite(price) || price <= 0) {
    const amountCandidate =
      raw.amount ??
      raw.total_amount ??
      raw.total ??
      raw.line_total ??
      raw.lineTotal ??
      null;
    const amount = Number(amountCandidate);
    if (Number.isFinite(amount) && amount > 0) {
      price = qty > 0 ? amount / qty : amount;
    } else {
      price = 0;
    }
  }

  return { name, qty, price };
}

function hasChargeableItems(draft: LineDraft): boolean {
  const hasItems = (draft.items || []).length > 0;
  const hasLumpSum = draft.priceType === 'LUMP_SUM' && (draft.lumpSumAmount || 0) > 0;
  return hasItems || hasLumpSum;
}

function buildReceiptDraftFromInvoiceData(
  invData: Record<string, unknown>,
  invDocId: string,
  invNo: string,
  receiptTerms?: string
): LineDraft {
  return {
    docType: "RECEIPT",
    customerName: String(invData.customer_name || (invData.customer_snapshot as any)?.name || ""),
    customerId: (invData.customer_id as string | null) || (invData.customer_snapshot as any)?.id || null,
    items: (invData.items as Array<Record<string, unknown>> || []).map((item) => normalizeDocItem(item)),
    subtotal: Number(invData.subtotal || invData.sub_total_amount || 0) || 0,
    vat: Number(invData.vat || invData.vat_amount || 0) || 0,
    wht: Number(invData.wht || 0) || 0,
    total: Number(invData.total || invData.total_amount || 0) || 0,
    notes: receiptTerms || "",
    // Source document link
    source_doc_type: "BILL",
    source_doc_id: invDocId,
    source_doc_no: invNo,
    // Lock items and customer
    locked_fields: ["items", "customerName", "customerId"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

async function handleAutoChainConfirm(
  userId: string,
  businessId: string,
  draft: LineDraft,
  replyFn: (msg: string, quickReply?: QuickReplyAction[]) => Promise<void>,
  lineUserId?: string
): Promise<boolean> {
  const validateDraftForIssue = async (target: string, draftToCheck: LineDraft): Promise<boolean> => {
    if (!draftToCheck.customerName) {
      await replyFn(
        `โอ๊ะ! ${target} ยังไม่มีชื่อลูกค้า\n` +
        `แก้ข้อมูลให้ครบก่อน แล้วค่อยลอง "ออกครบชุด"`
      );
      return false;
    }
    if (!hasChargeableItems(draftToCheck)) {
      await replyFn(
        `โอ๊ะ! ${target} ยังไม่มีรายการ\n` +
        `เพิ่มรายการก่อน แล้วค่อยลอง "ออกครบชุด"`
      );
      return false;
    }
    if (!draftToCheck.total || draftToCheck.total <= 0) {
      await replyFn(
        `โอ๊ะ! ${target} ยอดรวมเป็น 0 บาท\n` +
        `ตรวจสอบยอดก่อนนะ แล้วลองใหม่`
      );
      return false;
    }
    return true;
  };

  if (draft.docType !== "BILL") {
    await replyFn(
      "โอ๊ะ! ออกครบชุดได้เฉพาะใบวางบิลเท่านั้น\n" +
      "พิมพ์: ใบวางบิล จากใบเสนอราคา"
    );
    return true;
  }

  if (draft.source_doc_type !== "QUO") {
    await replyFn(
      "โอ๊ะ! ต้องสร้างใบวางบิลจากใบเสนอราคาก่อนนะ\n" +
      "พิมพ์: ใบวางบิล จากใบเสนอราคา"
    );
    return true;
  }

  const invoiceReady = await validateDraftForIssue("ใบวางบิล", draft);
  if (!invoiceReady) {
    return true;
  }

  let invResult: IssueResult | null = null;
  try {
    invResult = await confirmAndIssueDraft(
      userId,
      businessId,
      draft,
      replyFn,
      lineUserId,
      { silent: true }
    );
  } catch (err) {
    const { secureError } = await import('../utils/secureConsole');
    secureError({
      tag: '[AUTO_CHAIN_INVOICE_ERROR]',
      trace_id: 'n/a',
      user_id: userId,
      business_id: businessId,
      timestamp: new Date().toISOString(),
    }, err);
    await replyFn(
      "โอ๊ะ! ออกใบวางบิลไม่สำเร็จ\n" +
      "ลองใหม่อีกครั้งหรือเช็คแพ็กเกจนะ"
    );
    return true;
  }
  if (!invResult) {
    return true;
  }

  const db = getDb();
  const invSnap = await db
    .doc(`users/${userId}/businesses/${businessId}/documents/${invResult.docId}`)
    .get();

  if (!invSnap.exists) {
    await replyFn(
      "โอ๊ะ! หาใบวางบิลที่เพิ่งออกไม่เจอ\n" +
      "ลองใหม่อีกครั้งนะ"
    );
    return true;
  }

  let receiptTerms = "ขอบคุณที่ใช้บริการ";
  try {
    const termsDoc = await db
      .doc(`users/${userId}/businesses/${businessId}/settings/terms`)
      .get();
    if (termsDoc.exists) {
      const termsData = termsDoc.data();
      receiptTerms = termsData?.receipt_terms || receiptTerms;
    }
  } catch {
    const { secureWarn } = await import('../utils/secureConsole');
    secureWarn({
      tag: '[AUTO_CHAIN_RECEIPT_TERMS_ERROR]',
      trace_id: 'n/a',
      user_id: userId,
      business_id: businessId,
      error_type: 'terms_loading',
      timestamp: new Date().toISOString(),
    });
  }

  const recDraft = buildReceiptDraftFromInvoiceData(
    invSnap.data() as Record<string, unknown>,
    invResult.docId,
    invResult.docNo,
    receiptTerms
  );

  const receiptReady = await validateDraftForIssue("ใบเสร็จ", recDraft);
  if (!receiptReady) {
    await replyFn(
      `ติ๊ดๆ ออกใบวางบิลแล้ว (${invResult.docNo})\n` +
      `แต่ยังออกใบเสร็จไม่ได้\n` +
      `พิมพ์: ใบเสร็จจาก ${invResult.docNo}`
    );
    await clearDraft(userId).catch(() => undefined);
    return true;
  }

  let recResult: IssueResult | null = null;
  try {
    recResult = await confirmAndIssueDraft(
      userId,
      businessId,
      recDraft,
      replyFn,
      lineUserId,
      { silent: true }
    );
  } catch (err) {
    const { secureError } = await import('../utils/secureConsole');
    secureError({
      tag: '[AUTO_CHAIN_RECEIPT_ERROR]',
      trace_id: 'n/a',
      user_id: userId,
      business_id: businessId,
      timestamp: new Date().toISOString(),
    }, err);
    await replyFn(
      `ติ๊ดๆ ออกใบวางบิลแล้ว (${invResult.docNo})\n` +
      `แต่ยังออกใบเสร็จอัตโนมัติไม่ได้\n` +
      `พิมพ์: ใบเสร็จจาก ${invResult.docNo}`
    );
    await clearDraft(userId).catch(() => undefined);
    return true;
  }

  if (!recResult) {
    await replyFn(
      `ติ๊ดๆ ออกใบวางบิลแล้ว (${invResult.docNo})\n` +
      `แต่ยังออกใบเสร็จอัตโนมัติไม่ได้\n` +
      `พิมพ์: ใบเสร็จจาก ${invResult.docNo}`
    );
    await clearDraft(userId).catch(() => undefined);
    return true;
  }

  const totalFmt = (recResult.total || invResult.total || 0).toLocaleString("th-TH");
  await replyFn(
    `บี๊บ! ออกเอกสารครบชุดแล้ว ✅\n\n` +
    `ใบวางบิล: ${invResult.docNo}\n` +
    `ใบเสร็จ: ${recResult.docNo}\n` +
    `ลูกค้า: ${invResult.customerName}\n` +
    `รวม: ${totalFmt}฿`
  );

  await clearDraft(userId).catch(() => undefined);
  return true;
}

type ApprovalSettings = {
  enabled: boolean;
  approverLineUserIds: string[];
};

async function getApprovalSettings(
  userId: string,
  businessId: string
): Promise<ApprovalSettings> {
  const db = getDb();
  const snap = await db.doc(`users/${userId}/businesses/${businessId}/settings/approval`).get();
  if (!snap.exists) {
    return { enabled: false, approverLineUserIds: [] };
  }
  const data = snap.data() || {};
  return {
    enabled: Boolean(data.enabled),
    approverLineUserIds: Array.isArray(data.approver_line_user_ids)
      ? data.approver_line_user_ids.filter((id: unknown) => typeof id === 'string') as string[]
      : [],
  };
}

function serializeDraftForApproval(draft: LineDraft): Record<string, unknown> {
  const toMillis = (value: unknown): number | null => {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
      return (value as { toMillis: () => number }).toMillis();
    }
    return null;
  };

  return {
    ...draft,
    createdAt: toMillis(draft.createdAt),
    updatedAt: toMillis(draft.updatedAt),
    expiresAt: toMillis(draft.expiresAt),
  };
}

async function isApproverForRequest(
  requestOwnerId: string,
  businessId: string,
  lineUserId?: string
): Promise<boolean> {
  if (!lineUserId) return false;
  const settings = await getApprovalSettings(requestOwnerId, businessId);
  if (settings.approverLineUserIds.length > 0) {
    return settings.approverLineUserIds.includes(lineUserId);
  }

  const db = getDb();
  const userSnap = await db.collection('users').doc(requestOwnerId).get();
  const ownerLineUserId = userSnap.data()?.lineUserId;
  return Boolean(ownerLineUserId && ownerLineUserId === lineUserId);
}

async function createApprovalRequest(params: {
  userId: string;
  businessId: string;
  lineUserId?: string;
  draft: LineDraft;
}): Promise<string> {
  const db = getDb();
  const ref = db.collection('approval_requests').doc();
  const now = admin.firestore.Timestamp.now();
  await ref.set({
    id: ref.id,
    user_id: params.userId,
    business_id: params.businessId,
    line_user_id: params.lineUserId || null,
    doc_type: params.draft.docType,
    draft: serializeDraftForApproval(params.draft),
    status: 'PENDING',
    created_at: now,
    updated_at: now,
  });
  return ref.id;
}

async function notifyApprovers(params: {
  userId: string;
  businessId: string;
  requestId: string;
  draft: LineDraft;
}): Promise<void> {
  const { pushLineMessage } = await import("../services/lineService");
  const settings = await getApprovalSettings(params.userId, params.businessId);
  const db = getDb();

  let approvers = settings.approverLineUserIds;
  if (approvers.length === 0) {
    const ownerSnap = await db.collection('users').doc(params.userId).get();
    const ownerLineUserId = ownerSnap.data()?.lineUserId;
    if (ownerLineUserId) {
      approvers = [ownerLineUserId];
    }
  }

  if (approvers.length === 0) return;

  const total = (params.draft.total || 0).toLocaleString('th-TH');
  const docLabel =
    params.draft.docType === 'QUO'
      ? 'ใบเสนอราคา'
      : params.draft.docType === 'BILL'
        ? 'ใบวางบิล'
        : 'ใบเสร็จ';

  const message =
    `บี๊บ! ขออนุมัติออกเอกสาร\n\n` +
    `${docLabel}\n` +
    `ลูกค้า: ${params.draft.customerName || 'ไม่ระบุ'}\n` +
    `รวม: ${total}฿\n` +
    `รหัส: ${params.requestId}\n\n` +
    `พิมพ์: อนุมัติเอกสาร ${params.requestId}\n` +
    `หรือ: ปฏิเสธเอกสาร ${params.requestId} <เหตุผล>`;

  await Promise.all(
    approvers.map((approverId) => pushLineMessage(approverId, message))
  );
}

async function handleApprovalCommand(params: {
  action: 'APPROVE' | 'REJECT';
  requestId: string;
  reason?: string;
  lineUserId?: string;
  replyFn: (msg: string, quickReply?: QuickReplyAction[]) => Promise<void>;
}): Promise<boolean> {
  const db = getDb();
  const reqSnap = await db.collection('approval_requests').doc(params.requestId).get();
  if (!reqSnap.exists) {
    await params.replyFn("โอ๊ะ! ไม่พบคำขออนุมัติ");
    return true;
  }

  const reqData = reqSnap.data() as Record<string, unknown>;
  if (reqData.status !== 'PENDING') {
    await params.replyFn("ติ๊ดๆ คำขอนี้ถูกดำเนินการแล้ว");
    return true;
  }

  const userId = String(reqData.user_id || '');
  const businessId = String(reqData.business_id || '');
  if (!userId || !businessId) {
    await params.replyFn("โอ๊ะ! ข้อมูลคำขอไม่ครบ");
    return true;
  }

  const authorized = await isApproverForRequest(userId, businessId, params.lineUserId);
  if (!authorized) {
    await params.replyFn("โอ๊ะ! คุณไม่มีสิทธิ์อนุมัติเอกสารนี้");
    return true;
  }

  if (params.action === 'REJECT') {
    await reqSnap.ref.update({
      status: 'REJECTED',
      rejected_at: admin.firestore.FieldValue.serverTimestamp(),
      rejected_by: params.lineUserId || null,
      rejected_reason: params.reason || null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const { pushLineMessage } = await import("../services/lineService");
    const requesterLineUserId = String(reqData.line_user_id || '');
    if (requesterLineUserId) {
      await pushLineMessage(
        requesterLineUserId,
        `โอ๊ะ! เอกสารของคุณถูกปฏิเสธ\nเหตุผล: ${params.reason || 'ไม่ระบุ'}`
      );
    }

    await params.replyFn("ติ๊ดๆ ปฏิเสธเอกสารแล้ว");
    return true;
  }

  const draft = reqData.draft as LineDraft | undefined;
  if (!draft) {
    await params.replyFn("โอ๊ะ! ไม่พบข้อมูลเอกสารสำหรับอนุมัติ");
    return true;
  }

  const { pushLineMessage } = await import("../services/lineService");
  const requesterLineUserId = String(reqData.line_user_id || '');
  const replyRequester = async (msg: string, quickReply?: QuickReplyAction[]) => {
    if (!requesterLineUserId) return;
    await pushLineMessage(requesterLineUserId, msg, undefined, quickReply);
  };

  const issued = await confirmAndIssueDraft(
    userId,
    businessId,
    draft,
    replyRequester,
    requesterLineUserId,
    { silent: false }
  );

  if (!issued) {
    await params.replyFn(
      "โอ๊ะ! ออกเอกสารไม่สำเร็จ\n" +
      "ตรวจสอบแพ็กเกจ/ข้อมูลก่อนนะ"
    );
    return true;
  }

  await reqSnap.ref.update({
    status: 'APPROVED',
    approved_at: admin.firestore.FieldValue.serverTimestamp(),
    approved_by: params.lineUserId || null,
    doc_id: issued.docId,
    doc_no: issued.docNo,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await params.replyFn(`บี๊บ! อนุมัติแล้ว ✅ (${issued.docNo})`);
  return true;
}

/**
 * HELPER: Resolve invoice docId from message text or fallback to latest unpaid
 * Priority:
 * 1. Parse "INV-xxxx" from message → query by doc_no + doc_type=BILL + status in [ISSUED, UNPAID, AWAITING_PAYMENT]
 * 2. Fallback: Get latest BILL with any unpaid status
 * Returns null if not found
 */
async function resolveInvoiceDocId(
  userId: string,
  businessId: string,
  messageText: string
): Promise<string | null> {
  const db = getDb();
  const unpaidLikeStatuses = new Set<string>([
    ...UnpaidStatuses,
    'DELIVERED',
    'PDF_READY',
  ]);

  // Priority 1: Extract INV-xxxx from message
  const invNoMatch = messageText.match(/INV-\d+-\d+/i);
  if (invNoMatch) {
    const invNo = invNoMatch[0];
    try {
      // Try to find by doc_no + status in unpaid list
      const snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("businesses")
        .doc(businessId)
        .collection("documents")
        .where("doc_no", "==", invNo)
        .where("doc_type", "in", ["INVOICE", "BILL"])
        .get();

      const validDocs = snapshot.docs.filter((doc) => {
        const status = (doc.data()?.status as string) || "";
        return unpaidLikeStatuses.has(status);
      });

      if (validDocs.length > 0) {
        const doc = validDocs[0];
        const status = (doc.data()?.status as string) || "?";
        // ✅ FIX 5: Use secure logging (migrate info logs with PII)
        // Note: secureLog imported at top level, no need to redeclare
        const { secureLog: logSecure } = await import('../utils/secureConsole');
        logSecure({
          tag: '[RESOLVE_INVOICE_FOUND]',
          trace_id: 'n/a',
          doc_id: doc.id,
          status: status,
          timestamp: new Date().toISOString(),
        });
        return doc.id;
      } else {
        // ✅ FIX 5: Use secure logging
        const { secureLog: logSecure } = await import('../utils/secureConsole');
        logSecure({
          tag: '[RESOLVE_INVOICE_STATUS_MISMATCH]',
          trace_id: 'n/a',
          expected_statuses: Array.from(unpaidLikeStatuses),
          found_statuses: snapshot.docs.map((d) => d.data()?.status).filter(Boolean),
          timestamp: new Date().toISOString(),
        });
        return null;
      }
    } catch (err) {
      // ✅ FIX 5: Use secure error logging (migrate error logs first)
      const { secureError } = await import('../utils/secureConsole');
      secureError({
        tag: '[RESOLVE_INVOICE_ERROR]',
        trace_id: 'n/a',
        doc_no: invNo,
        user_id: userId,
        business_id: businessId,
        timestamp: new Date().toISOString(),
      }, err);
      return null;
    }
  }

  // Priority 2: Fallback to latest BILL with unpaid status
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("businesses")
      .doc(businessId)
      .collection("documents")
      .where("doc_type", "==", "BILL")
      .orderBy("created_at", "desc")
      .limit(10)
      .get();

    const validDocs = snapshot.docs.filter((doc) => {
      const status = (doc.data()?.status as string) || "";
      return unpaidLikeStatuses.has(status);
    });

    if (validDocs.length > 0) {
      const doc = validDocs[0];
      const status = (doc.data()?.status as string) || "?";
      // ✅ FIX 5: Use secure logging
      const { secureLog: logSecure } = await import('../utils/secureConsole');
      logSecure({
        tag: '[RESOLVE_INVOICE_FALLBACK]',
        trace_id: 'n/a',
        doc_id: doc.id,
        status: status,
        timestamp: new Date().toISOString(),
      });
      return doc.id;
    }
  } catch (err) {
    // ✅ FIX 5: Use secure error logging
    const { secureError } = await import('../utils/secureConsole');
    secureError({
      tag: '[RESOLVE_INVOICE_ERROR]',
      trace_id: 'n/a',
      user_id: userId,
      business_id: businessId,
      error_type: 'latest_bill_query',
      timestamp: new Date().toISOString(),
    }, err);
  }

  console.log(
    `[resolveInvoice] No unpaid BILL found for user=${userId}, business=${businessId}`
  );
  return null;
}

/**
 * Helper: Create Invoice from existing Quotation
 * Flow: QUO → INV (copy data, create as DRAFT)
 * 
 * Supports multi-installment billing:
 * - "สร้างใบวางบิลจาก QUO-xxxx" → full amount
 * - "สร้างใบวางบิลจาก QUO-xxxx งวด 1 50000" → installment with amount
 * 
 * Rules:
 * - QUO must exist and status = ISSUED (not CLOSED)
 * - Copies: customer_snapshot, items, totals, business_snapshot, payment_snapshot
 * - Uses invoice_terms (not quotation_terms)
 * - Does NOT generate PDF or deduct credits
 * - Creates INV as DRAFT for confirmation
 */
export async function createInvoiceFromQuotation(
  userId: string,
  businessId: string,
  messageText: string,
  replyFn: (msg: string) => Promise<void>
): Promise<string | null> {
  const db = getDb();
  const docsRef = db
    .collection("users")
    .doc(userId)
    .collection("businesses")
    .doc(businessId)
    .collection("documents");

  // Parse QUO number and optional installment from message
  // Pattern: "สร้างใบวางบิลจาก QUO-2569-001" or "สร้างใบวางบิลจาก QUO-2569-001 งวด 1 50000"
  const quoMatch = messageText.match(/(?:QUO|QOU)[\s-]*(\d+)[\s-]*(\d+)/i);
  const wantsLatestQuo =
    /(ทำ|สร้าง)?\s*ใบวางบิล\s*จาก\s*ใบเสนอราคา/i.test(messageText) ||
    /(ทำ|สร้าง)?\s*ใบวางบิล\s*จาก\s*เอกสาร(นี้)?/i.test(messageText) ||
    /ใบวางบิล.*ใบเสนอราคา/i.test(messageText) ||
    /ใบเสนอราคา.*ใบวางบิล/i.test(messageText) ||
    /ออกครบชุด.*ใบเสนอราคา/i.test(messageText) ||
    /ออกครบชุด.*เอกสาร(นี้)?/i.test(messageText);

  let quoNo: string;
  let quoDoc: QueryDocumentSnapshot<DocumentData>;

  if (!quoMatch) {
    if (!wantsLatestQuo) {
      await replyFn(
        "โอ๊ะ! ต้องมีเลขที่ใบเสนอราคา\n" +
        "ตัวอย่าง: สร้างใบวางบิลจาก QUO-2569-001\n" +
        "หรือ: สร้างใบวางบิลจาก QUO-2569-001 งวด 1 50000"
      );
      return null;
    }

    const latestQuoQuery = await docsRef
      .where("doc_type", "==", "QUOTATION")
      .where("status", "==", "ISSUED")
      .orderBy("created_at", "desc")
      .limit(1)
      .get();

    if (latestQuoQuery.empty) {
      await replyFn(
        "โอ๊ะ! ยังไม่พบใบเสนอราคาที่ออกแล้ว\n" +
        "ออกใบเสนอราคาก่อน แล้วค่อยลองใหม่"
      );
      return null;
    }

    quoDoc = latestQuoQuery.docs[0];
    const latestData = quoDoc.data();
    quoNo = String(latestData.doc_no || quoDoc.id);
  } else {
    quoNo = `QUO-${quoMatch[1]}-${quoMatch[2]}`;
    const quoQuery = await docsRef
      .where("doc_no", "==", quoNo)
      .where("doc_type", "==", "QUOTATION")
      .limit(1)
      .get();

    if (quoQuery.empty) {
      await replyFn(
        `โอ๊ะ! ไม่พบใบเสนอราคา ${quoNo}\n` +
        `ตรวจสอบเลขที่เอกสารอีกครั้งนะ`
      );
      return null;
    }

    quoDoc = quoQuery.docs[0];
  }
  const quoData = quoDoc.data();
  // Parse installment info (optional)
  const installmentMatch = messageText.match(/งวด\s*(\d+)(?:\s+(\d+))?/i);
  let installmentNo: number | null = null;
  let installmentAmount: number | null = null;

  if (installmentMatch) {
    installmentNo = parseInt(installmentMatch[1], 10);
    if (installmentMatch[2]) {
      installmentAmount = parseInt(installmentMatch[2], 10);
    }
  }
  const wantsInstallment = Boolean(installmentMatch);

  // ✅ FIX 5: Use secure logging (migrate info logs with PII)
  const { secureLog: logSecure1 } = await import('../utils/secureConsole');
  logSecure1({
    tag: '[CREATE_INV_FROM_QUO_START]',
    trace_id: 'n/a',
    installment_no: installmentNo,
    timestamp: new Date().toISOString(),
  });

  const quoTotal = Number(quoData.total || quoData.total_amount || 0) || 0;
  const quoSubtotal = Number(quoData.subtotal || quoData.subtotal_amount || 0) || 0;
  const quoVat = Number(quoData.vat || 0) || 0;
  const quoWht = Number(quoData.wht || 0) || 0;

  // Validate QUO status
  if (quoData.status === "CLOSED") {
    await replyFn(
      `โอ๊ะ! ${quoNo} ออกบิลครบแล้ว\n` +
      `ไม่สามารถสร้างใบวางบิลเพิ่มได้`
    );
    return null;
  }

  if (quoData.status !== "ISSUED") {
    await replyFn(
      `โอ๊ะ! ใบเสนอราคา ${quoNo} ยังไม่ได้ออก (สถานะ: ${quoData.status})\n` +
      `สร้างใบวางบิลได้จากใบเสนอราคาที่ออกแล้วเท่านั้น`
    );
    return null;
  }

  // Get installment summary for validation
  const { getInstallmentSummary, getNextInstallmentNo, validateInstallment } = await import("../services/installmentService");
  const summary = await getInstallmentSummary(userId, businessId, quoNo);
  const remainingBalance = summary?.remainingBalance ?? quoTotal;
  const issuedTotalBefore = summary?.issuedTotal ?? 0;

  // Validate installment if specified
  if (wantsInstallment) {
    // Auto-assign installment number if not provided
    if (!installmentNo) {
      installmentNo = await getNextInstallmentNo(userId, businessId, quoDoc.id);
    }

    // Auto-set amount to remaining if final installment or not specified
    if (!installmentAmount || installmentAmount > remainingBalance) {
      installmentAmount = remainingBalance;
    }

    // Validate (installmentNo and installmentAmount are guaranteed to be numbers here)
    const validation = await validateInstallment(userId, businessId, quoDoc.id, installmentNo!, installmentAmount!);
    if (!validation.valid) {
      await replyFn(`โอ๊ะ! ${validation.error}`);
      return null;
    }
  } else {
    // No installment specified - check if there are existing installments
    if (summary && summary.installments.length > 0) {
      // QUO already has installments, require explicit installment number
      const nextNo = await getNextInstallmentNo(userId, businessId, quoDoc.id);
      const remainingFmt = remainingBalance.toLocaleString("th-TH");
      await replyFn(
        `โอ๊ะ! ${quoNo} มีงวดอยู่แล้ว ${summary.installments.length} งวด\n` +
        `คงเหลือ: ${remainingFmt} บาท\n\n` +
        `ติ๊ดๆ ระบุงวดหน่อยนะ:\nสร้างใบวางบิลจาก ${quoNo} งวด ${nextNo} ${remainingBalance}`
      );
      return null;
    }
    // No existing installments - create full invoice (no installment)
    installmentNo = null;
    installmentAmount = null;
  }

  // Check if remaining is 0
  if (remainingBalance <= 0) {
    await replyFn(
      `โอ๊ะ! ${quoNo} ออกบิลครบแล้ว\n` +
      `ไม่มียอดคงเหลือ`
    );
    return null;
  }

  const isInstallment = installmentNo !== null;
  const remainingAfter = isInstallment ? remainingBalance - (installmentAmount || 0) : null;
  const issuedAfter = isInstallment ? issuedTotalBefore + (installmentAmount || 0) : null;

  // ✅ FIX 5: Use secure logging (redact customer name, amounts)
  const { secureLog: logSecure2 } = await import('../utils/secureConsole');
  logSecure2({
    tag: '[CREATE_INV_FROM_QUO_FOUND]',
    trace_id: 'n/a',
    quo_id: quoDoc.id,
    installment_no: installmentNo,
    timestamp: new Date().toISOString(),
  });

  // Load invoice_terms from settings (if any)
  let invoiceTerms = "กรุณาชำระเงินภายในวันที่กำหนด";
  try {
    const termsDoc = await db
      .doc(`users/${userId}/businesses/${businessId}/settings/terms`)
      .get();
    if (termsDoc.exists) {
      const termsData = termsDoc.data();
      invoiceTerms = termsData?.invoice_terms || invoiceTerms;
    }
  } catch {
    // ✅ FIX 5: Use secure error logging
    const { secureWarn } = await import('../utils/secureConsole');
    secureWarn({
      tag: '[CREATE_INV_FROM_QUO_ERROR]',
      trace_id: 'n/a',
      user_id: userId,
      business_id: businessId,
      error_type: 'terms_loading',
      timestamp: new Date().toISOString(),
    });
  }

  // Create INV draft (in draftStore)
  // For installments, we don't copy items - just use amount
  const invSubtotal = isInstallment ? (installmentAmount || 0) : (quoSubtotal || quoTotal);
  const invVat = isInstallment ? 0 : quoVat;
  const invWht = isInstallment ? 0 : quoWht;
  const invTotal = isInstallment ? (installmentAmount || 0) : (quoTotal || invSubtotal);

  const invDraft: LineDraft = {
    docType: "BILL",
    customerName: quoData.customer_name || quoData.customer_snapshot?.name || "",
    customerId: quoData.customer_id || quoData.customer_snapshot?.id || null,
    items: (!isInstallment || (installmentNo === 1 && installmentAmount === quoTotal))
      ? (quoData.items || []).map((item: Record<string, unknown>) => normalizeDocItem(item))
      : [{ name: `งวดที่ ${installmentNo} (${quoNo})`, qty: 1, price: installmentAmount || 0 }],
    subtotal: invSubtotal,
    vat: invVat,
    wht: invWht,
    total: invTotal,
    notes: invoiceTerms || "",
    // Source document link
    source_doc_type: "QUO",
    source_doc_id: quoDoc.id,
    source_doc_no: quoNo,
    // Installment info
    installment_no: isInstallment ? installmentNo : null,
    installment_total: isInstallment ? installmentAmount : null,
    installment_remaining: isInstallment ? remainingAfter : null,
    installment_issued_total: isInstallment ? issuedAfter : null,
    // Lock items and customer (cannot edit)
    locked_fields: ["items", "customerName", "customerId"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Store draft
  const { getOrCreateDraft, updateDraft } = await import("./draftStore");
  await getOrCreateDraft(userId, businessId, "BILL"); // Initialize draft structure
  await updateDraft(userId, invDraft); // Override with QUO data

  // ✅ FIX 5: Use secure logging
  const { secureLog: logSecure3 } = await import('../utils/secureConsole');
  logSecure3({
    tag: '[CREATE_INV_FROM_QUO_CREATED]',
    trace_id: 'n/a',
    installment_no: installmentNo,
    timestamp: new Date().toISOString(),
  });

  // Format response
  const customerDisplay = invDraft.customerName || "ไม่ระบุ";

  let response = `บี๊บ! สร้างใบวางบิลจาก ${quoNo}\n\n`;
  response += `👤 ลูกค้า: ${customerDisplay}\n`;
  if (isInstallment) {
    const amountFormatted = (installmentAmount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 });
    const remainingFormatted = (remainingAfter || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 });
    const issuedAfterFormatted = (issuedAfter || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 });
    response += `📝 งวดที่: ${installmentNo}\n`;
    response += `💰 ยอดงวดนี้: ${amountFormatted} บาท\n`;
    response += `✅ ออกแล้วสะสม: ${issuedAfterFormatted} บาท\n`;
    response += `📍 คงเหลือหลังออกบิล: ${remainingFormatted} บาท\n\n`;
    response += `ดูสรุปงวด: พิมพ์ "สรุปงวดของ ${quoNo}"\n\n`;
  } else {
    const totalFormatted = invTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 });
    response += `💰 ยอดรวม: ${totalFormatted} บาท\n\n`;
    response += `ถ้าต้องการแบ่งงวด: พิมพ์ "สร้างใบวางบิลจาก ${quoNo} งวด 1 <ยอด>"\n\n`;
  }
  response += `⚠️ ลูกค้าล็อกจากใบเสนอราคา\n`;
  response += `📝 เพิ่มหมายเหตุได้: พิมพ์ "หมายเหตุ [ข้อความ]"\n\n`;
  response += `พิมพ์ "ยืนยัน" เพื่อออกเอกสาร\n`;

  return response;
}

/**
 * Helper: Create Receipt from existing Invoice
 * Flow: INV → REC (copy data, create as DRAFT)
 * 
 * Rules:
 * - INV must exist and status = ISSUED
 * - One INV → One REC only
 * - Copies: customer_snapshot, items, totals, business_snapshot, payment_snapshot
 * - Uses receipt_terms
 * - Does NOT generate PDF or deduct credits
 * - Creates REC as DRAFT for confirmation
 */
export async function createReceiptFromInvoice(
  userId: string,
  businessId: string,
  messageText: string,
  replyFn: (msg: string) => Promise<void>
): Promise<string | null> {
  const db = getDb();
  const docsRef = db
    .collection("users")
    .doc(userId)
    .collection("businesses")
    .doc(businessId)
    .collection("documents");

  // Parse INV number from message
  // Pattern: "สร้างใบเสร็จจาก INV-2569-001"
  const invMatch = messageText.match(/(?:INV|INVOICE|บิล)[\s-]*(\d+)[\s-]*(\d+)/i);
  const wantsLatestInv =
    /(ทำ|สร้าง)?\s*ใบเสร็จ\s*จาก\s*ใบวางบิล/i.test(messageText) ||
    /(ทำ|สร้าง)?\s*ใบเสร็จ\s*จาก\s*เอกสาร(นี้)?/i.test(messageText) ||
    /ใบเสร็จ.*ใบวางบิล/i.test(messageText) ||
    /ใบวางบิล.*ใบเสร็จ/i.test(messageText);

  let invNo: string;
  let invDoc: QueryDocumentSnapshot<DocumentData>;
  if (!invMatch) {
    if (!wantsLatestInv) {
      await replyFn(
        "โอ๊ะ! ต้องมีเลขที่ใบวางบิล\n" +
        "ตัวอย่าง: สร้างใบเสร็จจาก INV-2569-001"
      );
      return null;
    }

    const candidates = await getLatestIssuedInvoiceCandidates(userId, businessId, 5);
    if (candidates.length === 0) {
      await replyFn(
        "โอ๊ะ! ยังไม่พบใบวางบิลที่ออกแล้ว\n" +
        "ออกใบวางบิลก่อน แล้วค่อยลองใหม่"
      );
      return null;
    }
    invNo = candidates[0].invNo;

    const invQuery = await docsRef
      .where("doc_no", "==", invNo)
      .where("doc_type", "==", "INVOICE")
      .limit(1)
      .get();

    if (invQuery.empty) {
      await replyFn(
        `โอ๊ะ! ไม่พบใบวางบิล ${invNo}\n` +
        `ตรวจสอบเลขที่เอกสารอีกครั้งนะ`
      );
      return null;
    }

    invDoc = invQuery.docs[0];
  } else {
    invNo = `INV-${invMatch[1]}-${invMatch[2]}`;

    const invQuery = await docsRef
      .where("doc_no", "==", invNo)
      .where("doc_type", "==", "INVOICE")
      .limit(1)
      .get();

    if (invQuery.empty) {
      await replyFn(
        `โอ๊ะ! ไม่พบใบวางบิล ${invNo}\n` +
        `ตรวจสอบเลขที่เอกสารอีกครั้งนะ`
      );
      return null;
    }

    invDoc = invQuery.docs[0];
  }
  // ✅ FIX 5: Use secure logging
  const { secureLog: logSecure } = await import('../utils/secureConsole');
  logSecure({
    tag: '[CREATE_REC_FROM_INV_START]',
    trace_id: 'n/a',
    timestamp: new Date().toISOString(),
  });

  const invData = invDoc.data();

  // Validate INV status
  if (invData.status !== "ISSUED" && invData.status !== "PAID") {
    await replyFn(
      `โอ๊ะ! ใบวางบิล ${invNo} ยังไม่ได้ออก (สถานะ: ${invData.status})\n` +
      `สร้างใบเสร็จได้จากใบวางบิลที่ออกแล้วเท่านั้น`
    );
    return null;
  }

  // Check if REC already exists for this INV
  const { hasReceiptFromInvoice } = await import("../services/installmentService");
  const hasRec = await hasReceiptFromInvoice(userId, businessId, invDoc.id);
  if (hasRec) {
    await replyFn(
      `โอ๊ะ! ใบวางบิล ${invNo} มีใบเสร็จแล้ว\n` +
      `หนึ่งใบวางบิลสร้างใบเสร็จได้เพียงใบเดียว`
    );
    return null;
  }

  // ✅ FIX 5: Use secure logging (redact customer name, total)
  const { secureLog } = await import('../utils/secureConsole');
  secureLog({
    tag: '[CREATE_REC_FROM_INV_FOUND]',
    trace_id: 'n/a',
    inv_id: invDoc.id,
    timestamp: new Date().toISOString(),
  });

  // Load receipt_terms from settings
  let receiptTerms = "ขอบคุณที่ใช้บริการ";
  try {
    const termsDoc = await db
      .doc(`users/${userId}/businesses/${businessId}/settings/terms`)
      .get();
    if (termsDoc.exists) {
      const termsData = termsDoc.data();
      receiptTerms = termsData?.receipt_terms || receiptTerms;
    }
  } catch {
    // ✅ FIX 5: Use secure error logging
    const { secureWarn } = await import('../utils/secureConsole');
    secureWarn({
      tag: '[CREATE_REC_FROM_INV_ERROR]',
      trace_id: 'n/a',
      user_id: userId,
      business_id: businessId,
      error_type: 'terms_loading',
      timestamp: new Date().toISOString(),
    });
  }

  // Create REC draft
  const recDraft = buildReceiptDraftFromInvoiceData(invData, invDoc.id, invNo, receiptTerms);

  // Store draft
  const { getOrCreateDraft, updateDraft } = await import("./draftStore");
  await getOrCreateDraft(userId, businessId, "RECEIPT");
  await updateDraft(userId, recDraft);

  console.log(`[CREATE_REC_FROM_INV] REC draft created from ${invNo}, customer=${recDraft.customerName}, total=${recDraft.total}`);

  // Format response
  const totalFormatted = (recDraft.total || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 });
  const customerDisplay = recDraft.customerName || "ไม่ระบุ";

  return (
    `บี๊บ! สร้างใบเสร็จจาก ${invNo}\n\n` +
    `👤 ลูกค้า: ${customerDisplay}\n` +
    `📦 รายการ: ${recDraft.items.length} รายการ\n` +
    `💰 ยอดรวม: ${totalFormatted} บาท\n\n` +
    `⚠️ รายการและลูกค้าล็อกจากใบวางบิล\n` +
    `📝 เพิ่มหมายเหตุได้: พิมพ์ "หมายเหตุ [ข้อความ]"\n\n` +
    `พิมพ์ "ยืนยัน" เพื่อออกเอกสาร`
  );
}

async function getLatestIssuedInvoiceDoc(
  userId: string,
  businessId: string
): Promise<QueryDocumentSnapshot<DocumentData> | null> {
  const db = getDb();
  const docsRef = db
    .collection("users")
    .doc(userId)
    .collection("businesses")
    .doc(businessId)
    .collection("documents");

  const latestInvQuery = await docsRef
    .where("doc_type", "==", "INVOICE")
    .where("status", "in", ["ISSUED", "PAID"])
    .orderBy("issued_at", "desc")
    .limit(1)
    .get();

  if (latestInvQuery.empty) return null;
  return latestInvQuery.docs[0];
}

type ReceiptSourceCandidate = {
  invNo: string;
  customerName: string;
  issuedAt: string | null;
  total: number;
  installmentNo: number | null;
  installmentRemaining: number | null;
  sourceDocNo: string | null;
};

async function getLatestIssuedInvoiceCandidates(
  userId: string,
  businessId: string,
  limit = 5
): Promise<ReceiptSourceCandidate[]> {
  const db = getDb();
  const docsRef = db
    .collection("users")
    .doc(userId)
    .collection("businesses")
    .doc(businessId)
    .collection("documents");

  let docs: QueryDocumentSnapshot<DocumentData>[] = [];
  try {
    const latestInvQuery = await docsRef
      .where("doc_type", "==", "INVOICE")
      .where("status", "in", ["ISSUED", "PAID"])
      .orderBy("issued_at", "desc")
      .limit(limit)
      .get();
    docs = latestInvQuery.docs;
  } catch (err) {
    const msg = (err as Error)?.message || "";
    const isIndexError = /requires an index/i.test(msg);
    if (!isIndexError) {
      throw err;
    }

    const fallbackLimit = Math.max(limit * 10, 50);
    const fallbackQuery = await docsRef
      .orderBy("issued_at", "desc")
      .limit(fallbackLimit)
      .get()
      .catch(async () => {
        return docsRef
          .orderBy("created_at", "desc")
          .limit(fallbackLimit)
          .get();
      });

    const filtered = fallbackQuery.docs.filter((doc) => {
      const data = doc.data();
      const status = String(data.status || "");
      return data.doc_type === "INVOICE" && (status === "ISSUED" || status === "PAID");
    });

    filtered.sort((a, b) => {
      const aData = a.data();
      const bData = b.data();
      const aTs = aData.issued_at || aData.created_at;
      const bTs = bData.issued_at || bData.created_at;
      const aMs = aTs?.toMillis ? aTs.toMillis() : 0;
      const bMs = bTs?.toMillis ? bTs.toMillis() : 0;
      return bMs - aMs;
    });

    docs = filtered.slice(0, limit);
  }

  if (!docs.length) return [];

  return docs.map((doc) => {
    const data = doc.data();
    const issuedAt = data.issued_at || data.created_at || null;
    const issuedAtText = issuedAt?.toDate
      ? issuedAt.toDate().toLocaleDateString("th-TH")
      : null;
    return {
      invNo: String(data.doc_no || doc.id),
      customerName: String(data.customer_name || data.customer_snapshot?.name || "ไม่ระบุ"),
      issuedAt: issuedAtText,
      total: Number(data.total || data.total_amount || 0) || 0,
      installmentNo: Number(data.installment_no || 0) || null,
      installmentRemaining: Number(data.installment_remaining || 0) || null,
      sourceDocNo: data.source_doc_no ? String(data.source_doc_no) : null,
    };
  });
}

function formatReceiptCandidateLine(
  index: number,
  candidate: ReceiptSourceCandidate
): string {
  const totalText = candidate.total > 0
    ? `${candidate.total.toLocaleString("th-TH")}฿`
    : "-";
  const issuedText = candidate.issuedAt ? candidate.issuedAt : "ไม่ระบุวันที่";
  const sourceText = candidate.sourceDocNo ? ` | จาก ${candidate.sourceDocNo}` : "";
  let installmentText = "";
  if (candidate.installmentNo) {
    const remainingText = candidate.installmentRemaining
      ? `คงเหลือ ${candidate.installmentRemaining.toLocaleString("th-TH")}฿`
      : "คงเหลือ -";
    installmentText = ` | งวด ${candidate.installmentNo} (${remainingText})`;
  }
  return `${index}) ${candidate.invNo} | ลูกค้า: ${candidate.customerName} | ${issuedText} | ${totalText}${installmentText}${sourceText}`;
}

function buildReceiptSelectionMessage(
  candidates: ReceiptSourceCandidate[]
): string {
  const lines = candidates.map((c, idx) => formatReceiptCandidateLine(idx + 1, c));
  return (
    `โอ๊ะ! เจอหลายใบวางบิลครับ ช่วยเลือกให้ด๊อกๆ ทีนะ เจ้านาย\n` +
    `${lines.join("\n")}\n\n` +
    `พิมพ์เลขที่ต้องการ หรือพิมพ์: ใบเสร็จจาก INV-xxxx\n` +
    `ยกเลิกได้ด้วย: ยกเลิก`
  );
}

function buildReceiptSelectionQuickReplies(
  candidates: ReceiptSourceCandidate[]
): QuickReplyAction[] {
  const numberButtons = candidates.map((_, idx) => String(idx + 1));
  const labels = [...numberButtons, "ยกเลิก"].slice(0, 13);
  return labels.map((label) => ({
    type: "action",
    action: {
      type: "message",
      label,
      text: label,
    },
  }));
}

/**
 * Helper: Handle installment summary command
 */
async function handleInstallmentSummary(
  userId: string,
  businessId: string,
  messageText: string
): Promise<string> {
  // Parse QUO number
  const quoMatch = messageText.match(/(?:QUO|QOU)[\s-]*(\d+)[\s-]*(\d+)/i);
  let quoNo: string | null = null;
  if (quoMatch) {
    quoNo = `QUO-${quoMatch[1]}-${quoMatch[2]}`;
  } else {
    const db = getDb();
    const latestQuo = await db
      .collection("users")
      .doc(userId)
      .collection("businesses")
      .doc(businessId)
      .collection("documents")
      .where("doc_type", "==", "QUOTATION")
      .where("status", "==", "ISSUED")
      .orderBy("issued_at", "desc")
      .limit(1)
      .get();

    if (latestQuo.empty) {
      return (
        "โอ๊ะ! ยังไม่พบใบเสนอราคาที่ออกแล้ว\n" +
        "พิมพ์: สรุปงวดของ QUO-2569-001"
      );
    }

    const latestData = latestQuo.docs[0].data();
    quoNo = String(latestData.doc_no || latestQuo.docs[0].id);
  }

  const { getInstallmentSummary, formatInstallmentSummary } = await import("../services/installmentService");
  const summary = await getInstallmentSummary(userId, businessId, quoNo);

  if (!summary) {
    return `โอ๊ะ! ไม่พบใบเสนอราคา ${quoNo}`;
  }

  return formatInstallmentSummary(summary);
}

/**
 * Helper: Handle installment dashboard command
 */
async function handleInstallmentDashboard(
  userId: string,
  businessId: string,
  messageText: string
): Promise<string> {
  // Parse QUO number
  const quoMatch = messageText.match(/(?:QUO|QOU)[\s-]*(\d+)[\s-]*(\d+)/i);
  if (!quoMatch) {
    return (
      "โอ๊ะ! ต้องมีเลขที่ใบเสนอราคา\n" +
      "ตัวอย่าง: แดชบอร์ด QUO-2569-001"
    );
  }

  const quoNo = `QUO-${quoMatch[1]}-${quoMatch[2]}`;

  const { getInstallmentSummary, formatInstallmentDashboard } = await import("../services/installmentService");
  const summary = await getInstallmentSummary(userId, businessId, quoNo);

  if (!summary) {
    return `โอ๊ะ! ไม่พบใบเสนอราคา ${quoNo}`;
  }

  return formatInstallmentDashboard(summary);
}

/**
 * Helper: Confirm and issue document from LINE draft
 * 1. Create document in Firestore
 * 2. Generate PDF
 * 3. Deliver PDF (email/LINE)
 */
interface IssueResult {
  docId: string;
  docNo: string;
  docType: string;
  total: number;
  customerName: string;
}

export async function confirmAndIssueDraft(
  userId: string,
  businessId: string,
  draft: LineDraft,
  replyFn: (msg: string, quickReply?: QuickReplyAction[]) => Promise<void>,
  lineUserId?: string,
  options?: { silent?: boolean }
): Promise<IssueResult | null> {
  const db = getDb();

  console.log(`[DRAFT_CONFIRMING] 📝 userId=${userId}, business=${businessId}, docType=${draft.docType}`);

  // Validate draft before issuance
  if (!draft.customerName || !hasChargeableItems(draft)) {
    console.error(`[DRAFT_VALIDATION_FAILED] ❌ Missing customer or items`);
    throw new Error("Draft incomplete: missing customer or items");
  }

  // PLAN CHECK BEFORE ISSUING
  const { getUserPlan, canCreateDocumentType } = await import("./planService");
  const { getUpsellMessage } = await import("./subscriptionService");
  const plan = await getUserPlan(userId);
  let starterQuota: { quota: number; used: number; remaining: number } | null = null;

  if (plan === 'FREE') {
    try {
      const { getStarterQuotaStatus } = await import("./lineLinkService");
      starterQuota = await getStarterQuotaStatus(userId, lineUserId);
      if (starterQuota.remaining <= 0) {
        await replyFn(
          "สิทธิ์ฟรี 10 ใบแรกของบัญชีนี้ใช้ครบแล้วครับ\n\n" +
          "ถ้าจะใช้งานต่อ เลือกได้เลยครับ\n" +
          "• EzDOC Pro 99 บาท สำหรับ 1 ผู้ใช้ ออกเอกสารได้ไม่จำกัด\n" +
          "• EzDOC Team 279 บาท สำหรับหลายผู้ใช้ ออกเอกสารได้ไม่จำกัด"
        );
        return null;
      }
    } catch (trialErr) {
      console.warn("[TRIAL_CHECK_FAIL] Unable to check starter quota:", trialErr);
    }
  }

  const docTypeKey = draft.docType === 'BILL' ? 'INV' : draft.docType === 'RECEIPT' ? 'REC' : 'QUO';
  const hasStarterAccess = plan === 'FREE' && Boolean(starterQuota && starterQuota.remaining > 0);
  const canCreate = hasStarterAccess ? true : await canCreateDocumentType(userId, docTypeKey);
  if (!canCreate) {
    console.log(`[PLAN_CHECK_FAILED] ❌ userId=${userId}, plan=${plan}, docType=${docTypeKey}`);
    await replyFn(getUpsellMessage(0));
    return null;
  }

  const { checkDailyDocLimit } = await import("./ratelimit");
  const limit = hasStarterAccess
    ? { allowed: true }
    : await checkDailyDocLimit(userId, businessId, plan);
  if (!limit.allowed) {
    await replyFn(
      "สิทธิ์ฟรี 10 ใบแรกของบัญชีนี้ใช้ครบแล้วครับ\n\n" +
      "ถ้าจะใช้งานต่อ เลือกได้เลยครับ\n" +
      "• EzDOC Pro 99 บาท สำหรับ 1 ผู้ใช้ ออกเอกสารได้ไม่จำกัด\n" +
      "• EzDOC Team 279 บาท สำหรับหลายผู้ใช้ ออกเอกสารได้ไม่จำกัด"
    );
    return null;
  }

  try {
    // 1. Create document in Firestore
    // Document type mapping: QUO → QUOTATION, BILL → INVOICE, RECEIPT → RECEIPT

    // Create document record with generated number
    const docRef = db
      .collection("users")
      .doc(userId)
      .collection("businesses")
      .doc(businessId)
      .collection("documents")
      .doc(); // Auto-generate ID

    // Build audit-safe snapshots (frozen at issuance time)
    const snapshots = await buildDocumentSnapshots({
      userId,
      businessId,
      customerName: draft.customerName,
      customerId: draft.customerId,
      customerLegalName: draft.customerLegalName,
      customerBranch: draft.customerBranch,
      customerAddress: draft.customerAddress,
      customerContactName: draft.customerContactName,
      customerTaxId: draft.customerTaxId,
    });

    // Calculate totals
    const subTotal = draft.subtotal;
    const taxSnapshot = { ...snapshots.tax_snapshot };
    if (draft.docType === 'QUO' && !draft.vat && !draft.wht) {
      taxSnapshot.vat_enabled = false;
      taxSnapshot.wht_enabled = false;
    }
    const vatPercent = taxSnapshot.vat_enabled ? taxSnapshot.vat_percent : 0;
    const vatAmount = draft.vat || 0;
    const discountAmount = draft.discountAmount || 0;
    const totalAmount = draft.total;

    const docRecord = {
      id: docRef.id,
      doc_type: DraftToIssuedDocTypeMap[draft.docType as keyof typeof DraftToIssuedDocTypeMap],
      doc_no: await generateDocumentNumber(businessId, draft.docType),

      // Customer info (legacy + snapshot)
      customer_name: draft.customerName,
      customer_id: draft.customerId || null,

      // Items with standardized structure
      items: (draft.items.length > 0
        ? draft.items
        : [{
            name: 'งานเหมารวม',
            qty: 1,
            price: draft.lumpSumAmount || draft.total || 0,
            description: draft.notes || '',
          }]
      ).map((item: { name: string; qty: number; price: number; description?: string }) => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        amount: item.qty * item.price,
        description: item.description || "",
      })),

      // Totals (standardized naming for pdf-service)
      subtotal: subTotal,
      sub_total_amount: subTotal,
      vat: vatAmount,
      vat_amount: vatAmount,
      vat_percent: vatPercent,
      discount_amount: discountAmount,
      discount_type: draft.discountType || null,
      discount_value: draft.discountValue || null,
      wht: draft.wht || 0,
      total: totalAmount,
      total_amount: totalAmount,

      // Status & timestamps
      status: DocStatusIssued,
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now(),
      issued_at: admin.firestore.Timestamp.now(),
      issued_by_user_id: userId,
      user_id: userId,
      business_id: businessId,

      // Notes & tags
      notes: draft.notes || "",
      tags: [],

      // Source document link (for QUO → INV → RECEIPT chain)
      source_doc_type: draft.source_doc_type || null,
      source_doc_id: draft.source_doc_id || null,
      source_doc_no: draft.source_doc_no || null,

      // Installment info (for multi-installment billing)
      installment_no: draft.installment_no || null,
      installment_total: draft.installment_no ? (draft.installment_total || draft.total || null) : null,
      installment_remaining: draft.installment_no ? (draft.installment_remaining || null) : null,
      installment_issued_total: draft.installment_no ? (draft.installment_issued_total || null) : null,

      // Lump sum mode fields
      price_type: draft.priceType || 'ITEMIZED',
      lump_sum_amount: draft.lumpSumAmount || null,
      scope_of_work: draft.scopeOfWork || [],
      payment_milestones: draft.paymentMilestones || [],

      // ✅ AUDIT-SAFE SNAPSHOTS (immutable at issuance)
      business_snapshot: snapshots.business_snapshot,
      customer_snapshot: snapshots.customer_snapshot,
      tax_snapshot: taxSnapshot,
      payment_snapshot: snapshots.payment_snapshot,
    };

    await docRef.set(docRecord);
    console.log(
      `[DOC_ISSUED] ✅ docId=${docRef.id}, doc_no=${docRecord.doc_no}, doc_type=${docRecord.doc_type}, customer=${docRecord.customer_name}, total=${docRecord.total}฿`
    );

    // ✅ STARTER QUOTA: Consume one free document only while user is on FREE starter access
    if (plan === 'FREE' && starterQuota && lineUserId) {
      try {
        const { incrementGuestTrial } = await import("./lineLinkService");
        await incrementGuestTrial(lineUserId, userId);
      } catch (trialIncErr) {
        console.warn("[TRIAL_INCREMENT_FAIL] Unable to increment starter quota usage:", trialIncErr);
      }
    }

    const issued: IssueResult = {
      docId: docRef.id,
      docNo: docRecord.doc_no,
      docType: docRecord.doc_type,
      total: docRecord.total,
      customerName: docRecord.customer_name,
    };

    // 2. Generate PDF (queue task)
    try {
      // Note: traceId not available in this context, using docId as correlation
      const { jobId, action } = await queuePdfGeneration(userId, businessId, docRef.id, docRecord.doc_no, docRecord.doc_type);
      console.log(
        `[PDF_JOB_QUEUED] 📤 docId=${docRef.id}, doc_no=${docRecord.doc_no}, doc_type=${docRecord.doc_type}, jobId=${jobId}, action=${action}`
      );
    } catch (pdfErr) {
      // ✅ FIX 5: Use secure error logging
      const { secureError } = await import('../utils/secureConsole');
      secureError({
        tag: '[PDF_JOB_FAILED]',
        trace_id: 'n/a',
        doc_id: docRef.id,
        user_id: userId,
        business_id: businessId,
        timestamp: new Date().toISOString(),
      }, pdfErr);
      // Continue anyway - document is created
    }

    // 3.5. Auto-close QUO if this is an INV from QUO (multi-installment)
    if (docRecord.doc_type === "INVOICE" && docRecord.source_doc_type === "QUO" && docRecord.source_doc_id) {
      try {
        const { checkAndCloseQuo } = await import("../services/installmentService");
        // Get LINE user ID for notifications
        const userDoc = await db.collection("users").doc(userId).get();
        const lineUserId = userDoc.data()?.lineUserId || null;
        await checkAndCloseQuo(userId, businessId, docRecord.source_doc_id, lineUserId);
      } catch (closeErr) {
        console.warn(`[AUTO_CLOSE_QUO] Warning: ${closeErr}`);
        // Non-blocking - document is already created
      }
    }

    if (!options?.silent) {
      // 4. Reply with success
      const typeEmojiMap: Record<string, string> = {
        QUOTATION: "📋",
        INVOICE: "📄",
        RECEIPT: "✅",
      };
      const typeEmoji = typeEmojiMap[docRecord.doc_type] || "📝";

      // Check for missing business fields (warning only, does not block)
      let missingFieldsWarning = "";
      let missingFields: string[] = [];
      try {
        const { getMissingFieldsInfo } = await import("../services/businessService");
        const info = await getMissingFieldsInfo(userId, businessId);
        if (info.warning) {
          missingFieldsWarning = info.warning;
          missingFields = info.missingFields;
        }
      } catch (warnErr) {
        console.warn("[confirmAndIssueDraft] Error checking missing fields:", warnErr);
      }

      let successMessage =
        `ตึ๊ง! ${typeEmoji} ออกเอกสารสำเร็จแล้วครับ\n\n` +
        `เลขที่: ${docRecord.doc_no}\n` +
        `ลูกค้า: ${docRecord.customer_name}\n` +
        `รวม: ${docRecord.total.toLocaleString("th-TH")}฿\n\n` +
        `บันทึกเสร็จแล้ว ✅\n` +
        `กำลัง render เอกสาร PDF ให้นะครับ รอสักครู่...`;

      if (missingFieldsWarning) {
        successMessage += `\n\n${missingFieldsWarning}`;
      }

      // Check and celebrate milestone (first-time only)
      let milestoneCelebrated = false;
      if (lineUserId) {
        try {
          const { checkAndCelebrateMilestone } = await import("../services/milestoneService");
          const accessToken = getLineChannelAccessToken();
          const docType = docRecord.doc_type?.toUpperCase() || '';

          if (docType === 'QUOTATION' || docType === 'QUO') {
            milestoneCelebrated = await checkAndCelebrateMilestone(
              userId,
              lineUserId,
              'firstQuotation',
              accessToken
            );
          } else if (docType === 'INVOICE' || docType === 'INV' || docType === 'BILL') {
            milestoneCelebrated = await checkAndCelebrateMilestone(
              userId,
              lineUserId,
              'firstInvoice',
              accessToken
            );
          }
        } catch (milestoneErr) {
          console.warn('[MILESTONE] Error checking milestone:', milestoneErr);
          // Non-blocking - continue with regular success message
        }
      }

      successMessage += ``;

      // If milestone was celebrated, skip regular success message
      if (!milestoneCelebrated) {
        // Document issued successfully - show SUCCESS context buttons
        const { getContextualQuickReply } = await import("../shared/contextualQuickReply");
        const { getIncompleteSetupButtons } = await import("../ui/quickReplies");
        const quotationButtons: QuickReplyAction[] = [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📄 ทำใบวางบิลต่อ',
              text: `ใบวางบิลจาก ${docRecord.doc_no}`,
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📂 เอกสารล่าสุด',
              text: 'เอกสารล่าสุด',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏠 เมนูหลัก',
              text: 'เมนู',
            },
          },
        ];
        const invoiceButtons: QuickReplyAction[] = [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '✅ ยืนยันรับเงิน',
              text: `ยืนยันรับเงิน ${docRecord.doc_no}`,
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📂 เอกสารล่าสุด',
              text: 'เอกสารล่าสุด',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏠 เมนูหลัก',
              text: 'เมนู',
            },
          },
        ];
        const successButtons = docRecord.doc_type === 'QUOTATION'
          ? quotationButtons
          : docRecord.doc_type === 'INVOICE'
            ? invoiceButtons
            : getContextualQuickReply({ context: 'SUCCESS' });
        const finalButtons = missingFields.length > 0
          ? [...getIncompleteSetupButtons(missingFields), ...successButtons].slice(0, 13)
          : successButtons;
        await replyFn(successMessage, finalButtons);
      }

      // Push MASCOT_SUCCESS image after document success (non-blocking)
      if (lineUserId) {
        const accessToken = getLineChannelAccessToken();
        const { buildMascotImageMessage } = await import('../shared/mascotAssets');
        const { LINE_API } = await import('../shared/config');

        fetch(LINE_API.PUSH, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            to: lineUserId,
            messages: [buildMascotImageMessage('MASCOT_SUCCESS')],
          }),
        }).then((response) => {
          console.log(JSON.stringify({
            tag: '[MASCOT_SENT]',
            assetKey: 'MASCOT_SUCCESS',
            traceId: 'document_issue',
            event: 'document_success',
            docNo: docRecord.doc_no,
            result: response.ok ? 'success' : 'fail',
          }));
        }).catch(() => {
          console.log(JSON.stringify({
            tag: '[MASCOT_FAILED]',
            assetKey: 'MASCOT_SUCCESS',
            event: 'document_success',
            result: 'fail',
          }));
        });
      }
    }

    return issued;
  } catch (err) {
    // ✅ FIX 5: Use secure error logging
    const { secureError } = await import('../utils/secureConsole');
    secureError({
      tag: '[CONFIRM_AND_ISSUE_DRAFT_ERROR]',
      trace_id: 'n/a',
      user_id: userId,
      business_id: businessId,
      timestamp: new Date().toISOString(),
    }, err);
    throw err;
  }
}

/**
 * Helper: Generate document number (INV-YYYY-NNN)
 */
async function generateDocumentNumber(businessId: string, docType: string): Promise<string> {
  const today = new Date();
  const year = today.getFullYear() + 543; // Thai Buddhist year

  // Type prefix
  const typePrefix = DocNumberPrefixes[docType as keyof typeof DocNumberPrefixes] || "DOC";

  const sequence = await getNextDocumentSequence({
    businessId,
    docTypeKey: docType,
    typePrefix,
    thaiYear: year,
  });
  const number = String(sequence).padStart(3, "0");
  return `${typePrefix}-${year}-${number}`;
}

/**
 * Helper: Queue PDF generation job
 */
async function queuePdfGeneration(
  userId: string,
  businessId: string,
  docId: string,
  docNo: string,
  docType?: string,
  traceId?: string // ✅ FIX 6: Correlation ID
): Promise<{ jobId: string; action: 'CREATED' | 'IN_PROGRESS' | 'DONE' | 'REQUEUED' }> {
  const db = getDb();
  // Deterministic job ID => 1 docId = 1 job (idempotent)
  const deterministicJobId = `${businessId}_${docId}`;
  const jobRef = db.collection("pdf_generation_jobs").doc(deterministicJobId);

  let action: 'CREATED' | 'IN_PROGRESS' | 'DONE' | 'REQUEUED' = 'CREATED';

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(jobRef);
    if (!snap.exists) {
      tx.set(jobRef, {
        id: jobRef.id,
        user_id: userId,
        business_id: businessId,
        document_id: docId,
        document_no: docNo,
        doc_type: docType || null,
        status: "PENDING",
        created_at: admin.firestore.Timestamp.now(),
        attempts: 0,
        max_attempts: 3,
        traceId: traceId || null, // ✅ FIX 6: Store correlation ID
        correlationId: traceId || null, // ✅ FIX 6: Alias for clarity
      });
      action = 'CREATED';
      return;
    }

    const data = snap.data() as any;
    const status = String(data?.status || '');

    if (status === 'PENDING' || status === 'PROCESSING') {
      action = 'IN_PROGRESS';
      return;
    }

    if (status === 'DONE') {
      action = 'DONE';
      return;
    }

    // FAILED or unknown => requeue (preserve attempts; worker will handle retry cap)
    tx.set(
      jobRef,
      {
        user_id: userId,
        business_id: businessId,
        document_id: docId,
        document_no: docNo,
        doc_type: docType || data?.doc_type || null,
        status: 'PENDING',
        error: admin.firestore.FieldValue.delete(),
        created_at: data?.created_at || admin.firestore.Timestamp.now(),
        max_attempts: data?.max_attempts || 3,
      },
      { merge: true }
    );
    action = 'REQUEUED';
  });

  console.log(`[PDF_JOB_ENQUEUE] 📤 jobId=${jobRef.id} docNo=${docNo} action=${action}`);
  return { jobId: jobRef.id, action };
}

/**
 * Main entry point: Handle conversation message from LINE
 * Routes to intent-specific UX flows
 */
export async function handleConversationMessage(params: {
  userId: string;
  businessId: string;
  messageText: string;
  replyToken: string;
  lineUserId?: string; // Optional: for admin auth
  traceId?: string; // ✅ FIX 6: Correlation ID
  lineClient: {
    replyMessage(p: {
      replyToken: string;
      messages: Array<any>; // Allow any message type (text, template, etc.)
    }): Promise<void>;
  };
}): Promise<void> {
  const t0 = Date.now(); // ✅ Latency tracking: Handler start time

  const { userId, messageText, replyToken, lineUserId, traceId, lineClient } = params;
  let draftCache: LineDraft | null | undefined;
  const getDraftCached = async (): Promise<LineDraft | null> => {
    if (draftCache !== undefined) return draftCache;
    draftCache = await getDraft(userId).catch(() => null);
    return draftCache;
  };

  // ✅ FIX 2: Track reply attempt and success separately
  // didReplySuccess = true only AFTER successful send
  let didReplySuccess = false;
  let didAttemptReply = false;

  // ✅ Allowlist check BEFORE intent routing (for all draft-editing intents)
  // This ensures allowlisted users NEVER see legacy flow (cached import)
  const { getConfig } = await import("../utils/cachedHotPathImports");
  const { getHumanFirstUxEnabled } = await getConfig();
  const { isUserInAllowlist } = await import("./humanFirstAllowlist");
  const isAllowlisted = getHumanFirstUxEnabled() && lineUserId
    ? await isUserInAllowlist(lineUserId)
    : false;

  // Helper: Get contextual quick reply (auto-detect if not provided)
  const getContextualButtons = async (override?: QuickReplyAction[]): Promise<QuickReplyAction[]> => {
    // If explicit override provided, use it
    if (override && override.length > 0) {
      return override;
    }

    // Auto-detect context (cached imports for hot path)
    try {
      const { getContextualQuickReply: getCachedContextualQuickReply, getPaymentStateMapper } = await import("../utils/cachedHotPathImports");
      const { determineQuickReplyContext, getContextualQuickReply } = await getCachedContextualQuickReply();

      // CRITICAL: Get payment state to ensure deterministic payment flow
      const { getPaymentStateParam } = await getPaymentStateMapper();
      const paymentStateParam = await getPaymentStateParam(userId);

      // ✅ FIX 4: Check for active draft (don't hardcode false)
      const draft = await getDraftCached();
      const hasActiveDraft = !!draft;

      const contextParams = await determineQuickReplyContext({
        userId,
        businessId: params.businessId,
        hasActiveDraft, // ✅ FIX 4: Use actual draft check
        paymentState: paymentStateParam, // CRITICAL: Send payment state
        traceId, // HARDENING v3: Pass traceId for logging
      });
      return getContextualQuickReply(contextParams);
    } catch (err) {
      console.warn("[conversationHandler] Error determining context, using global:", err);
      // Fallback to global (cached import)
      const { getContextualQuickReply: getCachedContextualQuickReply } = await import("../utils/cachedHotPathImports");
      const { getContextualQuickReply } = await getCachedContextualQuickReply();
      return getContextualQuickReply({ context: 'GLOBAL' });
    }
  };

  // ✅ FIX 4: Reply function with hard deadline enforcement (25s)
  const replyFn = async (msg: string, quickReplyActions?: QuickReplyAction[]) => {
    // Validate message before sending
    if (!msg || msg.trim().length === 0) {
      const { getSecureConsole } = await import("../utils/cachedHotPathImports");
      const { secureError } = await getSecureConsole();
      secureError({
        tag: "[REPLY_EMPTY_MESSAGE]",
        trace_id: traceId,
        user_id: userId,
        line_user_id: lineUserId,
        timestamp: new Date().toISOString(),
      });
      msg = "ไม่เป็นไรเลยค่ะ 😊\n\nเลือกทำต่อได้จากด้านล่างนะคะ";
    }

    if (!lineUserId) {
      // Cannot use replyWithDeadline without lineUserId
      // Fallback to direct reply (shouldn't happen in normal flow)
      await lineClient.replyMessage({
        replyToken,
        messages: [{ type: "text", text: msg }],
      });
      didReplySuccess = true;
      didAttemptReply = true;
      return;
    }

    // Get contextual buttons
    const buttons = await getContextualButtons(quickReplyActions);
    const quickReply = buttons && buttons.length > 0
      ? buttons.slice(0, 13)
      : undefined;

    // ✅ Use replyWithDeadline for hard deadline enforcement (cached import)
    const { getReplyWithDeadline } = await import("../utils/cachedHotPathImports");
    const { replyWithDeadline } = await getReplyWithDeadline();
    const replyState = await replyWithDeadline({
      replyToken,
      lineUserId,
      traceId: traceId || 'n/a',
      stage: 'CONVERSATION_HANDLER',
      message: msg,
      quickReplyActions: quickReply ? quickReply.map(btn => ({
        type: 'action',
        action: btn.action,
      })) : undefined,
      replyFn: async (params) => {
        await lineClient.replyMessage(params);
      },
    });

    // ✅ Update state from replyWithDeadline result
    didAttemptReply = replyState.didAttemptReply;
    didReplySuccess = replyState.didReplySuccess;
  };

  // ✅ FIX 3: Reply with Flex message (with hard deadline + fallback)
  const replyWithFlex = async (flexMessage: Record<string, unknown>) => {
    if (!lineUserId) {
      // Cannot use replyWithDeadline without lineUserId
      await lineClient.replyMessage({
        replyToken,
        messages: [flexMessage as any],
      });
      return;
    }

    // ✅ Use replyWithDeadline for hard deadline enforcement
    const { getReplyWithDeadline } = await import("../utils/cachedHotPathImports");
    const { replyWithDeadline } = await getReplyWithDeadline();

    // Convert flex message to text for fallback
    const flexText = (flexMessage as any).altText || 'เอกสารพร้อมแล้ว';

    const replyState = await replyWithDeadline({
      replyToken,
      lineUserId,
      traceId: traceId || 'n/a',
      stage: 'REPLY_FLEX',
      message: flexText, // Fallback text if timeout
      replyFn: async (params) => {
        // Override messages with flex message (ignore params.messages from replyWithDeadline)
        await lineClient.replyMessage({
          replyToken: params.replyToken,
          messages: [flexMessage as any],
        });
      },
    });

    // Update state
    if (replyState.didReplySuccess) {
      didReplySuccess = true;
      didAttemptReply = true;
    }

    // If failed, error already logged by replyWithDeadline
    if (!replyState.didReplySuccess && !replyState.didFallbackPush) {
      // Fallback push also failed - log final error
      const { getSecureConsole } = await import("../utils/cachedHotPathImports");
      const { secureError } = await getSecureConsole();
      secureError({
        tag: "[REPLY_FLEX_COMPLETE_FAILURE]",
        trace_id: traceId,
        user_id: userId,
        line_user_id: lineUserId,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const replyWithStructuredMessages = async (
    messages: Array<Record<string, unknown>>,
    fallbackText = 'ข้อมูลพร้อมแล้วครับ'
  ) => {
    if (!lineUserId) {
      await lineClient.replyMessage({
        replyToken,
        messages: messages as any,
      });
      didReplySuccess = true;
      didAttemptReply = true;
      return;
    }

    const { getReplyWithDeadline } = await import("../utils/cachedHotPathImports");
    const { replyWithDeadline } = await getReplyWithDeadline();

    const replyState = await replyWithDeadline({
      replyToken,
      lineUserId,
      traceId: traceId || 'n/a',
      stage: 'REPLY_STRUCTURED',
      message: fallbackText,
      replyFn: async (params) => {
        await lineClient.replyMessage({
          replyToken: params.replyToken,
          messages: messages as any,
        });
      },
    });

    if (replyState.didReplySuccess) {
      didReplySuccess = true;
      didAttemptReply = true;
    }

    if (!replyState.didReplySuccess && !replyState.didFallbackPush) {
      const { getSecureConsole } = await import("../utils/cachedHotPathImports");
      const { secureError } = await getSecureConsole();
      secureError({
        tag: "[REPLY_STRUCTURED_COMPLETE_FAILURE]",
        trace_id: traceId,
        user_id: userId,
        line_user_id: lineUserId,
        timestamp: new Date().toISOString(),
      });
    }
  };

  try {
    // ✅ Latency tracking: Import overhead measurement
    const tImport0 = Date.now();

    // ✅ CRITICAL: Payment State Guard - Check BEFORE intent parsing
    // If user is in payment flow, respond with payment status and block fallback
    // ✅ Cached imports for hot path
    const { getPaymentStateService, getConversationOrchestrator } = await import("../utils/cachedHotPathImports");
    const { getPaymentState, getPaymentStatusMessage, isInPaymentFlow } = await getPaymentStateService();
    const { recognizeIntent, Intent } = await getConversationOrchestrator();

    const tImport1 = Date.now();
    const importMs = tImport1 - tImport0;

    // ✅ NEW: Command Router (highest priority routing, cached import)
    const { getCommandRouter } = await import("../utils/cachedHotPathImports");
    const { routeIncomingText, RouteType } = await getCommandRouter();
    const db = getDb();
    const draft = await getDraft(userId).catch(() => null);
    const routeResult = routeIncomingText({
      text: messageText,
      hasActiveDraft: !!draft,
      db,
    });

    console.log(JSON.stringify({
      tag: "[ROUTE_TAKEN]",
      trace_id: traceId,
      user_id: userId,
      line_user_id: lineUserId,
      route: routeResult.route,
      doc_type: routeResult.docType,
      normalized_text: routeResult.normalizedText,
      original_text: messageText,
      has_active_draft: !!draft,
      timestamp: new Date().toISOString(),
    }));

    if (
      routeResult.route === RouteType.ROUTE_EDIT_DRAFT ||
      routeResult.route === RouteType.ROUTE_FALLBACK
    ) {
      try {
        const { classifyConversationalIntent } = await import("../services/hybridAiAssistService");
        const fuzzyIntent = await classifyConversationalIntent(messageText, {
          mode: routeResult.route === RouteType.ROUTE_EDIT_DRAFT ? "draft" : "general",
        });

        if (fuzzyIntent.intent === 'DOC_EXAMPLES') {
          const { buildDocumentExamplesFlexMessage } = await import("../services/documentExamplesService");
          await replyWithStructuredMessages(
            [buildDocumentExamplesFlexMessage()],
            'ตัวอย่างเอกสาร EzDOC'
          );
          return;
        }

        if (fuzzyIntent.intent === 'WELCOME_REPLAY') {
          const { getUserPlan } = await import("./planService");
          const { buildWelcomeFlexMessage } = await import("../services/uxCopy");
          const { buildDocumentExamplesFlexMessage } = await import("../services/documentExamplesService");
          const plan = await getUserPlan(userId);
          await replyWithStructuredMessages(
            [
              buildWelcomeFlexMessage(plan, { linked: true }),
              buildDocumentExamplesFlexMessage(),
            ],
            'Welcome Card พร้อมตัวอย่างเอกสาร'
          );
          return;
        }

        if (fuzzyIntent.intent === 'HELP_GUIDE') {
          const { getHelpMessageShort } = await import("../services/helpCopy");
          const { getUserPlan } = await import("./planService");
          const { getPlanAwareMainMenu } = await import("../services/planAwareUI");
          const plan = await getUserPlan(userId);
          const quickReply = await getPlanAwareMainMenu(userId);
          await replyFn(getHelpMessageShort(plan), quickReply);
          return;
        }

        if (fuzzyIntent.intent === 'MENU') {
          const { getPlanAwareMainMenu } = await import("../services/planAwareUI");
          const quickReply = await getPlanAwareMainMenu(userId);
          await replyFn('เลือกจากเมนูได้เลยครับเจ้านาย', quickReply);
          return;
        }

        if (fuzzyIntent.intent === 'BUSINESS_SETUP_FORM') {
          const { handleSettingsCommand } = await import("./businessSettings");
          const response = await handleSettingsCommand(userId, params.businessId, 'ตั้งค่าธุรกิจแบบฟอร์ม');
          await replyFn(response);
          return;
        }

        if (fuzzyIntent.intent === 'THEME_HELP') {
          const { handleSettingsCommand } = await import("./businessSettings");
          const response = await handleSettingsCommand(userId, params.businessId, 'ตั้งค่าธีม');
          await replyFn(response);
          return;
        }

        if (fuzzyIntent.intent === 'LINK_ACCOUNT') {
          const linkUrl = 'https://liff.line.me/2008406529-Y6Bh2fT5';
          await replyFn(
            'ติ๊ดๆ เชื่อมบัญชีได้จากลิงก์นี้เลยครับ\n' +
            `${linkUrl}\n\n` +
            'เชื่อมแล้วด๊อกๆ จะช่วยจำเอกสาร ลูกค้า และข้อมูลงานของคุณต่อได้ครับ'
          );
          return;
        }

        if (fuzzyIntent.intent === 'PAYMENT_HELP' || fuzzyIntent.intent === 'UPGRADE_PRO' || fuzzyIntent.intent === 'UPGRADE_TEAM') {
          const { buildSubscriptionPaymentHelpMessage } = await import("../services/subscriptionPaymentHelpService");
          await replyFn(buildSubscriptionPaymentHelpMessage());
          return;
        }

        if (fuzzyIntent.intent === 'TEAM_INVITE') {
          const { getFaqResponse } = await import("../services/faqService");
          const faq = getFaqResponse('เชิญทีม');
          if (faq?.structuredMessages?.length) {
            await replyWithStructuredMessages(faq.structuredMessages, 'วิธีเชิญทีม');
          } else if (faq) {
            await replyFn(faq.message, faq.quickReplies || []);
          } else {
            await replyFn('ถ้าจะเริ่มใช้งานหลายคนในทีม พิมพ์ "ซื้อแพ็ค 279" ได้เลยครับ');
          }
          return;
        }

        // ✅ PAYMENT_CLAIM: Handle directly — check purchase records
        if (fuzzyIntent.intent === 'PAYMENT_CLAIM') {
          try {
            const db = getDb();
            console.log(`[conversationHandler] PAYMENT_CLAIM (fuzzy): userId=${userId}`);

            const purchasesSnap = await db
              .collection('credit_purchases')
              .where('userId', '==', userId)
              .orderBy('createdAt', 'desc')
              .limit(1)
              .get();

            if (purchasesSnap.empty) {
              await replyFn(
                "ติ๊ดๆ ยังไม่พบรายการซื้อแพ็คในระบบครับ 🔍\n\n" +
                "ถ้าต้องการซื้อแพ็ค พิมพ์:\n" +
                '💳 "ซื้อแพ็ค 99" — 1 ผู้ใช้\n' +
                '👥 "ซื้อแพ็ค 279" — หลายผู้ใช้'
              );
            } else {
              const latest = purchasesSnap.docs[0].data();
              const status = latest.status || 'UNKNOWN';
              const pkg = latest.packageName || latest.package_name || 'แพ็ค';

              if (status === 'PAID' || status === 'COMPLETED' || status === 'ACTIVE') {
                const planSnap = await db.collection('users').doc(userId).get();
                const currentPlan = planSnap.data()?.plan || planSnap.data()?.subscription?.plan || 'FREE';
                if (currentPlan === 'FREE') {
                  console.error(`[PAYMENT_CLAIM] MISMATCH: userId=${userId} PAID but plan=FREE`);
                  await replyFn(
                    "ติ๊ดๆ พบรายการซื้อ " + pkg + " สำเร็จแล้วครับ ✅\n\n" +
                    "⚠️ แต่ระบบยังแสดงแพลน FREE อยู่\n" +
                    "กำลังแจ้งแอดมินตรวจสอบให้ครับ\n\n" +
                    '📧 พิมพ์ "รายงานปัญหา" เพื่อติดตาม'
                  );
                } else {
                  await replyFn("ติ๊ดๆ แพ็คของเจ้านาย: " + currentPlan + " ✅ ออกเอกสารได้ไม่จำกัด 🎉");
                }
              } else if (status === 'PENDING_REVIEW' || status === 'PENDING') {
                await replyFn(
                  "ติ๊ดๆ พบรายการซื้อ " + pkg + " แล้วครับ 🔍\n\n" +
                  "📋 สถานะ: กำลังตรวจสอบสลิป\n" +
                  "⏱️ รออนุมัติจากแอดมิน (ปกติไม่เกิน 30 นาที)"
                );
              } else if (status === 'WAITING_FOR_SLIP') {
                await replyFn(
                  "ติ๊ดๆ พบรายการซื้อ " + pkg + " แล้วครับ 🔍\n\n" +
                  "📋 สถานะ: รอรับสลิปโอนเงิน\n" +
                  "📸 ส่งรูปสลิปมาในแชทนี้ได้เลยครับ"
                );
              } else {
                await replyFn(
                  "ติ๊ดๆ พบรายการซื้อ " + pkg + " ครับ\n📋 สถานะ: " + status + "\n📧 พิมพ์ \"รายงานปัญหา\" ถ้าต้องการความช่วยเหลือ"
                );
              }
            }
          } catch (err) {
            console.error("[conversationHandler] PAYMENT_CLAIM (fuzzy) error:", err);
            await replyFn("โอ๊ะ! เช็คสถานะไม่ได้ชั่วคราว\nพิมพ์ \"รายงานปัญหา\" ได้ครับ");
          }
          return;
        }

        if (fuzzyIntent.intent === 'PACKAGE_STATUS') {
          const { getSubscriptionStatus } = await import("../services/trustCommands");
          const sub = await getSubscriptionStatus(userId);
          if (sub.plan === 'FREE' || sub.status !== 'ACTIVE') {
            const { getStarterQuotaStatus } = await import("./lineLinkService");
            const starterQuota = await getStarterQuotaStatus(userId, lineUserId);
            await replyFn(
              `สถานะแพ็ค: FREE\n` +
              `ใช้ฟรีไปแล้ว ${starterQuota.used}/${starterQuota.quota} ใบ\n` +
              `เอกสารฟรีจะมีลายน้ำ EzDOC\n\n` +
              `EzDOC Pro 99 บาท สำหรับ 1 ผู้ใช้ ออกเอกสารได้ไม่จำกัด\n` +
              `EzDOC Team 279 บาท สำหรับหลายผู้ใช้ ออกเอกสารได้ไม่จำกัด`
            );
          } else {
            const planName = sub.plan === 'TEAM' ? 'Team' : 'Pro';
            const seatText = sub.plan === 'TEAM' ? ` (${sub.seatUsed}/${sub.seatTotal} คน)` : '';
            const renewText = sub.periodEnd ? sub.periodEnd.toDate().toLocaleDateString('th-TH') : 'ไม่ทราบ';
            await replyFn(
              `สถานะแพ็ค: ${planName}${seatText}\n` +
              `ต่ออายุ: ${sub.autoRenew ? 'อัตโนมัติ' : 'ไม่อัตโนมัติ'}\n` +
              `รอบถัดไป: ${renewText}`
            );
          }
          return;
        }

        if (fuzzyIntent.intent === 'LATEST_DOC') {
          const { getLatestDocument } = await import("../services/trustCommands");
          const latest = await getLatestDocument(userId, params.businessId);
          if (!latest) {
            await replyFn('บี๊บ! ยังไม่มีเอกสาร\nพิมพ์ "ทำใบเสนอราคา" หรือ "ทำใบวางบิล" เพื่อเริ่มสร้าง');
          } else {
            let response =
              `ติ๊ดๆ เอกสารล่าสุด: ${latest.doc_no}\n` +
              `สถานะ: ${latest.status === 'PDF_READY'
                ? 'พร้อม'
                : latest.pdf_status === 'PROCESSING'
                  ? 'กำลังสร้าง PDF'
                  : latest.pdf_status === 'FAILED'
                    ? 'สร้าง PDF ล้มเหลว'
                    : latest.status || 'ไม่ทราบ'}`;

            if (latest.pdf_status === 'PROCESSING') {
              response += '\n\nยังทำอยู่นะครับ ถ้าเกิน 2 นาทีพิมพ์ "เอกสารล่าสุด" อีกครั้ง';
            } else if (latest.pdf_path) {
              response += '\n\nพิมพ์ "ส่ง PDF อีกครั้ง" เพื่อรับลิงก์ PDF';
            }

            await replyFn(response);
          }
          return;
        }
      } catch (hybridErr) {
        console.warn('[conversationHandler] hybrid conversational intent failed:', hybridErr);
      }

      // Note: UNIFIED_BRAIN for draft context is handled in Intent.UNKNOWN section with proper draft checks
    }

    // ✅ Receipt selection gate: handle pending receipt source selection
    {
      const { getStateMetadata, setStateMetadata } = await import("../services/conversationStateService");
      const metadata = await getStateMetadata(userId);
      const pendingReceiptOptions = metadata.pendingReceiptOptions as ReceiptSourceCandidate[] | undefined;

      if (pendingReceiptOptions && pendingReceiptOptions.length > 0) {
        const trimmed = messageText.trim();
        if (/^(เมนู|menu|ช่วยเหลือ|help)$/i.test(trimmed)) {
          await setStateMetadata(userId, {
            pendingReceiptOptions: admin.firestore.FieldValue.delete(),
          });
        } else if (/^(ยกเลิก|cancel)$/i.test(trimmed)) {
          await setStateMetadata(userId, {
            pendingReceiptOptions: admin.firestore.FieldValue.delete(),
          });
          await replyFn("ติ๊ดๆ ยกเลิกการเลือกใบเสร็จแล้ว");
          return;
        } else {
          let selectedInvNo: string | null = null;
          const indexMatch = trimmed.match(/^(\d{1,2})$/);
          if (indexMatch) {
            const idx = Number(indexMatch[1]) - 1;
            if (idx >= 0 && idx < pendingReceiptOptions.length) {
              selectedInvNo = pendingReceiptOptions[idx].invNo;
            }
          }

          const invMatch = trimmed.match(/(INV-\d{4}-\d{3,})/i);
          if (!selectedInvNo && invMatch) {
            selectedInvNo = invMatch[1].toUpperCase();
          }

          if (selectedInvNo) {
            await setStateMetadata(userId, {
              pendingReceiptOptions: admin.firestore.FieldValue.delete(),
            });
            const response = await createReceiptFromInvoice(
              userId,
              params.businessId,
              `ใบเสร็จจาก ${selectedInvNo}`,
              replyFn
            );
            if (response) {
              await replyFn(response, buildDraftEditorQuickReply());
              return;
            }
          }

          const prompt = buildReceiptSelectionMessage(pendingReceiptOptions);
          const buttons = buildReceiptSelectionQuickReplies(pendingReceiptOptions);
          await replyFn(prompt, buttons);
          return;
        }
      }
    }

    const approvalApproveMatch = messageText.match(/^อนุมัติเอกสาร\s+(\S+)/i);
    const approvalRejectMatch = messageText.match(/^ปฏิเสธเอกสาร\s+(\S+)(?:\s+(.+))?/i);
    if (approvalApproveMatch || approvalRejectMatch) {
      const handled = await handleApprovalCommand({
        action: approvalApproveMatch ? 'APPROVE' : 'REJECT',
        requestId: approvalApproveMatch ? approvalApproveMatch[1] : approvalRejectMatch![1],
        reason: approvalRejectMatch?.[2],
        lineUserId,
        replyFn,
      });
      if (handled) return;
    }

    const hasQuoRef =
      /(?:QUO|QOU)[\s-]*\d+[\s-]*\d+/i.test(messageText) ||
      /ใบเสนอราคา/i.test(messageText) ||
      /เอกสาร(นี้)?/i.test(messageText);

    if (/ออกครบชุด/i.test(messageText) && hasQuoRef) {
      if (draft) {
        await clearDraft(userId).catch(() => undefined);
      }

      try {
        const response = await createInvoiceFromQuotation(
          userId,
          params.businessId,
          messageText,
          replyFn
        );
        if (!response) {
          return;
        }

        const createdDraft = await getDraft(userId);
        if (!createdDraft) {
          await replyFn("โอ๊ะ! หาใบวางบิลที่เพิ่งสร้างไม่เจอ\nลองใหม่อีกครั้งนะ");
          return;
        }

        const handled = await handleAutoChainConfirm(
          userId,
          params.businessId,
          createdDraft,
          replyFn,
          lineUserId
        );
        if (handled) {
          return;
        }

        await replyFn(response);
        return;
      } catch (err) {
        const { secureError } = await import('../utils/secureConsole');
        secureError({
          tag: '[AUTO_CHAIN_FLOW_ERROR]',
          trace_id: traceId || 'n/a',
          user_id: userId,
          business_id: params.businessId,
          timestamp: new Date().toISOString(),
        }, err);
        await replyFn(
          `โอ๊ะ! ออกครบชุดไม่สำเร็จ\n` +
          `รหัสอ้างอิง: ${traceId || 'n/a'}`
        );
        return;
      }
    }

    if (!draft && /ออกครบชุด/i.test(messageText)) {
      await replyFn(
        "โอ๊ะ! ต้องระบุใบเสนอราคาที่ต้องการออกครบชุด\n" +
        "ตัวอย่าง:\n" +
        "- ออกครบชุดจาก QUO-2569-001\n" +
        "- ออกครบชุดจากใบเสนอราคา\n" +
        "- ออกครบชุดจากเอกสารนี้"
      );
      return;
    }

    // Route by RouteType (precedence handled in router)
    if (routeResult.route === RouteType.ROUTE_SETTINGS) {
      // ✅ FIX 2: Remove pre-emptive didSend - replyFn will set didReplySuccess after successful send
      const { handleSettingsCommand } = await import("./businessSettings");
      const response = await handleSettingsCommand(userId, params.businessId, messageText);
      await replyFn(response);
      return;
    }

    if (routeResult.route === RouteType.ROUTE_CREATE_DOC && routeResult.docType) {
      // ✅ FIX 2: Remove pre-emptive didSend - replyFn will set didReplySuccess after successful send
      if (routeResult.docType === 'RECEIPT') {
        await clearDraft(userId).catch(() => undefined);

        const candidates = await getLatestIssuedInvoiceCandidates(
          userId,
          params.businessId,
          5
        );

        if (candidates.length === 0) {
          await replyFn(
            "โอ๊ะ! ยังไม่พบใบวางบิลที่ออกแล้ว\n" +
            "ออกใบวางบิลก่อน แล้วค่อยลองใหม่"
          );
          return;
        }

        if (candidates.length === 1) {
          const response = await createReceiptFromInvoice(
            userId,
            params.businessId,
            `ใบเสร็จจาก ${candidates[0].invNo}`,
            replyFn
          );
          if (response) {
            await replyFn(response, buildDraftEditorQuickReply());
          }
          return;
        }

        const { setStateMetadata } = await import("../services/conversationStateService");
        await setStateMetadata(userId, { pendingReceiptOptions: candidates });
        const prompt = buildReceiptSelectionMessage(candidates);
        const buttons = buildReceiptSelectionQuickReplies(candidates);
        await replyFn(prompt, buttons);
        return;
      }

      const { startDoc } = await import("../services/humanFirstCopy");
      // ✅ FIX: Clear draft first (prevent old draft from interfering)
      await clearDraft(userId).catch(() => { /* Non-blocking */ });
      // Map INVOICE to BILL (they're the same in draft system)
      const draftDocType = routeResult.docType === 'INVOICE' ? 'BILL' : routeResult.docType;
      // ✅ FIX: Create new draft (getOrCreateDraft will create fresh draft after clear)
      await getOrCreateDraft(userId, params.businessId, draftDocType);
      await replyFn(startDoc(routeResult.docType));
      return;
    }

    // ✅ PHASE 1: Trust Commands (SEV-0)
    if (routeResult.route === RouteType.ROUTE_TRUST_COMMAND && routeResult.trustCommand) {
      // ✅ FIX 2: Remove pre-emptive didSend - replyFn will set didReplySuccess after successful send
      const { getLatestDocument, resendPdf, getSubscriptionStatus, getSlipOcrStatus } = await import("../services/trustCommands");
      const { getLineUserIdFromFirebaseUid } = await import("../core/lineUserMapping");

      let response: string;

      switch (routeResult.trustCommand) {
        case 'LATEST_DOC': {
          const latest = await getLatestDocument(userId, params.businessId);
          if (!latest) {
            response = 'บี๊บ! ยังไม่มีเอกสาร\nพิมพ์ "ทำใบเสนอราคา" หรือ "ทำใบวางบิล" เพื่อเริ่มสร้าง';
          } else {
            const statusText = latest.status === 'PDF_READY' ? 'พร้อม' :
              latest.pdf_status === 'PROCESSING' ? 'กำลังสร้าง PDF' :
                latest.pdf_status === 'FAILED' ? 'สร้าง PDF ล้มเหลว' :
                  latest.status || 'ไม่ทราบ';
            response = `ติ๊ดๆ เอกสารล่าสุด: ${latest.doc_no}\nสถานะ: ${statusText}`;

            if (latest.pdf_status === 'PROCESSING') {
              response += '\n\nยังทำอยู่นะครับ ถ้าเกิน 2 นาทีพิมพ์ "เอกสารล่าสุด" อีกครั้ง';
              response += '';
            } else if (latest.pdf_path) {
              // PDF is ready - user can use "ส่ง PDF อีกครั้ง" to get link
              response += '\n\nพิมพ์ "ส่ง PDF อีกครั้ง" เพื่อรับลิงก์ PDF';
              response += '';
            }
          }
          break;
        }

        case 'RESEND_PDF': {
          const lineUserId = await getLineUserIdFromFirebaseUid(userId);
          if (!lineUserId) {
            response = 'โอ๊ะ! ไม่พบ LINE user ID';
          } else {
            const result = await resendPdf(userId, params.businessId, lineUserId);
            response = result.message;
          }
          break;
        }

        case 'SUBSCRIPTION_STATUS': // ✅ Updated from CREDIT_BALANCE to SUBSCRIPTION_STATUS
        case 'CREDIT_BALANCE': { // ✅ Keep for backward compatibility
          const sub = await getSubscriptionStatus(userId);
          if (sub.plan === 'FREE' || sub.status !== 'ACTIVE') {
            const { getStarterQuotaStatus } = await import("./lineLinkService");
            const starterQuota = await getStarterQuotaStatus(userId, lineUserId);
            response =
              `สถานะแพ็ค: FREE\n` +
              `ใช้ฟรีไปแล้ว ${starterQuota.used}/${starterQuota.quota} ใบ\n` +
              `เอกสารฟรีจะมีลายน้ำ EzDOC\n\n` +
              `EzDOC Pro 99 บาท สำหรับ 1 ผู้ใช้ ออกเอกสารได้ไม่จำกัด\n` +
              `EzDOC Team 279 บาท สำหรับหลายผู้ใช้ ออกเอกสารได้ไม่จำกัด\n\n` +
              `พิมพ์: ซื้อแพ็ค 99 หรือ ซื้อแพ็ค 279`;
            break;
          }

          const planName = sub.plan === 'TEAM' ? 'Team' : 'Pro';
          const seatText = sub.plan === 'TEAM' ? ` (${sub.seatUsed}/${sub.seatTotal} คน)` : '';
          const renewText = sub.periodEnd ? sub.periodEnd.toDate().toLocaleDateString('th-TH') : 'ไม่ทราบ';
          const nextBillingText = sub.periodEnd ? `รอบถัดไป: ${renewText}` : '';
          response =
            `สถานะแพ็ค: ${planName}${seatText}\n` +
            `ต่ออายุ: ${sub.autoRenew ? 'อัตโนมัติ' : 'ไม่อัตโนมัติ'}\n` +
            (nextBillingText ? `${nextBillingText}\n` : '');
          break;
        }
        case 'INSTALLMENT_SUMMARY': {
          response = await handleInstallmentSummary(userId, params.businessId, messageText);
          break;
        }

        case 'CHECK_SLIP': {
          const ocrStatus = await getSlipOcrStatus(userId, lineUserId);
          response = ocrStatus.message;
          if (ocrStatus.quickReply) {
            await replyFn(response, ocrStatus.quickReply);
            return;
          }
          break;
        }

        case 'DOC_EXAMPLES': {
          const { buildDocumentExamplesFlexMessage } = await import("../services/documentExamplesService");
          await replyWithStructuredMessages(
            [buildDocumentExamplesFlexMessage()],
            'ตัวอย่างเอกสาร EzDOC'
          );
          return;
        }

        case 'WELCOME_REPLAY': {
          const { getUserPlan } = await import("./planService");
          const { buildWelcomeFlexMessage } = await import("../services/uxCopy");
          const { buildDocumentExamplesFlexMessage } = await import("../services/documentExamplesService");
          const plan = await getUserPlan(userId);
          await replyWithStructuredMessages(
            [
              buildWelcomeFlexMessage(plan, { linked: true }),
              buildDocumentExamplesFlexMessage(),
            ],
            'Welcome Card พร้อมตัวอย่างเอกสาร'
          );
          return;
        }

        default:
          response = 'คำสั่งไม่ถูกต้อง';
      }

      await replyFn(response);
      return;
    }

    // ✅ PHASE 3: Main menu command
    if (routeResult.route === RouteType.ROUTE_MENU) {
      // ✅ FIX 2: Remove pre-emptive didSend - replyFn will set didReplySuccess after successful send
      const { getPlanAwareMainMenu } = await import("../services/planAwareUI");
      const quickReply = await getPlanAwareMainMenu(userId);
      await replyFn("ติ๊ดๆ เลือกได้เลย", quickReply);
      return;
    }

    if (routeResult.route === RouteType.ROUTE_HELP) {
      // ✅ FIX 2: Remove pre-emptive didSend - replyFn will set didReplySuccess after successful send
      // ✅ PHASE 3: Help with real examples + theme command
      const { getHelpMessage } = await import("../services/helpCopy");
      const { getUserPlan } = await import("./planService");
      const { getPlanAwareMainMenu } = await import("../services/planAwareUI");
      const plan = await getUserPlan(userId);
      const quickReply = await getPlanAwareMainMenu(userId);
      await replyFn(getHelpMessage(plan), quickReply);
      return;
    }

    // Continue to intent-based routing for ROUTE_EDIT_DRAFT and ROUTE_FALLBACK
    const intent = recognizeIntent(messageText);

    // ✅ Log import overhead
    console.log(JSON.stringify({
      tag: "[IMPORT_OVERHEAD]",
      trace_id: traceId,
      user_id: userId,
      import_ms: importMs,
      timestamp: new Date().toISOString(),
    }));

    // ✅ PRIORITY OVERRIDE: LINK_ACCOUNT always wins (before payment guards)
    // This ensures "เชื่อมต่อ" command works even during payment flows
    if (intent === Intent.LINK_ACCOUNT) {
      try {
        // ✅ FIX 2: Remove pre-emptive didSend - replyFn will set didReplySuccess after successful send
        const LIFF_ID = "2008406529-Y6Bh2fT5";
        const linkUrl = `https://liff.line.me/${LIFF_ID}`;

        // Clear image state to prevent re-triggering slip checks after linking prompt
        try {
          const { clearUserImageMode } = await import("../services/userStateService");
          const { markPendingImageUsed } = await import("../services/imageUploadService");
          await clearUserImageMode(userId).catch(() => { });
          markPendingImageUsed(userId); // Clear pending image state
        } catch (clearErr) {
          // Non-blocking: continue even if clearing fails
          const { getSecureConsole } = await import("../utils/cachedHotPathImports");
          const { secureError } = await getSecureConsole();
          secureError({
            tag: "[LINK_ACCOUNT_CLEAR_STATE_ERROR]",
            trace_id: traceId,
            user_id: userId,
            line_user_id: lineUserId,
            timestamp: new Date().toISOString(),
          }, clearErr);
        }

        // ✅ Send template message with hard deadline enforcement
        if (lineUserId) {
          const { getReplyWithDeadline } = await import("../utils/cachedHotPathImports");
          const { replyWithDeadline } = await getReplyWithDeadline();

          const templateMessage = {
            type: "template",
            altText: "ต้องเชื่อมต่อบัญชีก่อนใช้งาน",
            template: {
              type: "buttons",
              text: "ติ๊ดๆ ต้องเชื่อมต่อบัญชีก่อนใช้งาน\n\nคลิกปุ่มด้านล่างเพื่อเข้าสู่ระบบ",
              actions: [
                {
                  type: "uri",
                  label: "🔗 เชื่อมต่อบัญชี",
                  uri: linkUrl,
                },
              ],
            },
          };

          const replyState = await replyWithDeadline({
            replyToken,
            lineUserId,
            traceId: traceId || 'n/a',
            stage: 'LINK_ACCOUNT',
            message: "โอ๊ะ! ต้องเชื่อมต่อบัญชีก่อนใช้งาน", // Fallback text
            replyFn: async (params) => {
              // Override with template message
              await lineClient.replyMessage({
                replyToken: params.replyToken,
                messages: [templateMessage as any],
              });
            },
          });

          if (replyState.didReplySuccess) {
            didReplySuccess = true;
            didAttemptReply = true;
          }

          const { getSecureConsole: getSecureConsole2 } = await import("../utils/cachedHotPathImports");
          const { secureLog } = await getSecureConsole2();
          secureLog({
            tag: "[LINK_ACCOUNT_SENT]",
            trace_id: traceId,
            user_id: userId,
            line_user_id: lineUserId,
            did_reply_success: replyState.didReplySuccess,
            did_fallback_push: replyState.didFallbackPush,
            timestamp: new Date().toISOString(),
          });
        } else {
          // Fallback if no lineUserId
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "template",
                altText: "ต้องเชื่อมต่อบัญชีก่อนใช้งาน",
                template: {
                  type: "buttons",
                  text: "ติ๊ดๆ ต้องเชื่อมต่อบัญชีก่อนใช้งาน\n\nคลิกปุ่มด้านล่างเพื่อเข้าสู่ระบบ",
                  actions: [
                    {
                      type: "uri",
                      label: "🔗 เชื่อมต่อบัญชี",
                      uri: linkUrl,
                    },
                  ],
                },
              },
            ],
          });
          didReplySuccess = true;
          didAttemptReply = true;
        }

        return; // Exit early - do not run payment guards or other handlers
      } catch (err) {
        console.error("[conversationHandler] LINK_ACCOUNT error:", err);
        // Fallback to text message if template fails
        await replyFn(
          "โอ๊ะ! ต้องเชื่อมต่อบัญชีก่อนใช้งานนะ\n" +
          "กดลิงก์เพื่อเชื่อมต่อได้เลย"
        );
        return;
      }
    }

    const paymentState = await getPaymentState(userId);
    const inPaymentFlow = await isInPaymentFlow(userId);
    const adminCandidate = messageText.replace(/^[^a-zA-Zก-๙]+/i, '').trim();
    const isAdminCommand = /^admin\b/i.test(adminCandidate);

    console.log(`[conversationHandler] intent=${intent}, user=${userId}, paymentState=${paymentState}`);

    // ✅ PATCH 3: Early payment guard for PENDING_REVIEW state
    // ✅ FIX 3: Allowlist for critical intents (CANCEL, HELP, CANCEL_PAYMENT, LINK_ACCOUNT)
    if (paymentState === 'PENDING_REVIEW') {
      // Allow critical intents to bypass guard (LINK_ACCOUNT handled above, but keep here for safety)
      const allowedIntents = [
        Intent.CANCEL,
        Intent.HELP,
        Intent.CANCEL_PAYMENT,
        Intent.WIZARD_CANCEL,
        Intent.USAGE_GUIDE,
        Intent.LINK_ACCOUNT, // ✅ SAFETY: Allow LINK_ACCOUNT (though already handled above)
        Intent.ADMIN_LIST_PENDING,
        Intent.ADMIN_VIEW_SLIP,
        Intent.ADMIN_APPROVE_SLIP,
        Intent.ADMIN_REJECT_SLIP,
        Intent.ADMIN_CONFIRM_EMAIL,
        Intent.ADMIN_ADD_CREDITS,
        Intent.ADMIN_EXPORT_CSV,
        Intent.ADMIN_RERENDER_PDF,
        Intent.ADMIN_TEMPLATE_REPORT,
        Intent.CREDIT_REPORT,
      ];

      if (!allowedIntents.includes(intent) && !isAdminCommand) {
        console.log(`[conversationHandler] 🔍 Payment in review, blocking intent ${intent}: userId=${userId}`);
        await replyFn('🔍 กำลังตรวจสอบการชำระเงิน\n\n⏱️ รอสักครู่...');
        return; // Block all processing during review (except allowlisted intents)
      }
      // Allow allowlisted intents to proceed
      console.log(`[conversationHandler] ✅ Payment in review, allowing intent ${intent}: userId=${userId}`);
    }

    // If in payment flow and intent is UNKNOWN or not payment-related, respond with payment status
    // This prevents fallback during payment
    if (inPaymentFlow) {
      // ALWAYS clear conflicting states when in payment flow (before any checks)
      const { clearConversationState } = await import("../services/conversationStateService");
      const { clearDraft } = await import("./draftStore");
      const { clearBusinessSetupState } = await import("../services/businessSetupCopyPaste");
      await clearConversationState(userId);
      await clearDraft(userId);
      await clearBusinessSetupState(userId);

      // Allow payment-related intents to proceed
      const paymentRelatedIntents = [
        Intent.BUY_PACKAGE_199,
        Intent.BUY_PACKAGE_279,
        Intent.BUY_PACKAGE_3990,
        Intent.CREDIT_PURCHASE_HISTORY,
        Intent.CONFIRM_CREDIT_PAYMENT,
        Intent.PAYMENT_CLAIM,
        Intent.LINK_ACCOUNT, // ✅ SAFETY: Allow LINK_ACCOUNT (though already handled above)
      ];

      // If not payment-related intent, respond with payment status
      if (!paymentRelatedIntents.includes(intent) && intent !== Intent.IMAGE_LABEL) {
        const paymentMessage = await getPaymentStatusMessage(userId);
        if (paymentMessage) {
          console.log(`[conversationHandler] Payment state guard: userId=${userId}, state=${paymentState}, responding with payment status`);
          await replyFn(paymentMessage);
          return; // Block further processing - user is in payment flow
        }
      }
    }

    // Clear business setup state when switching to document creation or payment
    const documentCreationIntents = [
      Intent.CREATE_QUOTATION,
      Intent.CREATE_INVOICE,
      Intent.CREATE_RECEIPT,
    ];
    const paymentRelatedIntents = [
      Intent.BUY_PACKAGE_199,
      Intent.BUY_PACKAGE_279,
      Intent.BUY_PACKAGE_3990,
      Intent.CREDIT_PURCHASE_HISTORY,
      Intent.CONFIRM_CREDIT_PAYMENT,
    ];

    if (documentCreationIntents.includes(intent) || paymentRelatedIntents.includes(intent)) {
      const { clearBusinessSetupState } = await import("../services/businessSetupCopyPaste");
      await clearBusinessSetupState(userId);
    }

    // ✅ PRIORITY: Check for pending slip image (if user is in SLIP mode and no intent command)
    // This handles the case where user sent image (with recent purchase) but didn't type intent
    // User intent commands (IMAGE_LABEL) will override this in their handler
    // CRITICAL: Also check if in payment flow - process slip immediately
    if (intent !== Intent.IMAGE_LABEL) {
      // ✅ FIX 4: Load imports once (outside hot path condition checks)
      const { getUserImageMode, clearUserImageMode } = await import("../services/userStateService");
      const { hasPendingImage, getPendingImage, markPendingImageUsed } = await import("../services/imageUploadService");
      const { processSlipUpload } = await import("../services/imageUploadService");

      const imageMode = await getUserImageMode(userId);
      const hasPending = hasPendingImage(userId);

      // Process slip if:
      // 1. User is in SLIP mode AND has pending image, OR
      // 2. User is in payment flow (WAITING_FOR_SLIP) AND has pending image
      if ((imageMode === 'SLIP' && hasPending) || (inPaymentFlow && paymentState === 'WAITING_FOR_SLIP' && hasPending)) {
        const pendingMessageId = getPendingImage(userId);
        if (pendingMessageId && lineUserId) {
          // ✅ PATCH 1: IDEMPOTENCY GUARD - Check if slip already processed
          const { getRecentPendingPurchase } = await import("../services/imageUploadService");
          const recentPurchase = await getRecentPendingPurchase(userId);

          if (recentPurchase) {
            const db = getDb();
            const purchaseRef = db.collection('credit_purchases').doc(recentPurchase.purchaseId);
            const purchaseDoc = await purchaseRef.get();
            const purchaseData = purchaseDoc.data();

            // Skip if already processed (status is PENDING_REVIEW or slip_image_url exists)
            if (purchaseData?.status === 'PENDING_REVIEW' || purchaseData?.slip_image_url) {
              console.log(`[conversationHandler] ⏭️  Slip already processed, skipping: purchaseId=${recentPurchase.purchaseId}, status=${purchaseData?.status}, hasSlipUrl=${!!purchaseData?.slip_image_url}`);

              // ✅ FIX 1: Clear pending image state to prevent infinite loop
              // Mark image as used AND clear image mode to prevent re-entry
              markPendingImageUsed(userId);
              await clearUserImageMode(userId).catch(err => {
                console.warn(`[conversationHandler] Failed to clear image mode:`, err);
              });

              const { getSlipReceivedMessage, getPaymentPendingQuickReply } = await import("../services/paymentUXCopy");
              await replyFn(getSlipReceivedMessage(), getPaymentPendingQuickReply());
              return; // Skip processing - state cleared to prevent loop
            }
          }

          // User has pending slip image - process immediately
          markPendingImageUsed(userId);
          const accessToken = getLineChannelAccessToken();

          console.log(`[conversationHandler] Processing pending slip: userId=${userId}, messageId=${pendingMessageId}, paymentState=${paymentState}`);

          // Process slip asynchronously (don't block reply)
          // But send acknowledgment immediately
          const { getSlipReceivedMessage, getPaymentPendingQuickReply } = await import("../services/paymentUXCopy");
          await replyFn(getSlipReceivedMessage(), getPaymentPendingQuickReply());

          // ✅ Telemetry: Log payment acknowledgment sent
          try {
            const { getRecentPendingPurchase } = await import("../services/imageUploadService");
            const recentPurchaseForTelemetry = await getRecentPendingPurchase(userId);
            if (recentPurchaseForTelemetry) {
              const { logPaymentAckSent } = await import("../services/paymentTelemetry");
              const slipUploadedAt = admin.firestore.Timestamp.now();
              await logPaymentAckSent(
                userId,
                recentPurchaseForTelemetry.purchaseId,
                lineUserId || '',
                slipUploadedAt
              );
            }
          } catch (telemetryError) {
            // Don't block on telemetry failure
            console.warn(`[conversationHandler] Failed to log payment ack:`, telemetryError);
          }

          (async () => {
            try {
              const result = await processSlipUpload(userId, lineUserId, pendingMessageId, accessToken);
              console.log(`[conversationHandler] Processed pending slip image for user ${userId}, success=${result.success}`);

              // If processing failed, user already got acknowledgment, so no need to send error
              // The OCR process will handle final notification
              if (!result.success) {
                await replyFn(result.message, result.quickReply);
              }
            } catch (err) {
              console.error(`[conversationHandler] Error processing pending slip:`, err);
              // Error is logged but user already got acknowledgment
              // OCR will handle final status
            }
          })();

          // Clear SLIP mode
          const { setUserImageMode } = await import("../services/userStateService");
          await setUserImageMode(userId, null);

          // Return early - slip is being processed
          return;
        }
      }
    }

    // ✅ ALLOWLIST GATE: Route draft-editing intents to human-first if allowlisted
    // This ensures allowlisted users NEVER see legacy flow
    const draftEditingIntents = [
      Intent.CREATE_QUOTATION,
      Intent.CREATE_INVOICE,
      Intent.CREATE_RECEIPT,
      Intent.EDIT,
    ];

    if (isAllowlisted && draftEditingIntents.includes(intent)) {
      // Route to human-first handler (which will handle all draft-editing intents)
      const { handleHumanFirstEdit } = await import("./humanFirstHandler");
      const humanFirstResponse = await handleHumanFirstEdit(
        userId,
        params.businessId,
        messageText,
        replyFn,
        params.lineUserId,
        params.traceId
      );

      if (humanFirstResponse) {
        await replyFn(humanFirstResponse.message, humanFirstResponse.buttons);
        // ✅ Log latency before return
        const durationMs = Date.now() - t0;
        console.log(JSON.stringify({
          tag: "[HANDLER_LATENCY]",
          trace_id: traceId,
          user_id: userId,
          intent,
          duration_ms: durationMs,
          did_reply_success: didReplySuccess,
        }));
        return;
      }
      // If humanFirstResponse is null, CONFIRM was handled (already replied)
      // Log latency and return (no legacy fallback for allowlisted users)
      const durationMs = Date.now() - t0;
      console.log(JSON.stringify({
        tag: "[HANDLER_LATENCY]",
        trace_id: traceId,
        user_id: userId,
        intent,
        duration_ms: durationMs,
        did_reply_success: didReplySuccess,
        human_first_confirm: true,
      }));
      return;
    }

    // Route by intent
    switch (intent) {
      case Intent.CREATE_QUOTATION:
        // Initialize draft for quotation
        {
          try {
            const draft = await getOrCreateDraft(userId, params.businessId, "QUO");

            // ✅ HUMAN-FIRST UX: Use simple message when flag enabled (but not allowlisted - already handled above)
            const { getHumanFirstUxEnabled } = await import("../shared/config");
            if (getHumanFirstUxEnabled() && !isAllowlisted) {
              const { renderDraftSummary, renderNextSteps } = await import("./humanFirstDraftRenderer");
              const { determineHumanFirstState, getHumanFirstButtons } = await import("./humanFirstStateMachine");

              const hasItems = hasChargeableItems(draft);
              const hasCustomer = !!draft.customerName;
              const state = determineHumanFirstState(true, hasCustomer, hasItems);
              const buttons = getHumanFirstButtons(state);
              const renderCtx = {
                docType: 'QUO' as const,
                state,
                isStartMessage: true,
              };
              const guidanceResult = renderNextSteps(draft, renderCtx);
              const summary = renderDraftSummary(draft);
              const message = `📄 กำลังทำใบเสนอราคา\n\n${summary}\n\n${guidanceResult.text}`;

              await replyFn(message, buttons);
              return;
            }

            // Legacy flow (when flag=0)
            const summary = formatDraftForDisplay(draft);

            // ✅ BUTTON-FIRST: Set state and show buttons (NO text syntax)
            const { setConversationState } = await import("../services/conversationStateService");
            const { getButtonsForState, ButtonState } = await import("./conversationStateMachine");

            const hasItems = hasChargeableItems(draft);
            const hasCustomer = !!draft.customerName;
            const initialState = hasItems ? ButtonState.ITEMS_EXIST : ButtonState.DRAFT_EMPTY;
            await setConversationState(userId, initialState);

            const buttons = getButtonsForState(initialState, hasItems, hasCustomer);

            // ✅ FIX 2: Send guided message with copy-paste templates when draft is empty
            let message = `บี๊บ! เริ่มทำใบเสนอราคาแล้ว\n\n${summary}`;
            if (!hasItems && !hasCustomer) {
              message = `บี๊บ! เริ่มทำใบเสนอราคาแล้ว\n\n` +
                `คุณสามารถ:\n` +
                `- เพิ่มรายการสินค้า/บริการ\n` +
                `- เพิ่มข้อมูลลูกค้า\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `โอเค ด๊อกๆ ปล่อย “คาถาเอกสาร” ให้ละ ก๊อป-แก้-ส่ง 👇\n\n` +
                `ชื่อลูกค้า:\n` +
                `ที่อยู่:\n` +
                `เบอร์โทร:\n\n` +
                `รายการสินค้า:\n` +
                `1. [ชื่อสินค้า] [จำนวน] [ราคา]\n` +
                `2. [ชื่อสินค้า] [จำนวน] [ราคา]\n` +
                `━━━━━━━━━━━━━━━━━━━━`;
            } else if (!hasCustomer) {
              message = `บี๊บ! เริ่มทำใบเสนอราคาแล้ว\n\n${summary}\n\n` +
                `โอ๊ะ! ยังไม่มีข้อมูลลูกค้า\n` +
                `เพิ่มข้อมูลลูกค้าก่อนออกเอกสารนะ\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `ก๊อป-แก้-ส่งได้เลย:\n\n` +
                `ชื่อลูกค้า:\n` +
                `ที่อยู่:\n` +
                `เบอร์โทร:\n` +
                `━━━━━━━━━━━━━━━━━━━━`;
            } else if (!hasItems) {
              message = `บี๊บ! เริ่มทำใบเสนอราคาแล้ว\n\n${summary}\n\n` +
                `โอ๊ะ! ยังไม่มีรายการสินค้า/บริการ\n` +
                `เพิ่มรายการก่อนออกเอกสารนะ\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `ก๊อป-แก้-ส่งได้เลย:\n\n` +
                `รายการสินค้า:\n` +
                `1. [ชื่อสินค้า] [จำนวน] [ราคา]\n` +
                `2. [ชื่อสินค้า] [จำนวน] [ราคา]\n` +
                `━━━━━━━━━━━━━━━━━━━━`;
            }

            await replyFn(message, buttons);
          } catch (err) {
            console.error("[conversationHandler] CREATE_QUOTATION error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.CREATE_INVOICE:
        // Initialize draft for invoice
        {
          try {
            const draft = await getOrCreateDraft(userId, params.businessId, "BILL");

            // ✅ HUMAN-FIRST UX: Use simple message when flag enabled
            const { getHumanFirstUxEnabled } = await import("../shared/config");
            if (getHumanFirstUxEnabled()) {
              const { renderDraftSummary, renderNextSteps } = await import("./humanFirstDraftRenderer");
              const { determineHumanFirstState, getHumanFirstButtons } = await import("./humanFirstStateMachine");

              const hasItems = hasChargeableItems(draft);
              const hasCustomer = !!draft.customerName;
              const state = determineHumanFirstState(true, hasCustomer, hasItems);
              const buttons = getHumanFirstButtons(state);
              const renderCtx = {
                docType: 'BILL' as const,
                state,
                isStartMessage: true,
              };
              const guidanceResult = renderNextSteps(draft, renderCtx);
              const summary = renderDraftSummary(draft);
              const message = `📄 กำลังทำใบวางบิล\n\n${summary}\n\n${guidanceResult.text}`;

              await replyFn(message, buttons);
              return;
            }

            // Legacy flow (when flag=0)
            const summary = formatDraftForDisplay(draft);

            // ✅ BUTTON-FIRST: Set state and show buttons (NO text syntax)
            const { setConversationState } = await import("../services/conversationStateService");
            const { getButtonsForState, ButtonState } = await import("./conversationStateMachine");

            const hasItems = hasChargeableItems(draft);
            const hasCustomer = !!draft.customerName;
            const initialState = hasItems ? ButtonState.ITEMS_EXIST : ButtonState.DRAFT_EMPTY;
            await setConversationState(userId, initialState);

            const buttons = getButtonsForState(initialState, hasItems, hasCustomer);
            await replyFn(
              `บี๊บ! เริ่มทำใบวางบิลแล้ว\n\n${summary}`,
              buttons
            );
          } catch (err) {
            console.error("[conversationHandler] CREATE_INVOICE error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.CREATE_RECEIPT:
        // Initialize draft for receipt
        {
          try {
            const wantsAutoFromLatest = /^\s*(ทำ|สร้าง)?\s*ใบเสร็จ(?:รับเงิน)?\s*$/i.test(messageText.trim());
            if (wantsAutoFromLatest) {
              await clearDraft(userId).catch(() => undefined);

              const candidates = await getLatestIssuedInvoiceCandidates(
                userId,
                params.businessId,
                5
              );

              if (candidates.length === 0) {
                await replyFn(
                  "โอ๊ะ! ยังไม่พบใบวางบิลที่ออกแล้ว\n" +
                  "ออกใบวางบิลก่อน แล้วค่อยลองใหม่"
                );
                return;
              }

              if (candidates.length === 1) {
                const response = await createReceiptFromInvoice(
                  userId,
                  params.businessId,
                  `ใบเสร็จจาก ${candidates[0].invNo}`,
                  replyFn
                );
                if (response) {
                  await replyFn(response, buildDraftEditorQuickReply());
                  return;
                }
              } else {
                const { setStateMetadata } = await import("../services/conversationStateService");
                await setStateMetadata(userId, { pendingReceiptOptions: candidates });
                const prompt = buildReceiptSelectionMessage(candidates);
                const buttons = buildReceiptSelectionQuickReplies(candidates);
                await replyFn(prompt, buttons);
                return;
              }
            }

            const draft = await getOrCreateDraft(userId, params.businessId, "RECEIPT");

            // ✅ HUMAN-FIRST UX: Use simple message when flag enabled
            const { getHumanFirstUxEnabled } = await import("../shared/config");
            if (getHumanFirstUxEnabled()) {
              const { renderDraftSummary, renderNextSteps } = await import("./humanFirstDraftRenderer");
              const { determineHumanFirstState, getHumanFirstButtons } = await import("./humanFirstStateMachine");

              const hasItems = hasChargeableItems(draft);
              const hasCustomer = !!draft.customerName;
              const state = determineHumanFirstState(true, hasCustomer, hasItems);
              const buttons = getHumanFirstButtons(state);
              const renderCtx = {
                docType: 'RECEIPT' as const,
                state,
                isStartMessage: true,
              };
              const guidanceResult = renderNextSteps(draft, renderCtx);
              const summary = renderDraftSummary(draft);
              const message = `💰 กำลังทำใบเสร็จ\n\n${summary}\n\n${guidanceResult.text}`;

              await replyFn(message, buttons);
              return;
            }

            // Legacy flow (when flag=0)
            const summary = formatDraftForDisplay(draft);

            // ✅ BUTTON-FIRST: Set state and show buttons (NO text syntax)
            const { setConversationState } = await import("../services/conversationStateService");
            const { getButtonsForState, ButtonState } = await import("./conversationStateMachine");

            const hasItems = hasChargeableItems(draft);
            const hasCustomer = !!draft.customerName;
            const initialState = hasItems ? ButtonState.ITEMS_EXIST : ButtonState.DRAFT_EMPTY;
            await setConversationState(userId, initialState);

            const buttons = getButtonsForState(initialState, hasItems, hasCustomer);
            await replyFn(
              `บี๊บ! เริ่มทำใบเสร็จแล้ว\n\n${summary}`,
              buttons
            );
          } catch (err) {
            console.error("[conversationHandler] CREATE_RECEIPT error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.CREATE_INV_FROM_QUO:
        // Create Invoice from existing Quotation (with optional installment)
        {
          try {
            const response = await createInvoiceFromQuotation(
              userId,
              params.businessId,
              messageText,
              replyFn
            );
            if (response) {
              await replyFn(response, buildDraftEditorQuickReply());
            }
          } catch (err) {
            console.error("[conversationHandler] CREATE_INV_FROM_QUO error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.CREATE_REC_FROM_INV:
        // Create Receipt from existing Invoice
        {
          try {
            const response = await createReceiptFromInvoice(
              userId,
              params.businessId,
              messageText,
              replyFn
            );
            if (response) {
              await replyFn(response, buildDraftEditorQuickReply());
            }
          } catch (err) {
            console.error("[conversationHandler] CREATE_REC_FROM_INV error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.INSTALLMENT_SUMMARY:
        // Show QUO installment summary
        {
          try {
            const response = await handleInstallmentSummary(userId, params.businessId, messageText);
            // Settings command - use contextual buttons (auto-detect)
            await replyFn(response);
          } catch (err) {
            console.error("[conversationHandler] INSTALLMENT_SUMMARY error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.INSTALLMENT_DASHBOARD:
        // Show QUO installment dashboard
        {
          try {
            const response = await handleInstallmentDashboard(userId, params.businessId, messageText);
            // Settings command - use contextual buttons (auto-detect)
            await replyFn(response);
          } catch (err) {
            console.error("[conversationHandler] INSTALLMENT_DASHBOARD error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.CONFIRM_CREDIT_PAYMENT:
        // Confirm credit purchase payment
        {
          try {
            const { confirmPayment } = await import("../services/purchaseService");
            const result = await confirmPayment(userId);
            // Credit payment confirmed - show SUCCESS context buttons
            const { getContextualQuickReply } = await import("../shared/contextualQuickReply");
            const successButtons = getContextualQuickReply({ context: 'SUCCESS' });
            await replyFn(result.message, successButtons);
          } catch (err) {
            console.error("[conversationHandler] CONFIRM_CREDIT_PAYMENT error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.CREDIT_PURCHASE_HISTORY:
        // Show credit purchase history
        {
          try {
            const { getPurchaseHistory } = await import("../services/purchaseService");
            const history = await getPurchaseHistory(userId);
            // History shown - use contextual buttons (auto-detect: GLOBAL)
            await replyFn(history);
          } catch (err) {
            console.error("[conversationHandler] CREDIT_PURCHASE_HISTORY error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;
      case Intent.APPLY_PROMO_CODE:
        {
          try {
            const { parsePromoCodeFromText, previewPromoCode, setPendingPromoCode } = await import("../services/promoCodeService");
            const { PACKAGE_TYPE_PRO } = await import("../services/purchaseService");
            const promoCode = parsePromoCodeFromText(messageText);
            if (!promoCode) {
              await replyFn("ติ๊ดๆ พิมพ์โค้ดส่วนลดแบบนี้นะ\nตัวอย่าง: ใช้โค้ด PRO99");
              break;
            }

            const preview = await previewPromoCode(promoCode);
            if (!preview.valid) {
              await replyFn(
                `โอ๊ะ! โค้ดนี้ใช้ไม่ได้ (${preview.reason || "ไม่ผ่านเงื่อนไข"})\n` +
                "ลองใหม่ได้เลย"
              );
              break;
            }

            await setPendingPromoCode(userId, promoCode, preview, PACKAGE_TYPE_PRO);
            const promoInfo = preview.discountedAmount
              ? `✅ ใช้โค้ดได้ ราคาโปร ${preview.discountedAmount} บาท\n`
              : "✅ ใช้โค้ดได้แล้ว\n";
            const planHint = preview.appliesTo && preview.appliesTo !== "ALL"
              ? `ใช้ได้กับแพ็ก ${preview.appliesTo}\n`
              : "";
            const monthsHint = preview.durationMonths ? `โปรนี้ใช้ได้ ${preview.durationMonths} เดือนแรก\n` : "";

            await replyFn(
              `${promoInfo}${planHint}${monthsHint}` +
              "พิมพ์เพื่อซื้อแพ็กได้เลย"
            );
          } catch (err) {
            console.error("[conversationHandler] APPLY_PROMO_CODE error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;
      case Intent.TEAM_INVITE:
        {
          try {
            const { buildTeamInviteMessage } = await import("../services/teamInviteService");
            const message = await buildTeamInviteMessage(userId, params.businessId);
            await replyFn(message);
          } catch (err) {
            console.error("[conversationHandler] TEAM_INVITE error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;
      case Intent.JOIN_TEAM:
        {
          try {
            const { joinTeamWithCode } = await import("../services/teamInviteService");
            const message = await joinTeamWithCode(userId, messageText);
            await replyFn(message);
          } catch (err) {
            console.error("[conversationHandler] JOIN_TEAM error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;
      case Intent.AFFILIATE_INFO:
        {
          try {
            const { buildAffiliateInfoMessage } = await import("../services/affiliateService");
            const message = await buildAffiliateInfoMessage(userId);
            await replyFn(message);
          } catch (err) {
            console.error("[conversationHandler] AFFILIATE_INFO error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.USAGE_GUIDE:
        // Show usage guide (simplified, 3 steps)
        {
          try {
            const { getUsageGuideSimple } = await import("../services/uxCopy");
            const { getUserPlan } = await import("./planService");
            const plan = await getUserPlan(userId);
            // Use contextual buttons (auto-detect: GLOBAL)
            await replyFn(getUsageGuideSimple(plan));
          } catch (err) {
            console.error("[conversationHandler] USAGE_GUIDE error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.HELP:
        // Show help summary (concise)
        {
          try {
            const { getHelpSummary } = await import("../services/uxCopy");
            const { getUserPlan } = await import("./planService");
            const plan = await getUserPlan(userId);
            // Use contextual buttons (auto-detect: GLOBAL)
            await replyFn(getHelpSummary(plan));
          } catch (err) {
            console.error("[conversationHandler] HELP error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.BUSINESS_SETUP:
        // ✅ FIX 3: Clear overlapping states when entering business setup
        {
          try {
            const { clearConversationState } = await import("../services/conversationStateService");
            const { clearDraft } = await import("./draftStore");
            await clearConversationState(userId);
            await clearDraft(userId);
            console.log(`[conversationHandler] Cleared overlapping states for business setup`);
          } catch (clearErr) {
            console.warn(`[conversationHandler] Failed to clear states for business setup:`, clearErr);
            // Continue - business setup is more important
          }
        }

        // ✅ HUMAN-FIRST: Copy-paste business setup flow
        {
          try {
            const {
              getBusinessSetupState,
              setBusinessSetupState,
              getBusinessSetupTemplate,
              getBusinessSetupSummary,
              getParsedBusinessData,
              getBusinessSetupPrefillData,
              mergeBusinessData,
              getBusinessSetupDiff,
              saveBusinessData,
              clearBusinessSetupState,
            } = await import("../services/businessSetupCopyPaste");
            const { parseBusinessData, validateBusinessData } = await import("../services/businessDataParser");
            const { getBusinessSetupSummaryQuickReply, getBusinessSetupSavedQuickReply } = await import("../shared/businessSetupQuickReply");

            const currentState = await getBusinessSetupState(userId);
            const useLatestMatch = messageText.trim().match(/^(ใช้|เลือก)\s*ธุรกิจ(?:ล่าสุด)?$|^ใช้ล่าสุด$/);
            const useBusinessMatch = messageText.trim().match(/^(ใช้|เลือก)\s*ธุรกิจ\s+(.+)$/);
            const listBusinessesMatch = messageText.trim().match(/^(รายการธุรกิจ|ธุรกิจทั้งหมด|เลือกธุรกิจ)$/);
            const clearFieldsMatch = messageText.trim().match(/^(ล้างข้อมูลธุรกิจ|ล้างค่า|ล้างข้อมูล|ล้าง)$/);

            const mapClearFieldLine = (text: string): string | null => {
              const m = text.trim().match(/^ล้าง\s*(ชื่อธุรกิจ|ที่อยู่|เบอร์โทร|เลขผู้เสียภาษี|อีเมล|ธนาคาร|เลขบัญชี|ชื่อบัญชี)$/);
              if (!m) return null;
              return `${m[1]}: -`;
            };

            if (currentState === 'IDLE' && (useLatestMatch || useBusinessMatch)) {
              const { setActiveBusiness } = await import("../core/businesses");
              const bizRef = db.collection("users").doc(userId).collection("businesses");
              let targetId: string | null = null;
              if (useLatestMatch) {
                const snap = await bizRef.orderBy("updatedAt", "desc").limit(1).get();
                targetId = snap.empty ? null : snap.docs[0].id;
              } else if (useBusinessMatch) {
                const query = useBusinessMatch[2].trim().toLowerCase();
                const snap = await bizRef.get();
                for (const doc of snap.docs) {
                  const name = String(doc.data().name || '').toLowerCase();
                  if (name.includes(query)) {
                    targetId = doc.id;
                    break;
                  }
                }
              }

              if (targetId) {
                await setActiveBusiness(userId, targetId);
                await setBusinessSetupState(userId, 'WAITING_FOR_DATA');
                const prefill = await getBusinessSetupPrefillData(userId, targetId);
                await replyFn(getBusinessSetupTemplate(prefill));
              } else {
                await replyFn("โอ๊ะ! ไม่พบธุรกิจที่ต้องการ\nลองพิมพ์ชื่อธุรกิจอีกครั้งนะ");
              }
              return;
            }

            if (clearFieldsMatch) {
              const { getBusinessClearButtons } = await import("../ui/quickReplies");
              await replyFn("ติ๊ดๆ เลือกฟิลด์ที่ต้องการล้างได้เลย", getBusinessClearButtons());
              return;
            }

            if (listBusinessesMatch) {
              const { listBusinesses, formatBusinessList } = await import("../services/businessService");
              const { getBusinessRecentButtons } = await import("../ui/quickReplies");
              const businesses = await listBusinesses(userId, 8);
              const message = formatBusinessList(businesses);
              const buttons = getBusinessRecentButtons(businesses.map((b) => b.name));
              await replyFn(message, buttons);
              return;
            }

            // STEP 1: Entry point - send template
            if (currentState === 'IDLE') {
              await setBusinessSetupState(userId, 'WAITING_FOR_DATA');
              const prefill = await getBusinessSetupPrefillData(userId, params.businessId);
              const { listRecentBusinesses } = await import("../services/businessService");
              const { getBusinessRecentButtons } = await import("../ui/quickReplies");
              const recent = await listRecentBusinesses(userId, 3);
              const buttons = getBusinessRecentButtons(recent.map((b) => b.name));
              await replyFn(getBusinessSetupTemplate(prefill), buttons);
              return;
            }

            // STEP 2: User sent data - parse and show summary
            if (currentState === 'WAITING_FOR_DATA') {
              // Check if user wants to cancel
              if (messageText.trim() === 'ยกเลิก' || messageText.trim() === 'cancel') {
                await clearBusinessSetupState(userId);
                await replyFn("ติ๊ดๆ ยกเลิกการตั้งค่าธุรกิจแล้ว");
                return;
              }
              const clearLine = mapClearFieldLine(messageText);
              if (useLatestMatch || useBusinessMatch) {
                const { setActiveBusiness } = await import("../core/businesses");
                const bizRef = db.collection("users").doc(userId).collection("businesses");
                let targetId: string | null = null;
                if (useLatestMatch) {
                  const snap = await bizRef.orderBy("updatedAt", "desc").limit(1).get();
                  targetId = snap.empty ? null : snap.docs[0].id;
                } else if (useBusinessMatch) {
                  const query = useBusinessMatch[2].trim().toLowerCase();
                  const snap = await bizRef.get();
                  for (const doc of snap.docs) {
                    const name = String(doc.data().name || '').toLowerCase();
                    if (name.includes(query)) {
                      targetId = doc.id;
                      break;
                    }
                  }
                }

                if (targetId) {
                  await setActiveBusiness(userId, targetId);
                  const prefill = await getBusinessSetupPrefillData(userId, targetId);
                  await replyFn(getBusinessSetupTemplate(prefill));
                } else {
                  await replyFn("โอ๊ะ! ไม่พบธุรกิจที่ต้องการ\nลองพิมพ์ชื่อธุรกิจอีกครั้งนะ");
                }
                return;
              }
              if (listBusinessesMatch) {
                const { listBusinesses, formatBusinessList } = await import("../services/businessService");
                const { getBusinessRecentButtons } = await import("../ui/quickReplies");
                const businesses = await listBusinesses(userId, 8);
                const message = formatBusinessList(businesses);
                const buttons = getBusinessRecentButtons(businesses.map((b) => b.name));
                await replyFn(message, buttons);
                return;
              }

              // Parse user input (forgiving parser)
              const parsed = parseBusinessData(clearLine || messageText);

              const existing = await getBusinessSetupPrefillData(userId, params.businessId);
              const merged = mergeBusinessData(existing, {
                name: parsed.name || undefined,
                address: parsed.address || undefined,
                phone: parsed.phone || undefined,
                taxId: parsed.taxId || undefined,
                email: parsed.email || undefined,
                bankName: parsed.bankName || undefined,
                bankAccountNo: parsed.bankAccountNo || undefined,
                bankAccountName: parsed.bankAccountName || undefined,
              });

              // Validate merged data (but don't reject - just show what we have)
              const validation = validateBusinessData({
                name: merged.name || null,
                address: merged.address || null,
                phone: merged.phone || null,
                taxId: merged.taxId || null,
                email: merged.email || null,
                bankName: merged.bankName || null,
                bankAccountNo: merged.bankAccountNo || null,
                bankAccountName: merged.bankAccountName || null,
              });

              // Store merged data and show summary
              await setBusinessSetupState(userId, 'SHOWING_SUMMARY', merged);

              const diffLines = getBusinessSetupDiff(existing, merged);
              const summary = getBusinessSetupSummary(merged, diffLines);
              const buttons = getBusinessSetupSummaryQuickReply();

              // If missing required fields, add gentle note (not error)
              if (!validation.valid) {
                await replyFn(
                  `${summary}\n\n💡 หมายเหตุ: ยังไม่มี${validation.missingFields.join(', ')} แต่สามารถบันทึกได้ก่อนนะครับ`,
                  buttons
                );
              } else {
                await replyFn(summary, buttons);
              }
              return;
            }

            // STEP 3: User confirmed or wants to edit
            if (currentState === 'SHOWING_SUMMARY') {
              const clearLine = mapClearFieldLine(messageText);
              if (messageText === 'บันทึกข้อมูล' || messageText === 'ยืนยัน') {
                // Save business data
                const parsed = await getParsedBusinessData(userId);
                if (!parsed) {
                  await replyFn("โอ๊ะ! ไม่พบข้อมูลที่ต้องการบันทึก\nลองใหม่อีกครั้งนะ");
                  await clearBusinessSetupState(userId);
                  return;
                }

                const result = await saveBusinessData(userId, params.businessId, parsed);

                if (result.success) {
                  const buttons = getBusinessSetupSavedQuickReply();
                  await replyFn(result.message, buttons);
                } else {
                  await replyFn(result.message);
                }
                return;
              } else if (messageText === 'แก้ไขอีกครั้ง' || messageText === 'แก้ไข') {
                // Go back to waiting for data
                await setBusinessSetupState(userId, 'WAITING_FOR_DATA');
                const parsed = await getParsedBusinessData(userId);
                await replyFn(getBusinessSetupTemplate(parsed || undefined));
                return;
              } else if (clearLine) {
                const parsed = parseBusinessData(clearLine);
                const existing = await getBusinessSetupPrefillData(userId, params.businessId);
                const merged = mergeBusinessData(existing, {
                  name: parsed.name || undefined,
                  address: parsed.address || undefined,
                  phone: parsed.phone || undefined,
                  taxId: parsed.taxId || undefined,
                  email: parsed.email || undefined,
                  bankName: parsed.bankName || undefined,
                  bankAccountNo: parsed.bankAccountNo || undefined,
                  bankAccountName: parsed.bankAccountName || undefined,
                });
                await setBusinessSetupState(userId, 'SHOWING_SUMMARY', merged);
                const diffLines = getBusinessSetupDiff(existing, merged);
                const summary = getBusinessSetupSummary(merged, diffLines);
                const buttons = getBusinessSetupSummaryQuickReply();
                await replyFn(summary, buttons);
                return;
              } else {
                // Unknown input during summary - show summary again
                const parsed = await getParsedBusinessData(userId);
                if (parsed) {
                  const summary = getBusinessSetupSummary(parsed);
                  const buttons = getBusinessSetupSummaryQuickReply();
                  await replyFn(
                    `${summary}\n\nติ๊ดๆ เลือกได้เลยว่าจะบันทึกหรือแก้ไขต่อ`,
                    buttons
                  );
                } else {
                  // Lost state - restart
                  await setBusinessSetupState(userId, 'WAITING_FOR_DATA');
                  const prefill = await getBusinessSetupPrefillData(userId, params.businessId);
                  await replyFn(getBusinessSetupTemplate(prefill));
                }
                return;
              }
            }

            // Fallback: restart flow
            await setBusinessSetupState(userId, 'WAITING_FOR_DATA');
            const prefill = await getBusinessSetupPrefillData(userId, params.businessId);
            await replyFn(getBusinessSetupTemplate(prefill));
          } catch (err) {
            console.error("[conversationHandler] BUSINESS_SETUP error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.CREDIT_REPORT:
        // Credit report (admin-only for reconciliation)
        {
          try {
            // Check if this is an admin command (starts with "admin ")
            if (messageText.toLowerCase().startsWith('admin ')) {
              const { assertAdmin, AdminAuthorizationError } = await import("../services/adminAuthService");
              const { generateDailyReconciliation, formatReconciliationReport } = await import("../services/reconciliationService");

              if (!lineUserId) {
                await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
                break;
              }

              try {
                await assertAdmin(lineUserId);
              } catch (err) {
                if (err instanceof AdminAuthorizationError) {
                  await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
                  break;
                }
                throw err;
              }

              let date: Date;
              if (messageText.includes('เมื่อวาน') || messageText.includes('yesterday')) {
                date = new Date();
                date.setDate(date.getDate() - 1);
              } else {
                date = new Date(); // Today
              }

              const metrics = await generateDailyReconciliation(date);
              const report = formatReconciliationReport(metrics, date);
              await replyFn(report);
            } else {
              // Non-admin users: show simple daily report
              const { generateDailyReport } = await import("../services/reportService");
              const report = await generateDailyReport();
              // Report shown - use contextual buttons (auto-detect: GLOBAL)
              await replyFn(report);
            }
          } catch (err) {
            console.error("[conversationHandler] CREDIT_REPORT error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.CREDIT_INVOICE:
        // Get latest credit invoice
        {
          try {
            const { getLatestCreditInvoice } = await import("../services/adminReportService");
            const result = await getLatestCreditInvoice(userId);

            if (!result.found) {
              // No purchase history - use contextual buttons (auto-detect: GLOBAL)
              await replyFn(
                "โอ๊ะ! ยังไม่พบรายการซื้อแพ็ก\n" +
                "ซื้อแพ็กก่อนนะ"
              );
            } else if (result.pdfPath) {
              // Has PDF - generate short link
              const { getOrCreateShortLink } = await import("../shared/pdfFlexMessage");
              const shortToken = await getOrCreateShortLink({
                docId: result.invoiceId!,
                docNo: result.invoiceNo || "CINV",
                docType: "CREDIT_INVOICE",
                pdfPath: result.pdfPath,
                userId,
                businessId: params.businessId,
              });
              // Credit invoice shown - use contextual buttons (auto-detect: GLOBAL)
              await replyFn(
                `ติ๊ดๆ ใบกำกับภาษีแพ็ก: ${result.invoiceNo}\n\n` +
                `🔗 https://doc.ezboq.com/p/${shortToken}`
              );
            } else {
              // Credit invoice generating - use contextual buttons (auto-detect: GLOBAL)
              await replyFn(
                `ติ๊ดๆ ใบกำกับภาษีแพ็ก: ${result.invoiceNo}\n\n` +
                `⏳ PDF กำลังสร้าง รอสักครู่ได้นะ`
              );
            }
          } catch (err) {
            console.error("[conversationHandler] CREDIT_INVOICE error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.IMAGE_LABEL:
        // Handle image label - USER INTENT ALWAYS OVERRIDES SLIP DETECTION
        {
          try {
            const { processImageWithKeyword, hasPendingImage } = await import("../services/imageUploadService");
            const { setUserImageMode, getUserImageMode } = await import("../services/userStateService");

            // Determine intent from keyword
            const keywordLower = messageText.toLowerCase().trim();
            let imageMode: 'LOGO' | 'SIGNATURE' | 'STAMP' | null = null;
            let thaiName = '';

            if (keywordLower === 'โลโก้' || keywordLower === 'logo') {
              imageMode = 'LOGO';
              thaiName = 'โลโก้';
            } else if (keywordLower === 'ลายเซ็น' || keywordLower === 'signature') {
              imageMode = 'SIGNATURE';
              thaiName = 'ลายเซ็น';
            } else if (keywordLower === 'ตราประทับ' || keywordLower === 'stamp') {
              imageMode = 'STAMP';
              thaiName = 'ตราประทับ';
            }

            if (!imageMode) {
              await replyFn(
                "โอ๊ะ! ยังไม่รู้จักคำสั่งนี้\n" +
                "พิมพ์: โลโก้ / ลายเซ็น / ตราประทับ"
              );
              break;
            }

            // PRIORITY: Override any SLIP mode when user explicitly types intent
            const currentMode = await getUserImageMode(userId);
            if (currentMode === 'SLIP') {
              // User intent overrides SLIP detection
              console.log(`[IMAGE_LABEL] Overriding SLIP mode with user intent: ${imageMode}`);
            }

            // Force image_mode to user intent
            await setUserImageMode(userId, imageMode);

            // Check for pending image (do not consume here; processImageWithKeyword will consume)
            if (hasPendingImage(userId)) {
              const accessToken = getLineChannelAccessToken();
              const result = await processImageWithKeyword(userId, params.businessId, messageText, accessToken);

              // Clear image_mode after processing
              await setUserImageMode(userId, null);

              // Credit payment confirmed - show SUCCESS context buttons
              const { getContextualQuickReply } = await import("../shared/contextualQuickReply");
              const successButtons = getContextualQuickReply({ context: 'SUCCESS' });
              await replyFn(result.message, successButtons);
            } else {
              // No pending image - set mode for next image
              // Image label set - use contextual buttons (auto-detect: GLOBAL)
              await replyFn(`ติ๊ดๆ ตั้งค่าแล้ว\nส่งรูป${thaiName}ได้เลย`);
            }
          } catch (err) {
            console.error("[conversationHandler] IMAGE_LABEL error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.ADMIN_LIST_PENDING:
        // List pending review purchases
        {
          try {
            const { assertAdmin, AdminAuthorizationError } = await import("../services/adminAuthService");
            const { listPendingReviews } = await import("../services/adminReviewService");

            if (!lineUserId) {
              await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
              break;
            }

            try {
              await assertAdmin(lineUserId);
            } catch (err) {
              if (err instanceof AdminAuthorizationError) {
                await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
                break;
              }
              throw err;
            }

            // Get both PENDING_REVIEW and max retry cases
            const { getAdminQueue, formatQueueEntryAsText, getQueueSummary } = await import("../services/adminPaymentQueueService");

            const pendingReviews = await listPendingReviews();
            const adminQueue = await getAdminQueue(10);
            const summary = await getQueueSummary();

            let message = pendingReviews;

            if (adminQueue.length > 0) {
              message += `\n\n━━━━━━━━━━━━━━━━━━━━\n`;
              message += `🚨 รายการที่ลองเกิน 3 ครั้ง (${summary.total} รายการ)\n\n`;

              for (const entry of adminQueue.slice(0, 5)) {
                message += formatQueueEntryAsText(entry);
                message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`;
              }

              if (adminQueue.length > 5) {
                message += `... และอีก ${adminQueue.length - 5} รายการ\n`;
              }
            }

            await replyFn(message);
          } catch (err) {
            console.error("[conversationHandler] ADMIN_LIST_PENDING error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.ADMIN_VIEW_SLIP:
        // View slip details ("admin ดู <purchaseId>")
        {
          try {
            const { assertAdmin, AdminAuthorizationError } = await import("../services/adminAuthService");
            const { getSlipDetails } = await import("../services/adminReviewService");

            if (!lineUserId) {
              await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
              break;
            }

            try {
              await assertAdmin(lineUserId);
            } catch (err) {
              if (err instanceof AdminAuthorizationError) {
                await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
                break;
              }
              throw err;
            }

            // Extract purchaseId from message (e.g., "admin ดู abc123")
            const match = messageText.match(/^admin\s+(?:ดู|view)\s+([A-Za-z0-9_-]+)/i);
            if (!match || !match[1]) {
              await replyFn("❌ กรุณาระบุ purchaseId\n\nเช่น: admin ดู abc123");
              break;
            }
            const purchaseId = match[1];
            const result = await getSlipDetails(purchaseId);
            await replyFn(result);
          } catch (err) {
            console.error("[conversationHandler] ADMIN_VIEW_SLIP error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.ADMIN_APPROVE_SLIP:
        // Approve slip ("admin ยืนยัน <purchaseId>")
        {
          try {
            const { assertAdmin, AdminAuthorizationError } = await import("../services/adminAuthService");
            const { approveSlip } = await import("../services/adminReviewService");

            if (!lineUserId) {
              await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
              break;
            }

            try {
              await assertAdmin(lineUserId);
            } catch (err) {
              if (err instanceof AdminAuthorizationError) {
                await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
                break;
              }
              throw err;
            }

            // Extract purchaseId from message (e.g., "admin ยืนยัน abc123")
            const match = messageText.match(/^admin\s+(?:ยืนยัน|approve)\s+([A-Za-z0-9_-]+)/i);
            if (!match || !match[1]) {
              await replyFn("❌ กรุณาระบุ purchaseId\n\nเช่น: admin ยืนยัน abc123");
              break;
            }
            const purchaseId = match[1];
            const result = await approveSlip(purchaseId, lineUserId);
            await replyFn(result);
          } catch (err) {
            console.error("[conversationHandler] ADMIN_APPROVE_SLIP error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.ADMIN_REJECT_SLIP:
        // Reject slip ("admin ปฏิเสธ <purchaseId> <reason>")
        {
          try {
            const { assertAdmin, AdminAuthorizationError } = await import("../services/adminAuthService");
            const { rejectSlip } = await import("../services/adminReviewService");

            if (!lineUserId) {
              await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
              break;
            }

            try {
              await assertAdmin(lineUserId);
            } catch (err) {
              if (err instanceof AdminAuthorizationError) {
                await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
                break;
              }
              throw err;
            }

            // Extract purchaseId and reason from message (e.g., "admin ปฏิเสธ abc123 สลิปไม่ชัด")
            const match = messageText.match(/^admin\s+(?:ปฏิเสธ|reject)\s+([A-Za-z0-9_-]+)(?:\s+(.+))?/i);
            if (!match || !match[1]) {
              await replyFn("❌ กรุณาระบุ purchaseId\n\nเช่น: admin ปฏิเสธ abc123 สลิปไม่ชัด");
              break;
            }
            const purchaseId = match[1];
            const reason = match[2] || 'ไม่ผ่านการตรวจสอบ';
            const result = await rejectSlip(purchaseId, lineUserId, reason);
            await replyFn(result);
          } catch (err) {
            console.error("[conversationHandler] ADMIN_REJECT_SLIP error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.ADMIN_CONFIRM_EMAIL:
        // Confirm via email ("admin ยืนยันอีเมล <purchaseId> [email text]")
        {
          try {
            const { assertAdmin, AdminAuthorizationError } = await import("../services/adminAuthService");
            const { confirmViaEmail } = await import("../services/adminReviewService");

            if (!lineUserId) {
              await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
              break;
            }

            try {
              await assertAdmin(lineUserId);
            } catch (err) {
              if (err instanceof AdminAuthorizationError) {
                await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
                break;
              }
              throw err;
            }

            // Extract purchaseId and optional email text from message
            // Pattern: "admin ยืนยันอีเมล <purchaseId> [email text]"
            const match = messageText.match(/^admin\s+(?:ยืนยันอีเมล|confirm email)\s+([A-Za-z0-9_-]+)(?:\s+(.+))?/is);
            if (!match || !match[1]) {
              await replyFn("❌ กรุณาระบุ purchaseId\n\nเช่น: admin ยืนยันอีเมล abc123\n\nหรือ: admin ยืนยันอีเมล abc123 [วางข้อความอีเมลธนาคาร]");
              break;
            }
            const purchaseId = match[1];
            const emailText = match[2]?.trim();

            if (!emailText || emailText.length < 50) {
              await replyFn(`📧 กรุณาส่งข้อความอีเมลธนาคารที่ได้รับเพื่อยืนยันการชำระเงินสำหรับ ${purchaseId}\n\n(ส่งข้อความใหม่)`);
              break;
            }

            const result = await confirmViaEmail(purchaseId, lineUserId, emailText);
            await replyFn(result);
          } catch (err) {
            console.error("[conversationHandler] ADMIN_CONFIRM_EMAIL error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.ADMIN_ADD_CREDITS:
        // Manual credit adjustment ("admin เติมเครดิต <userId> <amount> [reason]")
        {
          try {
            const { assertAdmin, AdminAuthorizationError } = await import("../services/adminAuthService");
            const { addManualCredits } = await import("../services/adminReviewService");

            if (!lineUserId) {
              await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
              break;
            }

            try {
              await assertAdmin(lineUserId);
            } catch (err) {
              if (err instanceof AdminAuthorizationError) {
                await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
                break;
              }
              throw err;
            }

            const match = messageText.match(/^admin\s+(?:เติมเครดิต|add credits?)\s+(\S+)\s+(\d+)(?:\s+(.+))?/i);
            if (!match || !match[1] || !match[2]) {
              await replyFn('❌ รูปแบบไม่ถูกต้อง\n\nตัวอย่าง: admin เติมเครดิต userId 100');
              break;
            }

            const targetUserId = match[1];
            const credits = parseInt(match[2], 10);
            const reason = match[3]?.trim();

            if (!Number.isFinite(credits) || credits <= 0) {
              await replyFn('❌ จำนวนเครดิตต้องมากกว่า 0');
              break;
            }

            const result = await addManualCredits(targetUserId, credits, lineUserId, reason);
            await replyFn(result);
          } catch (err) {
            console.error("[conversationHandler] ADMIN_ADD_CREDITS error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.ADMIN_RERENDER_PDF:
        // Force PDF re-render ("admin rerender <docId>")
        {
          try {
            const { assertAdmin, AdminAuthorizationError } = await import("../services/adminAuthService");

            if (!lineUserId) {
              await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
              break;
            }

            try {
              await assertAdmin(lineUserId);
            } catch (err) {
              if (err instanceof AdminAuthorizationError) {
                await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
                break;
              }
              throw err;
            }

            const normalized = messageText.replace(/^[^a-zA-Zก-๙]+/i, '').trim();
            const match = normalized.match(/^admin\s+(?:rerender|re-render|render)\s+(\S+)/i);
            if (!match || !match[1]) {
              await replyFn("❌ กรุณาระบุ docId\n\nตัวอย่าง: admin rerender Mbky5cNHbckjcfHKdoPs");
              break;
            }
            const requestedId = match[1].trim();

            const db = getDb();
            let targetUserId: string | null = null;
            let targetBusinessId: string | null = null;
            let docId = requestedId;
            let docNo = requestedId;
            let docType = '';
            let docRef: FirebaseFirestore.DocumentReference | null = null;
            const looksLikeDocNo = /^[A-Z]{2,4}-\d{4}-\d{3,}$/i.test(requestedId);

            // 1) Prefer resolving from existing PDF job (fast + accurate)
            const jobQuery = await db
              .collection('pdf_generation_jobs')
              .where('document_id', '==', requestedId)
              .limit(1)
              .get();

            if (!jobQuery.empty) {
              const jobData = jobQuery.docs[0].data() as Record<string, unknown>;
              targetUserId = String(jobData.user_id || '');
              targetBusinessId = String(jobData.business_id || '');
              docId = String(jobData.document_id || requestedId);
              docNo = String(jobData.document_no || docNo);
              docType = String(jobData.doc_type || docType);
              if (targetUserId && targetBusinessId) {
                docRef = db
                  .collection('users')
                  .doc(targetUserId)
                  .collection('businesses')
                  .doc(targetBusinessId)
                  .collection('documents')
                  .doc(docId);
              }
            }

            // 2) Fast path: resolve from short links (doc_no/doc_id)
            if (!docRef) {
              const shortLinks = db.collection('pdf_short_links');
              const linkQuery = await shortLinks
                .where('doc_no', '==', requestedId)
                .limit(1)
                .get();
              if (!linkQuery.empty) {
                const linkData = linkQuery.docs[0].data() as Record<string, unknown>;
                targetUserId = String(linkData.user_id || '');
                targetBusinessId = String(linkData.business_id || '');
                docId = String(linkData.doc_id || requestedId);
                docNo = String(linkData.doc_no || docNo);
                docType = String(linkData.doc_type || docType);
                const refPath = String(linkData.document_ref || '');
                if (refPath) {
                  docRef = db.doc(refPath);
                } else if (targetUserId && targetBusinessId) {
                  docRef = db
                    .collection('users')
                    .doc(targetUserId)
                    .collection('businesses')
                    .doc(targetBusinessId)
                    .collection('documents')
                    .doc(docId);
                }
              }
            }

            if (!docRef && !looksLikeDocNo) {
              if (requestedId.includes('/')) {
                const idQuery = await db
                  .collectionGroup('documents')
                  .where(admin.firestore.FieldPath.documentId(), '==', requestedId)
                  .limit(1)
                  .get();
                if (!idQuery.empty) {
                  docRef = idQuery.docs[0].ref;
                  const docData = idQuery.docs[0].data() as Record<string, unknown>;
                  docId = docRef.id;
                  const pathParts = docRef.path.split('/');
                  targetUserId = pathParts[1] || null;
                  targetBusinessId = pathParts[3] || null;
                  docNo = String(docData.doc_no || docData.docNo || docNo);
                  docType = String(docData.doc_type || docData.docType || docType);
                }
              } else {
                const idQuery = await db
                  .collectionGroup('documents')
                  .where('id', '==', requestedId)
                  .limit(1)
                  .get();
                if (!idQuery.empty) {
                  docRef = idQuery.docs[0].ref;
                  const docData = idQuery.docs[0].data() as Record<string, unknown>;
                  docId = docRef.id;
                  const pathParts = docRef.path.split('/');
                  targetUserId = pathParts[1] || null;
                  targetBusinessId = pathParts[3] || null;
                  docNo = String(docData.doc_no || docData.docNo || docNo);
                  docType = String(docData.doc_type || docData.docType || docType);
                }
              }
            }

            // 3) Fallback: resolve by doc_no if user passes QUO/INV/REC number
            if (!docRef && looksLikeDocNo) {
              const docNoQuery = await db
                .collectionGroup('documents')
                .where('doc_no', '==', requestedId)
                .limit(1)
                .get();
              if (!docNoQuery.empty) {
                docRef = docNoQuery.docs[0].ref;
                const docData = docNoQuery.docs[0].data() as Record<string, unknown>;
                docId = docRef.id;
                const pathParts = docRef.path.split('/');
                targetUserId = pathParts[1] || null;
                targetBusinessId = pathParts[3] || null;
                docNo = String(docData.doc_no || docNo);
                docType = String(docData.doc_type || docType);
              }
            }

            if (!docRef || !targetUserId || !targetBusinessId) {
              await replyFn(`ไม่พบเอกสาร docId=${docId}\n\nลองใช้ docNo เช่น QUO-2569-002`);
              break;
            }

            const jobId = `${targetBusinessId}_${docId}`;
            const jobRef = db.collection('pdf_generation_jobs').doc(jobId);

            await db.runTransaction(async (tx) => {
              const jobSnap = await tx.get(jobRef);
              const createdAt = jobSnap.exists
                ? jobSnap.get('created_at')
                : admin.firestore.Timestamp.now();

              tx.set(
                jobRef,
                {
                  id: jobId,
                  user_id: targetUserId,
                  business_id: targetBusinessId,
                  document_id: docId,
                  document_no: docNo,
                  doc_type: docType || null,
                  status: 'PENDING',
                  attempts: 0,
                  max_attempts: 3,
                  error: admin.firestore.FieldValue.delete(),
                  pdf_path: admin.firestore.FieldValue.delete(),
                  pdfUrl: admin.firestore.FieldValue.delete(),
                  completedAt: admin.firestore.FieldValue.delete(),
                  delivery_status: admin.firestore.FieldValue.delete(),
                  delivery_error: admin.firestore.FieldValue.delete(),
                  delivery_started_at: admin.firestore.FieldValue.delete(),
                  created_at: createdAt,
                  traceId: traceId || null,
                  correlationId: traceId || null,
                  rerendered_at: admin.firestore.FieldValue.serverTimestamp(),
                  forced_by: lineUserId,
                },
                { merge: true }
              );

              tx.set(
                docRef,
                {
                  pdfState: 'QUEUED',
                  pdfReady: false,
                  pdf_delivery_status: 'PENDING',
                  pdf_delivery_error: admin.firestore.FieldValue.delete(),
                  updated_at: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            });

            await replyFn(`✅ รับคำสั่ง re-render แล้ว\nเอกสาร: ${docNo}\nระบบจะส่ง PDF ใหม่เมื่อพร้อม`);
          } catch (err) {
            console.error("[conversationHandler] ADMIN_RERENDER_PDF error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.ADMIN_TEMPLATE_REPORT:
        // Report template usage ("admin รายงานเทมเพลต")
        {
          try {
            const { assertAdmin, AdminAuthorizationError } = await import("../services/adminAuthService");
            const { getTemplateReport } = await import("../services/templateReportService");

            if (!lineUserId) {
              await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
              break;
            }

            try {
              await assertAdmin(lineUserId);
            } catch (err) {
              if (err instanceof AdminAuthorizationError) {
                await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
                break;
              }
              throw err;
            }

            const report = await getTemplateReport({
              businessId: params.businessId,
              limit: 20,
            });
            await replyFn(report);
          } catch (err) {
            console.error("[conversationHandler] ADMIN_TEMPLATE_REPORT error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.ADMIN_EXPORT_CSV:
        // Export CSV ("admin export เครดิต csv")
        {
          try {
            const { assertAdmin, AdminAuthorizationError } = await import("../services/adminAuthService");
            const { exportCreditPurchasesCSV } = await import("../services/reportService");

            if (!lineUserId) {
              await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
              break;
            }

            try {
              await assertAdmin(lineUserId);
            } catch (err) {
              if (err instanceof AdminAuthorizationError) {
                await replyFn("⛔ คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น");
                break;
              }
              throw err;
            }

            // Check for date range (e.g., "admin export เครดิต csv เดือนนี้")
            let startDate: Date | null = null;
            let endDate: Date | null = null;
            if (messageText.includes('เดือนนี้') || messageText.includes('this month')) {
              const now = new Date();
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            }
            const csvUrl = await exportCreditPurchasesCSV(startDate, endDate);
            await replyFn(`📥 CSV Export:\n\n${csvUrl}\n\n(URL หมดอายุใน 1 ชั่วโมง)`);
          } catch (err) {
            console.error("[conversationHandler] ADMIN_EXPORT_CSV error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.UNKNOWN:
        // ✅ FIX 4: State-aware fallback - Never reset state, always provide context-specific help
        {
          try {
            // Get current user state
            const { getConversationState } = await import("../services/conversationStateService");
            const draftStore = await import("./draftStore");

            const conversationState = await getConversationState(userId);
            // Check if draft exists (getDraft returns null if no draft)
            const draft = await draftStore.getDraft(userId);
            const draftActive = !!draft;
            const draftHasContent = !!draft?.customerName || (draft?.items?.length ?? 0) > 0;

            // ✅ Copy-block fallback BEFORE FAQ (avoid pricing FAQ hijack on "ราคาเหมารวม")
            if (!draftHasContent && isLikelyCopyEditBlock(messageText)) {
              try {
                const { parseEzDocText } = await import("./parse");
                const { renderPostParseSummary } = await import("../services/uxCopy");
                const { getButtonsForState, ButtonState } = await import("./conversationStateMachine");
                const parsed = parseEzDocText(messageText);
                const hasSignals =
                  (parsed.items && parsed.items.length > 0) ||
                  typeof parsed.lump_sum_amount === 'number' ||
                  !!parsed.customer_name ||
                  !!parsed.customer_legal_name ||
                  !!parsed.doc_type;

                if (hasSignals) {
                  const parsedDocType = parsed.doc_type || "QUO";
                  const draftDocType =
                    parsedDocType === "RECEIPT"
                      ? "RECEIPT"
                      : parsedDocType === "BILL"
                        ? "BILL"
                        : "QUO";

                  await draftStore.getOrCreateDraft(userId, params.businessId, draftDocType);

                  let hadItems = false;
                  const updatedDraft = await updateDraftWithTransaction(userId, (draftState) => {
                    const updates: Partial<LineDraft> = {};
                    hadItems = (draftState.items || []).length > 0;

                    if (parsed.customer_name) {
                      updates.customerName = parsed.customer_name;
                    }
                    if (parsed.customer_legal_name) {
                      updates.customerLegalName = parsed.customer_legal_name;
                      if (!parsed.customer_name) {
                        updates.customerName = parsed.customer_legal_name;
                      }
                    }
                    if (parsed.customer_tax_id) {
                      updates.customerTaxId = parsed.customer_tax_id;
                    }
                    if (parsed.customer_branch) {
                      updates.customerBranch = parsed.customer_branch;
                    }
                    if (parsed.customer_address) {
                      updates.customerAddress = parsed.customer_address;
                    }
                    if (parsed.customer_contact_name) {
                      updates.customerContactName = parsed.customer_contact_name;
                    }

                    if (parsed.price_type === "LUMP_SUM") {
                      updates.priceType = "LUMP_SUM";
                      const lumpSumName = parsed.subject_th || parsed.subject_en || "งานเหมารวม";
                      if (typeof parsed.lump_sum_amount === "number") {
                        updates.lumpSumAmount = parsed.lump_sum_amount;
                        updates.items = [{
                          name: lumpSumName,
                          qty: 1,
                          price: parsed.lump_sum_amount,
                        }];
                      }
                      if (parsed.scope_of_work && parsed.scope_of_work.length > 0) {
                        updates.scopeOfWork = parsed.scope_of_work;
                      }
                      if (parsed.payment_milestones && parsed.payment_milestones.length > 0) {
                        updates.paymentMilestones = parsed.payment_milestones;
                      }
                      if (parsed.notes) {
                        updates.notes = parsed.notes;
                      }
                    }

                    if (parsed.items && parsed.items.length > 0 && parsed.price_type !== "LUMP_SUM") {
                      const newItems = parsed.items.map((item) => ({
                        name: item.description_th || item.description_en || "",
                        qty: item.qty || 1,
                        price: item.unit_price || 0,
                      }));
                      updates.items = hadItems ? [...(draftState.items || []), ...newItems] : newItems;
                    }
                    if (parsed.notes && parsed.price_type !== "LUMP_SUM") {
                      updates.notes = parsed.notes;
                    }
                    if (typeof parsed.discount_amount === 'number' && parsed.discount_amount > 0) {
                      updates.discountAmount = parsed.discount_amount;
                      updates.discountType = 'AMOUNT';
                      updates.discountValue = parsed.discount_amount;
                    }

                    return updates;
                  });

                  if (updatedDraft) {
                    draftCache = updatedDraft;
                    const hasItems = updatedDraft.items.length > 0;
                    const hasCustomer = !!updatedDraft.customerName;
                    const state = hasItems ? ButtonState.ITEMS_EXIST : ButtonState.DRAFT_EMPTY;
                    const buttons = getButtonsForState(state, hasItems, hasCustomer);
                    const summaryMsg = renderPostParseSummary({
                      ...parsed,
                      warnings: updatedDraft.docType
                        ? (parsed.warnings || []).filter((w) => w !== "MISSING_DOC_TYPE")
                        : parsed.warnings
                    }, {
                      customerOverride: updatedDraft.customerName || null,
                      itemCountOverride: updatedDraft.items.length,
                      totalOverride: updatedDraft.total,
                    });
                    const mergeNote = hadItems && parsed.items && parsed.items.length > 0
                      ? `\n\nเพิ่มเข้าไปแล้ว หากต้องการแทนที่ทั้งหมดให้พิมพ์ "เริ่มใหม่" แล้วส่งบล็อกอีกครั้ง`
                      : '';
                    await replyFn(`${summaryMsg}${mergeNote}`, buttons);
                    return;
                  }
                }
              } catch (err) {
                console.warn('[conversationHandler] Copy-block parse (pre-FAQ) failed:', err);
              }
            }

            if (!draftHasContent) {
              const { getFaqResponse } = await import("../services/faqService");
              const faq = getFaqResponse(messageText);
              if (faq) {
                if (faq.structuredMessages && faq.structuredMessages.length > 0) {
                  await replyWithStructuredMessages(faq.structuredMessages, faq.message);
                  return;
                }
                await replyFn(faq.message, faq.quickReplies);
                return;
              }
            }

            const { getWizardState } = await import("../services/wizardService");
            const { getBusinessChecklist } = await import("../services/businessService");
            const [wizardState, checklist] = await Promise.all([
              getWizardState(userId),
              getBusinessChecklist(userId, params.businessId),
            ]);

            const criticalFields = ['name', 'address', 'phone'];
            const missingFields = checklist.items
              .filter(item => criticalFields.includes(item.field) && !item.completed)
              .map(item => item.field === 'name' ? 'business_name' : item.field);

            // ✅ UNIFIED_BRAIN ESCAPE: Try AI before forgivingParser — but ONLY when no active draft
            // When user has active draft, they're likely entering items/customer data → let forgivingParser handle
            if (!draft) {
              const { getUnifiedBrainEnabled } = await import("../shared/config");
              if (getUnifiedBrainEnabled()) {
                try {
                  const { handleWithAIFallback } = await import("./aiFallbackBrain");
                  const aiResult = await handleWithAIFallback({
                    userId,
                    businessId: params.businessId,
                    lineUserId: String(lineUserId || ""),
                    messageText,
                    traceId,
                  });
                  if (aiResult.handled) {
                    const { getMainMenuButtons } = await import("../ui/quickReplies");
                    await replyFn(aiResult.message, getMainMenuButtons());
                    return;
                  }
                } catch (brainErr) {
                  console.warn("[UNIFIED_BRAIN] pre-parser escape error:", brainErr);
                }
              }
            }

            // ✅ Try forgiving parser before fallback (handles "ลูกค้าแมวจร" / "อาหารแมว3000")
            if (!paymentState || paymentState === 'NO_PAYMENT') {
              try {
                const { parseForgivingInput, ParsedActionType } = await import("./forgivingParser");
                const actions = parseForgivingInput(messageText, {
                  hasActiveDraft: !!draft,
                  hasCustomer: !!draft?.customerName,
                  hasItems: (draft?.items?.length ?? 0) > 0,
                });
                // ✅ Filter actions with sufficient confidence
                const goodActions = actions.filter((a) => (a.confidence ?? 0) >= 0.7);
                const action = goodActions[0]; // First good action for non-item commands

                if (action) {
                  const { getButtonsForState, ButtonState } = await import("./conversationStateMachine");
                  const { setConversationState } = await import("../services/conversationStateService");

                  if (action.type === ParsedActionType.TEMPLATE) {
                    const { getCopyEditTemplate } = await import('../services/uxCopy');
                    await replyFn(getCopyEditTemplate());
                    return;
                  }

                  if (action.type === ParsedActionType.HELP || action.type === ParsedActionType.MENU) {
                    const { getHelpMessageShort } = await import('../services/helpCopy');
                    const { getUserPlan } = await import('./planService');
                    const plan = await getUserPlan(userId);
                    await replyFn(getHelpMessageShort(plan));
                    return;
                  }

                  const customerName = action.payload?.customerName;
                  if (action.type === ParsedActionType.SET_CUSTOMER_NAME && customerName) {
                    if (!draft) {
                      await getOrCreateDraft(userId, params.businessId, 'QUO');
                    }
                    const updatedDraft = await updateDraftWithTransaction(userId, () => ({
                      customerName,
                    }));
                    await setConversationState(userId, ButtonState.CUSTOMER_SET);
                    if (updatedDraft) {
                      draftCache = updatedDraft;
                      const summary = formatDraftForDisplay(updatedDraft);
                      const buttons = getButtonsForState(ButtonState.CUSTOMER_SET, updatedDraft.items.length > 0, true);
                      await replyFn(`ติ๊ดๆ ตั้งชื่อลูกค้าเป็น "${customerName}" แล้วครับ\nถ้าไม่ถูก พิมพ์ 'ลูกค้า [ชื่อที่ถูกต้อง]'\n\n${summary}`, buttons);
                      return;
                    }
                  }

                  // ✅ MULTI-LINE ITEMS: Collect ALL ADD_ITEM actions and add them in one batch
                  const itemActions = goodActions.filter(
                    (a) => a.type === ParsedActionType.ADD_ITEM && a.payload?.item
                  );
                  if (itemActions.length > 0) {
                    // ✅ Only create draft if none exists — preserve existing doc type (INV/RECEIPT)
                    if (!draft) {
                      await getOrCreateDraft(userId, params.businessId, 'QUO');
                    }
                    const newItems = itemActions.map((a) => ({
                      name: a.payload!.item!.name,
                      qty: a.payload!.item!.qty,
                      price: a.payload!.item!.price,
                    }));
                    const updatedDraft = await updateDraftWithTransaction(userId, (draftState) => ({
                      items: [...(draftState.items || []), ...newItems],
                    }));
                    if (updatedDraft) {
                      draftCache = updatedDraft;
                    }
                    await setConversationState(userId, ButtonState.ITEMS_EXIST);
                    const finalDraft = await getDraftCached();
                    if (finalDraft) {
                      const summary = formatDraftForDisplay(finalDraft);
                      const buttons = getButtonsForState(ButtonState.ITEMS_EXIST, true, !!finalDraft.customerName);
                      const countMsg = newItems.length > 1
                        ? `ติ๊ดๆ เพิ่ม ${newItems.length} รายการแล้ว`
                        : `ติ๊ดๆ เพิ่มรายการแล้ว`;
                      await replyFn(`${countMsg}\n\n${summary}`, buttons);
                      return;
                    }
                  }
                }
              } catch (err) {
                console.warn('[conversationHandler] UNKNOWN forgivingParser failed:', err);
              }
            }

            // ✅ UNIFIED BRAIN: AI fallback before generic state-aware fallback
            // Skip when user has active draft — state-aware fallback is more appropriate
            if (!draftActive) {
              const { getUnifiedBrainEnabled } = await import("../shared/config");
              if (getUnifiedBrainEnabled()) {
                try {
                  const { handleWithAIFallback } = await import("./aiFallbackBrain");
                  const aiResult = await handleWithAIFallback({
                    userId,
                    businessId: params.businessId,
                    lineUserId: String(lineUserId || ""),
                    messageText,
                    traceId,
                  });
                  if (aiResult.handled) {
                    const { getMainMenuButtons } = await import("../ui/quickReplies");
                    await replyFn(aiResult.message, getMainMenuButtons());
                    return;
                  }
                } catch (aiErr) {
                  console.error("[UNIFIED_BRAIN] fallback error, using state-aware:", aiErr);
                }
              }
            }

            // ✅ FIX 4: Use state-aware fallback
            const { getStateAwareFallback } = await import("../utils/stateAwareFallback");
            const fallback = await getStateAwareFallback(userId, {
              conversationState,
              hasActiveDraft: draftActive,
              paymentState,
              wizardStep: wizardState?.step || null,
              missingBusinessFields: missingFields,
            }, traceId); // HARDENING v3: Pass traceId for logging

            console.log(`[conversationHandler] UNKNOWN intent - state-aware fallback: conversationState=${conversationState}, hasDraft=${draftActive}, paymentState=${paymentState}`);
            await replyFn(fallback.message, fallback.quickReply);
            return; // State preserved, user got help
          } catch (err) {
            console.error("[conversationHandler] UNKNOWN error:", err);
            // ✅ FIX 4: Always reply, even on error
            const { getGlobalFallbackMessage } = await import("../services/paymentUXCopy");
            const { getPlanAwareMainMenu } = await import("../services/planAwareUI");
            const buttons = await getPlanAwareMainMenu(userId);
            await replyFn(getGlobalFallbackMessage(), buttons);
          }
        }
        break;

        // Legacy code below (kept for reference, but UNKNOWN now returns early)
        {
          try {
            const { getConversationState, usesButtons } = await import("../services/conversationStateService");
            const { getButtonsForState } = await import("./conversationStateMachine");
            const { getDraft } = await import("./draftStore");

            const currentState = await getConversationState(userId);

            if (usesButtons(currentState)) {
              // User is in button-capable state - show buttons, NO text syntax
              const draft = await getDraft(userId);
              const hasItems = (draft?.items?.length ?? 0) > 0;
              const hasCustomer = !!draft?.customerName;
              const buttons = getButtonsForState(currentState, hasItems, hasCustomer);

              console.log(`[conversationHandler] UNKNOWN in button state: ${currentState}, showing buttons`);
              await replyFn("บี๊บ! ขอบคุณนะครับ 😊", buttons);
              return;
            }

            // Check if this was a button action that somehow reached UNKNOWN
            const { detectInputSource, getButtonAction } = await import("../core/buttonActionMap");
            const inputSource = detectInputSource(messageText);
            const buttonAction = getButtonAction(messageText);

            if (buttonAction || inputSource !== 'TEXT_INPUT') {
              // This should not happen - button action should have been caught earlier
              console.warn(`[conversationHandler] Button action reached UNKNOWN: "${messageText}"`);
              // Route to the correct intent anyway
              const { recognizeIntent } = await import("./conversationOrchestrator");
              const correctIntent = recognizeIntent(messageText);
              if (correctIntent !== Intent.UNKNOWN) {
                console.log(`[conversationHandler] Re-routing button action to: ${correctIntent}`);
                // Fall through to handle the correct intent
              }
            }

            const { suggestTypoCorrection } = await import("../services/onboardingService");

            // Check for typo correction
            const typoSuggestion = suggestTypoCorrection(messageText);
            if (typoSuggestion) {
              // Typo suggestion - use contextual buttons (auto-detect: GLOBAL)
              await replyFn(typoSuggestion || 'ไม่เข้าใจคำสั่งนี้ค่ะ');
            } else {
              // ✅ BUTTON-FIRST: Use global fallback (not payment-specific)
              // Only use this if NOT in payment flow (payment flow is handled above)
              const { getGlobalFallbackMessage } = await import("../services/paymentUXCopy");
              await replyFn(getGlobalFallbackMessage());
            }
          } catch (err) {
            console.error("[conversationHandler] UNKNOWN error:", err);
            // ✅ FIX 2: Always reply, even on error
            const { getGlobalFallbackMessage } = await import("../services/paymentUXCopy");
            await replyFn(getGlobalFallbackMessage());
          }
        }
        break;

      case Intent.EDIT:
        // ✅ HUMAN-FIRST UX: Try new flow first (gated by flag)
        // Note: Allowlisted users already handled above, this is for non-allowlisted users
        {
          try {
            const { getHumanFirstUxEnabled } = await import("../shared/config");

            if (getHumanFirstUxEnabled() && !isAllowlisted) {
              // Try human-first handler (non-allowlisted users can still use if flag is on)
              const { handleHumanFirstEdit } = await import("./humanFirstHandler");
              const humanFirstResponse = await handleHumanFirstEdit(
                userId,
                params.businessId,
                messageText,
                replyFn,
                params.lineUserId,
                params.traceId
              );

              if (humanFirstResponse) {
                await replyFn(humanFirstResponse.message, humanFirstResponse.buttons);
                return;
              }
              // If null, CONFIRM was handled - return
              return;
            }

            // Legacy handler (flag disabled or not allowlisted)

            // Fall back to legacy handler (when flag=0 or CONFIRM action)
            const draft = await getDraft(userId);
            if (!draft) {
              await replyFn("โอ๊ะ! ไม่มีเอกสารที่กำลังแก้ไข\nเริ่มใหม่ได้เลยนะ");
              break;
            }

            // ✅ Check if this is a button action
            const { getConversationState, setConversationState, getStateMetadata, setStateMetadata } = await import("../services/conversationStateService");
            const { getButtonsForState, ButtonState } = await import("./conversationStateMachine");
            const currentState = await getConversationState(userId);
            const metadata = await getStateMetadata(userId);

            // ✅ BUTTON: "ลูกค้า" - Transition to AWAITING_CUSTOMER_INPUT (FIX A1)
            if (messageText === "ลูกค้า" || messageText.trim() === "ลูกค้า") {
              const template =
                'ติ๊ดๆ ส่งข้อมูลลูกค้าได้เลยครับ:\n\n' +
                '📝 ตัวอย่าง (ก๊อปไปแก้ได้):\n' +
                'ลูกค้า: บริษัท ABC\n' +
                'ที่อยู่: 123/4 ถนน...\n' +
                'เบอร์โทร: 0123456789\n' +
                'เลขผู้เสียภาษี: 0123456789012\n\n' +
                'หรือส่งแค่ชื่อ: ลูกค้า: [ชื่อ]';
              await setConversationState(userId, ButtonState.AWAITING_CUSTOMER_INPUT);
              const { getAwaitingCustomerInputButtons } = await import("../ui/quickReplies");
              const buttons = getAwaitingCustomerInputButtons();
              await replyFn(template, buttons);
              return;
            }

            // ✅ BUTTON: "เพิ่มรายการ" - Transition to AWAITING_ITEM_INPUT
            if (messageText === "เพิ่มรายการ" || messageText.trim() === "เพิ่มรายการ") {
              // Start item add flow (ask for name first)
              await setConversationState(userId, ButtonState.AWAITING_ITEM_INPUT, { step: 'name' });
              const buttons = getButtonsForState(ButtonState.AWAITING_ITEM_INPUT);
              await replyFn("ติ๊ดๆ ชื่อรายการคืออะไรครับ?", buttons);
              return;
            }

            // ✅ STATE: AWAITING_CUSTOMER_INPUT - Handle customer input (FIX A1)
            if (currentState === ButtonState.AWAITING_CUSTOMER_INPUT) {
              // Parse customer info from multiline or single line format
              const customerMatch = messageText.match(/ลูกค้า[:：]?\s*(.+?)(?:\n|$)/i);
              if (customerMatch) {
                const customerName = customerMatch[1].trim();
                if (customerName && customerName.length > 0) {
                  await updateDraft(userId, { customerName });
                  await setConversationState(userId, ButtonState.CUSTOMER_SET);
                  const buttons = getButtonsForState(ButtonState.CUSTOMER_SET);
                  await replyFn(
                    `ติ๊ดๆ อัปเดตลูกค้า: ${customerName}`,
                    buttons
                  );
                  return;
                }
              }
              // If no match, ask again
              const { getAwaitingCustomerInputButtons } = await import("../ui/quickReplies");
              await replyFn(
                "โอ๊ะ! ส่งข้อมูลลูกค้าตามรูปแบบนี้นะ\nลูกค้า: [ชื่อ]",
                getAwaitingCustomerInputButtons()
              );
              return;
            }

            // ✅ STATE: AWAITING_ITEM_INPUT - Handle item name/price input
            if (currentState === ButtonState.AWAITING_ITEM_INPUT) {
              // ✅ FIX 7: Handle cancel command
              if (messageText === 'ยกเลิก' || messageText === 'cancel') {
                const { clearConversationState } = await import("../services/conversationStateService");
                await clearConversationState(userId);
                await setStateMetadata(userId, {});
                const buttons = getButtonsForState(ButtonState.IDLE);
                await replyFn("ติ๊ดๆ ยกเลิกการเพิ่มรายการแล้ว", buttons);
                return;
              }

              const step = metadata.step as string;

              if (step === 'name') {
                // User provided item name
                const itemName = messageText.trim();
                if (!itemName || itemName.length === 0) {
                  await replyFn("โอ๊ะ! ยังไม่เห็นชื่อรายการนะ");
                  return;
                }
                await setStateMetadata(userId, { pendingItemName: itemName, step: 'price' });
                const buttons = getButtonsForState(ButtonState.AWAITING_ITEM_INPUT);
                await replyFn(`ชื่อรายการ: ${itemName}\n\nราคาเท่าไหร่คะ?`, buttons);
                return;
              } else if (step === 'price') {
                // User provided price
                const priceText = messageText.trim();
                const price = parseFloat(priceText.replace(/[^\d.]/g, ''));

                if (isNaN(price) || price <= 0) {
                  await replyFn("โอ๊ะ! ราคายังไม่ถูกต้องนะ");
                  return;
                }

                const itemName = metadata.pendingItemName as string;
                if (!itemName) {
                  // Fallback: treat as full command
                  await setConversationState(userId, ButtonState.DRAFT_EMPTY);
                  // Continue to legacy parsing below
                } else {
                  // Add item to draft
                  const updatedDraft = await updateDraftWithTransaction(userId, (draftState) => ({
                    items: [...(draftState.items || []), { name: itemName, qty: 1, price }],
                  }));

                  // Transition to ITEMS_EXIST state
                  await setConversationState(userId, ButtonState.ITEMS_EXIST);
                  await setStateMetadata(userId, {}); // Clear pending data

                  const summary = formatDraftForDisplay(updatedDraft);
                  const buttons = getButtonsForState(ButtonState.ITEMS_EXIST);
                  await replyFn(
                    `ติ๊ดๆ เพิ่มรายการ: ${itemName} ${price.toLocaleString('th-TH')} บาท\n\n${summary}`,
                    buttons
                  );
                  return;
                }
              }
            }

            // ✅ COPY-EDIT TEMPLATE
            if (/^(แบบฟอร์ม|ก๊อป|template|copy)\b/i.test(messageText.trim())) {
              const { getCopyEditTemplate } = await import('../services/uxCopy');
              const { getMainMenuButtons } = await import('../ui/quickReplies');
              await replyFn(getCopyEditTemplate(), getMainMenuButtons());
              return;
            }

            // ✅ MULTILINE: Parse copy-edit block (heuristic)
            if (isLikelyCopyEditBlock(messageText)) {
              try {
                const { parseEzDocText } = await import('./parse');
                const { renderPostParseSummary } = await import('../services/uxCopy');
                const parsed = parseEzDocText(messageText);

                // Apply parsed data to draft
                let hadItems = false;
                const updatedDraft = await updateDraftWithTransaction(userId, (draftState) => {
                  const updates: Partial<typeof draftState> = {};
                  hadItems = (draftState.items || []).length > 0;

                  if (parsed.customer_name) {
                    updates.customerName = parsed.customer_name;
                  }
                  if (parsed.customer_legal_name) {
                    updates.customerLegalName = parsed.customer_legal_name;
                    if (!parsed.customer_name) {
                      updates.customerName = parsed.customer_legal_name;
                    }
                  }
                  if (parsed.customer_tax_id) {
                    updates.customerTaxId = parsed.customer_tax_id;
                  }
                  if (parsed.customer_branch) {
                    updates.customerBranch = parsed.customer_branch;
                  }
                  if (parsed.customer_address) {
                    updates.customerAddress = parsed.customer_address;
                  }
                  if (parsed.customer_contact_name) {
                    updates.customerContactName = parsed.customer_contact_name;
                  }

                  if (parsed.price_type === 'LUMP_SUM') {
                    updates.priceType = 'LUMP_SUM';
                    const lumpSumName = parsed.subject_th || parsed.subject_en || 'งานเหมารวม';
                    if (typeof parsed.lump_sum_amount === 'number') {
                      updates.lumpSumAmount = parsed.lump_sum_amount;
                      updates.items = [{
                        name: lumpSumName,
                        qty: 1,
                        price: parsed.lump_sum_amount,
                      }];
                    }
                    if (parsed.scope_of_work && parsed.scope_of_work.length > 0) {
                      updates.scopeOfWork = parsed.scope_of_work;
                    }
                    if (parsed.payment_milestones && parsed.payment_milestones.length > 0) {
                      updates.paymentMilestones = parsed.payment_milestones;
                    }
                    if (parsed.notes) {
                      updates.notes = parsed.notes;
                    }
                  }

                  if (parsed.items && parsed.items.length > 0 && parsed.price_type !== 'LUMP_SUM') {
                    const newItems = parsed.items.map(item => ({
                      name: item.description_th || item.description_en || '',
                      qty: item.qty || 1,
                      price: item.unit_price || 0,
                    }));
                    updates.items = hadItems ? [...(draftState.items || []), ...newItems] : newItems;
                  }
                  if (parsed.notes && parsed.price_type !== 'LUMP_SUM') {
                    updates.notes = parsed.notes;
                  }

                  return updates;
                });

                if (updatedDraft) {
                  draftCache = updatedDraft;
                  const hasItems = updatedDraft.items.length > 0;
                  const hasCustomer = !!updatedDraft.customerName;
                  const state = hasItems ? ButtonState.ITEMS_EXIST : ButtonState.DRAFT_EMPTY;
                  const buttons = getButtonsForState(state, hasItems, hasCustomer);

                  const summaryMsg = renderPostParseSummary({
                    ...parsed,
                    warnings: updatedDraft.docType
                      ? (parsed.warnings || []).filter(w => w !== 'MISSING_DOC_TYPE')
                      : parsed.warnings
                  }, {
                    customerOverride: updatedDraft.customerName || null,
                    itemCountOverride: updatedDraft.items.length,
                    totalOverride: updatedDraft.total,
                  });

                  const mergeNote = hadItems && parsed.items && parsed.items.length > 0
                    ? `\n\nเพิ่มเข้าไปแล้ว หากต้องการแทนที่ทั้งหมดให้พิมพ์ "เริ่มใหม่" แล้วส่งบล็อกอีกครั้ง`
                    : '';

                  await replyFn(`${summaryMsg}${mergeNote}`, buttons);
                  return;
                }
              } catch (err) {
                console.warn('[conversationHandler] Multiline parse failed, falling back to legacy:', err);
              }
            }

            // ✅ Forgiving parser for messy input (before legacy fallbacks)
            try {
              const currentDraft = await getDraft(userId);
              const { parseForgivingInput, ParsedActionType } = await import('./forgivingParser');

              if (!currentDraft) {
                const actions = parseForgivingInput(messageText, {
                  hasActiveDraft: false,
                  hasCustomer: false,
                  hasItems: false,
                });
                const action = actions.find((a) => (a.confidence ?? 0) >= 0.7);

                if (action) {
                  if (action.type === ParsedActionType.TEMPLATE) {
                    const { getCopyEditTemplate } = await import('../services/uxCopy');
                    await replyFn(getCopyEditTemplate());
                    return;
                  }

                  if (action.type === ParsedActionType.HELP || action.type === ParsedActionType.MENU) {
                    const { getHelpMessageShort } = await import('../services/helpCopy');
                    const { getUserPlan } = await import('./planService');
                    const plan = await getUserPlan(userId);
                    await replyFn(getHelpMessageShort(plan));
                    return;
                  }

                  const customerName = action.payload?.customerName;
                  if (action.type === ParsedActionType.SET_CUSTOMER_NAME && customerName) {
                    // ✅ Only create draft if none exists — preserve existing doc type
                    if (!currentDraft) {
                      await getOrCreateDraft(userId, params.businessId, 'QUO');
                    }
                    const updatedDraft = await updateDraftWithTransaction(userId, () => ({
                      customerName,
                    }));
                    if (updatedDraft) {
                      draftCache = updatedDraft;
                      const { getButtonsForState, ButtonState } = await import("./conversationStateMachine");
                      await setConversationState(userId, ButtonState.CUSTOMER_SET);
                      const buttons = getButtonsForState(ButtonState.CUSTOMER_SET);
                      const summary = formatDraftForDisplay(updatedDraft);
                      await replyFn(`ติ๊ดๆ ตั้งชื่อลูกค้าเป็น "${customerName}" แล้วครับ\nถ้าไม่ถูก พิมพ์ 'ลูกค้า [ชื่อที่ถูกต้อง]'\n\n${summary}`, buttons);
                      return;
                    }
                  }

                  if (action.type === ParsedActionType.ADD_ITEM && action.payload?.item) {
                    // ✅ Only create draft if none exists — preserve existing doc type
                    if (!currentDraft) {
                      await getOrCreateDraft(userId, params.businessId, 'QUO');
                    }
                    const item = action.payload.item;
                    const updatedDraft = await updateDraftWithTransaction(userId, (draftState) => ({
                      items: [...(draftState.items || []), { name: item.name, qty: item.qty, price: item.price }],
                    }));
                    if (updatedDraft) {
                      draftCache = updatedDraft;
                      const { getButtonsForState, ButtonState } = await import("./conversationStateMachine");
                      await setConversationState(userId, ButtonState.ITEMS_EXIST);
                      const buttons = getButtonsForState(ButtonState.ITEMS_EXIST, true, !!updatedDraft.customerName);
                      const summary = formatDraftForDisplay(updatedDraft);
                      await replyFn(`ติ๊ดๆ เพิ่มรายการแล้ว\n\n${summary}`, buttons);
                      return;
                    }
                  }
                }
              } else {
                const actions = parseForgivingInput(messageText, {
                  hasActiveDraft: true,
                  hasCustomer: !!currentDraft.customerName,
                  hasItems: currentDraft.items.length > 0,
                });
                const action = actions.find((a) => (a.confidence ?? 0) >= 0.7);

                if (action) {
                  const hasItems = currentDraft.items.length > 0;
                  const hasCustomer = !!currentDraft.customerName;
                  const state = hasItems ? ButtonState.ITEMS_EXIST : ButtonState.DRAFT_EMPTY;
                  const buttons = getButtonsForState(state, hasItems, hasCustomer);

                  if (action.type === ParsedActionType.TEMPLATE) {
                    const { getCopyEditTemplate } = await import('../services/uxCopy');
                    await replyFn(getCopyEditTemplate(), buttons);
                    return;
                  }

                  if (action.type === ParsedActionType.HELP || action.type === ParsedActionType.MENU) {
                    const { getHelpMessageShort } = await import('../services/helpCopy');
                    const { getUserPlan } = await import('./planService');
                    const plan = await getUserPlan(userId);
                    await replyFn(getHelpMessageShort(plan), buttons);
                    return;
                  }

                  const customerName = action.payload?.customerName;
                  if (action.type === ParsedActionType.SET_CUSTOMER_NAME && customerName) {
                    const updatedDraft = await updateDraftWithTransaction(userId, () => ({
                      customerName,
                    }));
                    if (updatedDraft) {
                      draftCache = updatedDraft;
                      const summary = formatDraftForDisplay(updatedDraft);
                      await replyFn(`ติ๊ดๆ อัปเดตลูกค้าแล้ว\n\n${summary}`, buttons);
                      return;
                    }
                  }

                  if (action.type === ParsedActionType.ADD_ITEM && action.payload?.item) {
                    const item = action.payload.item;
                    const updatedDraft = await updateDraftWithTransaction(userId, (draftState) => ({
                      items: [...(draftState.items || []), { name: item.name, qty: item.qty, price: item.price }],
                    }));
                    if (updatedDraft) {
                      draftCache = updatedDraft;
                      const summary = formatDraftForDisplay(updatedDraft);
                      await replyFn(`ติ๊ดๆ เพิ่มรายการแล้ว\n\n${summary}`, buttons);
                      return;
                    }
                  }

                  if (action.type === ParsedActionType.UNDO_LAST) {
                    if (currentDraft.items.length > 0) {
                      const updatedDraft = await updateDraftWithTransaction(userId, (draftState) => ({
                        items: (draftState.items || []).slice(0, -1),
                      }));
                      if (updatedDraft) {
                        draftCache = updatedDraft;
                        const summary = formatDraftForDisplay(updatedDraft);
                        await replyFn(`ติ๊ดๆ ยกเลิกรายการล่าสุดแล้ว\n\n${summary}`, buttons);
                        return;
                      }
                    }
                  }

                  if (action.type === ParsedActionType.RESET) {
                    await clearDraft(userId);
                    const { getCopyEditTemplate } = await import('../services/uxCopy');
                    await replyFn(`เริ่มใหม่แล้วครับ\n\n${getCopyEditTemplate()}`, buttons);
                    return;
                  }

                  if (action.type === ParsedActionType.CONFIRM) {
                    await replyFn(`เข้าใจว่าอยากออกเอกสารครับ\nพิมพ์ "ยืนยัน" เพื่อสรุป และ "ยืนยันอีกครั้ง" เพื่อออกเอกสาร`, buttons);
                    return;
                  }
                }
              }
            } catch (err) {
              console.warn('[conversationHandler] forgivingParser failed:', err);
            }

            // ✅ LEGACY: Parse text commands (for backward compatibility)
            // "ลูกค้า ABC" -> set customerName
            // "เพิ่มรายการ ABC 1000" -> add item (full syntax)
            // "ลบรายการ 1" -> remove item
            const customerMatch = messageText.match(/ลูกค้า\s+(.+?)(?:\n|$)/i);
            if (customerMatch) {
              const customerName = customerMatch[1].trim();
              await updateDraft(userId, { customerName });
              await setConversationState(userId, ButtonState.CUSTOMER_SET);
              const buttons = getButtonsForState(ButtonState.CUSTOMER_SET);
              await replyFn(`ติ๊ดๆ อัปเดตลูกค้า: ${customerName}`, buttons);
              return;
            }

            const addItemMatch = messageText.match(/เพิ่มรายการ\s+(.+?)(?:\s+|\|)(\d+)(?:\s|$)/i);
            if (addItemMatch) {
              const itemName = addItemMatch[1].trim();
              const price = parseInt(addItemMatch[2], 10);
              const updatedDraft = await updateDraftWithTransaction(userId, (draftState) => ({
                items: [...(draftState.items || []), { name: itemName, qty: 1, price }],
              }));
              if (updatedDraft) {
                draftCache = updatedDraft;
                await setConversationState(userId, ButtonState.ITEMS_EXIST);
                const buttons = getButtonsForState(ButtonState.ITEMS_EXIST);
                await replyFn(
                  `ติ๊ดๆ เพิ่มรายการ: ${itemName} ${price}฿`,
                  buttons
                );
                return;
              }
            }

            // Show current summary with buttons
            const currentDraft = await getDraft(userId);
            if (currentDraft) {
              const summary = formatDraftForDisplay(currentDraft);
              const hasItems = currentDraft.items.length > 0;
              const hasCustomer = !!currentDraft.customerName;
              const state = hasItems ? ButtonState.ITEMS_EXIST : ButtonState.DRAFT_EMPTY;
              const buttons = getButtonsForState(state, hasItems, hasCustomer);
              await replyFn(
                `ติ๊ดๆ สถานะปัจจุบัน:\n\n${summary}`,
                buttons
              );
            }
          } catch (err) {
            console.error("[conversationHandler] EDIT error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.CONFIRM:
        // Finalize and issue document
        {
          try {
            const draft = await getDraft(userId);
            if (!draft) {
              await replyFn("โอ๊ะ! ไม่มีเอกสารที่กำลังสร้าง");
              break;
            }

            const approvalSettings = await getApprovalSettings(userId, params.businessId);
            if (approvalSettings.enabled) {
              const requestId = await createApprovalRequest({
                userId,
                businessId: params.businessId,
                lineUserId,
                draft,
              });
              await notifyApprovers({
                userId,
                businessId: params.businessId,
                requestId,
                draft,
              });
              await clearDraft(userId);
              await replyFn(`ติ๊ดๆ ส่งคำขออนุมัติแล้ว ✅\nรหัส: ${requestId}`);
              break;
            }

            if (/ครบชุด/.test(messageText)) {
              const handled = await handleAutoChainConfirm(
                userId,
                params.businessId,
                draft,
                replyFn,
                lineUserId
              );
              if (handled) {
                break;
              }
            }

            if (!hasChargeableItems(draft)) {
              if (draft.docType === "RECEIPT") {
                const latestInvDoc = await getLatestIssuedInvoiceDoc(userId, params.businessId);
                if (latestInvDoc) {
                  const latestInvNo = String(latestInvDoc.data().doc_no || latestInvDoc.id);
                  await replyFn(
                    `โอ๊ะ! ใบเสร็จยังไม่มีรายการ\n` +
                    `ถ้าต้องการออกจากใบวางบิลล่าสุด พิมพ์: ใบเสร็จจาก ${latestInvNo}`
                  );
                  break;
                }
              }
              await replyFn("โอ๊ะ! ตอนนี้ยังไม่มีรายการนะ\nเพิ่มรายการก่อนนะ");
              break;
            }

            if (!draft.customerName) {
              await replyFn("โอ๊ะ! ยังไม่ได้ระบุลูกค้า\nตั้งลูกค้าก่อนนะ");
              break;
            }

            // Call document creation pipeline
            await confirmAndIssueDraft(userId, params.businessId, draft, replyFn, lineUserId);

            // Clear draft after successful issuance
            await clearDraft(userId);
          } catch (err) {
            console.error("[CONFIRM_ERROR] ❌ Error issuing document:", err);
            // Error creating PDF - use contextual buttons (auto-detect: GLOBAL)
            await replyFn(
              "โอ๊ะ! สร้าง PDF ไม่สำเร็จ\n" +
              "ลองใหม่อีกครั้งนะ หรือทักแอดมินได้เลย"
            );
          }
        }
        break;

      case Intent.CANCEL:
        // ✅ BUTTON-FIRST: Clear draft and state
        {
          try {
            const draft = await getDraft(userId);
            if (!draft) {
              await replyFn("โอ๊ะ! ไม่มีเอกสารที่กำลังสร้าง");
              break;
            }

            // ✅ BUTTON-FIRST: Clear state when cancelling
            const { clearConversationState } = await import("../services/conversationStateService");
            await clearConversationState(userId);

            await clearDraft(userId);
            // Draft cancelled - use contextual buttons (auto-detect: GLOBAL)
            await replyFn("ติ๊ดๆ ยกเลิกการสร้างเอกสารแล้ว");
          } catch (err) {
            console.error("[conversationHandler] CANCEL error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.PAID:
        // Step 1: User says "ชำระแล้ว INV-xxx"
        // Resolve invoice docId from message
        {
          const invoiceDocId = await resolveInvoiceDocId(userId, params.businessId, messageText);
          if (!invoiceDocId) {
            await replyFn(
              "โอ๊ะ! ไม่พบใบวางบิล\n" +
              "ระบุเลขเอกสาร เช่น:\nชำระแล้ว INV-2568-001"
            );
            break;
          }

          // Call payment notification handler
          try {
            await handlePaymentNotification(
              "", // conversationId (not used in this version)
              userId,
              params.businessId,
              invoiceDocId,
              replyFn
            );
          } catch (err) {
            console.error("[conversationHandler] Payment notification error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.CONFIRM_PAYMENT:
        // Step 2: User says "ยืนยันรับเงิน INV-xxx"
        // Resolve invoice docId from message
        {
          const invoiceDocId = await resolveInvoiceDocId(userId, params.businessId, messageText);
          if (!invoiceDocId) {
            await replyFn(
              "โอ๊ะ! ไม่พบใบวางบิล\n" +
              "ระบุเลขเอกสาร เช่น:\nยืนยันรับเงิน INV-2568-001"
            );
            break;
          }

          // Call payment confirmation handler
          try {
            await handlePaymentConfirmation(
              "", // conversationId (not used in this version)
              userId,
              params.businessId,
              invoiceDocId,
              replyFn
            );
          } catch (err) {
            console.error("[conversationHandler] Payment confirmation error:", err);
            await replyFn("โอ๊ะ! บันทึกการชำระไม่สำเร็จ\nลองใหม่อีกครั้งนะ");
          }
        }
        break;

      case Intent.REQUEST_PDF: {
        const db = getDb();

        // ✅ Robust doc_no parsing:
        // - PREFIX: 2-10 letters (case-insensitive)
        // - YEAR: 4 digits (supports Thai BE e.g., 2568)
        // - SEQ: 1-10 digits
        const docNoMatch = messageText.match(/\b([A-Z]{2,10})-(\d{4})-(\d{1,10})\b/i);
        if (!docNoMatch) {
          await replyFn(
            "โอ๊ะ! ต้องมีเลขเอกสารนะ\n" +
            "ตัวอย่าง: ขอ PDF QUO-2568-001"
          );
          break;
        }
        const docNo = docNoMatch[0].toUpperCase();

        // หาจาก documents
        try {
          const snap = await db
            .collection("users")
            .doc(userId)
            .collection("businesses")
            .doc(params.businessId)
            .collection("documents")
            .where("doc_no", "==", docNo)
            .limit(1)
            .get();

          if (snap.empty) {
            await replyFn(
              `โอ๊ะ! ไม่พบเอกสารเลขที่ ${docNo}`
            );
            break;
          }

          const doc = snap.docs[0];
          const data = doc.data() as any;

          const getTimestampMs = (value: any): number | null => {
            if (!value) return null;
            if (typeof value.toDate === 'function') return value.toDate().getTime();
            if (typeof value._seconds === 'number') return value._seconds * 1000;
            return null;
          };

          // ✅ Production-safe: use pdf_path as source of truth
          // Generate short link for security (no signed URL exposed in logs/messages)
          const pdfPath = data.pdf_path || data.pdfPath || null;
          if (pdfPath) {
            // If document was updated after PDF generation or theme changed -> force re-render
            const docUpdatedAtMs =
              getTimestampMs(data.updated_at) ||
              getTimestampMs(data.updatedAt) ||
              getTimestampMs(data.issued_at) ||
              getTimestampMs(data.created_at);
            const pdfGeneratedAtMs =
              getTimestampMs(data.pdf_generated_at) ||
              getTimestampMs(data.pdfGeneratedAt);

            let shouldRegen = false;
            let regenReason = '';

            if (docUpdatedAtMs && pdfGeneratedAtMs && docUpdatedAtMs > pdfGeneratedAtMs + 1000) {
              shouldRegen = true;
              regenReason = 'doc_updated';
            }

            // Theme drift check (business theme changed after PDF was generated)
            try {
              const businessSnap = await db
                .collection("users")
                .doc(userId)
                .collection("businesses")
                .doc(params.businessId)
                .get();
              const businessData = businessSnap.exists ? businessSnap.data() : {};
              const docTypeKey = String(data.doc_type || '').toUpperCase();
              const themeByDocType: Record<string, string | null> = {
                QUOTATION: businessData?.pdfThemeQuo || null,
                QUO: businessData?.pdfThemeQuo || null,
                BILL: businessData?.pdfThemeBill || null,
                INVOICE: businessData?.pdfThemeBill || null,
                RECEIPT: businessData?.pdfThemeReceipt || null,
                REC: businessData?.pdfThemeReceipt || null,
              };
              const desiredTheme = themeByDocType[docTypeKey] || businessData?.pdfTheme || null;
              const currentTheme = data.pdf_theme || data.pdfTheme || null;
              if (desiredTheme && desiredTheme !== currentTheme) {
                shouldRegen = true;
                regenReason = regenReason || 'theme_changed';
              }
            } catch (themeErr) {
              console.warn('[REQUEST_PDF] Theme check failed:', themeErr);
            }

            // Template version mismatch -> force regenerate
            try {
              const expectedVersion = getPdfTemplateVersion();
              const currentVersion = data.pdf_template_version || data.pdf_render_version || null;
              if (expectedVersion && currentVersion !== expectedVersion) {
                shouldRegen = true;
                regenReason = regenReason || 'template_version_mismatch';
              }
            } catch (versionErr) {
              console.warn('[REQUEST_PDF] Version check failed:', versionErr);
            }

            if (shouldRegen) {
              console.warn(`[REQUEST_PDF] regen required (${regenReason}) -> requeue: ${docNo}`);
              try {
                // Best-effort delete legacy PDF to avoid stale links
                try {
                  const bucket = admin.storage().bucket();
                  await bucket.file(String(pdfPath)).delete({ ignoreNotFound: true });
                } catch (cleanupErr) {
                  console.warn('[REQUEST_PDF] Legacy PDF cleanup failed:', cleanupErr);
                }
                await doc.ref.update({
                  pdf_path: admin.firestore.FieldValue.delete(),
                  pdfReady: false,
                  pdfState: 'QUEUED',
                  pdf_render_version: admin.firestore.FieldValue.delete(),
                  pdf_template_version: admin.firestore.FieldValue.delete(),
                  pdf_theme: admin.firestore.FieldValue.delete(),
                  pdf_generated_at: admin.firestore.FieldValue.delete(),
                  pdfUrl: admin.firestore.FieldValue.delete(),
                  pdf_url: admin.firestore.FieldValue.delete(),
                  pdfPath: admin.firestore.FieldValue.delete(),
                  updated_at: admin.firestore.FieldValue.serverTimestamp(),
                });
              } catch (updateErr) {
                console.warn('[REQUEST_PDF] Failed to reset pdf fields:', updateErr);
              }
            } else {
              // Normal path: PDF exists and is current -> send it
              try {
                const bucket = admin.storage().bucket();
                const file = bucket.file(String(pdfPath));
                const [exists] = await file.exists();
                if (!exists) {
                  // ✅ If pdf_path exists but the object is missing, DO NOT return legacy URL.
                  // Re-enqueue to regenerate and auto-push to user.
                  console.warn(`[REQUEST_PDF] pdf_path exists but object missing -> requeue: ${pdfPath}`);
                } else {
                  // Build Flex message with short link (secure, consistent UI)
                  const flexMessage = await buildPdfFlexMessageWithShortLink({
                    docId: doc.id,
                    docNo,
                    docType: data.doc_type || '',
                    pdfPath: String(pdfPath),
                    userId,
                    businessId: params.businessId,
                  });

                  // Security: Log only identifiers, not URLs
                  console.log(`[REQUEST_PDF] Replying with Flex: doc_no=${docNo}, pdf_path=${pdfPath}`);

                  // Reply with Flex message
                  await replyWithFlex(flexMessage);
                  break;
                }
              } catch (signErr) {
                console.error("[REQUEST_PDF] Error building Flex message:", signErr);
                // fall through to re-queue below (safety net)
              }
            }
          }

          // Legacy fallback removed - always use short links or enqueue

          // ยังไม่มี pdf -> enqueue idempotently (deterministic job ID)
          const { action } = await queuePdfGeneration(
            userId,
            params.businessId,
            doc.id,
            docNo,
            data.doc_type,
            traceId
          );

          if (action === 'DONE') {
            // Should be rare (document write-through should have populated pdfUrl already)
            await replyFn(
              `ติ๊ดๆ กำลังส่งไฟล์ PDF สำหรับ ${docNo} ให้คุณทาง LINE อัตโนมัติ`
            );
            break;
          }

          // If CREATED / IN_PROGRESS / REQUEUED -> rely on auto-push when DONE
          await replyFn(
            `ติ๊ดๆ รับแล้ว กำลังสร้าง PDF สำหรับ ${docNo}\n\n` +
            `ระบบจะส่งให้ทาง LINE อัตโนมัติเมื่อพร้อม`
          );
        } catch (err) {
          console.error("[conversationHandler] REQUEST_PDF error:", err);
          await replyFn("โอ๊ะ! ดึงข้อมูลไม่สำเร็จ\nลองใหม่อีกครั้งนะ");
        }
        break;
      }

      // ✅ FIX 5: Delivery retry commands
      case Intent.RESEND_DOCUMENT: {
        try {
          const db = getDb();

          // ✅ Authorization: Verify business exists and user has access
          const businessRef = db.collection('users').doc(userId).collection('businesses').doc(params.businessId);
          const businessDoc = await businessRef.get();
          if (!businessDoc.exists) {
            await replyFn("โอ๊ะ! ไม่พบบุรกิจที่ระบุ");
            break;
          }

          // ✅ Authorization: Verify business belongs to user (implicit via path, but explicit check for clarity)
          const businessData = businessDoc.data();
          if (!businessData) {
            await replyFn("โอ๊ะ! ไม่พบข้อมูลธุรกิจ");
            break;
          }

          // Get last document for user
          const docsQuery = await db
            .collection('users')
            .doc(userId)
            .collection('businesses')
            .doc(params.businessId)
            .collection('documents')
            .orderBy('created_at', 'desc')
            .limit(1)
            .get();

          if (docsQuery.empty) {
            await replyFn("โอ๊ะ! ยังไม่พบเอกสารล่าสุด");
            break;
          }

          const doc = docsQuery.docs[0];
          const docData = doc.data();
          const docNo = docData.doc_no || doc.id;
          const pdfPath = docData.pdf_path;

          if (!pdfPath) {
            await replyFn(
              `โอ๊ะ! เอกสาร ${docNo} ยังไม่มี PDF\n` +
              `รอสักครู่แล้วลองใหม่ได้เลย`
            );
            break;
          }

          // Build Flex message and send
          const { buildPdfFlexMessageWithShortLink } = await import("../shared/pdfFlexMessage");
          const flexMessage = await buildPdfFlexMessageWithShortLink({
            docId: doc.id,
            docNo,
            docType: docData.doc_type || '',
            pdfPath: String(pdfPath),
            userId,
            businessId: params.businessId,
          });

          await replyWithFlex(flexMessage);
          console.log(`[RESEND_DOCUMENT] Resent document: ${docNo}, traceId=${traceId || 'n/a'}`);
        } catch (err) {
          console.error("[conversationHandler] RESEND_DOCUMENT error:", err);
          await replyFn("โอ๊ะ! ส่งเอกสารไม่สำเร็จ\nลองใหม่อีกครั้งนะ");
        }
        break;
      }

      // ✅ FIX 1: Payment status commands
      case Intent.CHECK_PAYMENT_STATUS: {
        try {
          const { getRecentPendingPurchase } = await import("../services/imageUploadService");
          const { getPaymentStatusMessage } = await import("../services/paymentStateService");

          const recentPurchase = await getRecentPendingPurchase(userId);
          if (!recentPurchase) {
            await replyFn("โอ๊ะ! ยังไม่มีรายการชำระเงินที่รอตรวจสอบ");
            break;
          }

          const statusMessage = await getPaymentStatusMessage(userId);
          if (statusMessage) {
            await replyFn(statusMessage);
          } else {
            await replyFn("โอ๊ะ! ยังไม่มีรายการชำระเงินที่รอตรวจสอบ");
          }
        } catch (err) {
          console.error("[conversationHandler] CHECK_PAYMENT_STATUS error:", err);
          await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
        }
      }
        break;

      case Intent.RESEND_SLIP: {
        try {
          const { getRecentPendingPurchase } = await import("../services/imageUploadService");
          const recentPurchase = await getRecentPendingPurchase(userId);

          if (!recentPurchase) {
            await replyFn("โอ๊ะ! ยังไม่มีรายการชำระเงินที่รอส่งสลิป");
            break;
          }

          if (recentPurchase.purchase.status === 'PAID') {
            await replyFn("ติ๊ดๆ รายการนี้ชำระเงินแล้ว ✅");
            break;
          }

          // Reset to WAITING_FOR_SLIP and prompt for new slip
          const db = getDb();
          const purchaseRef = db.collection('credit_purchases').doc(recentPurchase.purchaseId);
          await purchaseRef.update({
            status: 'WAITING_FOR_SLIP',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const { setUserImageMode } = await import("../services/userStateService");
          await setUserImageMode(userId, 'SLIP');

          await replyFn("โอ๊ะ! ส่งสลิปใหม่อีกครั้งได้ไหมครับ");
        } catch (err) {
          console.error("[conversationHandler] RESEND_SLIP error:", err);
          await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
        }
      }
        break;

      case Intent.CANCEL_PAYMENT: {
        try {
          const { getRecentPendingPurchase } = await import("../services/imageUploadService");
          const recentPurchase = await getRecentPendingPurchase(userId);

          if (!recentPurchase) {
            await replyFn("โอ๊ะ! ยังไม่มีรายการชำระเงินที่ยกเลิกได้");
            break;
          }

          if (recentPurchase.purchase.status === 'PAID') {
            await replyFn("โอ๊ะ! ยกเลิกรายการที่ชำระแล้วไม่ได้");
            break;
          }

          // Mark as expired/cancelled
          const db = getDb();
          const purchaseRef = db.collection('credit_purchases').doc(recentPurchase.purchaseId);
          await purchaseRef.update({
            status: 'EXPIRED',
            cancelled_at: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const { setUserImageMode } = await import("../services/userStateService");
          await setUserImageMode(userId, null);

          await replyFn("ติ๊ดๆ ยกเลิกรายการชำระเงินแล้ว ✅");
        } catch (err) {
          console.error("[conversationHandler] CANCEL_PAYMENT error:", err);
          await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
        }
      }
        break;

      // ✅ PAYMENT CLAIM: User says "จ่ายแล้วทำไมยังฟรี", "โอนไปแล้ว 11 มีนา"
      // CRITICAL: Check actual purchase records and respond helpfully
      case Intent.PAYMENT_CLAIM: {
        try {
          const db = getDb();
          console.log(`[conversationHandler] PAYMENT_CLAIM: userId=${userId}, text="${messageText}"`);

          // 1. Check for any credit purchases (most recent first)
          const purchasesSnap = await db
            .collection('credit_purchases')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();

          if (purchasesSnap.empty) {
            // No purchase records at all
            await replyFn(
              "ติ๊ดๆ ยังไม่พบรายการซื้อแพ็คในระบบครับ 🔍\n\n" +
              "ถ้าต้องการซื้อแพ็ค พิมพ์:\n" +
              '💳 "ซื้อแพ็ค 99" — 1 ผู้ใช้ ไม่จำกัดเอกสาร\n' +
              '👥 "ซื้อแพ็ค 279" — หลายผู้ใช้ ไม่จำกัดเอกสาร\n\n' +
              "ระบบจะส่ง QR PromptPay มาให้โอนในแชทเลยครับ"
            );
            break;
          }

          // 2. Check latest purchase status
          const latestDoc = purchasesSnap.docs[0];
          const latest = latestDoc.data();
          const purchaseId = latestDoc.id;
          const status = latest.status || 'UNKNOWN';
          const packageName = latest.packageName || latest.package_name || 'แพ็ค';
          const amount = latest.amount || latest.price || 0;

          if (status === 'PAID' || status === 'COMPLETED' || status === 'ACTIVE') {
            // Purchase is confirmed — might be a plan display issue
            const planSnap = await db.collection('users').doc(userId).get();
            const planData = planSnap.data();
            const currentPlan = planData?.plan || planData?.subscription?.plan || 'FREE';

            if (currentPlan === 'FREE') {
              // Paid but plan still FREE — escalate to admin
              console.error(`[PAYMENT_CLAIM] MISMATCH: userId=${userId} has PAID purchase ${purchaseId} but plan is FREE`);
              await replyFn(
                "ติ๊ดๆ พบรายการซื้อ " + packageName + " สำเร็จแล้วครับ ✅\n\n" +
                "⚠️ แต่ระบบยังแสดงแพลน FREE อยู่\n" +
                "กำลังแจ้งแอดมินให้ตรวจสอบให้ครับ\n\n" +
                "📧 หรือพิมพ์ \"รายงานปัญหา จ่ายแพ็คแล้วแต่ยังเป็น FREE\" เพื่อติดตาม"
              );
            } else {
              await replyFn(
                "ติ๊ดๆ ยืนยันครับ! แพ็คของเจ้านาย: " + currentPlan + " ✅\n\n" +
                "รายการซื้อล่าสุด: " + packageName + " " + amount + " บาท — ชำระเรียบร้อยแล้ว\n\n" +
                "ออกเอกสารได้ไม่จำกัดเลยครับ 🎉"
              );
            }
          } else if (status === 'PENDING_REVIEW' || status === 'PENDING') {
            await replyFn(
              "ติ๊ดๆ พบรายการซื้อ " + packageName + " แล้วครับ 🔍\n\n" +
              "📋 สถานะ: กำลังตรวจสอบสลิป\n" +
              "⏱️ รออนุมัติจากแอดมิน (ปกติไม่เกิน 30 นาที)\n\n" +
              "ถ้ารอนานเกินไป พิมพ์ \"รายงานปัญหา\" ได้ครับ"
            );
          } else if (status === 'WAITING_FOR_SLIP') {
            await replyFn(
              "ติ๊ดๆ พบรายการซื้อ " + packageName + " แล้วครับ 🔍\n\n" +
              "📋 สถานะ: รอรับสลิปโอนเงิน\n" +
              "📸 ส่งรูปสลิปมาในแชทนี้ได้เลยครับ\n\n" +
              "ยอดโอน: " + amount + " บาท"
            );
          } else if (status === 'EXPIRED' || status === 'CANCELLED') {
            await replyFn(
              "ติ๊ดๆ พบรายการซื้อ " + packageName + " แต่หมดอายุ/ยกเลิกไปแล้วครับ ⏰\n\n" +
              "ถ้าต้องการซื้อใหม่ พิมพ์:\n" +
              '💳 "ซื้อแพ็ค 99" หรือ "ซื้อแพ็ค 279"\n\n' +
              "ถ้าโอนเงินไปแล้วแต่ไม่ได้ส่งสลิป พิมพ์ \"รายงานปัญหา\" ได้ครับ"
            );
          } else {
            await replyFn(
              "ติ๊ดๆ พบรายการซื้อ " + packageName + " ครับ 🔍\n\n" +
              "📋 สถานะ: " + status + "\n" +
              "📧 ถ้ามีปัญหา พิมพ์ \"รายงานปัญหา\" แล้วอธิบายรายละเอียดได้เลยครับ"
            );
          }
        } catch (err) {
          console.error("[conversationHandler] PAYMENT_CLAIM error:", err);
          await replyFn(
            "โอ๊ะ! เช็คสถานะไม่ได้ชั่วคราว\n" +
            "พิมพ์ \"รายงานปัญหา\" แล้วบอกรายละเอียดได้เลยครับ"
          );
        }
      }
        break;

      case Intent.GET_DOCUMENT_LINK: {
        try {
          const db = getDb();

          // ✅ Authorization: Verify business exists and user has access
          const businessRef = db.collection('users').doc(userId).collection('businesses').doc(params.businessId);
          const businessDoc = await businessRef.get();
          if (!businessDoc.exists) {
            await replyFn("โอ๊ะ! ไม่พบบุรกิจที่ระบุ");
            break;
          }

          // ✅ Authorization: Verify business belongs to user
          const businessData = businessDoc.data();
          if (!businessData) {
            await replyFn("โอ๊ะ! ไม่พบข้อมูลธุรกิจ");
            break;
          }

          // Get last document for user
          const docsQuery = await db
            .collection('users')
            .doc(userId)
            .collection('businesses')
            .doc(params.businessId)
            .collection('documents')
            .orderBy('created_at', 'desc')
            .limit(1)
            .get();

          if (docsQuery.empty) {
            await replyFn("โอ๊ะ! ยังไม่พบเอกสารล่าสุด");
            break;
          }

          const doc = docsQuery.docs[0];
          const docData = doc.data();
          const docNo = docData.doc_no || doc.id;
          const pdfPath = docData.pdf_path;

          if (!pdfPath) {
            await replyFn(
              `โอ๊ะ! เอกสาร ${docNo} ยังไม่มี PDF\n` +
              `รอสักครู่แล้วลองใหม่ได้เลย`
            );
            break;
          }

          // Generate short link for sharing (avoid long signed URLs)
          const { getOrCreateShortLink, buildShortUrl } = await import("../shared/pdfFlexMessage");
          const shortToken = await getOrCreateShortLink({
            docId: doc.id,
            docNo,
            docType: docData.doc_type || '',
            pdfPath: String(pdfPath),
            userId,
            businessId: params.businessId,
          });
          const shortUrl = buildShortUrl(shortToken);

          await replyFn(
            `🔗 ลิงก์เอกสาร ${docNo}:\n\n${shortUrl}\n\n(ลิงก์สั้นสำหรับแชร์)`
          );
          console.log(`[GET_DOCUMENT_LINK] Generated short link for document: ${docNo}, traceId=${traceId || 'n/a'}`);
        } catch (err) {
          console.error("[conversationHandler] GET_DOCUMENT_LINK error:", err);
          await replyFn("โอ๊ะ! สร้างลิงก์ไม่สำเร็จ\nลองใหม่อีกครั้งนะ");
        }
        break;
      }

      case Intent.SETTINGS: {
        // Handle business/payment settings commands
        try {
          const { handleSettingsCommand } = await import("./businessSettings");
          const response = await handleSettingsCommand(userId, params.businessId, messageText);
          if (response.startsWith('📋 ตั้งค่าธุรกิจปัจจุบัน:')) {
            const { getBusinessSetupSavedButtons } = await import("../ui/quickReplies");
            await replyFn(response, getBusinessSetupSavedButtons());
          } else {
            await replyFn(response);
          }
        } catch (err) {
          console.error("[conversationHandler] SETTINGS error:", err);
          await replyFn("โอ๊ะ! บันทึกข้อมูลไม่สำเร็จ\nลองใหม่อีกครั้งนะ");
        }
        break;
      }

      case Intent.WIZARD_BACK:
      case Intent.WIZARD_SKIP:
      case Intent.WIZARD_CANCEL:
        // Wizard navigation buttons (handled explicitly to ensure they work)
        {
          try {
            const { getWizardState, goBackWizardStep, skipWizardStep, setWizardState, completeWizard } = await import("../services/wizardService");
            const { getWizardQuestion } = await import("../services/wizardService");
            const { getBusinessSetupCompleteMessage, getBusinessSetupCancelMessage } = await import("../services/uxCopy");

            const wizardState = await getWizardState(userId);
            if (!wizardState || !wizardState.step || wizardState.step === 'COMPLETE') {
              // Not in wizard - show gentle guidance
              await replyFn("บี๊บ! ขอบคุณนะครับ 😊\nถ้ายังไม่สะดวกพิมพ์ กด ข้าม หรือ ยกเลิก ได้เลย");
              break;
            }

            if (intent === Intent.WIZARD_BACK) {
              const prevStep = await goBackWizardStep(userId, wizardState.step);
              if (prevStep && prevStep !== wizardState.step) {
                const question = getWizardQuestion(prevStep);
                const optionalSteps = ['TAX_ID', 'EMAIL'];
                const isOptional = optionalSteps.includes(prevStep);
                const { getContextualQuickReply } = await import("../shared/contextualQuickReply");
                const wizardButtons = getContextualQuickReply({
                  context: 'WIZARD',
                  wizardStep: prevStep,
                  isOptionalField: isOptional,
                });
                await replyFn(question, wizardButtons);
              } else {
                const optionalSteps = ['TAX_ID', 'EMAIL'];
                const isOptional = optionalSteps.includes(wizardState.step);
                const { getContextualQuickReply } = await import("../shared/contextualQuickReply");
                const wizardButtons = getContextualQuickReply({
                  context: 'WIZARD',
                  wizardStep: wizardState.step,
                  isOptionalField: isOptional,
                });
                await replyFn('โอ๊ะ! อยู่ขั้นตอนแรกแล้ว ย้อนกลับไม่ได้ครับ', wizardButtons);
              }
            } else if (intent === Intent.WIZARD_SKIP) {
              const optionalSteps = ['TAX_ID', 'EMAIL'];
              const isOptional = optionalSteps.includes(wizardState.step);
              if (!isOptional) {
                const { getContextualQuickReply } = await import("../shared/contextualQuickReply");
                const wizardButtons = getContextualQuickReply({
                  context: 'WIZARD',
                  wizardStep: wizardState.step,
                  isOptionalField: false,
                });
                await replyFn('โอ๊ะ! ขั้นตอนนี้ข้ามไม่ได้ครับ', wizardButtons);
                break;
              }
              const nextStep = await skipWizardStep(userId, wizardState.step);
              if (nextStep && nextStep !== wizardState.step) {
                if (nextStep === 'COMPLETE') {
                  await completeWizard(userId, params.businessId);
                  const { getBusinessSetupSavedButtons } = await import("../ui/quickReplies");
                  await replyFn(getBusinessSetupCompleteMessage(), getBusinessSetupSavedButtons());
                } else {
                  const question = getWizardQuestion(nextStep);
                  const isOptional = optionalSteps.includes(nextStep);
                  const { getContextualQuickReply } = await import("../shared/contextualQuickReply");
                  const wizardButtons = getContextualQuickReply({
                    context: 'WIZARD',
                    wizardStep: nextStep,
                    isOptionalField: isOptional,
                  });
                  await replyFn(question, wizardButtons);
                }
              }
            } else if (intent === Intent.WIZARD_CANCEL) {
              await setWizardState(userId, { step: null, completed: [], data: {} });
              await replyFn(getBusinessSetupCancelMessage());
            }
          } catch (err) {
            console.error("[conversationHandler] Wizard navigation error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.VIEW_LATEST_DOCUMENT:
        // View latest document
        {
          try {
            const db = getDb();
            const docsSnapshot = await db
              .collection(`users/${userId}/businesses/${params.businessId}/documents`)
              .orderBy('created_at', 'desc')
              .limit(1)
              .get();

            if (docsSnapshot.empty) {
              await replyFn("โอ๊ะ! ยังไม่มีเอกสารที่สร้างไว้\nลองสร้างเอกสารใหม่ได้เลย");
              break;
            }

            const doc = docsSnapshot.docs[0];
            const data = doc.data();
            const docNo = data.doc_no || 'N/A';
            const docType = data.doc_type || 'DOCUMENT';
            const pdfPath = data.pdf_path || data.pdfPath;

            if (pdfPath) {
              const getTimestampMs = (value: any): number | null => {
                if (!value) return null;
                if (typeof value.toDate === 'function') return value.toDate().getTime();
                if (typeof value._seconds === 'number') return value._seconds * 1000;
                return null;
              };

              const docUpdatedAtMs =
                getTimestampMs(data.updated_at) ||
                getTimestampMs(data.updatedAt) ||
                getTimestampMs(data.issued_at) ||
                getTimestampMs(data.created_at);
              const pdfGeneratedAtMs =
                getTimestampMs(data.pdf_generated_at) ||
                getTimestampMs(data.pdfGeneratedAt);

              let shouldRegen = false;
              let regenReason = '';

              if (docUpdatedAtMs && pdfGeneratedAtMs && docUpdatedAtMs > pdfGeneratedAtMs + 1000) {
                shouldRegen = true;
                regenReason = 'doc_updated';
              }

              try {
                const businessSnap = await db
                  .collection("users")
                  .doc(userId)
                  .collection("businesses")
                  .doc(params.businessId)
                  .get();
                const businessData = businessSnap.exists ? businessSnap.data() : {};
                const docTypeKey = String(data.doc_type || '').toUpperCase();
                const themeByDocType: Record<string, string | null> = {
                  QUOTATION: businessData?.pdfThemeQuo || null,
                  QUO: businessData?.pdfThemeQuo || null,
                  BILL: businessData?.pdfThemeBill || null,
                  INVOICE: businessData?.pdfThemeBill || null,
                  RECEIPT: businessData?.pdfThemeReceipt || null,
                  REC: businessData?.pdfThemeReceipt || null,
                };
                const desiredTheme = themeByDocType[docTypeKey] || businessData?.pdfTheme || null;
                const currentTheme = data.pdf_theme || data.pdfTheme || null;
                if (desiredTheme && desiredTheme !== currentTheme) {
                  shouldRegen = true;
                  regenReason = regenReason || 'theme_changed';
                }
              } catch (themeErr) {
                console.warn('[VIEW_LATEST_DOCUMENT] Theme check failed:', themeErr);
              }

              try {
                const expectedVersion = getPdfTemplateVersion();
                const currentVersion = data.pdf_template_version || data.pdf_render_version || null;
                if (expectedVersion && currentVersion !== expectedVersion) {
                  shouldRegen = true;
                  regenReason = regenReason || 'template_version_mismatch';
                }
              } catch (versionErr) {
                console.warn('[VIEW_LATEST_DOCUMENT] Version check failed:', versionErr);
              }

              if (shouldRegen) {
                console.warn(`[VIEW_LATEST_DOCUMENT] regen required (${regenReason}) -> requeue: ${docNo}`);
                try {
                  // Best-effort delete legacy PDF to avoid stale links
                  try {
                    const bucket = admin.storage().bucket();
                    await bucket.file(String(pdfPath)).delete({ ignoreNotFound: true });
                  } catch (cleanupErr) {
                    console.warn('[VIEW_LATEST_DOCUMENT] Legacy PDF cleanup failed:', cleanupErr);
                  }
                  await doc.ref.update({
                    pdf_path: admin.firestore.FieldValue.delete(),
                    pdfReady: false,
                    pdfState: 'QUEUED',
                    pdf_render_version: admin.firestore.FieldValue.delete(),
                    pdf_template_version: admin.firestore.FieldValue.delete(),
                    pdf_theme: admin.firestore.FieldValue.delete(),
                    pdf_generated_at: admin.firestore.FieldValue.delete(),
                    pdfUrl: admin.firestore.FieldValue.delete(),
                    pdf_url: admin.firestore.FieldValue.delete(),
                    pdfPath: admin.firestore.FieldValue.delete(),
                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                  });
                } catch (updateErr) {
                  console.warn('[VIEW_LATEST_DOCUMENT] Failed to reset pdf fields:', updateErr);
                }
                await replyFn(
                  `ติ๊ดๆ เอกสารล่าสุด: ${docNo}\n\n` +
                  `กำลังสร้าง PDF เวอร์ชันล่าสุดให้นะครับ`
                );
              } else {
                const { buildPdfFlexMessageWithShortLink } = await import("../shared/pdfFlexMessage");
                const flexMessage = await buildPdfFlexMessageWithShortLink({
                  docId: doc.id,
                  docNo,
                  docType,
                  pdfPath: String(pdfPath),
                  userId,
                  businessId: params.businessId,
                });
                await replyWithFlex(flexMessage);
              }
            } else {
              await replyFn(
                `ติ๊ดๆ เอกสารล่าสุด: ${docNo}\n\n` +
                `PDF กำลังสร้าง รอสักครู่ได้นะ`
              );
            }
          } catch (err) {
            console.error("[conversationHandler] VIEW_LATEST_DOCUMENT error:", err);
            await replyFn("โอ๊ะ! ดึงข้อมูลไม่สำเร็จ\nลองใหม่อีกครั้งนะ");
          }
        }
        break;

      case Intent.REPORT:
        {
          try {
            // ✅ D1: Generate traceId for report flow
            const { generateTraceId } = await import("../utils/asyncSafety");
            const traceId = generateTraceId();

            const { handleReportRequest } = await import("../services/reportService");
            const { getReportButtons } = await import("../ui/quickReplies");

            const text = messageText || "";
            const reportText = await handleReportRequest(userId, params.businessId, text, traceId);

            // ✅ D1: Log report event (non-blocking)
            const { appendDocumentEvent } = await import("../services/documentEvents");
            appendDocumentEvent(`report_${params.businessId}_${Date.now()}`, {
              event: 'REPORT_GENERATED',
              traceId,
              handler: 'conversationHandler',
              result_code: 'OK',
              meta: {
                userId,
                businessId: params.businessId,
                reportType: text.includes('เดือนนี้') ? 'this_month' : text.includes('เดือนก่อน') ? 'last_month' : 'menu',
              },
            }).catch(err => {
              console.warn(`[conversationHandler] Failed to log report event (non-blocking):`, err);
            });

            await replyFn(reportText, getReportButtons());
          } catch (err) {
            console.error("[conversationHandler] REPORT error:", err);
            await replyFn("โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย");
          }
        }
        break;

      case Intent.TAX_VAT_SUMMARY:
        {
          try {
            const { handleVatSummaryRequest, getTaxQuickReplies } = await import('../services/taxReportService');
            const message = await handleVatSummaryRequest(userId, params.businessId, messageText || '');
            await replyFn(message, getTaxQuickReplies());
            if (params.lineUserId) {
              const { sendTaxSummaryPdfToLine } = await import('../services/taxPdfService');
              void sendTaxSummaryPdfToLine({
                userId,
                businessId: params.businessId,
                lineUserId: params.lineUserId,
                messageText: messageText || '',
              }).catch((err) => {
                console.error('[conversationHandler] TAX_VAT_SUMMARY PDF error:', err);
              });
            }
          } catch (err) {
            console.error('[conversationHandler] TAX_VAT_SUMMARY error:', err);
            await replyFn('โอ๊ะ! สรุปภาษีไม่สำเร็จ\nลองใหม่ได้เลย');
          }
        }
        break;

      case Intent.TAX_WHT_SUMMARY:
        {
          try {
            const { handleWhtSummaryRequest, getTaxQuickReplies } = await import('../services/taxReportService');
            const message = await handleWhtSummaryRequest(userId, params.businessId, messageText || '');
            await replyFn(message, getTaxQuickReplies());
          } catch (err) {
            console.error('[conversationHandler] TAX_WHT_SUMMARY error:', err);
            await replyFn('โอ๊ะ! สรุปหัก ณ ที่จ่ายไม่สำเร็จ\nลองใหม่ได้เลย');
          }
        }
        break;

      case Intent.TAX_STATUS:
        {
          try {
            const { handleTaxStatusRequest, getTaxQuickReplies } = await import('../services/taxReportService');
            const message = await handleTaxStatusRequest(userId, params.businessId, messageText || '');
            await replyFn(message, getTaxQuickReplies());
          } catch (err) {
            console.error('[conversationHandler] TAX_STATUS error:', err);
            await replyFn('โอ๊ะ! เช็คภาษีค้างไม่สำเร็จ\nลองใหม่ได้เลย');
          }
        }
        break;

      case Intent.TAX_ANNUAL:
        {
          try {
            const { handleAnnualTaxRequest, getTaxQuickReplies } = await import('../services/taxReportService');
            const message = await handleAnnualTaxRequest(userId, params.businessId, messageText || '');
            await replyFn(message, getTaxQuickReplies());
          } catch (err) {
            console.error('[conversationHandler] TAX_ANNUAL error:', err);
            await replyFn('โอ๊ะ! สรุปภาษีทั้งปีไม่สำเร็จ\nลองใหม่ได้เลย');
          }
        }
        break;

      case Intent.TAX_REMINDER_ON:
        {
          try {
            const { handleTaxReminderToggle } = await import('../services/taxReportService');
            const message = await handleTaxReminderToggle(userId, params.businessId, true);
            await replyFn(message);
          } catch (err) {
            console.error('[conversationHandler] TAX_REMINDER_ON error:', err);
            await replyFn('โอ๊ะ! เปิดเตือนภาษีไม่สำเร็จ\nลองใหม่ได้เลย');
          }
        }
        break;

      case Intent.TAX_AUDIT:
        {
          try {
            const { handleTaxAuditRequest, getTaxQuickReplies } = await import('../services/taxReportService');
            const message = await handleTaxAuditRequest(userId, params.businessId, messageText || '');
            await replyFn(message, getTaxQuickReplies());
          } catch (err) {
            console.error('[conversationHandler] TAX_AUDIT error:', err);
            await replyFn('โอ๊ะ! ตรวจภาษีไม่สำเร็จ\nลองใหม่ได้เลย');
          }
        }
        break;

      case Intent.TAX_CERTIFICATE:
        {
          try {
            const { handleTaxCertificateRequest, getTaxQuickReplies } = await import('../services/taxReportService');
            const message = await handleTaxCertificateRequest(userId, params.businessId, messageText || '');
            await replyFn(message, getTaxQuickReplies());
            if (params.lineUserId) {
              const rawText = messageText || '';
              const supplierName = rawText
                .replace(/^(ออกหนังสือรับรองหัก ณ ที่จ่าย|ออก\\s*50ทวิ|ออก\\s*50\\s*ทวิ)\\s*/i, '')
                .replace(/^ให้\\s*/i, '')
                .trim();
              if (supplierName) {
                const { sendWhtCertificatePdfToLine } = await import('../services/taxPdfService');
                void sendWhtCertificatePdfToLine({
                  userId,
                  businessId: params.businessId,
                  lineUserId: params.lineUserId,
                  supplierName,
                  messageText: messageText || '',
                }).catch((err) => {
                  console.error('[conversationHandler] TAX_CERTIFICATE PDF error:', err);
                });
              }
            }
          } catch (err) {
            console.error('[conversationHandler] TAX_CERTIFICATE error:', err);
            await replyFn('โอ๊ะ! ออกหนังสือรับรองไม่สำเร็จ\nลองใหม่ได้เลย');
          }
        }
        break;

      case Intent.REPORT_ISSUE:
        {
          try {
            const rawText = messageText || '';
            const cleaned = rawText.replace(/^(รายงานปัญหา|แจ้งปัญหา|ติดต่อแอดมิน)\s*/i, '').trim();

            if (!cleaned || cleaned.length < 5) {
              await replyFn(
                'โอ๊ะ! ขอรายละเอียดเพิ่มนิดนึงนะครับ\n' +
                'พิมพ์แบบนี้ได้เลย:\n' +
                'รายงานปัญหา <อธิบายปัญหา>\n\n' +
                'ตัวอย่าง: รายงานปัญหา ออกใบเสร็จแล้ว PDF ไม่มา'
              );
              break;
            }

            const { generateTraceId } = await import("../utils/asyncSafety");
            const traceId = generateTraceId();
            const { createSupportTicket } = await import("../services/supportTicketService");
            const { getMainMenuButtons } = await import("../ui/quickReplies");

            const result = await createSupportTicket({
              userId,
              businessId: params.businessId,
              lineUserId,
              message: cleaned,
              traceId,
            });

            const emailStatus = result.emailSent ? 'ส่งอีเมลให้แอดมินแล้ว' : 'แอดมินจะเห็นเรื่องนี้ในระบบและ LINE';
            await replyFn(
              `ติ๊ดๆ รับเรื่องแล้ว ✅\n` +
              `Ticket: ${result.ticketId}\n` +
              `${emailStatus}\n\n` +
              `ถ้าด่วน ส่งอีเมลตรงได้ที่ admin@ezboq.com`,
              getMainMenuButtons()
            );
          } catch (err) {
            console.error("[conversationHandler] REPORT_ISSUE error:", err);
            await replyFn(
              'โอ๊ะ! รับเรื่องไม่สำเร็จตอนนี้\n' +
              'ส่งอีเมลได้ที่ admin@ezboq.com'
            );
          }
        }
        break;

      default: // Intent.UNKNOWN, etc.
        // Check if wizard is in progress - handle wizard navigation
        {
          try {
            const { getWizardState, advanceWizardStep, skipWizardStep, goBackWizardStep, completeWizard, getWizardQuestion, getWizardQuickReply } = await import("../services/wizardService");
            const { getBusinessSetupCompleteMessage, getBusinessSetupCancelMessage, getWizardValidationError, getFieldSavedMessage } = await import("../services/uxCopy");

            const wizardState = await getWizardState(userId);

            if (wizardState && wizardState.step && wizardState.step !== 'COMPLETE') {
              // Wizard in progress - handle navigation commands
              const textLower = messageText.toLowerCase().trim();

              // Handle navigation commands
              if (textLower === 'ย้อนกลับ' || textLower === 'back') {
                const prevStep = await goBackWizardStep(userId, wizardState.step);
                if (prevStep && prevStep !== wizardState.step) {
                  const question = getWizardQuestion(prevStep);
                  const quickReply = getWizardQuickReply(prevStep); // HARDENING v2: Now sync function
                  await replyFn(question, quickReply);
                } else {
                  await replyFn('โอ๊ะ! อยู่ขั้นตอนแรกแล้ว ย้อนกลับไม่ได้ครับ', getWizardQuickReply(wizardState.step)); // HARDENING v2: Now sync function
                }
                return;
              }

              if (textLower === 'ข้าม' || textLower === 'skip') {
                const nextStep = await skipWizardStep(userId, wizardState.step);
                if (nextStep && nextStep !== wizardState.step) {
                  if (nextStep === 'COMPLETE') {
                    await completeWizard(userId, params.businessId);

                    // Check and celebrate milestone (first-time only)
                    const { checkAndCelebrateMilestone } = await import("../services/milestoneService");
                    const { getLineLink } = await import("../core/lineLinkService");
                    const lineLink = await getLineLink(params.lineUserId || '');
                    if (lineLink && lineUserId) {
                      const accessToken = getLineChannelAccessToken();
                      const celebrated = await checkAndCelebrateMilestone(
                        userId,
                        lineUserId,
                        'businessSetup',
                        accessToken
                      );
                      if (celebrated) {
                        // Milestone message already sent, skip regular message
                        return;
                      }
                    }

                    // Business setup completed - show SUCCESS context buttons
                    const { getBusinessSetupSavedButtons } = await import("../ui/quickReplies");
                    await replyFn(getBusinessSetupCompleteMessage(), getBusinessSetupSavedButtons());
                  } else {
                    const question = getWizardQuestion(nextStep);
                    const quickReply = getWizardQuickReply(nextStep); // HARDENING v2: Now sync function
                    await replyFn(question, quickReply);
                  }
                } else {
                  const optionalSteps = ['TAX_ID', 'EMAIL'];
                  const isOptional = optionalSteps.includes(wizardState.step);
                  const { getContextualQuickReply } = await import("../shared/contextualQuickReply");
                  const wizardButtons = getContextualQuickReply({
                    context: 'WIZARD',
                    wizardStep: wizardState.step,
                    isOptionalField: isOptional,
                  });
                  await replyFn('โอ๊ะ! ขั้นตอนนี้ข้ามไม่ได้ครับ', wizardButtons);
                }
                return;
              }

              if (textLower === 'ยกเลิก' || textLower === 'cancel') {
                const { setWizardState } = await import("../services/wizardService");
                await setWizardState(userId, { step: null, completed: [], data: {} });
                // Wizard cancelled - show GLOBAL context buttons (default)
                await replyFn(getBusinessSetupCancelMessage());
                return;
              }

              // Process step input
              if (messageText.trim().length > 0) {
                // Validate input (light validation)
                let isValid = true;
                let errorReason = '';

                if (wizardState.step === 'PHONE') {
                  // Basic phone validation (Thai format)
                  const phoneRegex = /^[0-9\s()-]{8,15}$/;
                  if (!phoneRegex.test(messageText.trim())) {
                    isValid = false;
                    errorReason = 'รูปแบบเบอร์โทรไม่ถูกต้อง (ตัวอย่าง: 0812345678)';
                  }
                } else if (wizardState.step === 'EMAIL') {
                  // Basic email validation
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(messageText.trim())) {
                    isValid = false;
                    errorReason = 'รูปแบบอีเมลไม่ถูกต้อง (ตัวอย่าง: example@email.com)';
                  }
                }

                if (!isValid) {
                  const optionalSteps = ['TAX_ID', 'EMAIL'];
                  const isOptional = optionalSteps.includes(wizardState.step);
                  const { getContextualQuickReply } = await import("../shared/contextualQuickReply");
                  const wizardButtons = getContextualQuickReply({
                    context: 'WIZARD',
                    wizardStep: wizardState.step,
                    isOptionalField: isOptional,
                  });
                  await replyFn(getWizardValidationError(wizardState.step, errorReason), wizardButtons);
                  return;
                }

                // Advance to next step
                const nextStep = await advanceWizardStep(userId, wizardState.step, messageText.trim());

                if (nextStep === 'COMPLETE') {
                  await completeWizard(userId, params.businessId);
                  // Business setup completed - show SUCCESS context buttons
                  const { getBusinessSetupSavedButtons } = await import("../ui/quickReplies");
                  await replyFn(getBusinessSetupCompleteMessage(), getBusinessSetupSavedButtons());
                } else if (nextStep) {
                  // Show saved confirmation and next question
                  const fieldMap: Record<string, string> = {
                    'BUSINESS_NAME': 'business_name',
                    'ADDRESS': 'address',
                    'TAX_ID': 'tax_id',
                    'PHONE': 'phone',
                    'EMAIL': 'email',
                  };
                  const fieldName = fieldMap[wizardState.step] || '';
                  const savedMsg = getFieldSavedMessage(fieldName);
                  const nextQuestion = getWizardQuestion(nextStep);
                  const optionalSteps = ['TAX_ID', 'EMAIL'];
                  const isOptional = optionalSteps.includes(nextStep);
                  const { getContextualQuickReply } = await import("../shared/contextualQuickReply");
                  const wizardButtons = getContextualQuickReply({
                    context: 'WIZARD',
                    wizardStep: nextStep,
                    isOptionalField: isOptional,
                  });
                  await replyFn(`${savedMsg}\n\n${nextQuestion}`, wizardButtons);
                }
                return;
              }
            }

            // ✅ STATE-AWARE FALLBACK: Check all active states before generic fallback
            // Priority: Payment > Business Setup > Button State > Generic

            // 1. Check payment state (already handled above in UNKNOWN intent)

            // 2. Check business setup state
            // ✅ CRITICAL: Allow payment intents to bypass business setup state
            const paymentIntents = [Intent.BUY_PACKAGE_199, Intent.BUY_PACKAGE_279, Intent.BUY_PACKAGE_3990, Intent.CREDIT_PURCHASE_HISTORY, Intent.CONFIRM_CREDIT_PAYMENT];
            const isPaymentIntent = paymentIntents.includes(intent);

            // Only check business setup state if NOT a payment intent
            if (!isPaymentIntent) {
              try {
                const { getBusinessSetupState } = await import("../services/businessSetupCopyPaste");
                const businessSetupState = await getBusinessSetupState(userId);

                if (businessSetupState === 'WAITING_FOR_DATA') {
                  // User sent something during business setup - parse it
                  const { parseBusinessData, validateBusinessData } = await import("../services/businessDataParser");
                  const {
                    setBusinessSetupState,
                    getBusinessSetupSummary,
                    getBusinessSetupPrefillData,
                    mergeBusinessData,
                    getBusinessSetupDiff,
                  } = await import("../services/businessSetupCopyPaste");
                  const { getBusinessSetupSummaryQuickReply } = await import("../shared/businessSetupQuickReply");

                  const parsed = parseBusinessData(messageText);
                  const existing = await getBusinessSetupPrefillData(userId, params.businessId);
                  const merged = mergeBusinessData(existing, {
                    name: parsed.name || undefined,
                    address: parsed.address || undefined,
                    phone: parsed.phone || undefined,
                    taxId: parsed.taxId || undefined,
                    email: parsed.email || undefined,
                    bankName: parsed.bankName || undefined,
                    bankAccountNo: parsed.bankAccountNo || undefined,
                    bankAccountName: parsed.bankAccountName || undefined,
                  });
                  const validation = validateBusinessData({
                    name: merged.name || null,
                    address: merged.address || null,
                    phone: merged.phone || null,
                    taxId: merged.taxId || null,
                    email: merged.email || null,
                    bankName: merged.bankName || null,
                    bankAccountNo: merged.bankAccountNo || null,
                    bankAccountName: merged.bankAccountName || null,
                  });

                  await setBusinessSetupState(userId, 'SHOWING_SUMMARY', merged);

                  const diffLines = getBusinessSetupDiff(existing, merged);
                  const summary = getBusinessSetupSummary(merged, diffLines);
                  const buttons = getBusinessSetupSummaryQuickReply();

                  if (!validation.valid) {
                    await replyFn(
                      `${summary}\n\n💡 หมายเหตุ: ยังไม่มี${validation.missingFields.join(', ')} แต่สามารถบันทึกได้ก่อนนะครับ`,
                      buttons
                    );
                  } else {
                    await replyFn(summary, buttons);
                  }
                  return;
                } else if (businessSetupState === 'SHOWING_SUMMARY') {
                  // User sent something during summary - show summary again
                  const { getParsedBusinessData, getBusinessSetupSummary } = await import("../services/businessSetupCopyPaste");
                  const { getBusinessSetupSummaryQuickReply } = await import("../shared/businessSetupQuickReply");

                  const parsed = await getParsedBusinessData(userId);
                  if (parsed) {
                    const summary = getBusinessSetupSummary(parsed);
                    const buttons = getBusinessSetupSummaryQuickReply();
                    await replyFn(
                      `${summary}\n\nติ๊ดๆ เลือกได้เลยว่าจะบันทึกหรือแก้ไขต่อ`,
                      buttons
                    );
                  } else {
                    // Lost state - restart
                    const { getBusinessSetupTemplate, setBusinessSetupState, getBusinessSetupPrefillData } = await import("../services/businessSetupCopyPaste");
                    await setBusinessSetupState(userId, 'WAITING_FOR_DATA');
                    const prefill = await getBusinessSetupPrefillData(userId, params.businessId);
                    await replyFn(getBusinessSetupTemplate(prefill));
                  }
                  return;
                }
              } catch (businessSetupError) {
                // Don't block on business setup check failure
                console.warn(`[conversationHandler] Business setup state check failed:`, businessSetupError);
              }
            }

            // 3. Check button state (already handled above in UNKNOWN intent)

            // 4. Generic fallback (only if no active state)
            const { getUnknownCommandMessage } = await import("../services/uxCopy");
            await replyFn(getUnknownCommandMessage());
          } catch (err) {
            console.error("[conversationHandler] Wizard/Unknown error:", err);
            const { getUnknownCommandMessage } = await import("../services/uxCopy");
            // Unknown command - use GLOBAL context (auto-detect)
            await replyFn(getUnknownCommandMessage());
          }
        }
        break;
    }
  } catch (error) {
    console.error("[CONVERSATION_HANDLER_ERROR] ❌ Fatal error:", error);
    // Fatal error - use contextual buttons (auto-detect: GLOBAL)
    try {
      await replyFn(
        "โอ๊ะ! ระบบขัดข้องชั่วคราว\n" +
        "ลองใหม่อีกครั้งนะ หรือทักแอดมินได้เลย"
      );
    } catch (replyErr) {
      console.error("[CONVERSATION_HANDLER_ERROR] ❌ Failed to send error message:", replyErr);
      // Last resort: try to send via LINE API directly (with deadline if possible)
      if (lineUserId) {
        try {
          const { getReplyWithDeadline } = await import("../utils/cachedHotPathImports");
          const { replyWithDeadline } = await getReplyWithDeadline();

          const replyState = await replyWithDeadline({
            replyToken,
            lineUserId,
            traceId: traceId || 'n/a',
            stage: 'ERROR_HANDLER_FALLBACK',
            message: "โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย",
            replyFn: async (params) => {
              await lineClient.replyMessage(params);
            },
          });

          if (replyState.didReplySuccess) {
            didReplySuccess = true;
            didAttemptReply = true;
          }
        } catch (finalErr) {
          const { getSecureConsole } = await import("../utils/cachedHotPathImports");
          const { secureError } = await getSecureConsole();
          secureError({
            tag: "[CONVERSATION_HANDLER_ERROR]",
            trace_id: traceId,
            user_id: userId,
            line_user_id: lineUserId,
            timestamp: new Date().toISOString(),
          }, finalErr);
        }
      } else {
        // No lineUserId - direct reply (shouldn't happen in normal flow)
        try {
          await lineClient.replyMessage({
            replyToken,
            messages: [{
              type: "text",
              text: "โอ๊ะ! ระบบขัดข้องชั่วคราว\nลองใหม่ได้เลย",
            }],
          });
          didReplySuccess = true;
          didAttemptReply = true;
        } catch (finalErr) {
          const { getSecureConsole } = await import("../utils/cachedHotPathImports");
          const { secureError } = await getSecureConsole();
          secureError({
            tag: "[CONVERSATION_HANDLER_ERROR]",
            trace_id: traceId,
            user_id: userId,
            timestamp: new Date().toISOString(),
          }, finalErr);
        }
      }
    }
  }

  // ✅ FIX 2: Final safety net: Ensure reply sent before function returns
  if (!didReplySuccess) {
    const { getGlobalFallbackMessage } = await import("../services/paymentUXCopy");
    await replyFn(getGlobalFallbackMessage());
  }

  // ✅ Latency tracking: Log handler total latency
  const durationMs = Date.now() - t0;
  console.log(JSON.stringify({
    tag: "[HANDLER_LATENCY]",
    trace_id: traceId,
    user_id: userId,
    line_user_id: lineUserId,
    duration_ms: durationMs,
    did_reply_success: didReplySuccess,
    did_attempt_reply: didAttemptReply,
    timestamp: new Date().toISOString(),
  }));
}
