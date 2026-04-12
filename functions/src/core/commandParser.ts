/**
 * Command Parser for Conversational Document Creation
 * 
 * Supports flexible Thai language commands:
 * - เริ่ม ใบเสนอราคา / เริ่ม QT
 * - ลูกค้า บริษัท ABC
 * - เพิ่ม ค่าแรง 15000
 * - เพิ่ม วัสดุ 2 x 3200
 * - ส่วนลด 1000 / ส่วนลด 10%
 * - vat 7%
 * - ยืนยัน / ยืนยันอีกครั้ง
 */

import { DocumentType } from './conversationOrchestrator';

// ============================================================================
// COMMAND TYPES
// ============================================================================

export enum CommandType {
  START_DOC = 'START_DOC',
  SET_CUSTOMER = 'SET_CUSTOMER',
  SET_CUSTOMER_TAXID = 'SET_CUSTOMER_TAXID',
  SET_CUSTOMER_ADDRESS = 'SET_CUSTOMER_ADDRESS',
  ADD_ITEM = 'ADD_ITEM',
  UPDATE_ITEM = 'UPDATE_ITEM',
  REMOVE_ITEM = 'REMOVE_ITEM',
  SET_DISCOUNT = 'SET_DISCOUNT',
  SET_VAT = 'SET_VAT',
  SET_DUE_DATE = 'SET_DUE_DATE',
  SET_PAYMENT = 'SET_PAYMENT',
  CONFIRM_STEP1 = 'CONFIRM_STEP1',
  CONFIRM_STEP2 = 'CONFIRM_STEP2',
  APPLY_SUMMARY_PATCH = 'APPLY_SUMMARY_PATCH',
  CANCEL = 'CANCEL',
  RESET = 'RESET',
  HELP = 'HELP',
  MENU = 'MENU',
  TEMPLATE = 'TEMPLATE',
  UNKNOWN = 'UNKNOWN',
}

export interface ParsedCommand {
  type: CommandType;
  payload?: Record<string, any>;
  rawText: string;
  confidence?: number; // 0-1 for ML-based parsing
}

// ============================================================================
// TEXT NORMALIZATION
// ============================================================================

/**
 * Normalize Thai text for parsing:
 * - Trim and collapse whitespace
 * - Convert Thai numerals to Arabic
 * - Remove currency symbols
 * - Normalize punctuation
 */
export function normalizeText(text: string): string {
  let normalized = text.trim();

  // Remove leading bullets/dashes
  normalized = normalized.replace(/^[\s•\-*—]+/g, '');

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Remove currency symbols
  normalized = normalized.replace(/[฿$€£¥]/g, '');
  normalized = normalized.replace(/บาท/g, '');
  
  // Remove thousand separators
  normalized = normalized.replace(/,/g, '');
  
  // Convert Thai numerals to Arabic
  const thaiToArabic: Record<string, string> = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
  };
  
  normalized = normalized.replace(/[๐-๙]/g, (char) => thaiToArabic[char] || char);
  
  // Normalize quotes
  normalized = normalized.replace(/[""]/g, '"');
  normalized = normalized.replace(/['']/g, "'");

  // Normalize fullwidth colon
  normalized = normalized.replace(/[：]/g, ':');

  return normalized;
}

/**
 * Parse number from Thai text
 * Handles: 1500, 1,500, 30,000, ๑๕๐๐, 1500฿, 15000 บาท
 * Enhanced: Accepts commas as thousands, dots as decimals
 * Rejects ambiguous formats like 1.500,50 or 30.000
 */
