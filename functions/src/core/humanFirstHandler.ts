/**
 * Human Interaction Runtime
 * 
 * A production-grade, human-first conversational engine for document creation.
 * 
 * Architecture:
 * - InputPipeline: Normalizes and parses user input
 * - DraftEngine: Applies actions to draft state (pure, sequential)
 * - UXDirector: Decides what to say (all user-facing language)
 * - DocumentOrchestrator: Handles document issuance workflow
 * - Telemetry: Structured logging for observability
 * 
 * Principles:
 * 1. Human-first language: Professional, calm, helpful, never error language
 * 2. Deterministic: Same input + same state → same result
 * 3. Backward compatible: Feature flag gates all behavior
 */

import { getHumanFirstUxEnabled } from '../shared/config';
import {
  parseForgivingInput,
  normalizeThaiInput,
  ParsedActionType,
  type ParsingContext,
  type ParsedAction,
} from './forgivingParser';
import {
  determineHumanFirstState,
  getHumanFirstButtons,
} from './humanFirstStateMachine';
import { getDraft, updateDraft, clearDraft, type LineDraft } from './draftStore';
import type { QuickReplyAction } from '../shared/lineQuickReply';
import { getUxVariant, type DocType } from './ux';

export interface HumanFirstResponse {
  message: string;
  buttons: QuickReplyAction[];
}

// ============================================================================
// TELEMETRY
// ============================================================================

/**
 * Structured logging for observability
 */
function logRuntimeEvent(
  userId: string,
  businessId: string,
  traceId: string | undefined,
  action: string,
  context: Record<string, unknown>,
  draft?: { docType?: string; id?: string } | null,
  latencyMs?: number
): void {
  if (getHumanFirstUxEnabled()) {
    // Calculate confidence average if actions are present
    const actions = context.parsed_actions as Array<{ confidence?: number }> | undefined;
    const confidenceAvg = actions && actions.length > 0
      ? actions.reduce((sum, a) => sum + (a.confidence || 0), 0) / actions.length
      : undefined;

    console.log(JSON.stringify({
      human_first_enabled: true,
      handler_version: 'human_interaction_runtime_v1',
      trace_id: traceId || null,
      user_id: userId,
      business_id: businessId,
      action,
      doc_type: draft?.docType || null,
      draft_id: draft?.id || null,
      draft_exists: draft !== null && draft !== undefined,
      latency_ms: latencyMs || null,
      confidence_avg: confidenceAvg,
      was_normalized: context.was_normalized,
      ...context,
      timestamp: new Date().toISOString(),
    }));
  }
}

// ============================================================================
// INPUT PIPELINE
// ============================================================================

/**
 * Input Pipeline: Normalize and parse user input
 */
interface PipelineResult {
  actions: ParsedAction[];
  normalizedText: string;
  wasNormalized: boolean;
  confidence: number;
}

function processInput(rawText: string, context: ParsingContext): PipelineResult {
  // Normalize Thai input (insert spaces, protect URLs/emails)
  const normalizedText = normalizeThaiInput(rawText.trim());
  const wasNormalized = normalizedText !== rawText;

  // Parse into actions
  const actions = parseForgivingInput(normalizedText, context);

  // Calculate average confidence
  const confidence = actions.length > 0
    ? actions.reduce((sum, a) => sum + a.confidence, 0) / actions.length
    : 0;

  return {
    actions,
    normalizedText,
    wasNormalized,
    confidence,
  };
}

function shouldUseAiSlotAssist(result: PipelineResult): boolean {
  const meaningfulActions = result.actions.filter((action) =>
    ![
      ParsedActionType.UNKNOWN,
      ParsedActionType.HELP,
      ParsedActionType.MENU,
      ParsedActionType.TEMPLATE,
      ParsedActionType.PAYMENT_CLAIM,
    ].includes(action.type),
  );

  if (meaningfulActions.length === 0) {
    return true;
  }

  const hasOnlyIncompleteActions = meaningfulActions.every((action) =>
    action.type === ParsedActionType.MISSING_ITEM_PRICE,
  );

  return hasOnlyIncompleteActions || result.confidence < 0.55;
}

async function maybeEnhancePipelineWithAI(
  rawText: string,
  context: ParsingContext,
  baseResult: PipelineResult,
): Promise<PipelineResult> {
  if (!shouldUseAiSlotAssist(baseResult)) {
    return baseResult;
  }

  try {
    const { extractDraftActionsWithAI } = await import('../services/hybridAiAssistService');
    const aiResult = await extractDraftActionsWithAI(rawText, context);

    if (aiResult.actions.length === 0) {
      return baseResult;
    }

    return {
      actions: aiResult.actions,
      normalizedText: baseResult.normalizedText,
      wasNormalized: baseResult.wasNormalized,
      confidence: Math.max(baseResult.confidence, aiResult.confidence),
    };
  } catch (error) {
    console.warn('[humanFirst] AI slot assist failed:', error);
    return baseResult;
  }
}

// ============================================================================
// DRAFT ENGINE
// ============================================================================

/**
 * Draft Engine: Pure functions that apply actions to draft state
 * No UX copy here - only state transformations
 */

interface DraftChange {
  customerName?: string;
  items?: LineDraft['items'];
  needsRecalculation: boolean;
}

/**
 * Apply a single action to a working draft (pure function)
 */
