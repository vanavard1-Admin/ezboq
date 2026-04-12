/**
 * EzDoc - Quick Replies UI Builder
 * 
 * Single Source of Truth for all QuickReplyAction[] creation
 * 
 * RULES:
 * - NO emoji in text (emoji only in labels)
 * - Max 13 buttons (LINE limit)
 * - All commands use canonical constants from shared/commands.ts
 * - Deterministic: same input = same output
 */

import type { QuickReplyAction } from '../shared/lineQuickReply';
import {
  CMD_CREATE_QUOTATION,
  CMD_CREATE_INVOICE,
  CMD_CREATE_RECEIPT,
  CMD_CREATE_INVOICE_FROM_QUOTATION,
  CMD_MENU,
  CMD_BACK_TO_MENU,
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
  CMD_WIZARD_BACK,
  CMD_WIZARD_SKIP,
  CMD_WIZARD_CANCEL,
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
  CMD_CREDIT_HISTORY,
  CMD_CONFIRM_RENEWAL,
  CMD_TAX_VAT_THIS_MONTH,
  CMD_TAX_WHT_SUMMARY,
  CMD_TAX_STATUS,
  CMD_TAX_ANNUAL,
  CMD_TAX_REMINDER_ON,
} from '../shared/commands';

/**
 * Create a QuickReplyAction
 * Helper to ensure consistent structure
 */
function createAction(label: string, text: string): QuickReplyAction {
  return {
    type: 'action',
    action: {
      type: 'message',
      label,
      text, // NO emoji in text
    },
  };
}

/**
 * Limit buttons to max 13 (LINE limit)
 */
function limitButtons(buttons: QuickReplyAction[]): QuickReplyAction[] {
  return buttons.slice(0, 13);
}

// ============================================================================
// GLOBAL / MAIN MENU
// ============================================================================

/**
 * Main menu buttons (plan-aware)
 * Used in: greeting, fallback, after intent response
 */
export function getMainMenuButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('📄 ใบเสนอราคา', CMD_CREATE_QUOTATION),
    createAction('🧾 ใบวางบิล', CMD_CREATE_INVOICE),
    createAction('💰 ใบเสร็จ', CMD_CREATE_RECEIPT),
    createAction('📊 รายงาน', CMD_REPORT),
    createAction('🧾 ประวัติแพ็ก', CMD_CREDIT_HISTORY),
  ]);
}

/**
 * Plan-aware main menu (filters by plan)
 */
export async function getPlanAwareMainMenu(userId: string): Promise<QuickReplyAction[]> {
  const { getUserPlan } = await import('../core/planService');
  const plan = await getUserPlan(userId);
  
  const buttons: QuickReplyAction[] = [
    createAction('📄 ใบเสนอราคา', CMD_CREATE_QUOTATION),
  ];
  
  // PRO and TEAM can see Invoice and Receipt
  if (plan === 'PRO' || plan === 'TEAM') {
    buttons.push(
      createAction('🧾 ใบวางบิล', CMD_CREATE_INVOICE),
      createAction('💰 ใบเสร็จ', CMD_CREATE_RECEIPT)
    );
  }
  
  // All plans can see reports
  buttons.push(
    createAction('📊 รายงาน', CMD_REPORT),
    createAction('🧾 ประวัติแพ็ก', CMD_CREDIT_HISTORY)
  );
  
  return limitButtons(buttons);
}

/**
 * Global menu (simplified)
 */
export function getGlobalMenuButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('📄 สร้างเอกสาร', CMD_CREATE_QUOTATION),
    createAction('🏢 ตั้งค่าธุรกิจ', CMD_BUSINESS_SETUP),
    createAction('❓ วิธีใช้งาน', CMD_USAGE_GUIDE),
  ]);
}

// ============================================================================
// DRAFT EDITING
// ============================================================================

/**
 * Draft editor buttons (when editing a draft)
 */
