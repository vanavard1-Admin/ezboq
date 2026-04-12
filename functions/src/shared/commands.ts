/**
 * EzDoc - Canonical Commands
 * 
 * Single Source of Truth for all command text (button text)
 * 
 * RULES:
 * - NO emoji in command text (emoji only in labels)
 * - Commands are lowercase, trimmed, normalized
 * - All aliases map to canonical commands
 * - Used by buttonActionMap and quickReplies
 */

/**
 * Document Creation Commands
 */
export const CMD_CREATE_QUOTATION = 'ทำใบเสนอราคา';
export const CMD_CREATE_INVOICE = 'ทำใบวางบิล';
export const CMD_CREATE_RECEIPT = 'ทำใบเสร็จ';
export const CMD_CREATE_INVOICE_FROM_QUOTATION = 'ใบวางบิล จากใบเสนอราคา';

/**
 * Navigation Commands
 */
export const CMD_MENU = 'เมนูหลัก';
export const CMD_BACK_TO_MENU = 'กลับเมนู';
export const CMD_HELP = 'ช่วยเหลือ';
export const CMD_USAGE_GUIDE = 'วิธีใช้งาน';

/**
 * Business Setup Commands
 */
export const CMD_BUSINESS_SETUP = 'ตั้งค่าธุรกิจ';
export const CMD_BUSINESS_SETUP_FORM = 'ตั้งค่าธุรกิจแบบฟอร์ม';
export const CMD_BUSINESS_SAVE = 'บันทึกข้อมูล';
export const CMD_BUSINESS_EDIT = 'แก้ไขอีกครั้ง';

/**
 * Draft Editing Commands
 */
export const CMD_ADD_ITEM = 'เพิ่มรายการ';
export const CMD_EDIT_ITEM = 'แก้ไขรายการ';
export const CMD_REMOVE_ITEM = 'ลบรายการ';
export const CMD_CONFIRM = 'ยืนยัน';
export const CMD_CONFIRM_DOCUMENT = 'ยืนยันออกเอกสาร';
export const CMD_CANCEL = 'ยกเลิก';
export const CMD_UNDO = 'ย้อนกลับ';

/**
 * Wizard Commands
 */
export const CMD_WIZARD_BACK = 'ย้อนกลับ';
export const CMD_WIZARD_SKIP = 'ข้าม';
export const CMD_WIZARD_CANCEL = 'ยกเลิก';

/**
 * Payment Commands
 */
export const CMD_PAID = 'ชำระแล้ว';
export const CMD_CONFIRM_PAYMENT = 'ยืนยันรับเงิน';
export const CMD_PAYMENT_CANCEL = 'ยังไม่ใช่';
export const CMD_RETRY_SLIP = 'ส่งสลิปอีกครั้ง';
export const CMD_CHECK_SLIP = 'เช็คสลิป';

/**
 * Report Commands
 */
export const CMD_REPORT = 'รายงาน';
export const CMD_REPORT_THIS_MONTH = 'รายงาน เดือนนี้';
export const CMD_REPORT_LAST_MONTH = 'รายงาน เดือนก่อน';
export const CMD_REPORT_CUSTOM = 'รายงาน เดือน 12/2568'; // Template
export const CMD_REPORT_ISSUE = 'รายงานปัญหา';

/**
 * Tax Commands
 */
export const CMD_TAX_VAT_THIS_MONTH = 'ภาษี เดือนนี้';
export const CMD_TAX_WHT_SUMMARY = 'สรุปหัก ณ ที่จ่าย';
export const CMD_TAX_STATUS = 'ภาษีค้าง';
export const CMD_TAX_ANNUAL = 'สรุปภาษีทั้งปี';
export const CMD_TAX_REMINDER_ON = 'เปิดเตือนภาษี';

/**
 * View Commands
 */
export const CMD_VIEW_LATEST_DOCUMENT = 'ดูเอกสารล่าสุด';