function applyActionToDraft(
  draft: LineDraft,
  action: ParsedAction,
  context: ParsingContext
): DraftChange | null {
  void context;
  switch (action.type) {
    case ParsedActionType.RESET:
      // Reset is handled at orchestration level (clears draft)
      return null;

    case ParsedActionType.UNDO_LAST:
      if (draft.items && draft.items.length > 0) {
        return {
          items: draft.items.slice(0, -1),
          needsRecalculation: true,
        };
      }
      return null; // Nothing to undo

    case ParsedActionType.SET_CUSTOMER_NAME:
      if (action.payload?.customerName) {
        return {
          customerName: action.payload.customerName,
          needsRecalculation: false,
        };
      }
      return null;

    case ParsedActionType.ADD_ITEM:
      if (action.payload?.item) {
        const newItems = [...(draft.items || []), action.payload.item];
        return {
          items: newItems,
          needsRecalculation: true,
        };
      }
      return null;

    case ParsedActionType.SET_PENDING_PRICE:
      // Update price of last item
      if (action.payload?.item && draft.items && draft.items.length > 0) {
        const lastIndex = draft.items.length - 1;
        const updatedItems = [...draft.items];
        updatedItems[lastIndex] = {
          ...updatedItems[lastIndex],
          price: action.payload.item.price,
          qty: action.payload.item.qty || updatedItems[lastIndex].qty || 1,
        };
        return {
          items: updatedItems,
          needsRecalculation: true,
        };
      }
      return null;

    case ParsedActionType.EDIT_LAST_ITEM:
      if (action.payload?.item && draft.items && draft.items.length > 0) {
        const lastIndex = draft.items.length - 1;
        const currentItem = draft.items[lastIndex];
        const newItem = action.payload.item;

        const updatedItems = [...draft.items];
        updatedItems[lastIndex] = {
          ...currentItem,
          // Only update name if provided (non-empty)
          name: newItem.name || currentItem.name,
          // Only update price if provided (>0 or explicit)
          price: newItem.price > 0 ? newItem.price : currentItem.price,
          // Only update qty if provided
          qty: newItem.qty > 0 ? newItem.qty : currentItem.qty,
        };

        return {
          items: updatedItems,
          needsRecalculation: true,
        };
      }
      return null;

    case ParsedActionType.SET_PHONE:
      // Phone is not stored in draft (transparency handled in UX layer)
      return null;

    case ParsedActionType.CONFIRM:
    case ParsedActionType.UNKNOWN:
    case ParsedActionType.PAYMENT_CLAIM:
      // These are handled at orchestration level, not draft level
      return null;

    default:
      return null;
  }
}

/**
 * Validate draft completeness
 */
