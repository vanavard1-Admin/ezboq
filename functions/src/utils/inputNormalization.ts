/**
 * Input Normalization Utility
 * 
 * CRITICAL: Makes conversation system typo-tolerant and button-safe.
 * 
 * Features:
 * - Normalizes Thai spelling variants (แพค/แพ็ค, ลูกค้า/ลุกค้า)
 * - Removes redundant spaces and punctuation
 * - Handles common typos
 * - Canonicalizes numbers and units
 * - Preserves intent while tolerating minor differences
 */

/**
 * Thai spelling variant map
 * Maps common typos/variants to canonical forms
 */
const THAI_VARIANT_MAP: Record<string, string> = {
  // Package variants
  'แพค': 'แพ็ค',
  'แพ็ก': 'แพ็ค',
  'แพก': 'แพ็ค',
  
  // Customer variants
  'ลุกค้า': 'ลูกค้า',
  'ลูกค่า': 'ลูกค้า',
  'ลูกคา': 'ลูกค้า',
  
  // Add item variants
  'เพิมรายการ': 'เพิ่มรายการ',
  'เพิ้มรายการ': 'เพิ่มรายการ',
  'เพิม': 'เพิ่ม',
  'เพิ้ม': 'เพิ่ม',
  
  // Document variants
  'ใบเสนอราคา': 'ใบเสนอราคา', // Already canonical
  'ใบวางบิล': 'ใบวางบิล',
  'ใบเสร็จ': 'ใบเสร็จ',
  'ใบเสร็จรับเงิน': 'ใบเสร็จ',
  
  // Action variants
  'ยืนยัน': 'ยืนยัน',
  'ยืนยันรับเงิน': 'ยืนยันรับเงิน',
  'ยืนยันการชำระเงิน': 'ยืนยันการชำระเงิน',
  'ยกเลิก': 'ยกเลิก',
  'แก้ไข': 'แก้ไข',
  'เพิ่ม': 'เพิ่ม',
  'ลบ': 'ลบ',
  
  // Report variants
  'รายงาน': 'รายงาน',
  'รายงานเดือนนี้': 'รายงาน เดือนนี้',
  'รายงานเดือนก่อน': 'รายงาน เดือนก่อน',
  
  // Settings variants
  'ตั้งค่า': 'ตั้งค่า',
  'ตั้งค่าธุรกิจ': 'ตั้งค่าธุรกิจ',
  'ตั้งค่าพร้อมเพย์': 'ตั้งค่าพร้อมเพย์',
  'ตั้งค่าธนาคาร': 'ตั้งค่าธนาคาร',
  'โล้โก้': 'โลโก้',
  'โลโก': 'โลโก้',
  'ลายเซน': 'ลายเซ็น',
  'ตราปะทับ': 'ตราประทับ',
  
  // Menu variants
  'เมนูหลัก': 'เมนูหลัก',
  'กลับเมนู': 'กลับเมนู',
  'กลับ': 'กลับ',
  
  // Help variants
  'วิธีใช้งาน': 'วิธีใช้งาน',
  'ช่วยเหลือ': 'ช่วยเหลือ',
  'ช่วย': 'ช่วยเหลือ',
  'คำสั่งทั้งหมด': 'วิธีใช้งาน',
};

/**
 * Normalize Thai text input
 * 
 * Steps:
 * 1. Trim whitespace
 * 2. Normalize spaces (multiple spaces → single space)
 * 3. Remove leading/trailing punctuation
 * 4. Apply variant map
 * 5. Normalize numbers (e.g., "99 บาท" → "99บาท", "99บ" → "99บาท")
 * 
 * @param input - Raw user input
 * @returns Normalized input ready for intent recognition
 */
export function normalizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Step 1: Trim
  let normalized = input.trim();

  // Step 1.5: Fix common document typos before token-based normalization.
  normalized = normalized
    .replace(/ใบเสรอราคา/gi, 'ใบเสนอราคา')
    .replace(/ใบเสน่อราคา/gi, 'ใบเสนอราคา');

  // Step 2: Normalize spaces (multiple spaces → single space)
  normalized = normalized.replace(/\s+/g, ' ');

  // Step 3: Remove leading/trailing punctuation (but keep internal punctuation)
  normalized = normalized.replace(/^[^\w\u0E00-\u0E7F]+|[^\w\u0E00-\u0E7F]+$/g, '');

  // Step 4: Apply variant map (word-by-word to avoid partial matches)
  const words = normalized.split(/\s+/);
  const normalizedWords = words.map(word => {
    // Check exact match first
    if (THAI_VARIANT_MAP[word]) {
      return THAI_VARIANT_MAP[word];
    }
    
    // Check case-insensitive match
    const lowerWord = word.toLowerCase();
    for (const [variant, canonical] of Object.entries(THAI_VARIANT_MAP)) {
      if (variant.toLowerCase() === lowerWord) {
        return canonical;
      }
    }
    
    return word;
  });
  normalized = normalizedWords.join(' ');

  // Step 5: Normalize numbers with units
  // Pattern: "99 บาท" → "99บาท", "99บ" → "99บาท"
  normalized = normalized.replace(/(\d+)\s*บาท/g, '$1บาท');
  normalized = normalized.replace(/(\d+)\s*บ\b/g, '$1บาท');
  
  // Step 6: Normalize package purchase patterns
  // Pattern: "ซื้อแพ็ค 99" → "ซื้อแพ็ค 99" (keep space for ACTION_MAP matching)
  // Pattern: "ซื้อแพ็ค99" → "ซื้อแพ็ค 99" (add space for ACTION_MAP matching)
  // Pattern: "แพ็ค99" → "แพ็ค 99"
  normalized = normalized.replace(/ซื้อ\s*(แพ็ค|แพค|แพ็ก)\s*(\d+)/g, 'ซื้อแพ็ค $2');
  normalized = normalized.replace(/^แพ็ค\s*(\d+)/g, 'แพ็ค $1');
  normalized = normalized.replace(/^แพค\s*(\d+)/g, 'แพ็ค $1');
  normalized = normalized.replace(/^แพ็ก\s*(\d+)/g, 'แพ็ค $1');

  // Step 6: Normalize common command patterns
  // "ทำใบเสนอราคา" variations
  normalized = normalized.replace(/^(?:ทำ|สร้าง|ออก)?\s*ใบเสนอราคา$/i, 'ทำใบเสนอราคา');
  // "ทำใบวางบิล" variations
  normalized = normalized.replace(/^(?:ทำ|สร้าง|ออก)?\s*ใบวางบิล$/i, 'ทำใบวางบิล');
  // "ทำใบเสร็จ" variations
  normalized = normalized.replace(/^(?:ทำ|สร้าง|ออก)?\s*ใบเสร็จ(?:รับเงิน)?$/i, 'ทำใบเสร็จ');

  return normalized.trim();
}

/**
 * Check if two inputs are equivalent after normalization
 * Useful for fuzzy matching
 */
export function inputsAreEquivalent(input1: string, input2: string): boolean {
  const norm1 = normalizeInput(input1);
  const norm2 = normalizeInput(input2);
  return norm1 === norm2 || norm1.toLowerCase() === norm2.toLowerCase();
}

/**
 * Extract canonical command from input
 * Returns the most likely canonical form
 */
export function getCanonicalCommand(input: string): string {
  return normalizeInput(input);
}
