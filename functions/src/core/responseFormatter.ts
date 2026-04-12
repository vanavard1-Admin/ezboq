/**
 * Response Formatter
 *
 * Formats bot responses — natural Thai, no markdown artifacts
 */

import type { ConversationalDraft } from './draftManager';
import { DocumentType } from './conversationOrchestrator';
import type { QuickReplyAction } from '../shared/lineQuickReply';
import { commandsToButtons } from '../ui/quickReplies';

function formatMoney(amount: number): string {
  return amount.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getDocTypeName(docType: DocumentType): string {
  switch (docType) {
    case DocumentType.QUOTATION:
      return 'ใบเสนอราคา';
    case DocumentType.INVOICE:
      return 'ใบวางบิล';
    case DocumentType.RECEIPT:
      return 'ใบเสร็จรับเงิน';
    default:
      return 'เอกสาร';
  }
}

// ============================================================================
// DRAFT SUMMARY (SHORT VERSION)
// ============================================================================

export function formatDraftSummary(draft: ConversationalDraft): string {
  const docName = getDocTypeName(draft.docType);

  let summary = `บี๊บ! ${docName}\n\n`;

  if (draft.customerName) {
    summary += `ลูกค้า ${draft.customerName}\n`;
  } else {
    summary += `ยังไม่ได้เลือกลูกค้า\n`;
  }

  if (draft.items.length === 0) {
    summary += `ยังไม่มีรายการ\n`;
  } else {
    draft.items.forEach((item, i) => {
      const amount = formatMoney(item.amount);
      if (item.quantity > 1) {
        summary += `${i + 1}. ${item.description_th}  ${item.quantity} x ${formatMoney(item.unit_price)} = ${amount}฿\n`;
      } else {
        summary += `${i + 1}. ${item.description_th}  ${amount}฿\n`;
      }
    });
  }

  summary += `\nรวม ${formatMoney(draft.subTotal)}฿`;

  if (draft.discountAmount > 0) {
    const discountText = draft.discountType === 'PERCENT'
      ? `${draft.discountValue}%`
      : `${formatMoney(draft.discountAmount)}฿`;
    summary += `\nส่วนลด ${discountText}`;
  }

  if (draft.vatPercent > 0) {
    summary += `\nรวมสุทธิ ${formatMoney(draft.totalAmount)}฿ (VAT ${draft.vatPercent}%)`;
  } else {
    summary += `\nรวมสุทธิ ${formatMoney(draft.totalAmount)}฿`;
  }

  if (draft.docType === DocumentType.INVOICE && draft.dueDate) {
    summary += `\nครบกำหนด ${draft.dueDate}`;
  }

  if (draft.docType === DocumentType.RECEIPT && draft.paymentMethod) {
    summary += `\nชำระโดย ${draft.paymentMethod}`;
  }

  return summary;
}

// ============================================================================
// NEXT COMMANDS (CONTEXTUAL)
// ============================================================================

export function formatNextCommands(draft: ConversationalDraft): string[] {
  const { CMD_ADD_ITEM, CMD_CONFIRM } = require('../shared/commands');
  const commands: string[] = [];

  const missingCustomer = !draft.customerName;
  const missingItems = draft.items.length === 0;
  const missingDueDate = draft.docType === DocumentType.INVOICE && !draft.dueDate;
  const missingPayment = draft.docType === DocumentType.RECEIPT && !draft.paymentMethod;

  if (missingCustomer) {
    commands.push('ลูกค้า บริษัท ABC');
    return commands;
  }

  if (missingItems) {
    commands.push(CMD_ADD_ITEM);
    commands.push('เพิ่ม ค่าแรง 15000');
    return commands;
  }

  if (missingDueDate) {
    commands.push('กำหนดครบกำหนด 31/12/2568');
    return commands;
  }

  if (missingPayment) {
    commands.push('ชำระเงิน โอน');
    return commands;
  }

  commands.push(CMD_CONFIRM);
  commands.push(CMD_ADD_ITEM);

  if (!draft.discountAmount && draft.subTotal > 0) {
    commands.push('ส่วนลด 10%');
  }

  return commands.slice(0, 3);
}

// ============================================================================
// FULL CONFIRMATION SUMMARY
// ============================================================================

export function formatConfirmationSummary(draft: ConversationalDraft): string {
  let summary = `ติ๊ดๆ ช่วยเช็กก่อนออกเอกสารนะ เจ้านาย\n\n`;

  summary += `ลูกค้า ${draft.customerName}\n`;
  summary += `${draft.items.length} รายการ\n`;
  summary += `รวมสุทธิ ${formatMoney(draft.totalAmount)}฿`;

  if (draft.docType === DocumentType.INVOICE && draft.dueDate) {
    summary += `\nครบกำหนด ${draft.dueDate}`;
  }

  if (draft.docType === DocumentType.RECEIPT && draft.paymentMethod) {
    summary += `\nชำระโดย ${draft.paymentMethod}`;
  }

  summary += `\n\nพิมพ์ "ยืนยัน" เพื่อออกเอกสาร\nหรือ "แก้ไข" ถ้าจะแก้`;

  return summary;
}

// ============================================================================
// COMPLETE RESPONSE FORMATTER
// ============================================================================

export interface FormattedResponse {
  text: string;
  quickReplies?: string[];
  quickReplyActions?: QuickReplyAction[];
}

export function formatResponse(
  message: string,
  draft?: ConversationalDraft,
  includeSummary: boolean = true,
  includeNextCommands: boolean = true
): FormattedResponse {
  let text = message;

  if (draft && includeSummary) {
    text += '\n\n' + formatDraftSummary(draft);
  }

  let quickReplies: string[] = [];
  let quickReplyActions: QuickReplyAction[] = [];

  if (draft && includeNextCommands) {
    const commands = formatNextCommands(draft);

    if (commands.length > 0) {
      // Don't add text commands — use quick reply buttons instead
      quickReplyActions = commandsToButtons(commands);
      quickReplies = commands.slice(0, 13);
    }
  }

  return {
    text,
    quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
    quickReplyActions: quickReplyActions.length > 0 ? quickReplyActions : undefined,
  };
}

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export function formatError(error: string): string {
  const errorMessages: Record<string, string> = {
    UNKNOWN_COMMAND: 'โอ๊ะ! ด๊อกๆ ไม่เข้าใจคำสั่งนี้ ลองพิมพ์ "เมนู" หรือ "ช่วยเหลือ" นะเจ้านาย',
    VALIDATION_FAILED: 'โอ๊ะ! ข้อมูลยังไม่ครบ ลองเช็กแล้วแก้ไขอีกทีนะเจ้านาย',
    NO_DRAFT: 'โอ๊ะ! ยังไม่มีเอกสารในมือ ลองพิมพ์ "ทำใบเสนอราคา" ดูนะเจ้านาย',
    ITEM_NOT_FOUND: 'โอ๊ะ! ไม่พบรายการนี้ ลองเช็กดูอีกทีนะเจ้านาย',
    MISSING_CUSTOMER: 'โอ๊ะ! ยังขาดชื่อลูกค้า เจ้านาย\n\nลองพิมพ์แบบนี้นะ\nลูกค้า บริษัท ABC',
    MISSING_ITEMS: 'โอ๊ะ! ยังขาดรายการ เจ้านาย\n\nลองพิมพ์แบบนี้นะ\nเพิ่ม ค่าแรง 15000',
    MISSING_DUE_DATE: 'โอ๊ะ! ใบวางบิลต้องระบุวันครบกำหนดนะเจ้านาย\n\nลองพิมพ์แบบนี้\nกำหนดครบกำหนด 31/12/2568',
    MISSING_PAYMENT: 'โอ๊ะ! ใบเสร็จต้องระบุวิธีชำระเงินนะเจ้านาย\n\nลองพิมพ์แบบนี้\nชำระเงิน โอน',
  };

  return errorMessages[error] || `โอ๊ะ! ระบบขัดข้องชั่วคราว ลองใหม่อีกทีนะเจ้านาย`;
}

export default {
  formatDraftSummary,
  formatNextCommands,
  formatConfirmationSummary,
  formatResponse,
  formatError,
};
