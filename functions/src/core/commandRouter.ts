/**
 * Command Router - Single Source of Truth for Message Routing
 * 
 * CRITICAL: Routes messages BEFORE any handler processing
 * Precedence (MUST NOT change order):
 * SETTINGS > CREATE_DOC > EDIT_DRAFT > HELP > FALLBACK
 * 
 * Purpose: Ensure correct routing so UX flows work as expected
 */

import * as admin from 'firebase-admin';
import { normalizeInput } from '../utils/inputNormalization';

export enum RouteType {
  ROUTE_SETTINGS = 'ROUTE_SETTINGS',
  ROUTE_CREATE_DOC = 'ROUTE_CREATE_DOC',
  ROUTE_EDIT_DRAFT = 'ROUTE_EDIT_DRAFT',
  ROUTE_TRUST_COMMAND = 'ROUTE_TRUST_COMMAND',
  ROUTE_MENU = 'ROUTE_MENU',
  ROUTE_HELP = 'ROUTE_HELP',
  ROUTE_FALLBACK = 'ROUTE_FALLBACK',
}

export interface RouteResult {
  route: RouteType;
  docType?: 'QUO' | 'BILL' | 'INVOICE' | 'RECEIPT';
  trustCommand?:
    | 'LATEST_DOC'
    | 'RESEND_PDF'
    | 'SUBSCRIPTION_STATUS'
    | 'CHECK_SLIP'
    | 'CREDIT_BALANCE'
    | 'INSTALLMENT_SUMMARY'
    | 'DOC_EXAMPLES'
    | 'WELCOME_REPLAY'; // ✅ CREDIT_BALANCE kept for backward compatibility
  normalizedText: string;
}

/**
 * Normalize text (Thai spacing, trim, lowercase for matching)
 * ✅ FIX: Preserve exact match for docType patterns (don't normalize too aggressively)
 */
function normalizeText(text: string): string {
  if (!text) return '';
  
  // Trim only
  let normalized = text.trim();
  // Strip leading bullets/markers to keep commands detectable
  normalized = normalized.replace(/^[\s•\-*—]+/g, '');
  
  // Insert space between Thai/English letters and digits (for "ลูกค้าแมวน้อย" → "ลูกค้า แมวน้อย")
  normalized = normalized.replace(/([\u0E00-\u0E7FA-Za-z])(\d)/g, '$1 $2');
  normalized = normalized.replace(/(\d)([\u0E00-\u0E7FA-Za-z])/g, '$1 $2');
  
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Reuse global typo-tolerant normalization so create-doc aliases stay aligned.
  normalized = normalizeInput(normalized);
  
  return normalized.toLowerCase();
}

function getTrustCommand(normalized: string): RouteResult['trustCommand'] | null {
  // Trust commands to prevent user panic (explicit phrases only)
  const trustPatterns = [
    { pattern: /^(?:ขอ|ดู|เปิดดู|เอา)?\s*เอกสารล่าสุด(?:\s*(?:หน่อย|อีกครั้ง|อีกรอบ))?$/i, command: 'LATEST_DOC' as const },
    { pattern: /^ส่ง PDF อีกครั้ง$/i, command: 'RESEND_PDF' as const },
    { pattern: /^สถานะแพ็ค$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^สถานะแพ็ก$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^สถานะแพค$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^แพ็กของฉัน$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^แพ็คของฉัน$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^แพคของฉัน$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^(?:ขอ|ช่วย)?\s*(?:เช็ค|ดู|เปิดดู)?\s*(?:แพ็ก|แพ็ค|แพค)(?:ของฉัน)?(?:\s*(?:หน่อย|ให้หน่อย))?$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^(?:ฉัน|ผม|เรา)?.*(?:เหลือฟรี|เหลือ).*?(?:กี่|เท่าไหร่|อีกกี่).*(?:ใบ|ฉบับ)$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^เช็คเครดิต$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^เช็คแพ็ค$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^เช็คแพ็ก$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^เช็คแพค$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^ดูแพ็ค$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^ดูแพ็ก$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^ดูแพค$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^สถานะเครดิต$/i, command: 'SUBSCRIPTION_STATUS' as const },
    { pattern: /^เช็คสลิป$/i, command: 'CHECK_SLIP' as const },
    { pattern: /^ข้อมูลงวด[:：]?$/i, command: 'INSTALLMENT_SUMMARY' as const },
    { pattern: /^สรุปงวด[:：]?$/i, command: 'INSTALLMENT_SUMMARY' as const },
    { pattern: /^สรุปงวดของ/i, command: 'INSTALLMENT_SUMMARY' as const },
    { pattern: /^ตัวอย่างเอกสาร$/i, command: 'DOC_EXAMPLES' as const },
    {
      pattern: /^(?:ส่ง\s*)?(?:welcome(?:\s*card)?|การ์ดต้อนรับ|welcome card)(?:\s*(?:มา)?(?:ใหม่|อีกครั้ง|อีกรอบ))?$/i,
      command: 'WELCOME_REPLAY' as const,
    },
    // ✅ DEPRECATED: Keep for backward compatibility but route to subscription status
    { pattern: /^เครดิตคงเหลือ$/i, command: 'SUBSCRIPTION_STATUS' as const },
  ];

  for (const { pattern, command } of trustPatterns) {
    if (pattern.test(normalized)) return command;
  }

  return null;
}