export function getDraftEditorButtons(hasUndo: boolean = false): QuickReplyAction[] {
  const buttons: QuickReplyAction[] = [
    createAction('➕ เพิ่มรายการ', CMD_ADD_ITEM),
    createAction('✏️ แก้ไขรายการ', CMD_EDIT_ITEM),
    createAction('🗑 ลบรายการ', CMD_REMOVE_ITEM),
  ];
  
  if (hasUndo) {
    buttons.push(createAction('↩️ ย้อนกลับ', CMD_UNDO));
  }
  
  buttons.push(createAction('✅ ออกเอกสาร', CMD_CONFIRM));
  buttons.push(createAction('📱 เมนู', CMD_MENU));
  
  return limitButtons(buttons);
}

/**
 * Draft summary buttons (before confirmation)
 */
export function getDraftSummaryButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('✅ ยืนยันออกเอกสาร', CMD_CONFIRM_DOCUMENT),
    createAction('🔄 ยกเลิก', CMD_CANCEL),
  ]);
}

/**
 * Empty draft buttons
 */
export function getEmptyDraftButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('➕ เพิ่มรายการ', CMD_ADD_ITEM),
    createAction('❌ ยกเลิก', CMD_CANCEL),
  ]);
}

/**
 * Draft with items buttons
 */
export function getDraftWithItemsButtons(hasUndo: boolean = false): QuickReplyAction[] {
  const buttons: QuickReplyAction[] = [
    createAction('➕ เพิ่มรายการ', CMD_ADD_ITEM),
    createAction('✏️ แก้ไขรายการ', CMD_EDIT_ITEM),
    createAction('🗑 ลบรายการ', CMD_REMOVE_ITEM),
  ];

  if (hasUndo) {
    buttons.push(createAction('↩️ ย้อนกลับ', CMD_UNDO));
  }

  buttons.push(createAction('✅ ออกเอกสาร', CMD_CONFIRM));
  buttons.push(createAction('❌ ยกเลิก', CMD_CANCEL));

  return limitButtons(buttons);
}

// ============================================================================
// WIZARD / BUSINESS SETUP
// ============================================================================

/**
 * Wizard navigation buttons
 */
export function getWizardButtons(isOptionalField: boolean = false): QuickReplyAction[] {
  const buttons: QuickReplyAction[] = [
    createAction('⬅️ ย้อนกลับ', CMD_WIZARD_BACK),
  ];
  
  if (isOptionalField) {
    buttons.push(createAction('⏭️ ข้าม', CMD_WIZARD_SKIP));
  }
  
  buttons.push(createAction('❌ ยกเลิก', CMD_WIZARD_CANCEL));
  
  return limitButtons(buttons);
}

/**
 * Business setup summary buttons
 */
export function getBusinessSetupSummaryButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('✅ บันทึกข้อมูล', CMD_BUSINESS_SAVE),
    createAction('✏️ แก้ไขอีกครั้ง', CMD_BUSINESS_EDIT),
  ]);
}

/**
 * Business setup saved buttons
 */
export function getBusinessSetupSavedButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('✏️ แก้ไข', CMD_BUSINESS_EDIT),
    createAction('📝 แบบฟอร์ม', CMD_BUSINESS_SETUP_FORM),
    createAction('📄 สร้างเอกสาร', CMD_CREATE_QUOTATION),
    createAction('🏠 เมนูหลัก', CMD_MENU),
  ]);
}

export function getBusinessSelectButtons(names: string[]): QuickReplyAction[] {
  const buttons = names
    .filter((n) => n && n.trim().length > 0)
    .map((name) => createAction(`🏢 ${name}`, `ใช้ธุรกิจ ${name}`));
  return limitButtons(buttons);
}

export function getBusinessRecentButtons(names: string[]): QuickReplyAction[] {
  const buttons: QuickReplyAction[] = [
    createAction('⭐ ใช้ธุรกิจล่าสุด', 'ใช้ธุรกิจล่าสุด'),
    createAction('📋 รายการธุรกิจ', 'รายการธุรกิจ'),
  ];
  for (const name of names) {
    if (name && name.trim().length > 0) {
      buttons.push(createAction(`🏢 ${name}`, `ใช้ธุรกิจ ${name}`));
    }
  }
  return limitButtons(buttons);
}

