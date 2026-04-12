/**
 * EzDoc - Button Action Map
 * 
 * Central authoritative mapping of button text → intent.
 * This ensures button actions are NEVER rejected or misunderstood.
 * 
 * REFACTORED: Now uses canonical commands from shared/commands.ts
 * 
 * CRITICAL RULES:
 * - Button text must match EXACTLY (case-insensitive, trimmed)
 * - No NLP parsing required
 * - No ambiguity allowed
 * - Actions represent explicit user intent
 * - Uses canonical commands (no emoji in text)
 */

import { Intent } from './conversationOrchestrator';
import {
  CMD_CREATE_QUOTATION,
  CMD_CREATE_INVOICE,
  CMD_CREATE_RECEIPT,
  CMD_CREATE_INVOICE_FROM_QUOTATION,
  CMD_MENU,
  CMD_BACK_TO_MENU,
  CMD_HELP,
  CMD_USAGE_GUIDE,
  CMD_BUSINESS_SETUP,
  CMD_BUSINESS_SETUP_FORM,
  CMD_BUSINESS_SAVE,
  CMD_BUSINESS_EDIT,
  CMD_ADD_ITEM,
  CMD_EDIT_ITEM,
  CMD_REMOVE_ITEM,
  CMD_CONFIRM,
  CMD_CONFIRM_DOCUMENT,
  CMD_CANCEL,
  CMD_UNDO,
  CMD_WIZARD_SKIP,
  CMD_PAID,
  CMD_CONFIRM_PAYMENT,
  CMD_PAYMENT_CANCEL,
  CMD_RETRY_SLIP,
  CMD_CHECK_SLIP,
  CMD_REPORT,
  CMD_REPORT_THIS_MONTH,
  CMD_REPORT_LAST_MONTH,
  CMD_REPORT_CUSTOM,
  CMD_REPORT_ISSUE,
  CMD_VIEW_LATEST_DOCUMENT,
  CMD_BUY_PACK_199,
  CMD_BUY_PACK_279,
  CMD_BUY_PACK_3990,
  CMD_CREDIT_HISTORY,
  CMD_CONFIRM_CREDIT_PAYMENT,
  CMD_CONFIRM_RENEWAL,
  COMMAND_ALIASES,
} from '../shared/commands';

export type InputSource = 'TEXT_INPUT' | 'QUICK_REPLY_ACTION' | 'RICH_MENU_ACTION';

export interface ButtonAction {
  intent: Intent;
  requiresTextInput?: boolean; // If true, prompt user for additional input
  promptKey?: string; // Key for sub-flow prompt
  context?: string; // Required context (e.g., 'WIZARD', 'DRAFT_EDITING')
}

/**
 * Central ACTION MAP
 * Maps canonical command text → intent + metadata
 * 
 * Uses canonical commands from shared/commands.ts
 */
export const ACTION_MAP: Record<string, ButtonAction> = {
  // Document Creation (canonical)
  [CMD_CREATE_QUOTATION]: { intent: Intent.CREATE_QUOTATION },
  [CMD_CREATE_INVOICE]: { intent: Intent.CREATE_INVOICE },
  [CMD_CREATE_RECEIPT]: { intent: Intent.CREATE_RECEIPT },
  [CMD_CREATE_INVOICE_FROM_QUOTATION]: { intent: Intent.CREATE_INV_FROM_QUO },

  // Navigation (canonical)
  [CMD_MENU]: { intent: Intent.HELP },
  [CMD_BACK_TO_MENU]: { intent: Intent.HELP },
  [CMD_HELP]: { intent: Intent.HELP },
  [CMD_USAGE_GUIDE]: { intent: Intent.USAGE_GUIDE },

  // Business Setup (canonical)
  [CMD_BUSINESS_SETUP]: { intent: Intent.BUSINESS_SETUP },
  [CMD_BUSINESS_SETUP_FORM]: { intent: Intent.SETTINGS },
  [CMD_BUSINESS_SAVE]: { intent: Intent.BUSINESS_SETUP },
  [CMD_BUSINESS_EDIT]: { intent: Intent.BUSINESS_SETUP },

  // Draft Editing (canonical)
  [CMD_ADD_ITEM]: { intent: Intent.EDIT, requiresTextInput: true, promptKey: 'ASK_ITEM_NAME' },
  [CMD_EDIT_ITEM]: { intent: Intent.EDIT },
  [CMD_REMOVE_ITEM]: { intent: Intent.EDIT },
  [CMD_CONFIRM]: { intent: Intent.CONFIRM },
  [CMD_CONFIRM_DOCUMENT]: { intent: Intent.CONFIRM },
  [CMD_CANCEL]: { intent: Intent.CANCEL },
  [CMD_UNDO]: { intent: Intent.CANCEL }, // UNDO uses CANCEL intent
  // Note: CMD_WIZARD_BACK and CMD_UNDO both map to 'ย้อนกลับ' (same text)
  // Note: CMD_WIZARD_CANCEL and CMD_CANCEL both map to 'ยกเลิก' (same text)
  // We only map CMD_UNDO and CMD_CANCEL here, wizard variants use same mapping

  // Wizard (canonical)
  [CMD_WIZARD_SKIP]: { intent: Intent.WIZARD_SKIP, context: 'WIZARD' },

  // Payment (canonical)
  [CMD_PAID]: { intent: Intent.PAID },
  [CMD_CONFIRM_PAYMENT]: { intent: Intent.CONFIRM_PAYMENT },
  [CMD_PAYMENT_CANCEL]: { intent: Intent.CANCEL },
  [CMD_RETRY_SLIP]: { intent: Intent.RESEND_SLIP },
  [CMD_CHECK_SLIP]: { intent: Intent.CHECK_PAYMENT_STATUS },

  // Reports (canonical)
  [CMD_REPORT]: { intent: Intent.REPORT },
  [CMD_REPORT_THIS_MONTH]: { intent: Intent.REPORT },
  [CMD_REPORT_LAST_MONTH]: { intent: Intent.REPORT },
  [CMD_REPORT_CUSTOM]: { intent: Intent.REPORT },
  [CMD_REPORT_ISSUE]: { intent: Intent.REPORT_ISSUE },

  // View (canonical)
  [CMD_VIEW_LATEST_DOCUMENT]: { intent: Intent.VIEW_LATEST_DOCUMENT },

  // Credit Purchase (canonical)
  [CMD_BUY_PACK_199]: { intent: Intent.BUY_PACKAGE_199 },
  [CMD_BUY_PACK_279]: { intent: Intent.BUY_PACKAGE_279 },
  [CMD_BUY_PACK_3990]: { intent: Intent.BUY_PACKAGE_3990 },
  [CMD_CREDIT_HISTORY]: { intent: Intent.CREDIT_PURCHASE_HISTORY },
  [CMD_CONFIRM_CREDIT_PAYMENT]: { intent: Intent.CONFIRM_CREDIT_PAYMENT },
  [CMD_CONFIRM_RENEWAL]: { intent: Intent.CONFIRM_RENEWAL },
};

