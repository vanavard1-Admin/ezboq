/**
 * EzDoc - LINE Quick Reply Types
 * 
 * REFACTORED: This file now only contains type definitions.
 * All button builders moved to ui/quickReplies.ts (Single Source of Truth)
 * 
 * DEPRECATED: All builder functions are deprecated.
 * Use ui/quickReplies.ts instead.
 */

export interface QuickReplyAction {
  type: "action";
  action: {
    type: "message";
    label: string;
    text: string; // NO emoji in text (emoji only in label)
  };
}

export interface QuickReplyMessage {
  type: "text";
  text: string;
  quickReply: {
    items: QuickReplyAction[];
  };
}

/**
 * Build a quick reply message with fallback text if unsupported
 * 
 * DEPRECATED: Use ui/quickReplies.ts builders directly
 */
export function buildQuickReply(
  mainText: string,
  actions: QuickReplyAction[]
): QuickReplyMessage | { type: "text"; text: string } {
  // LINE quick reply max 13 items
  if (!actions || actions.length === 0) {
    return { type: "text", text: mainText };
  }

  const safeActions = actions.slice(0, 13);

  return {
    type: "text",
    text: mainText,
    quickReply: {
      items: safeActions,
    },
  };
}

// ============================================================================
// DEPRECATED BUILDERS - Use ui/quickReplies.ts instead
// ============================================================================

/**
 * @deprecated Use getMainMenuButtons() or getPlanAwareMainMenu() from ui/quickReplies.ts
 */
export function buildMainMenuQuickReply(): QuickReplyAction[] {
  const { getMainMenuButtons } = require('../ui/quickReplies');
  return getMainMenuButtons();
}

/**
 * @deprecated Use getPaymentConfirmationButtons() from ui/quickReplies.ts
 */
export function buildConfirmPaymentQuickReply(): QuickReplyAction[] {
  const { getPaymentConfirmationButtons } = require('../ui/quickReplies');
  return getPaymentConfirmationButtons();
}

/**
 * @deprecated Use getReportButtons() from ui/quickReplies.ts
 */
export function buildReportQuickReply(): QuickReplyAction[] {
  const { getReportButtons } = require('../ui/quickReplies');
  return getReportButtons();
}

/**
 * @deprecated Use getCreateInvoiceButtons() from ui/quickReplies.ts
 */
export function buildCreateInvoiceQuickReply(): QuickReplyAction[] {
  const { getCreateInvoiceButtons } = require('../ui/quickReplies');
  return getCreateInvoiceButtons();
}

/**
 * @deprecated Use getCreateReceiptButtons() from ui/quickReplies.ts
 */
export function buildCreateReceiptQuickReply(): QuickReplyAction[] {
  const { getCreateReceiptButtons } = require('../ui/quickReplies');
  return getCreateReceiptButtons();
}

/**
 * @deprecated Use getBackToMenuButton() from ui/quickReplies.ts
 */
export function buildBackToMenuQuickReply(): QuickReplyAction[] {
  const { getBackToMenuButton } = require('../ui/quickReplies');
  return getBackToMenuButton();
}
