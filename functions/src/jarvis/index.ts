/**
 * Jarvis AI Assistant — Main Entry Point (Unified Mode)
 *
 * เชื่อม Unified Brain + EzDoc Skills + Personal Skills + Context Loader
 * ทุกข้อความผ่าน AI หมด — ไม่ต้องสลับ mode อีกต่อไป
 */
import * as admin from "firebase-admin";
import { processUnifiedMessage } from "./unifiedBrain";
import { ezdocSkills } from "./ezdocSkills";
import { renderToLine } from "./lineRenderer";
import { loadBusinessContext, formatContextForPrompt } from "./contextLoader";
import { checkQuota, checkDocumentQuota, useDocument } from "./quotaService";
import { buildBlockedMessage, buildFlexFillBar, buildUpgradeMenu } from "./quotaRenderer";
import { createJarvisPurchase, getActiveJarvisPurchase } from "./paymentService";
import { buildPackagePricingMessage, isPackagePricingQuestion } from "../services/packagePricingService";
import { buildSubscriptionPaymentHelpMessage, isSubscriptionPaymentHelpQuestion } from "../services/subscriptionPaymentHelpService";
import type { JarvisContext, ConversationMessage } from "./types";
import { STARTER_FREE_DOC_QUOTA } from "../core/lineLinkService";
import { JARVIS_LINK_REQUIRED_TEXT } from "./linkPrompt";
import { normalizeInput } from "../utils/inputNormalization";
import { runGemmaGateway } from "../services/gemmaGateway";

export { clearContextCache } from "./contextLoader";
export { checkQuota, checkDocumentQuota, useDocument, upgradePlan, getQuota } from "./quotaService";

// Jarvis mode flag prefix in user's Firestore doc
const JARVIS_COLLECTION = "jarvis_users";
const CONVERSATION_SUBCOLLECTION = "conversations";
const MAX_HISTORY = 20;

function formatDocumentNotesLine(notes: string | null | undefined): string {
  const normalized = String(notes || "").trim();
  return normalized ? `\n📝 หมายเหตุ: ${normalized}` : "";
}

async function ensureDocumentAccess(params: {
  userId: string;
  lineUserId: string;
  docType: "QUO" | "BILL" | "RECEIPT";
  pushMessage: (text: string) => Promise<void>;
}): Promise<boolean> {
  const { userId, lineUserId, docType, pushMessage } = params;
  const { canCreateDocumentType } = await import("../core/planService");
  const { getUpsellMessage } = await import("../core/subscriptionService");
  const { getStarterQuotaStatus } = await import("../core/lineLinkService");
  const { getUserPlan } = await import("../core/planService");
  const planDocType = docType === "BILL" ? "INV" : docType === "RECEIPT" ? "REC" : "QUO";
  const plan = await getUserPlan(userId);
  const starterQuota = plan === "FREE"
    ? await getStarterQuotaStatus(userId, lineUserId)
    : null;
  const allowed = (starterQuota && starterQuota.remaining > 0)
    ? true
    : await canCreateDocumentType(userId, planDocType);

  if (allowed) {
    return true;
  }

  if (starterQuota && starterQuota.remaining <= 0) {
    await pushMessage(
      "สิทธิ์ฟรี 10 ใบแรกของบัญชีนี้ใช้ครบแล้วครับ\n\n" +
      "EzDOC Pro 99 บาท สำหรับ 1 ผู้ใช้ ออกเอกสารได้ไม่จำกัด\n" +
      "EzDOC Team 279 บาท สำหรับหลายผู้ใช้ ออกเอกสารได้ไม่จำกัด\n\n" +
      "พิมพ์ \"ซื้อแพ็ค 99\" หรือ \"ซื้อแพ็ค 279\" ได้เลยครับ"
    );
    return false;
  }

  await pushMessage(getUpsellMessage(0));
  return false;
}

async function replyWithDeterministicPlanStatus(params: {
  userId: string;
  lineUserId: string;
  pushMessage: (text: string) => Promise<void>;
}): Promise<void> {
  const { userId, lineUserId, pushMessage } = params;
  const { getSubscriptionStatus } = await import("../services/trustCommands");
  const subscription = await getSubscriptionStatus(userId);

  if (subscription.status === "ACTIVE" && (subscription.plan === "PRO" || subscription.plan === "TEAM")) {
    const label = subscription.plan === "TEAM" ? "TEAM" : "PRO";
    await pushMessage(
      `ตอนนี้แพ็ก EzDoc ของคุณคือ ${label}\n` +
      `สิทธิ์เอกสารในแพ็กนี้ใช้งานได้ไม่จำกัดครับ`
    );
    return;
  }

  const { getStarterQuotaStatus } = await import("../core/lineLinkService");
  const starterQuota = await getStarterQuotaStatus(userId, lineUserId);
  await pushMessage(
    `ตอนนี้แพ็ก EzDoc ของคุณคือ FREE และยังไม่เป็นสมาชิก\n` +
    `สิทธิ์ฟรีของบัญชีนี้ใช้ไปแล้ว ${starterQuota.used}/${starterQuota.quota} ใบ\n` +
    `เอกสารฟรีจะมีลายน้ำ EzDOC\n` +
    `ถ้าจะเชื่อมบัญชีเพื่อเก็บงานไว้ พิมพ์ "เชื่อมต่อ"\n` +
    `ถ้าจะอัปเกรดใน LINE พิมพ์ "ซื้อแพ็ค 99" หรือ "ซื้อแพ็ค 279" ได้เลย`
  );
}