/**
 * Route incoming text to appropriate handler
 * 
 * Precedence (checked in order):
 * 1. SETTINGS - ตั้งค่า... (theme, bank, tax, address, company, VAT, WHT, logo, signature, stamp)
 * 2. CREATE_DOC - ใบเสนอราคา/ทำใบเสนอราคา/ใบวางบิล/ทำใบวางบิล/ใบแจ้งหนี้/ใบเสร็จ
 * 3. EDIT_DRAFT - Has draft or looks like item/customer/confirm/cancel
 * 4. HELP - วิธีใช้งาน/ช่วยเหลือ
 * 5. FALLBACK - Everything else
 */
export function routeIncomingText(params: {
  text: string;
  hasActiveDraft?: boolean;
  db: admin.firestore.Firestore;
}): RouteResult {
  const { text, hasActiveDraft = false } = params;
  
  const normalized = normalizeText(text);

  // Admin commands should bypass draft routing and be handled by intent recognizer
  if (/^admin\b/i.test(normalized)) {
    return {
      route: RouteType.ROUTE_FALLBACK,
      normalizedText: normalized,
    };
  }
  
  // ========================================================================
  // 1. ROUTE_SETTINGS (HIGHEST PRIORITY)
  // ========================================================================
  // Settings keywords: ตั้งค่า... (theme, bank, tax, address, company, VAT, WHT, logo, signature, stamp)
  const settingsPatterns = [
    /^ตั้งค่าธีม/i,
    /^เปลี่ยนธีม/i,
    /^ตั้งค่าธนาคาร/i,
    /^ตั้งค่าเลขผู้เสียภาษี/i,
    /^ตั้งค่าที่อยู่/i,
    /^ตั้งค่าชื่อบริษัท/i,
    /^ตั้งค่าvat/i,
    /^ตั้งค่าwht/i,
    /^ตั้งค่าโลโก้/i,
    /^ตั้งค่าลายเซ็น/i,
    /^ตั้งค่าตราประทับ/i,
    /^ตั้งค่าพร้อมเพย์/i,
    /^ตั้งค่าธุรกิจ/i,
    /^ตั้งค่า/i, // Generic "ตั้งค่า" (must be last in settings patterns)
  ];
  
  for (const pattern of settingsPatterns) {
    if (pattern.test(normalized)) {
      return {
        route: RouteType.ROUTE_SETTINGS,
        normalizedText: normalized,
      };
    }
  }
  
  // ========================================================================
  // 2. ROUTE_CREATE_DOC
  // ========================================================================
  // Document creation keywords (must match before EDIT_DRAFT)
  // ✅ FIX: Explicit mapping (BILL vs INVOICE) - order matters (specific first)
  const createDocPatterns = [
    // Quotation (specific patterns first)
    { pattern: /^ทำใบเสนอราคา$/i, docType: 'QUO' as const },
    { pattern: /^ใบเสนอราคา$/i, docType: 'QUO' as const },
    { pattern: /^quotation$/i, docType: 'QUO' as const },
    { pattern: /^quo$/i, docType: 'QUO' as const },
    { pattern: /^(?:ขอ|ช่วย|ฝาก|อยาก|จะ)?\s*(?:ทำ|สร้าง|ออก)?\s*(?:ใบเสนอราคา|เสนอราคา|quotation|quo)(?:\s*(?:ให้|ให้หน่อย|หน่อย|ที|ทีนะ|ทีครับ|ทีค่ะ))?$/i, docType: 'QUO' as const },
    // Invoice/Bill - ใบวางบิล = BILL, ใบแจ้งหนี้ = INVOICE
    { pattern: /^ทำใบวางบิล$/i, docType: 'BILL' as const },
    { pattern: /^ใบวางบิล$/i, docType: 'BILL' as const },
    { pattern: /^ทำใบแจ้งหนี้$/i, docType: 'INVOICE' as const },
    { pattern: /^ใบแจ้งหนี้$/i, docType: 'INVOICE' as const },
    { pattern: /^invoice$/i, docType: 'INVOICE' as const },
    { pattern: /^inv$/i, docType: 'INVOICE' as const },
    { pattern: /^(?:ขอ|ช่วย|ฝาก|อยาก|จะ)?\s*(?:ทำ|สร้าง|ออก)?\s*(?:ใบวางบิล|ใบแจ้งหนี้|invoice|inv|วางบิล|บิล)(?:\s*(?:ให้|ให้หน่อย|หน่อย|ที|ทีนะ|ทีครับ|ทีค่ะ))?$/i, docType: 'BILL' as const },
    // Receipt (specific patterns first)
    { pattern: /^ทำใบเสร็จ$/i, docType: 'RECEIPT' as const },
    { pattern: /^ใบเสร็จรับเงิน$/i, docType: 'RECEIPT' as const },
    { pattern: /^ใบเสร็จ$/i, docType: 'RECEIPT' as const },
    { pattern: /^receipt$/i, docType: 'RECEIPT' as const },
    { pattern: /^rec$/i, docType: 'RECEIPT' as const },
    { pattern: /^(?:ขอ|ช่วย|ฝาก|อยาก|จะ)?\s*(?:ทำ|สร้าง|ออก)?\s*(?:ใบเสร็จ|ใบเสร็จรับเงิน|receipt|rec)(?:\s*(?:ให้|ให้หน่อย|หน่อย|ที|ทีนะ|ทีครับ|ทีค่ะ))?$/i, docType: 'RECEIPT' as const },
  ];
  
  for (const { pattern, docType } of createDocPatterns) {
    if (pattern.test(normalized)) {
      return {
        route: RouteType.ROUTE_CREATE_DOC,
        docType,
        normalizedText: normalized,
      };
    }
  }
  
  // ========================================================================
  // 3. ROUTE_EDIT_DRAFT
  // ========================================================================
  // Only route to EDIT_DRAFT if:
  // - Has active draft, OR
  // - Looks like edit command (confirm, cancel, item edit patterns)
  if (hasActiveDraft) {
    const trustCommand = getTrustCommand(normalized);
    if (trustCommand) {
      return {
        route: RouteType.ROUTE_TRUST_COMMAND,
        normalizedText: normalized,
        trustCommand,
      };
    }
    return {
      route: RouteType.ROUTE_EDIT_DRAFT,
      normalizedText: normalized,
    };
  }
  
  // Edit-like patterns (even without draft, route to EDIT_DRAFT handler which will handle "no draft" case)
  const editPatterns = [
    /^ยืนยัน|^ออกเอกสาร/i,
    /^ออกครบชุด/i,
    /^ยกเลิก|^เริ่มใหม่|^ลบ/i,
    /^แก้ไข/i,
    /^เพิ่มรายการ/i,
    /^ลูกค้า/i, // "ลูกค้า..." is edit command
  ];
  
  for (const pattern of editPatterns) {
    if (pattern.test(normalized)) {
      return {
        route: RouteType.ROUTE_EDIT_DRAFT,
        normalizedText: normalized,
      };
    }
  }
  
  // ========================================================================
  // 4. ROUTE_TRUST_COMMANDS (PHASE 1 - SEV-0)
  // ========================================================================
  const trustCommand = getTrustCommand(normalized);
  if (trustCommand) {
    return {
      route: RouteType.ROUTE_TRUST_COMMAND,
      normalizedText: normalized,
      trustCommand,
    };
  }
  
  // ========================================================================
  // 5. ROUTE_MENU (PHASE 3: Main menu command)
  // ========================================================================
  if (/^(?:ขอ|เอา)?\s*(?:เมนู|menu)(?:\s*(?:หน่อย|ใหม่|หลัก))?$/i.test(normalized)) {
    return {
      route: RouteType.ROUTE_MENU,
      normalizedText: normalized,
    };
  }
  
  // ========================================================================
  // 6. ROUTE_HELP
  // ========================================================================
  const helpPatterns = [
    /^วิธีใช้งาน/i,
    /^ช่วยเหลือ|^ช่วย/i,
    /^help/i,
  ];
  
  for (const pattern of helpPatterns) {
    if (pattern.test(normalized)) {
      return {
        route: RouteType.ROUTE_HELP,
        normalizedText: normalized,
      };
    }
  }
  
  // ========================================================================
  // 7. ROUTE_FALLBACK (DEFAULT)
  // ========================================================================
  return {
    route: RouteType.ROUTE_FALLBACK,
    normalizedText: normalized,
  };
}