export function getBusinessClearButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('🗑️ ล้างชื่อธุรกิจ', 'ชื่อธุรกิจ: -'),
    createAction('🗑️ ล้างที่อยู่', 'ที่อยู่: -'),
    createAction('🗑️ ล้างเบอร์โทร', 'เบอร์โทร: -'),
    createAction('🗑️ ล้างเลขผู้เสียภาษี', 'เลขผู้เสียภาษี: -'),
    createAction('🗑️ ล้างอีเมล', 'อีเมล: -'),
    createAction('🗑️ ล้างธนาคาร', 'ธนาคาร: -'),
    createAction('🗑️ ล้างเลขบัญชี', 'เลขบัญชี: -'),
    createAction('🗑️ ล้างชื่อบัญชี', 'ชื่อบัญชี: -'),
  ]);
}

/**
 * Incomplete setup buttons (for missing fields)
 */
export function getIncompleteSetupButtons(missingFields: string[]): QuickReplyAction[] {
  const fieldLabels: Record<string, string> = {
    'business_name': '🏢 ชื่อธุรกิจ',
    'address': '📍 ที่อยู่',
    'tax_id': '📋 เลขผู้เสียภาษี',
    'phone': '☎️ เบอร์โทร',
    'email': '📧 อีเมล',
  };
  
  const buttons: QuickReplyAction[] = missingFields
    .slice(0, 4) // Max 4 to fit LINE limit
    .map(field => createAction(
      fieldLabels[field] || `📝 ${field}`,
      CMD_BUSINESS_SETUP
    ));
  
  if (missingFields.length > 4) {
    buttons.push(createAction('📋 ดูทั้งหมด', CMD_BUSINESS_SETUP));
  }
  
  return limitButtons(buttons);
}

// ============================================================================
// PAYMENT
// ============================================================================

/**
 * Payment confirmation buttons
 */
export function getPaymentConfirmationButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('✅ ยืนยัน', CMD_CONFIRM_PAYMENT),
    createAction('❌ ยังไม่ใช่', CMD_PAYMENT_CANCEL),
  ]);
}

/**
 * Payment retry buttons
 */
export function getPaymentRetryButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('🔄 ส่งสลิปอีกครั้ง', CMD_RETRY_SLIP),
    createAction('🆘 แจ้งปัญหา', CMD_REPORT_ISSUE),
    createAction('🏠 เมนูหลัก', CMD_MENU),
  ]);
}

/**
 * Payment success buttons
 */
export function getPaymentSuccessButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('📄 สร้างเอกสาร', CMD_CREATE_QUOTATION),
    createAction('🧾 ประวัติแพ็ก', CMD_CREDIT_HISTORY),
    createAction('🏠 เมนูหลัก', CMD_MENU), // CMD_MENU = 'เมนูหลัก'
  ]);
}

/**
 * Payment pending buttons (slip received / checking)
 */
export function getPaymentPendingButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('🔎 เช็คสลิป', CMD_CHECK_SLIP),
    createAction('🆘 แจ้งปัญหา', CMD_REPORT_ISSUE),
    createAction('🧾 ประวัติแพ็ก', CMD_CREDIT_HISTORY),
    createAction('🏠 เมนูหลัก', CMD_MENU),
  ]);
}

/**
 * Payment pending review buttons (OCR unclear / admin review)
 */
export function getPaymentPendingReviewButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('🆘 แจ้งปัญหา', CMD_REPORT_ISSUE),
    createAction('🔎 เช็คสลิป', CMD_CHECK_SLIP),
    createAction('🧾 ประวัติแพ็ก', CMD_CREDIT_HISTORY),
    createAction('🏠 เมนูหลัก', CMD_MENU),
  ]);
}

// ============================================================================
// REPORTS
// ============================================================================

/**
 * Report period selection buttons
 */