/**
 * Package Purchase Commands
 */
export const CMD_BUY_PACK_199 = 'ซื้อแพ็ค 99';
export const CMD_BUY_PACK_279 = 'ซื้อแพ็ค 279';
/** @deprecated Use CMD_BUY_PACK_279 */
export const CMD_BUY_PACK_399 = CMD_BUY_PACK_279;
export const CMD_BUY_PACK_3990 = 'ซื้อแพ็ค TEAM รายปี';
export const CMD_CREDIT_HISTORY = 'ประวัติการซื้อแพ็ก';
export const CMD_CONFIRM_CREDIT_PAYMENT = 'ยืนยันการชำระเงิน';
export const CMD_CONFIRM_RENEWAL = 'ยืนยันต่ออายุแพ็ก';

/**
 * Settings Commands
 */
export const CMD_SETTINGS_PROMPTPAY = 'ตั้งค่าพร้อมเพย์';
export const CMD_SETTINGS_BANK = 'ตั้งค่าธนาคาร';
export const CMD_SETTINGS_LOGO = 'ตั้งค่าโลโก้';
export const CMD_SETTINGS_SIGNATURE = 'ตั้งค่าลายเซ็น';
export const CMD_SETTINGS_STAMP = 'ตั้งค่าตราประทับ';

/**
 * Command Aliases Map
 * Maps alternative text → canonical command
 * Used for backward compatibility and typo tolerance
 */
export const COMMAND_ALIASES: Record<string, string> = {
  // Document creation aliases
  'สร้างเอกสาร': CMD_CREATE_QUOTATION,
  'สร้างใบเสนอราคา': CMD_CREATE_QUOTATION,
  'เริ่มใหม่': CMD_CREATE_INVOICE,
  'ทดลองฟรี': CMD_CREATE_QUOTATION,
  'ทดลองใช้': CMD_CREATE_QUOTATION,
  
  // Navigation aliases
  'เมนู': CMD_MENU,
  '🏠 เมนูหลัก': CMD_MENU,
  
  // Draft editing aliases
  '✅ ยืนยัน': CMD_CONFIRM,
  'ยืนยันอีกครั้ง': CMD_CONFIRM,
  
  // Wizard aliases (CMD_WIZARD_BACK uses CMD_UNDO - same text 'ย้อนกลับ')
  // Note: Wizard context is determined separately, not by command text
  
  // Package purchase aliases (no space variants)
  'ซื้อแพ็ค99': CMD_BUY_PACK_199,
  'ซื้อแพ็ค199': CMD_BUY_PACK_199,
  'ซื้อแพ็ค279': CMD_BUY_PACK_279,
  'ซื้อแพ็ค299': CMD_BUY_PACK_279,
  'ซื้อแพ็ค399': CMD_BUY_PACK_279,
  'ซื้อแพ็ค3990': CMD_BUY_PACK_3990,
  'ซื้อแพ็ค2790': CMD_BUY_PACK_3990,
  'ซื้อแพ็ค 99': CMD_BUY_PACK_199,
  'ซื้อแพ็ค 199': CMD_BUY_PACK_199,
  'ซื้อแพ็ค 279': CMD_BUY_PACK_279,
  'ซื้อแพ็ค 299': CMD_BUY_PACK_279,
  'ซื้อแพ็ค 399': CMD_BUY_PACK_279,
  'ซื้อแพ็ค 3990': CMD_BUY_PACK_3990,
  'ซื้อแพ็ค 2790': CMD_BUY_PACK_3990,
  'แพ็ค 99': CMD_BUY_PACK_199,
  'แพ็ค 199': CMD_BUY_PACK_199,
  'แพ็ค 279': CMD_BUY_PACK_279,
  'แพ็ค 299': CMD_BUY_PACK_279,
  'แพ็ค99': CMD_BUY_PACK_199,
  'แพ็ค199': CMD_BUY_PACK_199,
  'แพ็ค279': CMD_BUY_PACK_279,
  'แพ็ค299': CMD_BUY_PACK_279,
  'แพ็ค 399': CMD_BUY_PACK_279,
  'แพ็ค 3990': CMD_BUY_PACK_3990,
  'แพ็คทีมรายปี': CMD_BUY_PACK_3990,
  'ทีมรายปี': CMD_BUY_PACK_3990,
  'team รายปี': CMD_BUY_PACK_3990,
  'team yearly': CMD_BUY_PACK_3990,
  'ซื้อ 99': CMD_BUY_PACK_199,
  'ซื้อ 199': CMD_BUY_PACK_199,
  'ซื้อ 299': CMD_BUY_PACK_279,
  'ซื้อ 3990': CMD_BUY_PACK_3990,
  'ประวัติการซื้อเครดิต': CMD_CREDIT_HISTORY,
  'รายงานปัญหา': CMD_REPORT_ISSUE,
  'ยืนยันต่ออายุ': CMD_CONFIRM_RENEWAL,
  'ยืนยันต่ออายุแพ็ก': CMD_CONFIRM_RENEWAL,
  'ต่ออายุแพ็ก': CMD_CONFIRM_RENEWAL,
  'แจ้งปัญหา': CMD_REPORT_ISSUE,
  'ติดต่อแอดมิน': CMD_REPORT_ISSUE,
  'ภาษีเดือนนี้': CMD_TAX_VAT_THIS_MONTH,
  'สรุปภาษีเดือนนี้': CMD_TAX_VAT_THIS_MONTH,
  'สรุปหักณที่จ่าย': CMD_TAX_WHT_SUMMARY,
  'ภาษีค้าง': CMD_TAX_STATUS,
  'สรุปภาษีทั้งปี': CMD_TAX_ANNUAL,
  'เปิดเตือนภาษี': CMD_TAX_REMINDER_ON,
  'ตรวจสลิป': CMD_CHECK_SLIP,
  'เช็คสลิป': CMD_CHECK_SLIP,
  'ตั้งค่าธุรกิจฟอร์ม': CMD_BUSINESS_SETUP_FORM,
};

