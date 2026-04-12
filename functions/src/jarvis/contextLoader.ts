/**
 * Context Loader — โหลดข้อมูลธุรกิจจาก Firestore ใส่ AI System Prompt
 *
 * ทำให้ AI รู้จักธุรกิจของ user: ชื่อ, แพลน, ลูกค้าล่าสุด, เอกสารล่าสุด, ยอดขาย
 */
import * as admin from "firebase-admin";
import { getEffectiveSubscriptionPlan } from "../core/planService";

// ============ Types ============

type WorkingDraftMemory = {
  source: "line_draft" | "jarvis_draft";
  docType: string;
  status: string;
  customerName?: string;
  notes?: string;
  sourceDocNo?: string;
  installmentNo?: number | null;
  installmentAmount?: number | null;
  installmentRemaining?: number | null;
  total?: number | null;
  itemCount?: number | null;
  updatedAtMs: number;
};

type PendingPurchaseMemory = {
  source: "credit_purchase" | "jarvis_purchase";
  status: string;
  packageLabel: string;
  amount: number;
  referenceId?: string;
  expiresAtMs?: number | null;
};

type UnpaidInvoiceMemory = {
  docNo: string;
  customer: string;
  amount: number;
  status: string;
  notes?: string;
  createdAtMs: number;
};

export interface SessionWorkingMemory {
  latestDraft: WorkingDraftMemory | null;
  pendingPurchase: PendingPurchaseMemory | null;
  latestUnpaidInvoice: UnpaidInvoiceMemory | null;
}

export interface BusinessContext {
  uid: string;
  plan: string;
  planLabel: string;
  businessId: string;
  businessName: string;
  businessAddress?: string;
  businessTaxId?: string;
  businessPhone?: string;
  businessEmail?: string;
  hasBankAccount: boolean;
  hasPromptPay: boolean;
  hasLogo: boolean;
  setupComplete: boolean;
  recentCustomers: Array<{ name: string; id: string }>;
  recentDocuments: Array<{
    docNo: string;
    docType: string;
    customer: string;
    amount: number;
    status: string;
  }>;
  monthlyDocCount: number;
  monthlyRevenue: number;
  unpaidInvoiceCount: number;
  workingMemory: SessionWorkingMemory;
}

// ============ Cache ============

const contextCache = new Map<
  string,
  { data: BusinessContext; timestamp: number }
>();
const CACHE_TTL = 30_000; // 30 seconds

// ============ Main Function ============