export function parseNumber(text: string): { value?: number; error?: string; ambiguous?: boolean } {
  // Normalize but preserve number structure
  let normalized = text.trim();
  
  // Remove currency symbols and "บาท"
  normalized = normalized.replace(/[฿$€£¥]/g, '');
  normalized = normalized.replace(/บาท/g, '').trim();
  
  // Convert Thai numerals to Arabic
  const thaiToArabic: Record<string, string> = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
  };
  normalized = normalized.replace(/[๐-๙]/g, (char) => thaiToArabic[char] || char);
  
  // Detect ambiguous formats (European style: 1.500,50 or 30.000)
  // Pattern: has both comma and dot, or multiple dots/commas in wrong positions
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');
  
  // Rule: Accept "30,000" (thousands comma), "1500.50" (decimal dot), "30000"
  // Reject ambiguous: "30.000", "1.500,50"
  
  if (hasComma && hasDot) {
    // Check if it's European format (dot for thousands, comma for decimal)
    const commaPos = normalized.indexOf(',');
    const dotPos = normalized.indexOf('.');
    // If comma comes after dot, it's European format (1.500,50) - reject
    if (commaPos > dotPos) {
      return {
        error: 'รูปแบบตัวเลขยังงงๆ นิดนึง ใช้จุลภาค (,) สำหรับหลักพัน และจุด (.) สำหรับทศนิยม\nตัวอย่าง: 30,000 หรือ 1500.50',
        ambiguous: true,
      };
    }
  }
  
  // Check for ambiguous thousands separator (30.000)
  const dotCount = (normalized.match(/\./g) || []).length;
  
  // If multiple dots and no comma, could be ambiguous (e.g., 30.000)
  if (dotCount > 1 && !hasComma) {
    // Check if it looks like thousands separator (e.g., 30.000)
    const lastDotPos = normalized.lastIndexOf('.');
    const afterLastDot = normalized.substring(lastDotPos + 1);
    // If after last dot is 3 digits, likely thousands separator - reject
    if (/^\d{3}$/.test(afterLastDot) && lastDotPos > 0) {
      return {
        error: 'รูปแบบตัวเลขยังงงๆ นิดนึง ใช้จุลภาค (,) สำหรับหลักพัน และจุด (.) สำหรับทศนิยม\nตัวอย่าง: 30,000 หรือ 1500.50',
        ambiguous: true,
      };
    }
  }
  
  // Single dot at end with 3 digits before it (e.g., 30.000) - ambiguous
  if (dotCount === 1 && !hasComma) {
    const dotPos = normalized.indexOf('.');
    const beforeDot = normalized.substring(0, dotPos);
    const afterDot = normalized.substring(dotPos + 1);
    // If before dot has digits and after dot is exactly 3 digits, likely thousands separator
    if (/^\d+$/.test(beforeDot) && /^\d{3}$/.test(afterDot) && beforeDot.length > 0) {
      return {
        error: 'รูปแบบตัวเลขยังงงๆ นิดนึง ใช้จุลภาค (,) สำหรับหลักพัน และจุด (.) สำหรับทศนิยม\nตัวอย่าง: 30,000 หรือ 1500.50',
        ambiguous: true,
      };
    }
  }
  
  // Remove thousand separators (commas) - Thai/US format
  normalized = normalized.replace(/,/g, '');
  
  // Extract number (supports decimals with dot)
  const match = normalized.match(/^(\d+(?:\.\d+)?)$/);
  if (match) {
    const num = parseFloat(match[1]);
    return isNaN(num) 
      ? { error: 'ไม่สามารถแปลงเป็นตัวเลขได้' } 
      : { value: num };
  }
  
  return { error: 'ไม่พบตัวเลขที่ถูกต้อง' };
}

/**
 * Parse quantity from text
 * Handles: "2", "x2", "*2", "2ชิ้น", "2 ครั้ง", "2 หน่วย"
 */