async function replyWithDeterministicUpgradeGuide(
  pushMessage: (text: string) => Promise<void>,
): Promise<void> {
  await pushMessage(
    `ผู้ใช้ใหม่ใช้ฟรีได้ ${STARTER_FREE_DOC_QUOTA} ใบแรกก่อนครับ\n` +
    `เอกสารฟรีจะมีลายน้ำ EzDOC\n\n` +
    `สมัครแพ็กผ่าน LINE ได้เลยครับ ไม่ต้องเข้าเว็บก่อน\n` +
    `• EzDoc Pro พิมพ์ "ซื้อแพ็ค 99" สำหรับ 1 ผู้ใช้ ออกเอกสารได้ไม่จำกัด\n` +
    `• EzDoc Team พิมพ์ "ซื้อแพ็ค 279" สำหรับหลายผู้ใช้ ออกเอกสารได้ไม่จำกัด\n` +
    `ระบบจะส่ง PromptPay QR มาในแชทนี้ แล้วโอนเสร็จส่งสลิปได้เลย`
  );
}

async function handleDirectPackagePurchase(params: {
  userId: string;
  lineUserId: string;
  packageType: 99 | 279 | 399 | 2790 | 3990;
  pushMessage: (text: string) => Promise<void>;
}): Promise<void> {
  const { createPurchase } = await import("../services/purchaseService");
  const result = await createPurchase({
    userId: params.userId,
    lineUserId: params.lineUserId,
    packageType: params.packageType,
  });
  await params.pushMessage(result.message);
}

/**
 * เช็คว่า user เปิดใช้ Jarvis mode หรือยัง
 */
export async function isJarvisUser(
  lineUserId: string,
  db?: admin.firestore.Firestore,
): Promise<boolean> {
  const firestore = db || admin.firestore();
  const doc = await firestore.collection(JARVIS_COLLECTION).doc(lineUserId).get();
  return doc.exists && doc.data()?.enabled === true;
}

/**
 * เปิด/ปิด Jarvis mode สำหรับ user
 */