/**
 * Build complete ACTION_MAP with aliases
 * This includes all canonical commands + their aliases for backward compatibility
 */
function buildCompleteActionMap(): Record<string, ButtonAction> {
  const completeMap: Record<string, ButtonAction> = { ...ACTION_MAP };
  
  // Add aliases (map alias → canonical command's intent)
  for (const [alias, canonical] of Object.entries(COMMAND_ALIASES)) {
    const canonicalAction = ACTION_MAP[canonical];
    if (canonicalAction) {
      completeMap[alias] = canonicalAction;
    }
  }
  
  return completeMap;
}

// Export the complete map
export const COMPLETE_ACTION_MAP = buildCompleteActionMap();

/**
 * Check if message text matches a button action
 * Returns the action if found, null otherwise
 * 
 * REFACTORED: Uses canonical commands and aliases
 * 
 * Priority:
 * 1. Canonical command match
 * 2. Alias match (via getCanonicalCommand)
 * 3. Case-insensitive match
 */
export function getButtonAction(messageText: string): ButtonAction | null {
  const { getCanonicalCommand } = require('../shared/commands');
  const trimmed = messageText.trim();
  
  // Priority 1: Exact match on canonical command
  const canonical = getCanonicalCommand(trimmed);
  const canonicalMatch = COMPLETE_ACTION_MAP[canonical];
  if (canonicalMatch) {
    return canonicalMatch;
  }

  // Priority 2: Exact match on original text (for aliases)
  const originalMatch = COMPLETE_ACTION_MAP[trimmed];
  if (originalMatch) {
    return originalMatch;
  }

  // Priority 3: Case-insensitive match
  const lowerTrimmed = trimmed.toLowerCase();
  for (const [key, action] of Object.entries(COMPLETE_ACTION_MAP)) {
    if (key.toLowerCase() === lowerTrimmed) {
      return action;
    }
  }

  return null;
}

/**
 * Detect input source based on message context
 * 
 * Note: LINE API doesn't explicitly mark button actions,
 * so we infer from exact text matches to ACTION_MAP
 */
export function detectInputSource(messageText: string): InputSource {
  const buttonAction = getButtonAction(messageText);
  
  if (buttonAction) {
    // If text matches a button action, treat as button
    // In production, you might want to add metadata to track this
    return 'QUICK_REPLY_ACTION'; // Could also be RICH_MENU_ACTION
  }
  
  return 'TEXT_INPUT';
}

/**
 * Get sub-flow prompt for actions that require text input
 */
export function getSubFlowPrompt(promptKey: string): string {
  const prompts: Record<string, string> = {
    'ASK_ITEM_NAME':
      'ติ๊ดๆ ชื่อรายการคืออะไรนะครับเจ้านาย',

    'ASK_ITEM_PRICE':
      'ติ๊ดๆ ราคาเท่าไหร่ดีครับ',

    'ASK_CUSTOMER_NAME':
      'ติ๊ดๆ ชื่อลูกค้าคืออะไรนะครับ',

    'ASK_LINE_ITEM_DETAILS':
      'บี๊บ! ส่งชื่อรายการและราคาได้เลยครับ\n\n💡 ตัวอย่าง: ค่าออกแบบ 5000',

    'ASK_DOCUMENT_NUMBER':
      'บี๊บ! ส่งเลขที่เอกสารที่ต้องการดูได้เลยครับ\n\n💡 ตัวอย่าง: QUO-2568-001',
  };

  return prompts[promptKey] || 'บี๊บ! ส่งข้อมูลที่ต้องการได้เลยครับเจ้านาย';
}