export function getReportButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('📅 เดือนนี้', CMD_REPORT_THIS_MONTH),
    createAction('📆 เดือนก่อน', CMD_REPORT_LAST_MONTH),
    createAction('📋 ระบุเดือน', CMD_REPORT_CUSTOM),
  ]);
}

// ============================================================================
// TAX
// ============================================================================

/**
 * Tax quick replies (VAT/WHT/Status)
 */
export function getTaxQuickReplies(): QuickReplyAction[] {
  return limitButtons([
    createAction('📌 ภาษี เดือนนี้', CMD_TAX_VAT_THIS_MONTH),
    createAction('🧾 สรุปหัก ณ ที่จ่าย', CMD_TAX_WHT_SUMMARY),
    createAction('✅ ภาษีค้าง', CMD_TAX_STATUS),
    createAction('📊 ภาษีทั้งปี', CMD_TAX_ANNUAL),
    createAction('🔔 เตือนภาษี', CMD_TAX_REMINDER_ON),
    createAction('🏠 เมนู', CMD_MENU),
  ]);
}

// ============================================================================
// DOCUMENT CREATION
// ============================================================================

/**
 * Create invoice buttons (from quotation or new)
 */
export function getCreateInvoiceButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('📄 จากใบเสนอราคา', CMD_CREATE_INVOICE_FROM_QUOTATION),
    createAction('🆕 เริ่มใหม่', CMD_CREATE_INVOICE),
  ]);
}

/**
 * Create receipt buttons
 */
export function getCreateReceiptButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('✅ ยืนยัน', CMD_CONFIRM),
    createAction('🏠 กลับเมนู', CMD_BACK_TO_MENU),
  ]);
}

// ============================================================================
// SUCCESS / AFTER ACTION
// ============================================================================

/**
 * Success state buttons (after successful action)
 */
export function getSuccessButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('📄 สร้างใบเสนอราคา', CMD_CREATE_QUOTATION),
    createAction('📂 ดูเอกสารล่าสุด', CMD_VIEW_LATEST_DOCUMENT),
    createAction('🏠 เมนูหลัก', CMD_MENU),
  ]);
}

/**
 * Success buttons after quotation issued
 */
export function getSuccessButtonsAfterQuotation(): QuickReplyAction[] {
  return limitButtons([
    createAction('📄 ทำใบวางบิลต่อ', CMD_CREATE_INVOICE_FROM_QUOTATION),
    createAction('📂 ดูเอกสารล่าสุด', CMD_VIEW_LATEST_DOCUMENT),
    createAction('🏠 เมนูหลัก', CMD_MENU),
  ]);
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Back to menu button (single)
 */
export function getBackToMenuButton(): QuickReplyAction[] {
  return limitButtons([
    createAction('🏠 กลับเมนู', CMD_BACK_TO_MENU),
  ]);
}

/**
 * Convert command strings to QuickReplyAction[]
 * Used by responseFormatter for suggested commands
 * 
 * SAFETY: Only converts if command is canonical (safe to click)
 */
export function commandsToButtons(commands: string[]): QuickReplyAction[] {
  const { isCanonicalCommand } = require('../shared/commands');
  
  const buttons: QuickReplyAction[] = [];
  
  for (const cmd of commands) {
    // Only add if it's a canonical command (safe to click)
    if (isCanonicalCommand(cmd)) {
      // Extract label from command (simple heuristic)
      const label = cmd.length > 20 ? cmd.substring(0, 17) + '...' : cmd;
      buttons.push(createAction(label, cmd));
    }
  }
  
  return limitButtons(buttons);
}

/**
 * Empty buttons (suppress quick replies)
 * Used for payment flow, etc.
 */
export function getEmptyButtons(): QuickReplyAction[] {
  return [];
}

// ============================================================================
// STATE MACHINE BUTTONS
// ============================================================================

/**
 * Draft empty buttons (with optional customer button)
 */
export function getDraftEmptyButtons(hasCustomer: boolean): QuickReplyAction[] {
  const buttons: QuickReplyAction[] = [
    createAction('➕ เพิ่มรายการ', CMD_ADD_ITEM),
  ];
  
  if (!hasCustomer) {
    buttons.push(createAction('👤 เพิ่มลูกค้า', 'ลูกค้า')); // Note: 'ลูกค้า' is not canonical, but used for customer input
  }
  
  buttons.push(createAction('❌ ยกเลิก', CMD_CANCEL));
  
  return limitButtons(buttons);
}

/**
 * Awaiting item input buttons
 */
export function getAwaitingItemInputButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('🔙 กลับ', CMD_UNDO),
    createAction('❌ ยกเลิก', CMD_CANCEL),
  ]);
}