function toMillis(value: unknown): number {
  if (value instanceof admin.firestore.Timestamp) {
    return value.toMillis();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value && typeof value === "object" && typeof (value as { toMillis?: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function normalizeDocTypeLabel(docType: string | undefined | null): string {
  const normalized = String(docType || "").trim().toUpperCase();
  if (["QUO", "QUOTATION"].includes(normalized)) return "ใบเสนอราคา";
  if (["BILL", "INVOICE", "INV"].includes(normalized)) return "ใบวางบิล";
  if (["RECEIPT", "REC"].includes(normalized)) return "ใบเสร็จ";
  if (["CN", "CREDIT_NOTE"].includes(normalized)) return "ใบลดหนี้";
  if (["DN", "DEBIT_NOTE"].includes(normalized)) return "ใบเพิ่มหนี้";
  return normalized || "เอกสาร";
}

function normalizeWorkingDraftFromLineDraft(data: Record<string, unknown> | undefined): WorkingDraftMemory | null {
  if (!data) return null;
  const updatedAtMs = Math.max(toMillis(data.updatedAt), toMillis(data.createdAt));
  if (updatedAtMs <= 0) return null;
  return {
    source: "line_draft",
    docType: String(data.docType || "QUO"),
    status: String(data.status || "editing"),
    customerName: String(data.customerLegalName || data.customerName || "").trim() || undefined,
    notes: String(data.notes || "").trim() || undefined,
    sourceDocNo: String(data.source_doc_no || "").trim() || undefined,
    installmentNo: typeof data.installment_no === "number" ? data.installment_no : null,
    installmentAmount: typeof data.installment_total === "number" ? data.installment_total : null,
    installmentRemaining: typeof data.installment_remaining === "number" ? data.installment_remaining : null,
    total: typeof data.total === "number" ? data.total : null,
    itemCount: Array.isArray(data.items) ? data.items.length : null,
    updatedAtMs,
  };
}

function normalizeWorkingDraftFromJarvisDraft(data: Record<string, unknown> | undefined): WorkingDraftMemory | null {
  if (!data) return null;
  const expiresAtMs = toMillis(data.expiresAt);
  if (expiresAtMs > 0 && expiresAtMs < Date.now()) {
    return null;
  }
  const updatedAtMs = Math.max(toMillis(data.updatedAt), toMillis(data.createdAt));
  if (updatedAtMs <= 0) return null;
  return {
    source: "jarvis_draft",
    docType: String(data.docType || "QUO"),
    status: String(data.status || "pending_confirm"),
    customerName: String(data.customerName || "").trim() || undefined,
    notes: String(data.notes || "").trim() || undefined,
    sourceDocNo: String(data.source_doc_no || data.sourceDocNo || "").trim() || undefined,
    installmentNo: typeof data.installment_no === "number" ? data.installment_no : null,
    installmentAmount: typeof data.installment_total === "number" ? data.installment_total : null,
    installmentRemaining: typeof data.installment_remaining === "number" ? data.installment_remaining : null,
    total: typeof data.total === "number"
      ? data.total
      : typeof data.subtotal === "number"
        ? data.subtotal
        : null,
    itemCount: Array.isArray(data.items) ? data.items.length : null,
    updatedAtMs,
  };
}

function pickLatestDraft(
  lineDraft: WorkingDraftMemory | null,
  jarvisDrafts: WorkingDraftMemory[],
): WorkingDraftMemory | null {
  const candidates = [lineDraft, ...jarvisDrafts].filter((draft): draft is WorkingDraftMemory => Boolean(draft));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  return candidates[0];
}

function formatPackageLabel(packageType: unknown): string {
  const numeric = Number(packageType);
  if (numeric === 99 || numeric === 199 || numeric === 990) return "EzDOC Pro";
  if (numeric === 279 || numeric === 299 || numeric === 399 || numeric === 2511 || numeric === 2790 || numeric === 3591 || numeric === 3990) {
    return "EzDOC Team";
  }
  return String(packageType || "แพ็กสมาชิก");
}

function buildPendingPurchaseMemory(
  creditPurchases: Array<Record<string, unknown>>,
  jarvisPurchases: Array<Record<string, unknown>>,
): PendingPurchaseMemory | null {
  const activeCreditStatuses = new Set(["PENDING", "WAITING_FOR_SLIP", "PENDING_REVIEW"]);
  const activeJarvisStatuses = new Set(["PENDING", "WAITING_FOR_SLIP", "PROCESSING"]);

  const credit = creditPurchases
    .filter((purchase) => activeCreditStatuses.has(String(purchase.status || "")))
    .sort((a, b) => {
      const aMs = Math.max(toMillis(a.updatedAt), toMillis(a.updated_at), toMillis(a.slip_uploaded_at), toMillis(a.createdAt));
      const bMs = Math.max(toMillis(b.updatedAt), toMillis(b.updated_at), toMillis(b.slip_uploaded_at), toMillis(b.createdAt));
      return bMs - aMs;
    })[0];

  if (credit) {
    return {
      source: "credit_purchase",
      status: String(credit.status || ""),
      packageLabel: formatPackageLabel(credit.packageType),
      amount: Number(credit.amount || 0) || 0,
      referenceId: String(credit.referenceId || "").trim() || undefined,
      expiresAtMs: toMillis(credit.expiresAt) || null,
    };
  }

  const jarvis = jarvisPurchases
    .filter((purchase) => activeJarvisStatuses.has(String(purchase.status || "")))
    .sort((a, b) => Math.max(toMillis(b.createdAt), toMillis(b.expiresAt)) - Math.max(toMillis(a.createdAt), toMillis(a.expiresAt)))[0];

  if (!jarvis) return null;

  return {
    source: "jarvis_purchase",
    status: String(jarvis.status || ""),
    packageLabel: `Jarvis ${String(jarvis.plan || "").toUpperCase()}`,
    amount: Number(jarvis.amount || 0) || 0,
    referenceId: String(jarvis.referenceId || "").trim() || undefined,
    expiresAtMs: toMillis(jarvis.expiresAt) || null,
  };
}

function buildLatestUnpaidInvoiceMemory(
  unpaidDocs: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>[],
): UnpaidInvoiceMemory | null {
  if (unpaidDocs.length === 0) return null;
  const latest = unpaidDocs
    .map((doc) => doc.data())
    .sort((a, b) => {
      const aMs = Math.max(toMillis(a.createdAt), toMillis(a.created_at), toMillis(a.issued_at));
      const bMs = Math.max(toMillis(b.createdAt), toMillis(b.created_at), toMillis(b.issued_at));
      return bMs - aMs;
    })[0];

  return {
    docNo: String(latest.docNo || latest.doc_no || "-"),
    customer:
      String(
        latest.customerSnapshot?.displayName ||
        latest.customer_snapshot?.name ||
        latest.customer_name ||
        "-"
      ),
    amount: Number(latest.money?.total_amount || latest.total_amount || latest.total || 0) || 0,
    status: String(latest.status || "ISSUED"),
    notes: String(latest.notes || "").trim() || undefined,
    createdAtMs: Math.max(toMillis(latest.createdAt), toMillis(latest.created_at), toMillis(latest.issued_at)),
  };
}

/**
 * Load business context for AI system prompt
 * Returns null if user is not linked or has no business
 */
export async function loadBusinessContext(
  lineUserId: string,
  db?: admin.firestore.Firestore,
): Promise<BusinessContext | null> {
  // Check cache first
  const cached = contextCache.get(lineUserId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const firestore = db || admin.firestore();

  try {
    // Get Firebase UID from LINE link
    const linkDoc = await firestore
      .collection("line_links")
      .doc(lineUserId)
      .get();

    if (!linkDoc.exists) return null;

    const linkData = linkDoc.data();
    if (!linkData || linkData.status !== "ACTIVE") return null;

    const uid = linkData.uid;
    if (!uid) return null;

    // Get user document + active business ID
    const userDoc = await firestore.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const businessId = userData?.activeBusinessId || linkData.businessId;
    if (!businessId) return null;

    // Parallel fetch: business, subscription, recent docs, recent customers, unpaid bills
    const [
      businessDoc,
      subscriptionDoc,
      recentDocsSnapshot,
      recentCustomersSnapshot,
      unpaidSnapshot,
      lineDraftDoc,
      jarvisDraftsSnapshot,
      creditPurchasesSnapshot,
      jarvisPurchasesSnapshot,
    ] = await Promise.all([
      firestore.doc(`users/${uid}/businesses/${businessId}`).get(),
      firestore.doc(`subscriptions/${uid}`).get(),
      firestore
        .collection(`users/${uid}/businesses/${businessId}/documents`)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get(),
      firestore
        .collection(`users/${uid}/businesses/${businessId}/customers`)
        .limit(10)
        .get(),
      firestore
        .collection(`users/${uid}/businesses/${businessId}/documents`)
        .where("docType", "==", "BILL")
        .where("status", "in", ["ISSUED", "UNPAID", "AWAITING_PAYMENT"])
        .limit(20)
        .get(),
      firestore.collection("line_drafts").doc(uid).get(),
      firestore
        .collection("jarvis_drafts")
        .where("lineUserId", "==", lineUserId)
        .limit(10)
        .get(),
      firestore
        .collection("credit_purchases")
        .where("userId", "==", uid)
        .limit(20)
        .get(),
      firestore
        .collection("jarvis_purchases")
        .where("lineUserId", "==", lineUserId)
        .limit(10)
        .get(),
    ]);

    const business = businessDoc.data() || {};
    const subscription = subscriptionDoc.data() || {};

    const plan = getEffectiveSubscriptionPlan(subscription);

    const planLabels: Record<string, string> = {
      FREE: "ฟรี (สิทธิ์พื้นฐาน)",
      PRO: "PRO 99฿/เดือน (ไม่จำกัด)",
      TEAM: "TEAM 279฿/เดือน (3 คน)",
    };

    // Process recent documents
    const recentDocuments = recentDocsSnapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        docNo: d.docNo || d.doc_no || "Draft",
        docType: d.docType || d.doc_type || "QUO",
        customer:
          d.customerSnapshot?.displayName ||
          d.customer_snapshot?.name ||
          d.customer_name ||
          "-",
        amount:
          d.money?.total_amount || d.total_amount || d.money?.grand_total || 0,
        status: d.status || "DRAFT",
      };
    });

    // Process recent customers
    const recentCustomers = recentCustomersSnapshot.docs.map((doc) => ({
      name: doc.data().displayName || doc.data().name || "-",
      id: doc.id,
    }));

    // Monthly stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let monthlyDocCount = 0;
    let monthlyRevenue = 0;
    for (const doc of recentDocsSnapshot.docs) {
      const d = doc.data();
      const created = d.createdAt?.toDate?.() || null;
      if (created && created >= monthStart) {
        monthlyDocCount++;
        const isReceipt =
          d.docType === "RECEIPT" || d.doc_type === "RECEIPT";
        if (isReceipt) {
          monthlyRevenue += d.money?.total_amount || d.total_amount || 0;
        }
      }
    }

    const lineDraft = normalizeWorkingDraftFromLineDraft(
      lineDraftDoc.exists ? (lineDraftDoc.data() as Record<string, unknown>) : undefined
    );
    const jarvisDrafts = jarvisDraftsSnapshot.docs
      .map((doc) => normalizeWorkingDraftFromJarvisDraft(doc.data() as Record<string, unknown>))
      .filter((draft): draft is WorkingDraftMemory => Boolean(draft));

    const workingMemory: SessionWorkingMemory = {
      latestDraft: pickLatestDraft(lineDraft, jarvisDrafts),
      pendingPurchase: buildPendingPurchaseMemory(
        creditPurchasesSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
        jarvisPurchasesSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>)
      ),
      latestUnpaidInvoice: buildLatestUnpaidInvoiceMemory(unpaidSnapshot.docs),
    };

    // Build context
    const context: BusinessContext = {
      uid,
      plan,
      planLabel: planLabels[plan] || plan,
      businessId,
      businessName: business.name || "ยังไม่ตั้งชื่อ",
      businessAddress: business.address,
      businessTaxId: business.taxId || business.tax_id,
      businessPhone: business.phone,
      businessEmail: business.email,
      hasBankAccount: !!(business.bankAccountNo && business.bankName),
      hasPromptPay: !!(business.promptpayAccount || business.promptpay_account),
      hasLogo: !!(business.logo_url || business.logoUrl),
      setupComplete: !!(business.name && business.address && (business.taxId || business.tax_id)),
      recentCustomers,
      recentDocuments,
      monthlyDocCount,
      monthlyRevenue,
      unpaidInvoiceCount: unpaidSnapshot.size,
      workingMemory,
    };

    // Cache and return
    contextCache.set(lineUserId, { data: context, timestamp: Date.now() });
    return context;
  } catch (error) {
    console.error("[JARVIS] Context load error:", error);
    return null;
  }
}

/**
 * Format business context as text for AI system prompt injection
 */
export function formatContextForPrompt(ctx: BusinessContext): string {
  const lines: string[] = [
    `ชื่อธุรกิจ: ${ctx.businessName}`,
    `แพลน: ${ctx.planLabel}`,
  ];

  if (ctx.businessTaxId) lines.push(`เลขภาษี: ${ctx.businessTaxId}`);
  if (ctx.businessPhone) lines.push(`โทร: ${ctx.businessPhone}`);

  // Setup warnings
  if (!ctx.setupComplete) {
    const missing: string[] = [];
    if (!ctx.businessName || ctx.businessName === "ยังไม่ตั้งชื่อ")
      missing.push("ชื่อธุรกิจ");
    if (!ctx.businessAddress) missing.push("ที่อยู่");
    if (!ctx.businessTaxId) missing.push("เลขภาษี");
    if (!ctx.hasBankAccount) missing.push("บัญชีธนาคาร");
    if (missing.length > 0) {
      lines.push(`⚠️ ตั้งค่าไม่ครบ: ${missing.join(", ")}`);
    }
  }

  // Monthly stats
  lines.push(`เอกสารเดือนนี้: ${ctx.monthlyDocCount} ใบ`);
  lines.push(`รายได้เดือนนี้: ฿${ctx.monthlyRevenue.toLocaleString()}`);
  if (ctx.unpaidInvoiceCount > 0) {
    lines.push(`⚠️ ใบวางบิลค้างชำระ: ${ctx.unpaidInvoiceCount} ใบ`);
  }

  // Recent customers
  if (ctx.recentCustomers.length > 0) {
    lines.push(
      `ลูกค้าล่าสุด: ${ctx.recentCustomers
        .slice(0, 5)
        .map((c) => c.name)
        .join(", ")}`,
    );
  }

  // Recent documents
  if (ctx.recentDocuments.length > 0) {
    const docTypeEmoji: Record<string, string> = {
      QUO: "📋",
      BILL: "🧾",
      RECEIPT: "💰",
    };
    lines.push("เอกสารล่าสุด:");
    for (const d of ctx.recentDocuments.slice(0, 3)) {
      lines.push(
        `  ${docTypeEmoji[d.docType] || "📄"} ${d.docNo} | ${d.customer} | ฿${d.amount.toLocaleString()}`,
      );
    }
  }

  const memory = ctx.workingMemory;
  if (memory.latestDraft || memory.pendingPurchase || memory.latestUnpaidInvoice) {
    lines.push("Working memory ล่าสุด:");

    if (memory.latestDraft) {
      const draft = memory.latestDraft;
      const draftParts = [
        `${normalizeDocTypeLabel(draft.docType)} (${draft.source})`,
        draft.customerName ? `ลูกค้า ${draft.customerName}` : null,
        typeof draft.total === "number" ? `ยอด ฿${draft.total.toLocaleString()}` : null,
        draft.itemCount ? `${draft.itemCount} รายการ` : null,
        draft.status ? `สถานะ ${draft.status}` : null,
      ].filter(Boolean);
      lines.push(`- draft ล่าสุด: ${draftParts.join(" | ")}`);
      if (draft.sourceDocNo) {
        lines.push(`- อ้างอิงเอกสาร: ${draft.sourceDocNo}`);
      }
      if (draft.notes) {
        lines.push(`- หมายเหตุปัจจุบัน: ${draft.notes}`);
      }
      if (draft.installmentNo) {
        const installmentBits = [
          `งวดที่ ${draft.installmentNo}`,
          typeof draft.installmentAmount === "number" ? `ยอดงวด ฿${draft.installmentAmount.toLocaleString()}` : null,
          typeof draft.installmentRemaining === "number" ? `คงเหลือ ฿${draft.installmentRemaining.toLocaleString()}` : null,
        ].filter(Boolean);
        lines.push(`- installment: ${installmentBits.join(" | ")}`);
      }
    }

    if (memory.pendingPurchase) {
      const purchase = memory.pendingPurchase;
      const purchaseBits = [
        purchase.packageLabel,
        `สถานะ ${purchase.status}`,
        `฿${purchase.amount.toLocaleString()}`,
        purchase.referenceId ? `Ref ${purchase.referenceId}` : null,
      ].filter(Boolean);
      lines.push(`- pending purchase: ${purchaseBits.join(" | ")}`);
    }

    if (memory.latestUnpaidInvoice) {
      const invoice = memory.latestUnpaidInvoice;
      const invoiceBits = [
        invoice.docNo,
        invoice.customer,
        `฿${invoice.amount.toLocaleString()}`,
        invoice.status,
      ].filter(Boolean);
      lines.push(`- unpaid invoice ล่าสุด: ${invoiceBits.join(" | ")}`);
      if (invoice.notes) {
        lines.push(`- หมายเหตุบิลค้างล่าสุด: ${invoice.notes}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Clear cached context for a user (call after data changes)
 */
export function clearContextCache(lineUserId: string): void {
  contextCache.delete(lineUserId);
}