function validateDraftCompleteness(draft: LineDraft): {
  isValid: boolean;
  missing: Array<'customer' | 'items'>;
} {
  const missing: Array<'customer' | 'items'> = [];

  if (!draft.customerName || draft.customerName.trim().length === 0) {
    missing.push('customer');
  }

  if (!draft.items || draft.items.length === 0) {
    missing.push('items');
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
}

/**
 * Sanitize item names for PDF generation (remove UI/system phrases)
 */
function sanitizeItemNamesForPdf(draft: LineDraft): LineDraft {
  const uiPhrases = [
    'เพิ่มรายการ',
    'ลูกค้า',
    'ยกเลิก',
    'ออกเอกสาร',
    'ยืนยัน',
    'เริ่มใหม่',
    'ลบรายการ',
  ];

  return {
    ...draft,
    items: draft.items.map(item => {
      let sanitized = item.name.trim();

      // Remove UI phrases (case-insensitive, whole word only)
      for (const phrase of uiPhrases) {
        const regex = new RegExp(`^${phrase}\\s*[:：]?\\s*`, 'i');
        sanitized = sanitized.replace(regex, '').trim();
      }

      return {
        ...item,
        name: sanitized || item.name, // Fallback to original if empty
      };
    }),
  };
}

// ============================================================================
// UX DIRECTOR
// ============================================================================

/**
 * UX Director: All user-facing language lives here
 * Professional, calm, helpful, human-first
 */



/**
 * Detect document creation commands from raw text
 */
function detectCreateCommand(rawText: string): 'QUO' | 'BILL' | 'RECEIPT' | null {
  const normalized = rawText.toLowerCase().trim();

  // Create Quotation
  if (
    normalized.includes('ทำใบเสนอราคา') ||
    normalized.includes('ใบเสนอราคา') ||
    normalized.includes('quotation')
  ) {
    return 'QUO';
  }

  // Create Invoice
  if (
    normalized.includes('ทำใบวางบิล') ||
    normalized.includes('ใบวางบิล') ||
    normalized.includes('ทำ invoice') ||
    normalized.includes('invoice') ||
    normalized.includes('วางบิล')
  ) {
    return 'BILL';
  }

  // Create Receipt
  if (
    normalized.includes('ทำใบเสร็จ') ||
    normalized.includes('ใบเสร็จ') ||
    normalized.includes('receipt') ||
    normalized.includes('ใบเสร็จรับเงิน')
  ) {
    return 'RECEIPT';
  }

  return null;
}



/**
 * Build draft summary text (for context in messages)
 */
function buildDraftSummary(draft: LineDraft): string {
  const customerLine = draft.customerName
    ? `ลูกค้า: ${draft.customerName}`
    : 'ลูกค้า: (ยังไม่ได้ระบุ)';

  const items = draft.items || [];
  const itemCount = items.length;

  const itemsText = itemCount > 0
    ? items.map((item, idx) =>
      `  ${idx + 1}. ${item.name}${item.qty > 1 ? ` x${item.qty}` : ''} ${(item.price * item.qty).toLocaleString('th-TH')} บาท`
    ).join('\n')
    : '  (ยังไม่มีรายการ)';

  const itemsCountLine = `รายการ: ${itemCount} รายการ`;
  const totalText = `รวม: ${(draft.total || 0).toLocaleString('th-TH')} บาท`;

  return `${customerLine}
${itemsCountLine}
${itemsText}
${totalText}`;
}

// ============================================================================
// DOCUMENT ORCHESTRATOR
// ============================================================================

/**
 * Document Orchestrator: Handles document issuance workflow
 */
async function issueDocument(
  userId: string,
  businessId: string,
  draft: LineDraft,
  replyFn: (msg: string, quickReply?: QuickReplyAction[]) => Promise<void>,
  lineUserId?: string,
  traceId?: string
): Promise<void> {
  void traceId;
  // Preflight: Sanitize item names
  const sanitizedDraft = sanitizeItemNamesForPdf(draft);

  // Issue document
  const { confirmAndIssueDraft } = await import('./conversationHandler');
  await confirmAndIssueDraft(userId, businessId, sanitizedDraft, replyFn, lineUserId);

  // Clear draft after successful issuance
  await clearDraft(userId);
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Human Interaction Runtime: Main entry point
 * 
 * Orchestrates the entire human-first flow:
 * 1. Process input (normalize, parse)
 * 2. Apply actions to draft (pure transformations)
 * 3. Decide what to say (human-first language)
 * 4. Handle document issuance (if confirm)
 */
export async function handleHumanFirstEdit(
  userId: string,
  businessId: string,
  messageText: string,
  replyFn?: (msg: string, quickReply?: QuickReplyAction[]) => Promise<void>,
  lineUserId?: string,
  traceId?: string
): Promise<HumanFirstResponse | null> {
  const tStart = Date.now();

  // Feature flag gate
  if (!getHumanFirstUxEnabled()) {
    return null; // Fall back to legacy handler
  }

  // Get UX Variant (A/B Test)
  const ux = getUxVariant(userId);

  // Get draft
  let draft = await getDraft(userId);

  const { getConversationState, setConversationState, getStateMetadata, setStateMetadata, clearConversationState } =
    await import("../services/conversationStateService");
  const { getButtonsForState, ButtonState } = await import("./conversationStateMachine");
  const currentState = await getConversationState(userId);
  const stateMetadata = await getStateMetadata(userId);

  // ✅ FIX 1: Zero-friction document start - Handle CREATE commands when no draft exists
  if (!draft) {
    const looksLikeCopyBlock =
      /\n/.test(messageText) ||
      /(ลูกค้า|ชื่อลูกค้า|รายการ|ประเภทเอกสาร|หมายเหตุ|วันที่)/i.test(messageText);

    if (looksLikeCopyBlock) {
      const { parseEzDocText } = await import("./parse");
      const parsed = parseEzDocText(messageText);
      const hasParsedSignals =
        (parsed.items && parsed.items.length > 0) ||
        typeof parsed.lump_sum_amount === 'number' ||
        !!parsed.customer_name;

      if (hasParsedSignals) {
        const parsedDocType = parsed.doc_type || "QUO";
        const draftDocType = parsedDocType === "RECEIPT" ? "RECEIPT" : parsedDocType === "BILL" ? "BILL" : "QUO";
        const { getOrCreateDraft, updateDraft } = await import("./draftStore");
        draft = await getOrCreateDraft(userId, businessId, draftDocType);

        const isLumpSum = parsed.price_type === 'LUMP_SUM';
        const lumpSumName = parsed.subject_th || parsed.subject_en || 'งานเหมารวม';
        const items = isLumpSum && typeof parsed.lump_sum_amount === 'number'
          ? [{ name: lumpSumName, qty: 1, price: parsed.lump_sum_amount }]
          : (parsed.items || [])
            .map((item) => {
              const qty = Number(item.qty || 1) || 1;
              const unitPrice = Number(item.unit_price || 0);
              const price = unitPrice > 0 ? unitPrice : (Number(item.amount || 0) / qty || 0);
              return { name: item.description_th, qty, price };
            })
            .filter((it) => it.name && it.price > 0);

        await updateDraft(userId, {
          docType: draftDocType,
          customerName: parsed.customer_name || parsed.customer_legal_name || undefined,
          customerLegalName: parsed.customer_legal_name || undefined,
          customerTaxId: parsed.customer_tax_id || undefined,
          customerBranch: parsed.customer_branch || undefined,
          customerAddress: parsed.customer_address || undefined,
          customerContactName: parsed.customer_contact_name || undefined,
          items,
          priceType: isLumpSum ? 'LUMP_SUM' : undefined,
          lumpSumAmount: isLumpSum && typeof parsed.lump_sum_amount === 'number'
            ? parsed.lump_sum_amount
            : undefined,
          scopeOfWork: isLumpSum ? parsed.scope_of_work || undefined : undefined,
          paymentMilestones: isLumpSum ? parsed.payment_milestones || undefined : undefined,
          notes: parsed.notes || undefined,
        });

        const updatedDraft = await getDraft(userId);
        if (updatedDraft) {
          const hasCustomer = !!updatedDraft.customerName;
          const hasItems = !!(updatedDraft.items && updatedDraft.items.length > 0);
          const state = determineHumanFirstState(true, hasCustomer, hasItems);

          let message = `ติ๊ดๆ รับข้อมูลแล้วครับ ✅\n\n`;
          if (ux.shouldShowSummary(updatedDraft)) {
            message += buildDraftSummary(updatedDraft) + '\n\n';
          }

          const validation = validateDraftCompleteness(updatedDraft);
          if (validation.isValid) {
            message += ux.getReadyToConfirmMessage(updatedDraft.docType as DocType);
          } else {
            const missingText = validation.missing.map((m) => (m === "customer" ? "ลูกค้า" : "รายการ")).join(" / ");
            message += `ยังขาด: ${missingText}\n`;
            message += `ทำต่อได้: เพิ่มรายการ / แก้ไขรายการ / เมนู`;
          }

          return {
            message,
            buttons: ux.getButtons(state),
          };
        }
      }
    }

    // Detect if user is trying to create a document
    const createCommand = detectCreateCommand(messageText);

    if (createCommand) {
      // ✅ FIX 4: Handle "Create from Source" commands (e.g., "Bill from QUO")
      const isFromSource = /(?:จาก|from)\s*(?:QUO|INV|QOU|INVOICE|ใบเสนอราคา|ใบวางบิล|เอกสาร)/i.test(messageText);

      if (isFromSource) {
        let response: string | null = null;

        if (createCommand === 'BILL') {
          const { createInvoiceFromQuotation } = await import('./conversationHandler');
          response = await createInvoiceFromQuotation(userId, businessId, messageText, async () => {
            // Temporary replyFn adapter if needed, but createInvoiceFromQuotation returns string mostly
            // Actually createInvoiceFromQuotation calls replyFn for errors, returns string for success
            // We'll capture the error via local var if possible or just let it return null
          });
          // Wait, createInvoiceFromQuotation signature is: 
          // (userId, businessId, messageText, replyFn) -> Promise<string | null>
          // It calls replyFn for errors. We need to capture those errors?
          // Let's pass a dummy replyFn that captures the message
          let capturedMessage = "";
          const captureFn = async (msg: string) => { capturedMessage = msg; };
          response = await createInvoiceFromQuotation(userId, businessId, messageText, captureFn);
          if (!response && capturedMessage) response = capturedMessage;
        } else if (createCommand === 'RECEIPT') {
          const { createReceiptFromInvoice } = await import('./conversationHandler');
          let capturedMessage = "";
          const captureFn = async (msg: string) => { capturedMessage = msg; };
          response = await createReceiptFromInvoice(userId, businessId, messageText, captureFn);
          if (!response && capturedMessage) response = capturedMessage;
        }

        if (response) {
          // Reload draft to get updated state for buttons
          draft = await getDraft(userId);
          const hasCustomer = !!draft?.customerName;
          const hasItems = !!(draft?.items && draft.items.length > 0);
          const state = determineHumanFirstState(true, hasCustomer, hasItems);

          return {
            message: response,
            buttons: ux.getButtons(state),
          };
        }
      }

      // ✅ FIX 2: Acknowledge user action before guidance
      // Create the draft first
      const { getOrCreateDraft } = await import('./draftStore');
      draft = await getOrCreateDraft(userId, businessId, createCommand);

      const strippedCreateCommand = messageText
        .replace(/(?:ขอ|ช่วย|ฝาก|อยาก|จะ)?\s*(?:ทำ|สร้าง|ออก)?\s*(?:ใบเสนอราคา|ใบวางบิล|ใบเสร็จ|ใบเสร็จรับเงิน|quotation|invoice|receipt)/ig, '')
        .trim();
      const shouldTryAiPrefill = strippedCreateCommand.length >= 6 && /[\dก-๙a-zA-Z]/i.test(strippedCreateCommand);

      const aiPrefillContext: ParsingContext = {
        hasActiveDraft: true,
        hasCustomer: false,
        hasItems: false,
      };

      let aiPrefillActions: ParsedAction[] = [];
      if (shouldTryAiPrefill) {
        const aiPrefill = await maybeEnhancePipelineWithAI(messageText, aiPrefillContext, {
          actions: [{ type: ParsedActionType.UNKNOWN, confidence: 0 }],
          normalizedText: messageText,
          wasNormalized: false,
          confidence: 0,
        });

        aiPrefillActions = aiPrefill.actions.filter((action) =>
          action.type === ParsedActionType.SET_CUSTOMER_NAME ||
          action.type === ParsedActionType.ADD_ITEM,
        );
      }

      if (draft && aiPrefillActions.length > 0) {
        const workingDraft: LineDraft = JSON.parse(JSON.stringify(draft));

        for (const action of aiPrefillActions) {
          const change = applyActionToDraft(workingDraft, action, aiPrefillContext);
          if (!change) continue;
          if (change.customerName !== undefined) {
            workingDraft.customerName = change.customerName;
          }
          if (change.items) {
            workingDraft.items = change.items;
          }
        }

        const updates: Partial<LineDraft> = {};
        if (workingDraft.customerName) {
          updates.customerName = workingDraft.customerName;
        }
        if (workingDraft.items && workingDraft.items.length > 0) {
          updates.items = workingDraft.items;
        }

        if (Object.keys(updates).length > 0) {
          await updateDraft(userId, updates);
          const updatedDraft = await getDraft(userId);
          if (updatedDraft) {
            const hasCustomer = !!updatedDraft.customerName;
            const hasItems = !!(updatedDraft.items && updatedDraft.items.length > 0);
            const state = determineHumanFirstState(true, hasCustomer, hasItems);

            let message = `ติ๊ดๆ ด๊อกๆ เติมข้อมูลจากข้อความให้แล้วครับ ✅\n\n`;
            if (ux.shouldShowSummary(updatedDraft)) {
              message += buildDraftSummary(updatedDraft) + '\n\n';
            }

            const validation = validateDraftCompleteness(updatedDraft);
            if (validation.isValid) {
              message += ux.getReadyToConfirmMessage(updatedDraft.docType as DocType);
            } else {
              const missingText = validation.missing.map((m) => (m === 'customer' ? 'ลูกค้า' : 'รายการ')).join(' / ');
              message += `ยังขาด: ${missingText}\n`;
              message += `ทำต่อได้: เพิ่มรายการ / แก้ไขรายการ / ออกเอกสาร / เมนู`;
            }

            return {
              message,
              buttons: ux.getButtons(state),
            };
          }
        }
      }

      const latencyMs = Date.now() - tStart;
      logRuntimeEvent(userId, businessId, traceId, 'create_document_no_draft', {
        doc_type: createCommand,
        message_text: messageText,
      }, draft, latencyMs);

      // Build acknowledgment + guidance message
      const ackMessage = ux.getCreateAcknowledgmentMessage(createCommand);
      const state = determineHumanFirstState(true, false, false);

      let message = `${ackMessage}\n\n`;
      message += `ตอนนี้ยังไม่มีลูกค้า/รายการ\n\n`;
      message += `คัดลอกบล็อกนี้แล้วแก้ข้อมูลของคุณ 👇\n`;
      if (createCommand === 'QUO') {
        message += `ลูกค้า บจก. ABC\n`;
        message += `รายการ\n`;
        message += `- บริการออกแบบ 1 5000\n`;
        message += `- ค่าเดินทาง 300\n\n`;
      } else if (createCommand === 'BILL') {
        message += `ลูกค้า บจก. ABC\n`;
        message += `รายการ\n`;
        message += `- งวดงาน 1 25000\n`;
        message += `- ค่าใช้จ่ายอื่น ๆ 300\n\n`;
      } else {
        message += `ถ้าออกจากใบวางบิล: ใบเสร็จจาก INV-xxxx\n\n`;
        message += `หรือกรอกข้อมูลใหม่แบบนี้:\n`;
        message += `ลูกค้า บจก. ABC\n`;
        message += `รายการ\n`;
        message += `- ค่าบริการ 1 5000\n\n`;
      }

      message += `พิมพ์ติดกันก็ได้: ลูกค้าแมวเป้า / อาหารแมว3000\n`;
      message += `ทำต่อได้: ตั้งลูกค้า / เพิ่มรายการ / ออกเอกสาร / เมนู`;

      return {
        message,
        buttons: getHumanFirstButtons(state),
      };
    }

    // ✅ FIX 3: CONFIRM / RESET without draft handling
    const pipelineResultForNoDraft = processInput(messageText, {
      hasActiveDraft: false,
      hasCustomer: false,
      hasItems: false,
    });

    const isConfirmCommand = pipelineResultForNoDraft.actions.some(
      a => a.type === ParsedActionType.CONFIRM
    ) || messageText.toLowerCase().includes('ออกเอกสาร') || messageText.toLowerCase().includes('ยืนยัน');

    if (isConfirmCommand) {
      const latencyMs = Date.now() - tStart;
      logRuntimeEvent(userId, businessId, traceId, 'confirm_without_draft', {
        message_text: messageText,
      }, null, latencyMs);

      return {
        message: ux.getConfirmWithoutDraftMessage(),
        buttons: [],
      };
    }

    const isResetCommand = pipelineResultForNoDraft.actions.some(
      a => a.type === ParsedActionType.RESET
    );
    if (isResetCommand) {
      await clearDraft(userId);
      await clearConversationState(userId);
      await setStateMetadata(userId, {});

      const state = determineHumanFirstState(false, false, false);
      return {
        message:
          ux.getResetMessage(),
        buttons: ux.getButtons(state),
      };
    }

    // No CREATE command and no CONFIRM - show no draft message
    const latencyMs = Date.now() - tStart;
    logRuntimeEvent(userId, businessId, traceId, 'no_draft', {
      message_text_length: messageText.length,
    }, null, latencyMs);

    return {
      message: ux.getNoDraftMessage(),
      buttons: [],
    };
  }

  // Handle pending item input (button-first state) even in human-first flow
  if (currentState === ButtonState.AWAITING_ITEM_INPUT) {
    const trimmedInput = messageText.trim();

    if (trimmedInput === 'ยกเลิก' || trimmedInput === 'cancel') {
      await clearConversationState(userId);
      await setStateMetadata(userId, {});
      const buttons = getButtonsForState(ButtonState.IDLE);
      const message = "โอ๊ะ! ยกเลิกการเพิ่มรายการแล้วครับ\nทำต่อได้: เพิ่มรายการ / เมนู";
      if (replyFn) {
        await replyFn(message, buttons);
        return null;
      }
      return { message, buttons };
    }

    const step = (stateMetadata.step as string) || 'name';
    if (step === 'name') {
      const nameContext: ParsingContext = {
        hasActiveDraft: true,
        hasCustomer: !!draft.customerName,
        hasItems: draft.items && draft.items.length > 0,
        lastItemName: draft.items && draft.items.length > 0 ? draft.items[draft.items.length - 1].name : undefined,
      };
      const parsed = parseForgivingInput(trimmedInput, nameContext);
      const addItemAction = parsed.find((a) => a.type === ParsedActionType.ADD_ITEM && a.payload?.item);
      if (addItemAction && addItemAction.payload?.item) {
        const item = addItemAction.payload.item;
        const updatedItems = [...(draft.items || []), { name: item.name, qty: item.qty, price: item.price }];
        await updateDraft(userId, { items: updatedItems });
        await setConversationState(userId, ButtonState.ITEMS_EXIST);
        await setStateMetadata(userId, {});

        const refreshedDraft = await getDraft(userId);
        const effectiveDraft = refreshedDraft || { ...draft, items: updatedItems } as LineDraft;
        const state = determineHumanFirstState(true, !!effectiveDraft.customerName, updatedItems.length > 0);

        let message = ux.getItemAddedMessage(item.name, item.price, item.qty);
        if (ux.shouldShowSummary(effectiveDraft)) {
          message += '\n\n' + buildDraftSummary(effectiveDraft);
        }
        const buttons = getHumanFirstButtons(state);
        if (replyFn) {
          await replyFn(message, buttons);
          return null;
        }
        return { message, buttons };
      }

      const itemName = trimmedInput;
      if (!itemName || itemName.length < 2) {
        const message = "โอ๊ะ! ยังไม่เห็นชื่อรายการนะ\nทำต่อได้: ส่งชื่อรายการ / เมนู";
        const buttons = getButtonsForState(ButtonState.AWAITING_ITEM_INPUT);
        if (replyFn) {
          await replyFn(message, buttons);
          return null;
        }
        return { message, buttons };
      }
      await setStateMetadata(userId, { pendingItemName: itemName, step: 'price' });
      const message = `ชื่อรายการ: ${itemName}\n\nติ๊ดๆ ราคาเท่าไหร่ดี?\nทำต่อได้: ส่งราคา / ยกเลิก`;
      const buttons = getButtonsForState(ButtonState.AWAITING_ITEM_INPUT);
      if (replyFn) {
        await replyFn(message, buttons);
        return null;
      }
      return { message, buttons };
    }

    if (step === 'price') {
      const priceText = trimmedInput;
      const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
      if (!Number.isFinite(price) || price <= 0) {
        const message = "โอ๊ะ! ราคายังไม่ถูกต้องนะ\nทำต่อได้: ส่งราคา / ยกเลิก";
        const buttons = getButtonsForState(ButtonState.AWAITING_ITEM_INPUT);
        if (replyFn) {
          await replyFn(message, buttons);
          return null;
        }
        return { message, buttons };
      }

      const itemName = (stateMetadata.pendingItemName as string) || 'รายการ';
      const updatedItems = [...(draft.items || []), { name: itemName, qty: 1, price }];
      await updateDraft(userId, { items: updatedItems });
      await setConversationState(userId, ButtonState.ITEMS_EXIST);
      await setStateMetadata(userId, {});

      const refreshedDraft = await getDraft(userId);
      const effectiveDraft = refreshedDraft || { ...draft, items: updatedItems } as LineDraft;
      const state = determineHumanFirstState(true, !!effectiveDraft.customerName, updatedItems.length > 0);

      let message = ux.getItemAddedMessage(itemName, price, 1);
      if (ux.shouldShowSummary(effectiveDraft)) {
        message += '\n\n' + buildDraftSummary(effectiveDraft);
      }
      const buttons = getHumanFirstButtons(state);
      if (replyFn) {
        await replyFn(message, buttons);
        return null;
      }
      return { message, buttons };
    }
  }

  const trimmed = messageText.trim();
  const trimmedNoSpace = trimmed.replace(/\s+/g, '');
  const adminCandidate = trimmed.replace(/^[^a-zA-Zก-๙]+/i, '');
  const stateForButtons = determineHumanFirstState(
    true,
    !!draft.customerName,
    Array.isArray(draft.items) && draft.items.length > 0
  );

  const looksLikeCopyBlock =
    /\n/.test(messageText) ||
    /(^|\n)\s*(ลูกค้า|ชื่อลูกค้า|รายการ|ประเภทเอกสาร|หมายเหตุ|วันที่)\b/i.test(messageText);

  if (looksLikeCopyBlock) {
    const { parseEzDocText } = await import("./parse");
    const parsed = parseEzDocText(messageText);
    const hasParsedSignals =
      (parsed.items && parsed.items.length > 0) ||
      typeof parsed.lump_sum_amount === 'number' ||
      !!parsed.customer_name ||
      !!parsed.doc_type;

    if (hasParsedSignals) {
      const docType = parsed.doc_type || (draft.docType as DocType) || "QUO";
      const isLumpSum = parsed.price_type === 'LUMP_SUM';
      const lumpSumName = parsed.subject_th || parsed.subject_en || 'งานเหมารวม';
      const items = isLumpSum && typeof parsed.lump_sum_amount === 'number'
        ? [{ name: lumpSumName, qty: 1, price: parsed.lump_sum_amount }]
        : (parsed.items || [])
          .map((item) => {
            const qty = Number(item.qty || 1) || 1;
            const unitPrice = Number(item.unit_price || 0);
            const fallbackPrice = Number(item.amount || 0) / qty || 0;
            const price = unitPrice > 0 ? unitPrice : fallbackPrice;
            return { name: item.description_th, qty, price };
          })
          .filter((it) => it.name && it.price > 0);

      const patch: Partial<LineDraft> = {
        docType,
      };
      if (parsed.customer_name) {
        patch.customerName = parsed.customer_name;
      } else if (parsed.customer_legal_name) {
        patch.customerName = parsed.customer_legal_name;
      }
      if (parsed.customer_legal_name) {
        patch.customerLegalName = parsed.customer_legal_name;
      }
      if (parsed.customer_tax_id) {
        patch.customerTaxId = parsed.customer_tax_id;
      }
      if (parsed.customer_branch) {
        patch.customerBranch = parsed.customer_branch;
      }
      if (parsed.customer_address) {
        patch.customerAddress = parsed.customer_address;
      }
      if (parsed.customer_contact_name) {
        patch.customerContactName = parsed.customer_contact_name;
      }
      if (items.length > 0) {
        patch.items = items;
      }
      if (isLumpSum) {
        patch.priceType = 'LUMP_SUM';
        if (typeof parsed.lump_sum_amount === 'number') {
          patch.lumpSumAmount = parsed.lump_sum_amount;
        }
        if (parsed.scope_of_work) patch.scopeOfWork = parsed.scope_of_work;
        if (parsed.payment_milestones) patch.paymentMilestones = parsed.payment_milestones;
        if (parsed.notes) patch.notes = parsed.notes;
      } else if (parsed.notes) {
        patch.notes = parsed.notes;
      }

      await updateDraft(userId, patch);
      const updatedDraft = await getDraft(userId);
      if (updatedDraft) {
        const hasCustomer = !!updatedDraft.customerName;
        const hasItems = updatedDraft.items && updatedDraft.items.length > 0;
        const state = determineHumanFirstState(true, hasCustomer, hasItems);
        let message = `ติ๊ดๆ รับข้อมูลแล้วครับ ✅\n\n`;
        if (ux.shouldShowSummary(updatedDraft)) {
          message += buildDraftSummary(updatedDraft) + '\n\n';
        }

        const validation = validateDraftCompleteness(updatedDraft);
        if (validation.isValid) {
          message += ux.getReadyToConfirmMessage(updatedDraft.docType as DocType);
        } else {
          const missingText = validation.missing.map((m) => (m === "customer" ? "ลูกค้า" : "รายการ")).join(" / ");
          message += `ยังขาด: ${missingText}\n`;
          message += `ทำต่อได้: เพิ่มรายการ / แก้ไขรายการ / เมนู`;
        }

        return {
          message,
          buttons: getHumanFirstButtons(state),
        };
      }
    }
  }

  if (trimmed === 'เพิ่มรายการ') {
    await setConversationState(userId, ButtonState.AWAITING_ITEM_INPUT, { step: 'name' });
    return {
      message:
        `ติ๊ดๆ ส่งชื่อรายการตามด้วยราคาได้เลยครับ (เว้นวรรคหรือไม่เว้นก็ได้)\n` +
        `เช่น "อาหารแมว 3000" หรือ "อาหารแมว3000"\n` +
        `ถ้าพิมพ์แค่ชื่อ ระบบจะถามราคาให้อีกครั้ง\n\n` +
        `ถ้าต้องการระบุจำนวน (จำนวนก่อนราคา):\n` +
        `"อาหารแมว 2 x 1500" หรือ "อาหารแมว 2 1500"\n` +
        `ทำต่อได้: ส่งชื่อรายการ / ยกเลิก`,
      buttons: getHumanFirstButtons(stateForButtons),
    };
  }

  if (trimmed === 'ลูกค้า') {
    return {
      message:
        `ติ๊ดๆ พิมพ์ชื่อลูกค้าได้เลยครับ\n` +
        `เช่น "ลูกค้า แมวจร" หรือ "ลูกค้าแมวจร"\n` +
        `ทำต่อได้: ส่งชื่อลูกค้า / เมนู`,
      buttons: getHumanFirstButtons(stateForButtons),
    };
  }

  if (trimmed === 'แก้ไขรายการ' || trimmed === 'แก้ไข') {
    return {
      message:
        `ติ๊ดๆ ถ้าต้องการแก้ไขรายการ ให้พิมพ์รายการใหม่แทนได้เลย\n` +
        `เช่น "ค่าแรง 3500"\n` +
        `หรือพิมพ์ "ลบ" เพื่อลบรายการล่าสุด แล้วพิมพ์รายการใหม่\n` +
        `ทำต่อได้: ส่งรายการใหม่ / พิมพ์ ลบ`,
      buttons: getHumanFirstButtons(stateForButtons),
    };
  }

  if (/^admin\b/i.test(adminCandidate) || trimmedNoSpace.startsWith('เติมเครดิต')) {
    return {
      message:
        `ถ้าต้องการเติมเครดิตให้ผู้ใช้ (แอดมิน)\n` +
        `พิมพ์: admin เติมเครดิต <userId> <จำนวน>\n` +
        `ตัวอย่าง: admin เติมเครดิต WLGfXF... 100\n` +
        `หมายเหตุ: userId ต้องพิมพ์ติดกัน ห้ามเว้นวรรค\n\n` +
        `ถ้าต้องการซื้อแพ็คให้ตัวเอง\n` +
        `พิมพ์: ซื้อแพ็ค 99`,
      buttons: getHumanFirstButtons(stateForButtons),
    };
  }

  // Build parsing context
  const context: ParsingContext = {
    hasActiveDraft: true,
    hasCustomer: !!draft.customerName,
    hasItems: draft.items && draft.items.length > 0,
    lastItemName: draft.items && draft.items.length > 0
      ? draft.items[draft.items.length - 1].name
      : undefined,
  };

  // INPUT PIPELINE: Process input
  let pipelineResult = processInput(messageText, context);
  pipelineResult = await maybeEnhancePipelineWithAI(messageText, context, pipelineResult);
  const tParsed = Date.now();

  // Log input processing
  logRuntimeEvent(userId, businessId, traceId, 'input_processed', {
    message_text_raw: messageText,
    message_text_normalized: pipelineResult.wasNormalized ? pipelineResult.normalizedText.substring(0, 200) : undefined,
    was_normalized: pipelineResult.wasNormalized,
    message_text_length: messageText.length,
    parsed_actions_count: pipelineResult.actions.length,
    parsed_actions: pipelineResult.actions.map(a => ({ type: a.type, confidence: a.confidence })),
  }, draft, tParsed - tStart);

  // ✅ PAYMENT CLAIM: If user talks about payment while editing draft,
  // return null to let conversationHandler handle it (check purchase records)
  const paymentClaimAction = pipelineResult.actions.find(a => a.type === ParsedActionType.PAYMENT_CLAIM);
  if (paymentClaimAction) {
    console.log(`[humanFirstHandler] PAYMENT_CLAIM detected during draft edit, deferring to conversationHandler`);
    return null; // Falls through to conversationHandler → Intent.PAYMENT_CLAIM
  }

  // Handle CONFIRM action (explicit state transition)
  // ✅ Note: Draft is guaranteed to exist here (checked above)
  const confirmAction = pipelineResult.actions.find(a => a.type === ParsedActionType.CONFIRM);
  if (confirmAction) {
    if (!replyFn) {
      logRuntimeEvent(userId, businessId, traceId, 'confirm_no_replyfn', {}, draft);
      throw new Error('CONFIRM action requires replyFn');
    }

    // Validate draft completeness
    const validation = validateDraftCompleteness(draft);
    if (!validation.isValid) {
      const latencyMs = Date.now() - tStart;
      logRuntimeEvent(userId, businessId, traceId, 'confirm_validation_failed', {
        missing: validation.missing,
      }, draft, latencyMs);

      const state = determineHumanFirstState(true, context.hasCustomer, context.hasItems);
      return {
        message: ux.getMissingInfoMessage(draft, validation.missing),
        buttons: ux.getButtons(state),
      };
    }

    // DOCUMENT ORCHESTRATOR: Issue document
    const tIssueStart = Date.now();
    logRuntimeEvent(userId, businessId, traceId, 'confirm_issuing', {
      items_count: draft.items.length,
      total: draft.total,
    }, draft, tIssueStart - tStart);

    await issueDocument(userId, businessId, draft, replyFn, lineUserId, traceId);

    const latencyMs = Date.now() - tStart;
    logRuntimeEvent(userId, businessId, traceId, 'confirm_issued', {}, null, latencyMs);

    // Return null to indicate handler completed (response already sent via replyFn)
    return null;
  }

  // Handle RESET action
  const resetAction = pipelineResult.actions.find(a => a.type === ParsedActionType.RESET);
  if (resetAction) {
    await clearDraft(userId);
    const latencyMs = Date.now() - tStart;
    logRuntimeEvent(userId, businessId, traceId, 'reset_draft', {}, draft, latencyMs);

    return {
      message: ux.getResetMessage(),
      buttons: [],
    };
  }

  const missingPriceAction = pipelineResult.actions.find(
    a => a.type === ParsedActionType.MISSING_ITEM_PRICE
  );
  if (missingPriceAction) {
    const itemName = missingPriceAction.payload?.item?.name || 'รายการนี้';
    const state = determineHumanFirstState(true, context.hasCustomer, context.hasItems);
    return {
      message:
        `โอ๊ะ! ${itemName} ยังไม่มีราคา\n` +
        `พิมพ์แบบนี้ได้เลย:\n` +
        `• ${itemName} 3000\n` +
        `• ${itemName} 2 x 1500 (จำนวนก่อนราคา)\n` +
        `หรือพิมพ์แค่ "3000" ถ้าเป็นรายการล่าสุด\n` +
        `ทำต่อได้: ส่งราคา / เมนู`,
      buttons: getHumanFirstButtons(state),
    };
  }

  // DRAFT ENGINE: Apply actions to working draft
  const workingDraft: LineDraft = JSON.parse(JSON.stringify(draft)); // Deep clone
  const responseMessages: string[] = [];
  let hasChanges = false;

  for (const action of pipelineResult.actions) {
    // Skip CONFIRM, RESET, UNKNOWN (handled separately)
    if (
      action.type === ParsedActionType.CONFIRM ||
      action.type === ParsedActionType.RESET ||
      action.type === ParsedActionType.UNKNOWN
    ) {
      continue;
    }

    // Apply action to draft
    const change = applyActionToDraft(workingDraft, action, context);

    if (change) {
      // Merge changes into working draft
      if (change.customerName !== undefined) {
        workingDraft.customerName = change.customerName;
        responseMessages.push(ux.getCustomerSetMessage(change.customerName));
        hasChanges = true;
      }

      if (change.items) {
        workingDraft.items = change.items;

        // Generate appropriate message
        if (action.type === ParsedActionType.ADD_ITEM && action.payload?.item) {
          responseMessages.push(
            ux.getItemAddedMessage(
              action.payload.item.name,
              action.payload.item.price,
              action.payload.item.qty
            )
          );
        } else if (action.type === ParsedActionType.SET_PENDING_PRICE && action.payload?.item) {
          const lastItem = workingDraft.items[workingDraft.items.length - 1];
          responseMessages.push(
            ux.getPriceSetMessage(lastItem.name, action.payload.item.price)
          );
        } else if (action.type === ParsedActionType.UNDO_LAST) {
          responseMessages.push(
            ux.getUndoMessage(workingDraft.items.length > 0)
          );
        }

        hasChanges = true;
      }

      // Recalculate totals if needed (updateDraft will handle this)
      if (change.needsRecalculation) {
        // Totals will be recalculated by updateDraft
      }
    }

    // Handle SET_PHONE (transparency message, no draft change)
    if (action.type === ParsedActionType.SET_PHONE && action.payload?.phone) {
      responseMessages.push(ux.getPhoneTransparencyMessage(action.payload.phone));
    }
  }

  // Handle UNKNOWN action (ambiguous input)
  const unknownAction = pipelineResult.actions.find(a => a.type === ParsedActionType.UNKNOWN);
  if (unknownAction && pipelineResult.confidence < 0.3) {
    const state = determineHumanFirstState(true, context.hasCustomer, context.hasItems);
    const latencyMs = Date.now() - tStart;
    logRuntimeEvent(userId, businessId, traceId, 'ambiguous_response', {
      confidence: unknownAction.confidence,
    }, draft, latencyMs);

    return {
      message: ux.getAmbiguousMessage(draft),
      buttons: ux.getButtons(state),
    };
  }

  // Persist draft changes if any
  if (hasChanges) {
    const updates: Partial<LineDraft> = {};
    if (workingDraft.items !== draft.items) {
      updates.items = workingDraft.items;
    }
    if (workingDraft.customerName !== draft.customerName) {
      updates.customerName = workingDraft.customerName;
    }

    await updateDraft(userId, updates);

    // Refresh draft to get updated totals
    const updatedDraft = await getDraft(userId);
    if (updatedDraft) {
      const hasCustomer = !!updatedDraft.customerName;
      const hasItems = updatedDraft.items && updatedDraft.items.length > 0;
      const state = determineHumanFirstState(true, hasCustomer, hasItems);

      // Build response message
      let message = '';
      if (responseMessages.length > 0) {
        message = responseMessages.join('\n\n') + '\n\n';
      }

      // Add summary
      const summary = buildDraftSummary(updatedDraft);
      if (ux.shouldShowSummary(updatedDraft)) {
        message += summary + '\n\n';
      }

      // Add next steps based on readiness
      const validation = validateDraftCompleteness(updatedDraft);
      if (validation.isValid) {
        message += ux.getReadyToConfirmMessage(updatedDraft.docType as DocType);
      } else {
        // Still missing info - show what's needed
        const missingText = validation.missing.map(m => m === 'customer' ? 'ลูกค้า' : 'รายการ').join(' / ');
        message += `ยังขาด: ${missingText}\n`;
        message += `ทำต่อได้: เพิ่มรายการ / แก้ไขรายการ / เมนู`;
      }

      const latencyMs = Date.now() - tStart;
      logRuntimeEvent(userId, businessId, traceId, 'draft_updated', {
        updates_count: Object.keys(updates).length,
        items_count: updatedDraft.items.length,
      }, updatedDraft, latencyMs);

      return {
        message,
        buttons: ux.getButtons(state),
      };
    }
  }

  // No changes - show current state with guidance
  const state = determineHumanFirstState(true, context.hasCustomer, context.hasItems);
  const validation = validateDraftCompleteness(draft);

  let message = '';
  if (ux.shouldShowSummary(draft)) {
    message = buildDraftSummary(draft) + '\n\n';
  }

  if (validation.isValid) {
    message += ux.getReadyToConfirmMessage(draft.docType as DocType);
  } else {
    const { renderNextSteps } = await import('./humanFirstDraftRenderer');
    const guidance = renderNextSteps(draft, {
      docType: draft.docType as DocType,
      state,
      isAmbiguous: true,
    });
    message += guidance.text;
  }

  const latencyMs = Date.now() - tStart;
  logRuntimeEvent(userId, businessId, traceId, 'no_updates_response', {}, draft, latencyMs);

  return {
    message,
    buttons: ux.getButtons(state),
  };
}