/**
 * Item added buttons
 */
export function getItemAddedButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('➕ เพิ่มรายการ', CMD_ADD_ITEM),
    createAction('✏️ แก้ไขรายการ', CMD_EDIT_ITEM),
    createAction('🗑 ลบรายการ', CMD_REMOVE_ITEM),
    createAction('✅ ออกเอกสาร', CMD_CONFIRM),
    createAction('❌ ยกเลิก', CMD_CANCEL),
  ]);
}

/**
 * Items exist buttons (with optional customer button)
 */
export function getItemsExistButtons(hasCustomer: boolean): QuickReplyAction[] {
  const buttons: QuickReplyAction[] = [
    createAction('➕ เพิ่มรายการ', CMD_ADD_ITEM),
    createAction('✏️ แก้ไขรายการ', CMD_EDIT_ITEM),
    createAction('🗑 ลบรายการ', CMD_REMOVE_ITEM),
  ];

  if (hasCustomer) {
    buttons.push(createAction('✅ ออกเอกสาร', CMD_CONFIRM));
  } else {
    buttons.push(createAction('👤 เพิ่มลูกค้า', 'ลูกค้า'));
  }

  buttons.push(createAction('❌ ยกเลิก', CMD_CANCEL));

  return limitButtons(buttons);
}

/**
 * Awaiting customer input buttons
 */
export function getAwaitingCustomerInputButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('🔙 กลับ', CMD_UNDO),
    createAction('❌ ยกเลิก', CMD_CANCEL),
  ]);
}

/**
 * Review ready buttons
 */
export function getReviewReadyButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('✅ ยืนยันออกเอกสาร', CMD_CONFIRM_DOCUMENT),
    createAction('✏️ แก้ไข', CMD_EDIT_ITEM), // Using CMD_EDIT_ITEM as placeholder
    createAction('❌ ยกเลิก', CMD_CANCEL),
  ]);
}

/**
 * Await confirm buttons
 */
export function getAwaitConfirmButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('✅ ยืนยันอีกครั้ง', CMD_CONFIRM),
    createAction('✏️ แก้ไข', CMD_EDIT_ITEM), // Using CMD_EDIT_ITEM as placeholder
    createAction('❌ ยกเลิก', CMD_CANCEL),
  ]);
}

/**
 * Renewal confirmation buttons
 */
export function getRenewalConfirmButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('✅ ยืนยันต่ออายุ', CMD_CONFIRM_RENEWAL),
    createAction('❌ ยกเลิก', CMD_CANCEL),
    createAction('🏠 เมนูหลัก', CMD_MENU),
  ]);
}

/**
 * Issued buttons (after document issued)
 */
export function getIssuedButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('📄 ดูเอกสาร', CMD_VIEW_LATEST_DOCUMENT),
    createAction('🏠 เมนูหลัก', CMD_MENU),
  ]);
}

/**
 * Completed buttons (after flow completed)
 */
export function getCompletedButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('📄 สร้างเอกสารใหม่', CMD_CREATE_QUOTATION),
    createAction('🏠 เมนูหลัก', CMD_MENU),
  ]);
}

/**
 * Upgrade success buttons
 */
export function getUpgradeSuccessButtons(): QuickReplyAction[] {
  return limitButtons([
    createAction('📄 สร้างเอกสาร', CMD_CREATE_QUOTATION),
    createAction('🏠 เมนูหลัก', CMD_MENU),
  ]);
}