export async function setJarvisMode(
  lineUserId: string,
  enabled: boolean,
  db?: admin.firestore.Firestore,
): Promise<void> {
  const firestore = db || admin.firestore();
  await firestore.collection(JARVIS_COLLECTION).doc(lineUserId).set(
    {
      enabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

function sanitizeRoutingText(messageText: string): string {
  return messageText
    .trim()
    .replace(/^[^A-Za-z0-9ก-๙]+/u, "");
}

function shouldRouteToGemmaConstruction(messageText: string): boolean {
  const text = sanitizeRoutingText(messageText).toLowerCase();

  if (!text) {
    return false;
  }

  const patterns = [
    /boq|bill\s*of\s*quantity/i,
    /วัสดุ|ก่อสร้าง|โครงการ|ไซต์งาน|งานระบบ/,
    /ราคาวัสดุ|วัสดุก่อสร้าง|ต้นทุน|ประมาณราคา/,
    /คอนกรีต|ปูน|เหล็ก|กระเบื้อง|สี|ท่อ|สายไฟ/,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

export function isExplicitJarvisActivation(messageText: string): boolean {
  const text = sanitizeRoutingText(messageText);
  return /^(jarvis|จาวิส|ai|เอไอ|ezdoc\s*ai)$/i.test(text);
}

export function shouldPreferDeterministicDocumentFlow(messageText: string): boolean {
  const text = sanitizeRoutingText(messageText);
  const normalizedText = normalizeInput(text);

  if (!text) {
    return false;
  }

  if (
    /^(?:ใบเสนอราคา|ใบวางบิล|ใบเสร็จ|ใบเสร็จรับเงิน|quotation|invoice|receipt)$/i.test(normalizedText) ||
    /^(?:ทำ|สร้าง|ออก|เริ่ม)\s*(?:ใบเสนอราคา|ใบวางบิล|ใบเสร็จ|ใบเสร็จรับเงิน|quotation|invoice|receipt)(?:\s|$)/i.test(normalizedText) ||
    /^(?:ออกครบชุด|ใบวางบิล\s*จาก|ใบเสร็จ\s*จาก|ยืนยันรับเงิน)(?:\s|$)/i.test(normalizedText) ||
    /^(?:ตัวอย่างเอกสาร|ตั้งค่าธุรกิจ(?:แบบฟอร์ม)?|เชื่อมต่อ(?:บัญชี)?|สถานะแพ็ค|เมนู|ช่วยเหลือ|วิธีใช้(?:งาน)?|แบบฟอร์ม|เช็คสลิป|รายงาน)(?:\s|$)/i.test(normalizedText) ||
    /^(?:ตั้งค่า(?:ธีม|theme)|เปลี่ยน(?:ธีม|theme)|(?:ธีม|theme).*(?:ยังไง|อย่างไร|ไง|คืออะไร))(?:\s|$)/i.test(normalizedText) ||
    /^(?:ซื้อแพ็ค\s*(?:99|279|3990)|ลูกค้า\s*[:：]?\s+.+|ชื่อลูกค้า\s*[:：]?\s+.+|เพิ่ม(?:รายการ)?(?:\s+.+|$)|แก้(?:ไข)?(?:รายการ)?(?:\s+.+|$)|ลบ(?:รายการ)?(?:\s+.+|$)|ออกเอกสาร(?:\s+.+|$)|ยืนยัน(?:อีกครั้ง)?(?:\s+.+|$)|เริ่มใหม่(?:\s+.+|$)|ตั้งลูกค้า(?:\s+.+|$)|จ่ายเงินสด|จ่ายสด|ชำระเงินสด|เงินสด)$/i.test(normalizedText) ||
    /(?:^|\n)\s*(?:ลูกค้า|ชื่อลูกค้า|รายการ|หมายเหตุ|วันที่|รายละเอียด(?:รายการ)?งาน|หมวด)/i.test(text) ||
    (/\n/.test(text) && /(จำนวน\s*\d+.*(?:ราคา|฿|บาท)|(?:ราคา|฿)\s*[0-9,]+|[0-9,]+\s*บาท)/i.test(text))
  ) {
    return true;
  }

  return false;
}

/**
 * Main handler — รับข้อความจาก LINE แล้วให้ Jarvis ตอบ
 */
export async function handleJarvisMessage(params: {
  lineUserId: string;
  userId: string;
  messageText: string;
  pushMessage: (text: string) => Promise<void>;
  pushMessages: (messages: Array<{ type: string; [key: string]: unknown }>) => Promise<void>;
  traceId: string;
  db?: admin.firestore.Firestore;
}): Promise<void> {
  const { lineUserId, userId, messageText, pushMessage, pushMessages, traceId } = params;
  const db = params.db || admin.firestore();
  const trimmed = messageText.trim();

  if (isPackagePricingQuestion(trimmed)) {
    const reply = buildPackagePricingMessage();
    await pushMessage(reply);
    await saveConversationMessage(lineUserId, "user", trimmed, db);
    await saveConversationMessage(lineUserId, "assistant", reply, db);
    return;
  }

  if (isSubscriptionPaymentHelpQuestion(trimmed)) {
    const reply = buildSubscriptionPaymentHelpMessage();
    await pushMessage(reply);
    await saveConversationMessage(lineUserId, "user", trimmed, db);
    await saveConversationMessage(lineUserId, "assistant", reply, db);
    return;
  }

  const compact = trimmed.replace(/\s+/g, "");
  if (compact === "ซื้อแพ็ค99" || compact === "แพ็ค99" || compact === "99" || compact === "ซื้อแพ็ค199" || compact === "แพ็ค199" || compact === "199") {
    await handleDirectPackagePurchase({ userId, lineUserId, packageType: 99, pushMessage });
    await saveConversationMessage(lineUserId, "user", trimmed, db);
    await saveConversationMessage(lineUserId, "assistant", "[purchase] package 99", db);
    return;
  }

  if (compact === "ซื้อแพ็ค279" || compact === "แพ็ค279" || compact === "279" || compact === "ซื้อแพ็ค399" || compact === "แพ็ค399" || compact === "399" || compact === "ซื้อแพ็ค299" || compact === "แพ็ค299" || compact === "299") {
    await handleDirectPackagePurchase({ userId, lineUserId, packageType: 279, pushMessage });
    await saveConversationMessage(lineUserId, "user", trimmed, db);
    await saveConversationMessage(lineUserId, "assistant", "[purchase] package 279", db);
    return;
  }

  if (compact === "ซื้อแพ็ค3990" || compact === "แพ็ค3990" || compact === "3990") {
    await handleDirectPackagePurchase({ userId, lineUserId, packageType: 3990, pushMessage });
    await saveConversationMessage(lineUserId, "user", trimmed, db);
    await saveConversationMessage(lineUserId, "assistant", "[purchase] package 3990", db);
    return;
  }

  if (/(?:สมัคร|อัปเกรด|upgrade|ซื้อ).*(?:แพ็ก|แพ็ค|สมาชิก|pro|team)|(?:pro|team).*(?:ยังไง|ไง|สมัคร|อัปเกรด|ซื้อ)/i.test(trimmed)) {
    await replyWithDeterministicUpgradeGuide(pushMessage);
    await saveConversationMessage(lineUserId, "user", trimmed, db);
    await saveConversationMessage(lineUserId, "assistant", "[subscription-upgrade] deterministic reply", db);
    return;
  }

  if (/(สถานะแพ็ค|แพ็กเกจ|แพลน|สมาชิก|ออกเอกสารได้กี่|เหลือกี่ฉบับ|เหลือกี่ใบ|ไม่จำกัดไหม|ยังออกได้ไหม)/i.test(trimmed)) {
    await replyWithDeterministicPlanStatus({ userId, lineUserId, pushMessage });
    await saveConversationMessage(lineUserId, "user", trimmed, db);
    await saveConversationMessage(lineUserId, "assistant", "[subscription-status] deterministic reply", db);
    return;
  }

  // ============ Meta commands ============

  // ปิด AI mode
  if (/^(ปิด\s*(jarvis|ai|ezdoc\s*ai)|exit\s*(jarvis|ai)|\/ezdoc)$/i.test(trimmed)) {
    await setJarvisMode(lineUserId, false, db);
    await pushMessage("🔄 กลับสู่โหมด EzDoc ปกติแล้วครับ\nพิมพ์ 'ai' เมื่อไหร่ก็ได้เพื่อกลับมาใช้ EzDoc AI");
    return;
  }

  // อัพเกรด command
  if (/^(อัพเกรด|upgrade)\s*(ezdoc|jarvis|ai)?/i.test(trimmed)) {
    const { quota } = await checkQuota(lineUserId, db);
    const flexMenu = buildUpgradeMenu(quota.plan);
    await pushMessages([{ type: "flex", altText: "🚀 อัพเกรด EzDoc AI", contents: flexMenu }]);
    return;
  }

  // สมัคร EzDoc plan command → generate QR for payment
  const subscribePlanMatch = trimmed.match(/^สมัคร\s*(?:ezdoc|jarvis)?\s*(basic|pro|unlimited)/i);
  if (subscribePlanMatch) {
    const planMap = {
      basic: "BASIC",
      pro: "PRO",
      unlimited: "PRO",
    } as const;
    const requestedPlan = subscribePlanMatch[1].toLowerCase() as keyof typeof planMap;
    const newPlan = planMap[requestedPlan];
    if (newPlan) {
      try {
        const { flexMessage, instructionText } = await createJarvisPurchase(lineUserId, newPlan, db);
        await pushMessages([
          { type: "flex", altText: `💳 ชำระเงิน EzDoc ${newPlan}`, contents: flexMessage },
        ]);
        await pushMessage(instructionText);
      } catch (error) {
        console.error("[JARVIS] Payment creation failed:", error);
        await pushMessage("❌ สร้าง QR ไม่สำเร็จ ลองใหม่อีกครั้งครับ");
      }
      return;
    }
  }

  // ยกเลิกสมัคร — cancel pending Jarvis purchase
  if (/^ยกเลิกสมัคร$/i.test(trimmed)) {
    const pending = await getActiveJarvisPurchase(lineUserId, db);
    if (pending) {
      await db.collection("jarvis_purchases").doc(pending.id).update({ status: "EXPIRED" });
      await pushMessage("❌ ยกเลิกการสมัครแล้วครับ");
    } else {
      await pushMessage("ไม่มีรายการสมัครที่ค้างอยู่ครับ");
    }
    return;
  }

  // จ่ายแล้ว / โอนแล้ว — check pending purchase status
  if (/^(จ่ายแล้ว|โอนแล้ว|ส่งสลิปแล้ว)$/i.test(trimmed)) {
    const pending = await getActiveJarvisPurchase(lineUserId, db);
    if (pending) {
      if (pending.status === "PROCESSING") {
        await pushMessage("⏳ กำลังตรวจสอบสลิปอยู่ครับ รอสักครู่...");
      } else {
        await pushMessage("📸 ส่งรูปสลิปการโอนเงินในแชทนี้ได้เลยครับ\nระบบจะตรวจสอบให้อัตโนมัติ");
      }
    } else {
      await pushMessage("ไม่มีรายการชำระเงินที่ค้างอยู่ครับ");
    }
    return;
  }

  // เช็คโควต้า command
  if (/^(โควต้า|quota|เหลือกี่เอกสาร|เหลือกี่คำถาม|usage)/i.test(trimmed)) {
    const { quota } = await checkDocumentQuota(lineUserId, db);
    const flexBar = buildFlexFillBar(quota);
    await pushMessages([{ type: "flex", altText: "📊 โควต้าเอกสาร EzDoc", contents: flexBar }]);
    return;
  }

  // ============ Document Confirm/Cancel Handlers ============

  // Handle "ยกเลิก" — cancel any pending draft
  if (/^ยกเลิก$/i.test(trimmed)) {
    await pushMessage("❌ ยกเลิกแล้วครับ");
    return;
  }

  // Handle jarvis_confirm_doc_{draftId}
  const confirmDocMatch = trimmed.match(/^jarvis_confirm_doc_(.+)$/);
  if (confirmDocMatch) {
    const draftId = confirmDocMatch[1];
    await handleConfirmDocument(draftId, lineUserId, pushMessage, db);
    return;
  }

  // Handle jarvis_confirm_batch_{draftId} — batch receipt creation
  const confirmBatchMatch = trimmed.match(/^jarvis_confirm_batch_(.+)$/);
  if (confirmBatchMatch) {
    const batchDraftId = confirmBatchMatch[1];
    await handleConfirmBatchReceipt(batchDraftId, lineUserId, pushMessage, db);
    return;
  }

  // Handle jarvis_receipt_from_{docId}
  const receiptFromMatch = trimmed.match(/^jarvis_receipt_from_(.+)$/);
  if (receiptFromMatch) {
    const sourceDocId = receiptFromMatch[1];
    await handleConfirmReceiptFromInvoice(sourceDocId, lineUserId, pushMessage, db);
    return;
  }

  // Handle "ยืนยัน" / "ยืนยันออกเอกสาร" — find latest pending draft
  if (/^(ยืนยัน|ยืนยันออกเอกสาร)$/i.test(trimmed)) {
    // Find pending drafts for this user (no orderBy to avoid index requirement)
    const pendingDrafts = await db
      .collection("jarvis_drafts")
      .where("lineUserId", "==", lineUserId)
      .where("status", "==", "pending_confirm")
      .limit(10)
      .get();

    if (!pendingDrafts.empty) {
      // Sort in memory to get the latest one
      const sorted = pendingDrafts.docs.sort((a, b) => {
        const aTime = a.data().createdAt?.toMillis?.() || 0;
        const bTime = b.data().createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      await handleConfirmDocument(sorted[0].id, lineUserId, pushMessage, db);
      return;
    }
    await pushMessage("❌ ไม่พบเอกสารที่รอยืนยันครับ ลองสร้างใหม่อีกครั้ง");
    return;
  }

  // ============ Build context (AI chat is FREE — no quota check) ============

  const conversationHistory = await getConversationHistory(lineUserId, db);

  const ctx: JarvisContext = {
    userId,
    lineUserId,
    traceId,
    conversationHistory,
  };

  // ============ Load business context ============

  let businessContextText: string | undefined;
  try {
    const bizCtx = await loadBusinessContext(lineUserId, db);
    if (bizCtx) {
      businessContextText = formatContextForPrompt(bizCtx);
    }
  } catch (error) {
    console.error("[JARVIS] Failed to load business context:", error);
  }

  // ============ Process with EzDoc AI Brain ============

  console.log(`[EZDOC_AI] Processing message for ${lineUserId.slice(0, 8)}...: "${trimmed.slice(0, 50)}"`);

  const shouldUseConstruction = shouldRouteToGemmaConstruction(trimmed);
  const task = shouldUseConstruction ? "construction_qa" : "document_chat";

  const gemmaResult = await runGemmaGateway({
    task,
    channel: "line",
    actor: { uid: userId, lineUserId },
    input: {
      text: trimmed,
      meta: { skills: ezdocSkills, ctx, businessContext: businessContextText },
    },
    context: shouldUseConstruction
      ? { maxKnowledgeItems: 3, loaders: ["project_memory", "code_index", "incidents", "project_issues", "test_observations"] }
      : undefined,
    output: { format: shouldUseConstruction ? "text" : "jarvis_response" },
    trace: { source: "jarvis" },
  });

  let response = null as unknown as Awaited<ReturnType<typeof processUnifiedMessage>>;
  if (gemmaResult.ok) {
    if (shouldUseConstruction && gemmaResult.output.text) {
      response = { type: "text", text: gemmaResult.output.text } as typeof response;
    } else if (gemmaResult.output.jarvisResponse) {
      response = gemmaResult.output.jarvisResponse as typeof response;
    } else if (gemmaResult.output.text) {
      response = { type: "text", text: gemmaResult.output.text } as typeof response;
    }
  }

  if (!response) {
    response = await processUnifiedMessage(trimmed, ezdocSkills, ctx, businessContextText);
  }

  // ============ Render & Send (AI chat is free — no quota deduction) ============

  const lineMessages = renderToLine(response);

  try {
    await pushMessages(lineMessages);
  } catch (error) {
    // Fallback: ถ้า Flex Message มีปัญหา ส่ง text ธรรมดา
    console.error("[JARVIS] Flex message failed, falling back to text:", error);
    const fallbackText =
      response.type === "text"
        ? response.text
        : `🤖 EzDoc AI: ดำเนินการเรียบร้อยครับ (${response.type})`;
    await pushMessage(fallbackText);
  }

  // ============ Save conversation history ============

  await saveConversationMessage(lineUserId, "user", trimmed, db);
  const assistantText =
    response.type === "text"
      ? response.text
      : `[${response.type}] action completed`;
  await saveConversationMessage(lineUserId, "assistant", assistantText, db);
}

/**
 * Quick check — ข้อความนี้ควร route ไป EzDoc AI หรือ EzDoc ปกติ?
 * โฟกัสเอกสารอย่างเดียว: ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จ, รายงาน
 */
export function isJarvisIntent(messageText: string): boolean {
  if (shouldPreferDeterministicDocumentFlow(messageText)) {
    return false;
  }

  const text = sanitizeRoutingText(messageText).toLowerCase();

  const aiPatterns = [
    // Explicit AI trigger
    /^(jarvis|จาวิส|ai|เอไอ)\s/i,
    // Document creation
    /ออก(ใบ|เอกสาร)|สร้าง(ใบ|เอกสาร)|ทำ(ใบ|เอกสาร)/,
    /ใบเสนอราคา|ใบแจ้งหนี้|ใบวางบิล|ใบเสร็จ|ใบกำกับ/,
    /quotation|invoice|receipt|billing/i,
    // Customer / Business
    /ลูกค้า|customer|เพิ่มลูกค้า|หาลูกค้า/i,
    // Report / Summary
    /รายงาน|สรุป(ยอด|เดือน|รายได้)|report|ยอดขาย/i,
    // Tax
    /ภาษี|tax|vat|หัก.*ณ.*ที่จ่าย|withholding/i,
    // Calculator for business
    /คำนวณ(ราคา|ภาษี|vat|ส่วนลด)|คิดราคา|คิดvat/i,
  ];

  return aiPatterns.some((p) => p.test(text));
}

// ============ Conversation History (Firestore) ============

async function getConversationHistory(
  lineUserId: string,
  db: admin.firestore.Firestore,
): Promise<ConversationMessage[]> {
  try {
    const snapshot = await db
      .collection(JARVIS_COLLECTION)
      .doc(lineUserId)
      .collection(CONVERSATION_SUBCOLLECTION)
      .orderBy("timestamp", "desc")
      .limit(MAX_HISTORY)
      .get();

    return snapshot.docs
      .map((doc) => doc.data() as ConversationMessage)
      .reverse(); // oldest first
  } catch {
    return [];
  }
}

// ============ Document Confirmation Handlers ============

async function handleConfirmDocument(
  draftId: string,
  lineUserId: string,
  pushMessage: (text: string) => Promise<void>,
  db: admin.firestore.Firestore,
): Promise<void> {
  try {
    // ============ Document Quota Check ============
    const { allowed, quota } = await checkDocumentQuota(lineUserId, db);
    if (!allowed) {
      const blocked = buildBlockedMessage(quota);
      await pushMessage(blocked.text);
      return;
    }

    const draftRef = db.collection("jarvis_drafts").doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      await pushMessage("❌ ไม่พบเอกสารนี้ อาจหมดอายุแล้ว ลองสร้างใหม่ครับ");
      return;
    }

    const draft = draftDoc.data()!;

    if (draft.status !== "pending_confirm") {
      await pushMessage("✅ เอกสารนี้ถูกยืนยันไปแล้วครับ");
      return;
    }

    if (draft.lineUserId !== lineUserId) {
      await pushMessage("❌ ไม่มีสิทธิ์ยืนยันเอกสารนี้ครับ");
      return;
    }

    const { uid, businessId, docType, customerName, items, subtotal } = draft;
    const hasAccess = await ensureDocumentAccess({
      userId: uid,
      lineUserId,
      docType,
      pushMessage,
    });
    if (!hasAccess) {
      return;
    }

    // Generate document number using atomic counter (no compound index needed)
    const prefix: Record<string, string> = { QUO: "QUO", BILL: "INV", RECEIPT: "REC" };
    const now = new Date();
    const yearBE = now.getFullYear() + 543;
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const counterKey = `${yearBE}${month}_${docType}`;

    const counterRef = db.doc(`users/${uid}/businesses/${businessId}/counters/docNumbers`);
    const seq = await db.runTransaction(async (tx) => {
      const counterDoc = await tx.get(counterRef);
      const counters = counterDoc.exists ? counterDoc.data() || {} : {};
      const nextSeq = (counters[counterKey] || 0) + 1;
      tx.set(counterRef, { [counterKey]: nextSeq }, { merge: true });
      return nextSeq;
    });

    const docNo = `${prefix[docType] || docType}-${yearBE}${month}-${String(seq).padStart(3, "0")}`;

    // Create actual document
    const docData = {
      docNo,
      docType,
      status: docType === "RECEIPT" ? "PAID" : "ISSUED",
      customerSnapshot: { displayName: customerName },
      customer_name: customerName,
      notes: draft.notes || "",
      items: items.map((item: { name: string; qty: number; price: number }) => ({
        description_th: item.name,
        name: item.name,
        qty: item.qty,
        unit_price: item.price,
        amount: item.qty * item.price,
      })),
      money: {
        subtotal,
        total_amount: subtotal,
        grand_total: subtotal,
      },
      total_amount: subtotal,
      source_doc_no: draft.source_doc_no || null,
      sourceDocNo: draft.source_doc_no || null,
      businessId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "jarvis",
    };

    const newDocRef = await db
      .collection(`users/${uid}/businesses/${businessId}/documents`)
      .add(docData);

    // Queue PDF generation — triggers the PDF pipeline automatically
    const pdfJobRef = db.collection("pdf_generation_jobs").doc(`${businessId}_${newDocRef.id}`);
    await pdfJobRef.set({
      id: pdfJobRef.id,
      user_id: uid,
      business_id: businessId,
      document_id: newDocRef.id,
      document_no: docNo,
      doc_type: docType,
      status: "PENDING",
      created_at: admin.firestore.Timestamp.now(),
      attempts: 0,
      max_attempts: 3,
      source: "JARVIS",
    });

    // Mark draft as confirmed
    await draftRef.update({ status: "confirmed", confirmedAt: Date.now() });

    // ============ Deduct document quota ============
    await useDocument(lineUserId, db);

    const docTypeNames: Record<string, string> = {
      QUO: "ใบเสนอราคา",
      BILL: "ใบวางบิล",
      RECEIPT: "ใบเสร็จรับเงิน",
    };
    const emoji: Record<string, string> = { QUO: "📋", BILL: "🧾", RECEIPT: "💰" };

    let msg =
      `${emoji[docType] || "📄"} ออก${docTypeNames[docType] || docType}เรียบร้อย!\n\n` +
      `📄 เลขที่: ${docNo}\n` +
      `👤 ลูกค้า: ${customerName}\n` +
      `💰 จำนวน: ฿${subtotal.toLocaleString()}\n\n` +
      `สถานะ: ${docType === "RECEIPT" ? "ชำระแล้ว" : "ออกแล้ว"}`;
    msg += formatDocumentNotesLine(draft.notes);

    // Document Chain — แนะนำขั้นตอนถัดไป
    const chainHints: Record<string, string> = {
      QUO: "\n\n💡 ลูกค้าตกลงเมื่อไหร่ บอกด็อกนะ จะออกบิลให้เลยครับ",
      BILL: "\n\n💡 ลูกค้าจ่ายแล้วบอกด็อก จะออกใบเสร็จให้ครับ",
      RECEIPT: "\n\n✅ เอกสารครบ flow แล้ว เยี่ยมเลยครับ!",
    };
    msg += chainHints[docType] || "";

    await pushMessage(msg);
  } catch (error) {
    console.error("[JARVIS] Confirm document error:", error);
    await pushMessage("❌ เกิดข้อผิดพลาดในการออกเอกสาร ลองใหม่อีกครั้งครับ");
  }
}

async function handleConfirmReceiptFromInvoice(
  sourceDocId: string,
  lineUserId: string,
  pushMessage: (text: string) => Promise<void>,
  db: admin.firestore.Firestore,
): Promise<void> {
  try {
    // ============ Document Quota Check ============
    const { allowed, quota } = await checkDocumentQuota(lineUserId, db);
    if (!allowed) {
      const blocked = buildBlockedMessage(quota);
      await pushMessage(blocked.text);
      return;
    }

    // Find the user
    const linkDoc = await db.collection("line_links").doc(lineUserId).get();
    if (!linkDoc.exists) {
      await pushMessage(JARVIS_LINK_REQUIRED_TEXT);
      return;
    }
    const linkData = linkDoc.data()!;
    const uid = linkData.uid;
    const hasAccess = await ensureDocumentAccess({
      userId: uid,
      lineUserId,
      docType: "RECEIPT",
      pushMessage,
    });
    if (!hasAccess) {
      return;
    }
    const userDoc = await db.collection("users").doc(uid).get();
    const businessId = userDoc.data()?.activeBusinessId || linkData.businessId;

    if (!businessId) {
      await pushMessage("❌ ไม่พบข้อมูลธุรกิจครับ");
      return;
    }

    // Get the source invoice
    const invoiceRef = db.doc(`users/${uid}/businesses/${businessId}/documents/${sourceDocId}`);
    const invoiceDoc = await invoiceRef.get();

    if (!invoiceDoc.exists) {
      await pushMessage("❌ ไม่พบใบวางบิลนี้ ลองใหม่ครับ");
      return;
    }

    const invoice = invoiceDoc.data()!;
    const customerName = invoice.customerSnapshot?.displayName || invoice.customer_name || "-";
    const amount = invoice.money?.total_amount || invoice.total_amount || 0;

    // Generate receipt number using atomic counter
    const now = new Date();
    const yearBE = now.getFullYear() + 543;
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const counterKey = `${yearBE}${month}_RECEIPT`;

    const counterRef = db.doc(`users/${uid}/businesses/${businessId}/counters/docNumbers`);
    const seq = await db.runTransaction(async (tx) => {
      const counterDoc = await tx.get(counterRef);
      const counters = counterDoc.exists ? counterDoc.data() || {} : {};
      const nextSeq = (counters[counterKey] || 0) + 1;
      tx.set(counterRef, { [counterKey]: nextSeq }, { merge: true });
      return nextSeq;
    });

    const docNo = `REC-${yearBE}${month}-${String(seq).padStart(3, "0")}`;

    // Create receipt
    const receiptData = {
      docNo,
      docType: "RECEIPT",
      status: "PAID",
      customerSnapshot: invoice.customerSnapshot || { displayName: customerName },
      customer_name: customerName,
      notes: invoice.notes || "",
      items: invoice.items || [],
      money: invoice.money || { total_amount: amount, grand_total: amount },
      total_amount: amount,
      source_doc_no: invoice.docNo || null,
      sourceDocNo: invoice.docNo || null,
      source_doc_id: sourceDocId,
      sourceDocId,
      businessId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "jarvis",
    };

    const newReceiptRef = await db
      .collection(`users/${uid}/businesses/${businessId}/documents`)
      .add(receiptData);

    // Queue PDF generation for receipt
    const pdfJobRef = db.collection("pdf_generation_jobs").doc(`${businessId}_${newReceiptRef.id}`);
    await pdfJobRef.set({
      id: pdfJobRef.id,
      user_id: uid,
      business_id: businessId,
      document_id: newReceiptRef.id,
      document_no: docNo,
      doc_type: "RECEIPT",
      status: "PENDING",
      created_at: admin.firestore.Timestamp.now(),
      attempts: 0,
      max_attempts: 3,
      source: "JARVIS",
    });

    // Update invoice status to PAID
    await invoiceRef.update({
      status: "PAID",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ============ Deduct document quota ============
    await useDocument(lineUserId, db);

    const msg =
      `💰 ออกใบเสร็จเรียบร้อย!\n\n` +
      `📄 เลขที่: ${docNo}\n` +
      `👤 ลูกค้า: ${customerName}\n` +
      `💰 จำนวน: ฿${amount.toLocaleString()}\n` +
      `📎 อ้างอิง: ${invoice.docNo || sourceDocId}` +
      `${formatDocumentNotesLine(invoice.notes)}\n\n` +
      `✅ ใบวางบิลเปลี่ยนสถานะเป็น "ชำระแล้ว"`;

    await pushMessage(msg);
  } catch (error) {
    console.error("[JARVIS] Confirm receipt from invoice error:", error);
    await pushMessage("❌ เกิดข้อผิดพลาดในการออกใบเสร็จ ลองใหม่ครับ");
  }
}

// ============ Batch Receipt Confirmation Handler ============

async function handleConfirmBatchReceipt(
  batchDraftId: string,
  lineUserId: string,
  pushMessage: (text: string) => Promise<void>,
  db: admin.firestore.Firestore,
): Promise<void> {
  try {
    const draftRef = db.collection("jarvis_drafts").doc(batchDraftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      await pushMessage("❌ ไม่พบรายการนี้ อาจหมดอายุแล้ว ลองใหม่ครับ");
      return;
    }

    const draft = draftDoc.data()!;
    if (draft.status !== "pending_confirm" || draft.lineUserId !== lineUserId) {
      await pushMessage("❌ ไม่สามารถดำเนินการได้ครับ");
      return;
    }

    const { uid, businessId, billIds } = draft;
    const hasAccess = await ensureDocumentAccess({
      userId: uid,
      lineUserId,
      docType: "RECEIPT",
      pushMessage,
    });
    if (!hasAccess) {
      return;
    }
    if (!billIds || billIds.length === 0) {
      await pushMessage("❌ ไม่พบบิลที่ต้องออกใบเสร็จครับ");
      return;
    }

    await pushMessage(`⏳ กำลังออกใบเสร็จ ${billIds.length} ใบ...`);

    let successCount = 0;
    let totalAmount = 0;

    for (const billId of billIds) {
      try {
        // Check quota for each
        const { allowed } = await checkDocumentQuota(lineUserId, db);
        if (!allowed) {
          await pushMessage(`⚠️ โควต้าหมด ออกได้ ${successCount}/${billIds.length} ใบ`);
          break;
        }

        const invoiceRef = db.doc(`users/${uid}/businesses/${businessId}/documents/${billId}`);
        const invoiceDoc = await invoiceRef.get();
        if (!invoiceDoc.exists) continue;

        const invoice = invoiceDoc.data()!;
        const customerName = invoice.customerSnapshot?.displayName || invoice.customer_name || "-";
        const amount = invoice.money?.grand_total || invoice.total_amount || 0;

        // Generate receipt number
        const now = new Date();
        const yearBE = now.getFullYear() + 543;
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const counterKey = `${yearBE}${month}_RECEIPT`;

        const counterRef = db.doc(`users/${uid}/businesses/${businessId}/counters/docNumbers`);
        const seq = await db.runTransaction(async (tx) => {
          const counterDoc = await tx.get(counterRef);
          const counters = counterDoc.exists ? counterDoc.data() || {} : {};
          const nextSeq = (counters[counterKey] || 0) + 1;
          tx.set(counterRef, { [counterKey]: nextSeq }, { merge: true });
          return nextSeq;
        });

        const docNo = `REC-${yearBE}${month}-${String(seq).padStart(3, "0")}`;

        // Create receipt
        const newReceiptRef = await db
          .collection(`users/${uid}/businesses/${businessId}/documents`)
          .add({
            docNo,
            docType: "RECEIPT",
            status: "PAID",
            customerSnapshot: invoice.customerSnapshot || { displayName: customerName },
            customer_name: customerName,
            notes: invoice.notes || "",
            items: invoice.items || [],
            money: invoice.money || { total_amount: amount, grand_total: amount },
            total_amount: amount,
            source_doc_no: invoice.docNo || null,
            sourceDocNo: invoice.docNo || null,
            source_doc_id: billId,
            sourceDocId: billId,
            businessId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: "jarvis",
          });

        // Queue PDF
        const pdfJobRef = db.collection("pdf_generation_jobs").doc(`${businessId}_${newReceiptRef.id}`);
        await pdfJobRef.set({
          id: pdfJobRef.id,
          user_id: uid,
          business_id: businessId,
          document_id: newReceiptRef.id,
          document_no: docNo,
          doc_type: "RECEIPT",
          status: "PENDING",
          created_at: admin.firestore.Timestamp.now(),
          attempts: 0,
          max_attempts: 3,
          source: "JARVIS",
        });

        // Update invoice status
        await invoiceRef.update({
          status: "PAID",
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await useDocument(lineUserId, db);
        successCount++;
        totalAmount += amount;
      } catch (err) {
        console.error(`[JARVIS] Batch receipt error for bill ${billId}:`, err);
      }
    }

    await draftRef.update({ status: "confirmed", confirmedAt: Date.now() });

    await pushMessage(
      `✅ ออกใบเสร็จเรียบร้อย ${successCount}/${billIds.length} ใบ\n` +
      `💰 รวม ฿${totalAmount.toLocaleString()}\n\n` +
      `บิลทั้งหมดเปลี่ยนสถานะเป็น "ชำระแล้ว" ครับ`,
    );
  } catch (error) {
    console.error("[JARVIS] Batch receipt error:", error);
    await pushMessage("❌ เกิดข้อผิดพลาดในการออกใบเสร็จ ลองใหม่ครับ");
  }
}

async function saveConversationMessage(
  lineUserId: string,
  role: "user" | "assistant",
  content: string,
  db: admin.firestore.Firestore,
): Promise<void> {
  try {
    await db
      .collection(JARVIS_COLLECTION)
      .doc(lineUserId)
      .collection(CONVERSATION_SUBCOLLECTION)
      .add({
        role,
        content: content.slice(0, 2000), // limit size
        timestamp: Date.now(),
        expiresAt: admin.firestore.Timestamp.fromMillis(
          Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days TTL
        ),
      });
  } catch (error) {
    console.error("[JARVIS] Failed to save conversation:", error);
  }
}