function parseQuantity(text: string): number | null {
  // Remove common quantity suffixes
  const cleaned = text
    .replace(/ชิ้น|ครั้ง|หน่วย|ตัว|อัน|รายการ/gi, '')
    .replace(/[x*×]/g, '')
    .trim();
  
  const result = parseNumber(cleaned);
  return result.value ?? null;
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const patterns = {
  // เริ่ม ใบเสนอราคา | เริ่ม ใบวางบิล | เริ่ม ใบเสร็จ | เริ่ม QT
  startDoc: /^เริ่ม\s+(ใบเสนอราคา|ใบวางบิล|ใบเสร็จ|ใบเสร็จรับเงิน|QT|qt|WB|wb|RC|rc|BILL|bill)/i,
  // ทำใบเสนอราคา | ทำใบวางบิล | ทำใบเสร็จ
  startDocDirect: /^(ทำใบเสนอราคา|ทำใบวางบิล|ทำใบเสร็จ|ทำใบเสร็จรับเงิน)/i,
  
  // ลูกค้า <name> | ลูกค้า: <name> | ตั้งลูกค้า <name>
  setCustomer: /^(?:ลูกค้า|ตั้งลูกค้า)[:：]?\s*(.+)/i,
  
  // เลขผู้เสียภาษี <taxId>
  setTaxId: /^เลขผู้เสียภาษี[:：]?\s*(.+)/i,
  
  // ที่อยู่ <address>
  setAddress: /^ที่อยู่[:：]?\s*(.+)/i,
  
  // เพิ่ม <name> <qty> x <price> (with quantity)
  // Enhanced: accepts commas, "บาท", various qty formats
  addItemQty: /^เพิ่ม(?:รายการ)?[:：]?\s+(.+?)\s+(\d+(?:[,.]\d+)*)\s*[x*×]\s*(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/i,
  
  // เพิ่ม <name> <price> (simple)
  // Enhanced: accepts commas, "บาท"
  addItem: /^เพิ่ม(?:รายการ)?[:：]?\s+(.+?)\s+(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/i,
  
  // แก้ <name> <price> | แก้ <name> <qty> x <price>
  // Enhanced: accepts commas, "บาท", various qty formats
  updateItemQty: /^(?:แก้|แก้ไข)(?:รายการ)?[:：]?\s+(.+?)\s+(\d+(?:[,.]\d+)*)\s*[x*×]\s*(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/i,
  updateItem: /^(?:แก้|แก้ไข)(?:รายการ)?[:：]?\s+(.+?)\s+(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/i,
  
  // ลบ <name> | ลบรายการ <name>
  // Enhanced: accepts ":"
  removeItem: /^(?:ลบ|ลบรายการ)[:：]?\s+(.+)/i,
  
  // ส่วนลด 1000 | ส่วนลด 10%
  discount: /^ส่วนลด\s+(\d+(?:\.\d+)?)([%％]?)/i,
  
  // vat 7% | ภาษี 7%
  vat: /^(?:vat|VAT|ภาษี)\s+(\d+(?:\.\d+)?)[%％]/i,
  
  // กำหนดชำระ 30/01/2568 | กำหนดชำระ 2025-01-30 | กำหนดครบกำหนด 31/12/2568
  dueDate: /^(?:กำหนดชำระ|กำหนดครบกำหนด|ครบกำหนด)\s+(.+)/i,
  
  // ชำระ 29/12/2568 | ช่องทาง โอนเงิน | อ้างอิง REF123
  payment: /^(?:ชำระ|ช่องทาง|อ้างอิง)\s+(.+)/i,
  
  // ยืนยัน
  confirm1: /^ยืนยัน$/i,

  // ยืนยันอีกครั้ง
  confirm2: /^ยืนยันอีกครั้ง$/i,

  // ออกเอกสาร (issue)
  confirmIssue: /^(ออกเอกสาร|ออกเอกสารเลย|สร้างเอกสาร)$/i,

  // เมนู / ช่วยเหลือ / แบบฟอร์ม
  menu: /^(เมนู|menu)$/i,
  help: /^(ช่วยเหลือ|help|usage|วิธีใช้งาน|คำสั่งทั้งหมด)$/i,
  template: /^(แบบฟอร์ม|template|copy|ก๊อป)$/i,
  
  // ยกเลิก
  cancel: /^(?:ยกเลิก|cancel)/i,
  
  // เริ่มใหม่
  reset: /^เริ่มใหม่$/i,
  
};

// ============================================================================
// COMMAND PARSER
// ============================================================================

/**
 * Validate payload for ADD_ITEM command
 */
function validateAddItemPayload(payload: any): { valid: boolean; error?: string } {
  if (!payload) {
    return { valid: false, error: 'ไม่มีข้อมูลรายการ' };
  }
  
  if (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length === 0) {
    return { valid: false, error: 'ยังไม่เห็นชื่อรายการนะ' };
  }
  
  if (payload.name.trim().length < 2) {
    return { valid: false, error: 'ชื่อรายการต้องมีอย่างน้อย 2 ตัวอักษร' };
  }
  
  if (payload.qty === undefined || payload.qty === null || isNaN(payload.qty) || payload.qty <= 0) {
    return { valid: false, error: 'จำนวนยังไม่ถูกต้องนะ' };
  }
  
  if (payload.unitPrice === undefined || payload.unitPrice === null || isNaN(payload.unitPrice) || payload.unitPrice <= 0) {
    return { valid: false, error: 'ราคายังไม่ถูกต้องนะ' };
  }
  
  return { valid: true };
}

/**
 * Parse Thai command to structured action
 * CRITICAL: Uses normalized text for intent detection, raw text for payload extraction
 * 
 * @param rawText - Raw user input
 * @param context - Optional context (hasActiveDraft) to restrict flex patterns
 */
export function parseCommand(rawText: string, context?: { hasActiveDraft?: boolean }): ParsedCommand {
  // Normalize text ONLY for intent detection (regex matching)
  const text = normalizeText(rawText);
  // Keep raw text for payload extraction (preserves original formatting)

  if (patterns.menu.test(text)) {
    return { type: CommandType.MENU, rawText, confidence: 1.0 };
  }

  if (patterns.help.test(text)) {
    return { type: CommandType.HELP, rawText, confidence: 1.0 };
  }

  if (patterns.template.test(text)) {
    return { type: CommandType.TEMPLATE, rawText, confidence: 1.0 };
  }
  
  // START_DOC
  const startDocMatch = text.match(patterns.startDoc);
  if (startDocMatch) {
    const docTypeText = startDocMatch[1].toLowerCase();
    let docType: DocumentType;
    
    if (docTypeText.includes('เสนอราคา') || docTypeText === 'qt') {
      docType = DocumentType.QUOTATION;
    } else if (docTypeText.includes('วางบิล') || docTypeText === 'wb' || docTypeText === 'bill') {
      docType = DocumentType.INVOICE;
    } else if (docTypeText.includes('เสร็จ') || docTypeText === 'rc') {
      docType = DocumentType.RECEIPT;
    } else {
      docType = DocumentType.QUOTATION; // Default
    }
    
    return {
      type: CommandType.START_DOC,
      payload: { docType },
      rawText,
      confidence: 1.0,
    };
  }

  const startDirectMatch = text.match(patterns.startDocDirect);
  if (startDirectMatch) {
    const docTypeText = startDirectMatch[1].toLowerCase();
    let docType: DocumentType;
    if (docTypeText.includes('เสนอราคา')) {
      docType = DocumentType.QUOTATION;
    } else if (docTypeText.includes('วางบิล')) {
      docType = DocumentType.INVOICE;
    } else {
      docType = DocumentType.RECEIPT;
    }
    return {
      type: CommandType.START_DOC,
      payload: { docType },
      rawText,
      confidence: 1.0,
    };
  }
  
  // SET_CUSTOMER - Extract name from raw text
  const customerMatch = text.match(patterns.setCustomer);
  if (customerMatch) {
    // Extract from raw text to preserve original formatting
    const rawCustomerMatch = rawText.match(/^(?:ลูกค้า|ตั้งลูกค้า)[:：]?\s*(.+)/i);
    const name = rawCustomerMatch ? rawCustomerMatch[1].trim() : customerMatch[1].trim();
    
    if (!name || name.length === 0) {
      return {
        type: CommandType.UNKNOWN,
        rawText,
        confidence: 0.0,
      };
    }
    
    return {
      type: CommandType.SET_CUSTOMER,
      payload: { name },
      rawText,
      confidence: 1.0,
    };
  }
  
  // SET_CUSTOMER_TAXID
  const taxIdMatch = text.match(patterns.setTaxId);
  if (taxIdMatch) {
    const rawTaxIdMatch = rawText.match(/^เลขผู้เสียภาษี[:：]?\s*(.+)/i);
    const taxId = rawTaxIdMatch ? rawTaxIdMatch[1].trim() : taxIdMatch[1].trim();
    
    if (!taxId || taxId.length === 0) {
      return {
        type: CommandType.UNKNOWN,
        rawText,
        confidence: 0.0,
      };
    }
    
    return {
      type: CommandType.SET_CUSTOMER_TAXID,
      payload: { taxId },
      rawText,
      confidence: 1.0,
    };
  }
  
  // SET_CUSTOMER_ADDRESS
  const addressMatch = text.match(patterns.setAddress);
  if (addressMatch) {
    const rawAddressMatch = rawText.match(/^ที่อยู่[:：]?\s*(.+)/i);
    const address = rawAddressMatch ? rawAddressMatch[1].trim() : addressMatch[1].trim();
    
    if (!address || address.length === 0) {
      return {
        type: CommandType.UNKNOWN,
        rawText,
        confidence: 0.0,
      };
    }
    
    return {
      type: CommandType.SET_CUSTOMER_ADDRESS,
      payload: { address },
      rawText,
      confidence: 1.0,
    };
  }
  
  // ADD_ITEM with quantity - Extract from raw text
  // Enhanced: handles commas, "บาท", qty formats (x2, *2, 2ชิ้น)
  const addItemQtyMatch = text.match(patterns.addItemQty);
  if (addItemQtyMatch) {
    // Extract payload from raw text (enhanced pattern)
    const rawAddItemQtyMatch = rawText.match(/^เพิ่ม(?:รายการ)?[:：]?\s+(.+?)\s+(\d+(?:[,.]\d+)*)\s*[x*×]\s*(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/i);
    
    if (rawAddItemQtyMatch) {
      const name = rawAddItemQtyMatch[1].trim();
      const qtyText = rawAddItemQtyMatch[2];
      const priceText = rawAddItemQtyMatch[3];
      
      const qtyResult = parseQuantity(qtyText);
      const priceResult = parseNumber(priceText);
      
      if (priceResult.error) {
        return {
          type: CommandType.ADD_ITEM,
          payload: { name, qty: qtyResult || 1, unitPrice: undefined, _invalid: true, _error: priceResult.error },
          rawText,
          confidence: 0.5,
        };
      }
      
      if (!priceResult.value) {
        return {
          type: CommandType.ADD_ITEM,
          payload: { name, qty: qtyResult || 1, unitPrice: undefined, _invalid: true, _error: 'ไม่พบราคาที่ถูกต้อง' },
          rawText,
          confidence: 0.5,
        };
      }
      
      const payload = { name, qty: qtyResult || 1, unitPrice: priceResult.value };
      const validation = validateAddItemPayload(payload);
      
      if (!validation.valid) {
        // Return command with invalid payload flag
        return {
          type: CommandType.ADD_ITEM,
          payload: { ...payload, _invalid: true, _error: validation.error },
          rawText,
          confidence: 0.5,
        };
      }
    
    return {
      type: CommandType.ADD_ITEM,
        payload,
      rawText,
      confidence: 1.0,
    };
    }
  }
  
  // ADD_ITEM simple - Extract from raw text
  // Enhanced: handles commas, "บาท"
  const addItemMatch = text.match(patterns.addItem);
  if (addItemMatch) {
    // Extract payload from raw text (enhanced pattern)
    const rawAddItemMatch = rawText.match(/^เพิ่ม(?:รายการ)?[:：]?\s+(.+?)\s+(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/i);
    
    if (rawAddItemMatch) {
      const name = rawAddItemMatch[1].trim();
      const priceText = rawAddItemMatch[2];
      const priceResult = parseNumber(priceText);
      
      if (priceResult.error) {
        return {
          type: CommandType.ADD_ITEM,
          payload: { name, qty: 1, unitPrice: undefined, _invalid: true, _error: priceResult.error },
          rawText,
          confidence: 0.5,
        };
      }
      
      if (!priceResult.value) {
        return {
          type: CommandType.ADD_ITEM,
          payload: { name, qty: 1, unitPrice: undefined, _invalid: true, _error: 'ไม่พบราคาที่ถูกต้อง' },
          rawText,
          confidence: 0.5,
        };
      }
      
      const payload = { name, qty: 1, unitPrice: priceResult.value };
      const validation = validateAddItemPayload(payload);
      
      if (!validation.valid) {
        return {
          type: CommandType.ADD_ITEM,
          payload: { ...payload, _invalid: true, _error: validation.error },
          rawText,
          confidence: 0.5,
        };
      }
    
    return {
      type: CommandType.ADD_ITEM,
        payload,
      rawText,
      confidence: 0.9,
    };
    }
  }
  
  // FLEXIBLE ADD_ITEM (paste-to-edit support)
  // RESTRICTED: Only matches when user has active draft (item editing context)
  // Match: "ค่าแรง 18000" or "ปูนซีเมนต์ 10 x 120" without "เพิ่ม" prefix
  // Enhanced: handles commas, "บาท", qty formats
  // CRITICAL: Require explicit keywords OR active draft context
  // Strategy C: Disable flex if message contains non-item command keywords
  if (context?.hasActiveDraft) {
    // Check for non-item command keywords - if found, disable flex patterns
    const nonItemKeywords = [
      'ลูกค้า', 'ที่อยู่', 'เลขผู้เสียภาษี', 'ธนาคาร', 
      'ส่วนลด', 'vat', 'ภาษี', 'กำหนด', 'หมายเหตุ',
      'ยืนยัน', 'ยกเลิก', 'เริ่มใหม่', 'ช่วยเหลือ'
    ];
    
    const containsNonItemKeyword = nonItemKeywords.some(keyword => 
      rawText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // If contains non-item keyword, skip flex patterns (let explicit patterns handle it)
    if (containsNonItemKeyword) {
      // Skip to next command type checks
    } else {
    const flexAddQtyMatch = text.match(/^(.+?)\s+(\d+(?:[,.]\d+)*)\s*[x*×]\s*(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/i);
  if (flexAddQtyMatch) {
      const rawFlexAddQtyMatch = rawText.match(/^(.+?)\s+(\d+(?:[,.]\d+)*)\s*[x*×]\s*(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/i);
      
      if (rawFlexAddQtyMatch) {
        const name = rawFlexAddQtyMatch[1].trim();
        const qtyText = rawFlexAddQtyMatch[2];
        const priceText = rawFlexAddQtyMatch[3];
        
        const qtyResult = parseQuantity(qtyText);
        const priceResult = parseNumber(priceText);
        
        if (priceResult.error) {
          return {
            type: CommandType.ADD_ITEM,
            payload: { name, qty: qtyResult || 1, unitPrice: undefined, _invalid: true, _error: priceResult.error },
            rawText,
            confidence: 0.4,
          };
        }
        
        if (!priceResult.value) {
          return {
            type: CommandType.ADD_ITEM,
            payload: { name, qty: qtyResult || 1, unitPrice: undefined, _invalid: true, _error: 'ไม่พบราคาที่ถูกต้อง' },
            rawText,
            confidence: 0.4,
          };
        }
        
        const payload = { name, qty: qtyResult || 1, unitPrice: priceResult.value };
        const validation = validateAddItemPayload(payload);
        
        if (!validation.valid) {
          return {
            type: CommandType.ADD_ITEM,
            payload: { ...payload, _invalid: true, _error: validation.error },
            rawText,
            confidence: 0.4,
          };
        }
    
    return {
      type: CommandType.ADD_ITEM,
          payload,
      rawText,
      confidence: 0.85,
    };
      }
  }
  
    // Enhanced: handles commas, "บาท"
    const flexAddMatch = text.match(/^(.+?)\s+(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/);
  if (flexAddMatch) {
      const rawFlexAddMatch = rawText.match(/^(.+?)\s+(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/);
      
      if (rawFlexAddMatch) {
        const name = rawFlexAddMatch[1].trim();
        const priceText = rawFlexAddMatch[2];
        const priceResult = parseNumber(priceText);
        
        if (priceResult.error) {
          const errorMsg = priceResult.ambiguous 
            ? priceResult.error 
            : priceResult.error;
          return {
            type: CommandType.ADD_ITEM,
            payload: { name, qty: 1, unitPrice: undefined, _invalid: true, _error: errorMsg },
            rawText,
            confidence: 0.3,
          };
        }
        
        if (!priceResult.value) {
          return {
            type: CommandType.ADD_ITEM,
            payload: { name, qty: 1, unitPrice: undefined, _invalid: true, _error: 'ไม่พบราคาที่ถูกต้อง' },
            rawText,
            confidence: 0.3,
          };
        }
    
    // Avoid false positives like "ส่วนลด 1000" or "vat 7"
    const isOtherCommand = ['ส่วนลด', 'vat', 'ภาษี', 'กำหนด'].some(kw => 
      name.toLowerCase().includes(kw)
    );
    
    if (!isOtherCommand && name.length >= 2) {
          const payload = { name, qty: 1, unitPrice: priceResult.value };
          const validation = validateAddItemPayload(payload);
          
          if (!validation.valid) {
            return {
              type: CommandType.ADD_ITEM,
              payload: { ...payload, _invalid: true, _error: validation.error },
              rawText,
              confidence: 0.3,
            };
          }
          
      return {
        type: CommandType.ADD_ITEM,
            payload,
        rawText,
        confidence: 0.75,
      };
    }
      }
    }
    } // End of flex pattern block (only if no non-item keywords)
  }
  
  // UPDATE_ITEM with quantity
  // Enhanced: handles commas, "บาท", qty formats, ":"
  const updateItemQtyMatch = text.match(patterns.updateItemQty);
  if (updateItemQtyMatch) {
    const rawUpdateItemQtyMatch = rawText.match(/^(?:แก้|แก้ไข)(?:รายการ)?[:：]?\s+(.+?)\s+(\d+(?:[,.]\d+)*)\s*[x*×]\s*(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/i);
    
    if (rawUpdateItemQtyMatch) {
      const name = rawUpdateItemQtyMatch[1].trim();
      const qtyText = rawUpdateItemQtyMatch[2];
      const priceText = rawUpdateItemQtyMatch[3];
      
      const qtyResult = parseQuantity(qtyText);
      const priceResult = parseNumber(priceText);
      
      if (priceResult.error) {
        return {
          type: CommandType.UPDATE_ITEM,
          payload: { name: name || '', qty: qtyResult || 1, unitPrice: undefined, _invalid: true, _error: priceResult.error },
          rawText,
          confidence: 0.5,
        };
      }
      
      if (!priceResult.value) {
        return {
          type: CommandType.UPDATE_ITEM,
          payload: { name: name || '', qty: qtyResult || 1, unitPrice: undefined, _invalid: true, _error: 'ไม่พบราคาที่ถูกต้อง' },
          rawText,
          confidence: 0.5,
        };
      }
      
      if (!name || name.length === 0 || !qtyResult || qtyResult <= 0 || !priceResult.value || priceResult.value <= 0) {
        return {
          type: CommandType.UPDATE_ITEM,
          payload: { name: name || '', qty: qtyResult || 1, unitPrice: priceResult.value, _invalid: true, _error: 'ยังขาดชื่อรายการ/จำนวน/ราคาอยู่' },
          rawText,
          confidence: 0.5,
        };
      }
    
    return {
      type: CommandType.UPDATE_ITEM,
        payload: { name, qty: qtyResult, unitPrice: priceResult.value },
      rawText,
      confidence: 1.0,
    };
    }
  }
  
  // UPDATE_ITEM simple (price only)
  // Enhanced: handles commas, "บาท", ":"
  const updateItemMatch = text.match(patterns.updateItem);
  if (updateItemMatch) {
    const rawUpdateItemMatch = rawText.match(/^(?:แก้|แก้ไข)(?:รายการ)?[:：]?\s+(.+?)\s+(\d+(?:[,.]\d+)*)(?:\s*บาท)?\s*$/i);
    
    if (rawUpdateItemMatch) {
      const name = rawUpdateItemMatch[1].trim();
      const priceText = rawUpdateItemMatch[2];
      const priceResult = parseNumber(priceText);
      
      if (priceResult.error) {
        return {
          type: CommandType.UPDATE_ITEM,
          payload: { name: name || '', unitPrice: undefined, _invalid: true, _error: priceResult.error },
          rawText,
          confidence: 0.5,
        };
      }
      
      if (!priceResult.value) {
        return {
          type: CommandType.UPDATE_ITEM,
          payload: { name: name || '', unitPrice: undefined, _invalid: true, _error: 'ไม่พบราคาที่ถูกต้อง' },
          rawText,
          confidence: 0.5,
        };
      }
      
      if (!name || name.length === 0 || !priceResult.value || priceResult.value <= 0) {
        return {
          type: CommandType.UPDATE_ITEM,
          payload: { name: name || '', unitPrice: priceResult.value, _invalid: true, _error: 'ยังขาดชื่อรายการหรือราคาอยู่' },
          rawText,
          confidence: 0.5,
        };
      }
    
    return {
      type: CommandType.UPDATE_ITEM,
        payload: { name, unitPrice: priceResult.value },
      rawText,
      confidence: 0.9,
    };
    }
  }
  
  // REMOVE_ITEM
  // Enhanced: handles ":"
  const removeItemMatch = text.match(patterns.removeItem);
  if (removeItemMatch) {
    const rawRemoveItemMatch = rawText.match(/^(?:ลบ|ลบรายการ)[:：]?\s+(.+)/i);
    const name = rawRemoveItemMatch ? rawRemoveItemMatch[1].trim() : removeItemMatch[1].trim();
    
    if (!name || name.length === 0) {
      return {
        type: CommandType.REMOVE_ITEM,
        payload: { name: '', _invalid: true, _error: 'ยังไม่เห็นชื่อรายการที่จะลบ' },
        rawText,
        confidence: 0.5,
      };
    }
    
    return {
      type: CommandType.REMOVE_ITEM,
      payload: { name },
      rawText,
      confidence: 1.0,
    };
  }
  
  // SET_DISCOUNT
  const discountMatch = text.match(patterns.discount);
  if (discountMatch) {
    const value = parseFloat(discountMatch[1]);
    const isPercent = discountMatch[2] === '%' || discountMatch[2] === '％';
    
    return {
      type: CommandType.SET_DISCOUNT,
      payload: {
        type: isPercent ? 'PERCENT' : 'AMOUNT',
        value,
      },
      rawText,
      confidence: 1.0,
    };
  }
  
  // SET_VAT
  const vatMatch = text.match(patterns.vat);
  if (vatMatch) {
    return {
      type: CommandType.SET_VAT,
      payload: { rate: parseFloat(vatMatch[1]) },
      rawText,
      confidence: 1.0,
    };
  }
  
  // SET_DUE_DATE
  const dueDateMatch = text.match(patterns.dueDate);
  if (dueDateMatch) {
    return {
      type: CommandType.SET_DUE_DATE,
      payload: { date: dueDateMatch[1].trim() },
      rawText,
      confidence: 0.8,
    };
  }
  
  // SET_PAYMENT
  const paymentMatch = text.match(patterns.payment);
  if (paymentMatch) {
    return {
      type: CommandType.SET_PAYMENT,
      payload: { value: paymentMatch[1].trim() },
      rawText,
      confidence: 0.7,
    };
  }
  
  // CONFIRM_STEP2 (must check before CONFIRM_STEP1)
  if (patterns.confirm2.test(text)) {
    return {
      type: CommandType.CONFIRM_STEP2,
      rawText,
      confidence: 1.0,
    };
  }

  if (patterns.confirmIssue.test(text)) {
    return {
      type: CommandType.CONFIRM_STEP2,
      rawText,
      confidence: 1.0,
    };
  }
  
  // CONFIRM_STEP1
  if (patterns.confirm1.test(text)) {
    return {
      type: CommandType.CONFIRM_STEP1,
      rawText,
      confidence: 1.0,
    };
  }
  
  // CANCEL
  if (patterns.cancel.test(text)) {
    return {
      type: CommandType.CANCEL,
      rawText,
      confidence: 1.0,
    };
  }
  
  // RESET
  if (patterns.reset.test(text)) {
    return {
      type: CommandType.RESET,
      rawText,
      confidence: 1.0,
    };
  }
  
  // HELP
  if (patterns.help.test(text)) {
    return {
      type: CommandType.HELP,
      rawText,
      confidence: 1.0,
    };
  }
  
  // UNKNOWN
  return {
    type: CommandType.UNKNOWN,
    rawText,
    confidence: 0.0,
  };
}

// ============================================================================
// HELP TEXT
// ============================================================================

export function getHelpText(): string {
  const { getHelpMessageShort } = require('../services/helpCopy');
  return getHelpMessageShort();
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  parseCommand,
  normalizeText,
  parseNumber,
  getHelpText,
  CommandType,
};