/**
 * Get canonical command from text (handles aliases)
 */
export function getCanonicalCommand(text: string): string {
  const normalized = text.trim().toLowerCase();
  
  // Check aliases first
  const aliasMatch = COMMAND_ALIASES[text.trim()];
  if (aliasMatch) {
    return aliasMatch;
  }
  
  // Case-insensitive alias check
  for (const [alias, canonical] of Object.entries(COMMAND_ALIASES)) {
    if (alias.toLowerCase() === normalized) {
      return canonical;
    }
  }
  
  // Return original if no alias found
  return text.trim();
}

/**
 * Check if text is a canonical command
 */
export function isCanonicalCommand(text: string): boolean {
  const canonical = getCanonicalCommand(text);
  const allCommands = [
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
    CMD_WIZARD_BACK,
    CMD_WIZARD_SKIP,
    CMD_WIZARD_CANCEL,
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
    CMD_TAX_VAT_THIS_MONTH,
    CMD_TAX_WHT_SUMMARY,
    CMD_TAX_STATUS,
    CMD_TAX_ANNUAL,
    CMD_TAX_REMINDER_ON,
    CMD_VIEW_LATEST_DOCUMENT,
    CMD_BUY_PACK_199,
    CMD_BUY_PACK_279,
    CMD_BUY_PACK_3990,
    CMD_CREDIT_HISTORY,
    CMD_CONFIRM_CREDIT_PAYMENT,
    CMD_CONFIRM_RENEWAL,
    CMD_SETTINGS_PROMPTPAY,
    CMD_SETTINGS_BANK,
    CMD_SETTINGS_LOGO,
    CMD_SETTINGS_SIGNATURE,
    CMD_SETTINGS_STAMP,
  ];
  
  return allCommands.includes(canonical);
}
