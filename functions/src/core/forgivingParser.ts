/**
 * Forgiving Parser - Human-First UX
 * 
 * Core principle: "Try to parse everything before asking"
 * 
 * Parsing order (critical - try parse before asking):
 * 1. Detect special commands (ออกเอกสาร|ยืนยัน|ลบ|เริ่มใหม่)
 * 2. Split multiline → parse line-by-line
 * 3. Phone detection (รองรับขีด เว้นวรรค คำว่า โทร)
 * 4. Item detection: "คำ + ตัวเลข" (qty optional: x2, 2x, จำนวน 2)
 * 5. Pure short text (<50) no digits → customer name
 * 6. Price-only number → SET_PENDING_PRICE หรือ require context
 */

export enum ParsedActionType {
  SET_CUSTOMER_NAME = 'SET_CUSTOMER_NAME',
  SET_PHONE = 'SET_PHONE',
  ADD_ITEM = 'ADD_ITEM',
  UNDO_LAST = 'UNDO_LAST',
  RESET = 'RESET',
  CONFIRM = 'CONFIRM',
  HELP = 'HELP',
  MENU = 'MENU',
  TEMPLATE = 'TEMPLATE',
  SET_PENDING_PRICE = 'SET_PENDING_PRICE', // Price-only number (needs context)
  MISSING_ITEM_PRICE = 'MISSING_ITEM_PRICE', // Item name without price
  EDIT_LAST_ITEM = 'EDIT_LAST_ITEM', // "edit last item" command
  PAYMENT_CLAIM = 'PAYMENT_CLAIM', // User claims they already paid (e.g., "จ่ายแล้ว", "โอนแล้ว")
  UNKNOWN = 'UNKNOWN',
}

export interface ParsedAction {
  type: ParsedActionType;
  confidence: number; // 0-1
  payload?: {
    customerName?: string;
    phone?: string;
    item?: {
      name: string;
      qty: number;
      price: number;
    };
  };
}

export interface ParsingContext {
  hasActiveDraft: boolean;
  hasCustomer: boolean;
  hasItems: boolean;
  lastItemName?: string; // For SET_PENDING_PRICE context
}

/**
 * Expand installments from text (e.g., "ค่าทำเว็บ 50000 แบ่งจ่าย 2 งวด")
 */
function expandInstallments(name: string, price: number, text: string): ParsedAction[] {
  const installmentMatch = text.match(/แบ่งจ่าย\s*(\d+)\s*งวด/i);
  if (!installmentMatch) return [];

  const totalInstallments = parseInt(installmentMatch[1], 10);
  if (isNaN(totalInstallments) || totalInstallments < 2) return [];

  const perInstallment = price / totalInstallments;
  const actions: ParsedAction[] = [];

  for (let i = 1; i <= totalInstallments; i++) {
    actions.push({
      type: ParsedActionType.ADD_ITEM,
      confidence: 0.95,
      payload: {
        item: {
          name: `${name} (งวดที่ ${i}/${totalInstallments})`,
          qty: 1,
          price: perInstallment,
        },
      },
    });
  }
  return actions;
}

/**
 * ✅ Normalize Thai input without spaces
 * Inserts spaces between letters and digits, and after keywords
 * 
 * Rules:
 * - Insert space between Thai/English letters and digits
 * - Insert space after known keywords when glued to next char
 * - Preserve URLs and emails (normalize segments separately)
 * - Collapse multiple spaces to single
 */
export function normalizeThaiInput(raw: string): string {
  if (!raw || raw.length === 0) return raw;

  const normalizeLine = (line: string): string => {
    // ✅ Step 1: Split into segments (URL/email segments vs. normal text)
    const urlEmailPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const segments: Array<{ text: string; isProtected: boolean }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    urlEmailPattern.lastIndex = 0;

    while ((match = urlEmailPattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: line.substring(lastIndex, match.index), isProtected: false });
      }
      segments.push({ text: match[0], isProtected: true });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      segments.push({ text: line.substring(lastIndex), isProtected: false });
    }

    if (segments.length === 0) {
      segments.push({ text: line, isProtected: false });
    }

    const normalizedSegments = segments.map(segment => {
      if (segment.isProtected) {
        return segment.text;
      }

      let normalized = segment.text;

      // Preserve Thai honorific/name forms like "นายABC" while still separating
      // latin text that is glued in front of Thai words.
      normalized = normalized.replace(/([A-Za-z])([\u0E00-\u0E7F])/g, '$1 $2');

      normalized = normalized.replace(/([\u0E00-\u0E7FA-Za-z])(\d)/g, '$1 $2');
      normalized = normalized.replace(/(\d)([\u0E00-\u0E7FA-Za-z])/g, '$1 $2');

      const gluedKeywordPatterns = [
        /^ลูกค้า(\S+)/,
        /^เพิ่มรายการ(\S+)/,
        /^ที่อยู่(\S+)/,
        /^เลขผู้เสียภาษี(\S+)/,
        /^ธนาคาร(\S+)/,
        /^พร้อมเพย์(\S+)/,
        /^ชื่อบริษัท(\S+)/,
        /^ชื่อธุรกิจ(\S+)/,
        /^ให้(\S+)/, // ✅ Handling "ให้[Name]"
        /^สำหรับ(\S+)/, // ✅ Handling "สำหรับ[Name]"
        /^แบ่งจ่าย(\S+)/, // ✅ Handling "แบ่งจ่าย[N]"
      ];

      for (const pattern of gluedKeywordPatterns) {
        normalized = normalized.replace(pattern, (match, rest) => {
          const keyword = match.substring(0, match.length - rest.length);
          return `${keyword} ${rest}`;
        });
      }

      const keywords = [
        'ลูกค้า',
        'เพิ่มรายการ',
        'รายการ',
        'ออกเอกสาร',
        'ยืนยัน',
        'ลบ',
        'ลบรายการ',
        'เริ่มใหม่',
        'ใบเสนอราคา',
        'ใบวางบิล',
        'ใบเสร็จ',
        'เมนู',
        'ช่วยเหลือ',
        'แบบฟอร์ม',
        'ให้', // ✅ Keyword "Hai"
        'สำหรับ', // ✅ Keyword "Samrub"
      ];

      const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

      for (const keyword of sortedKeywords) {
        const pattern1 = new RegExp(`(${keyword})([^\\s:：\\.,!?\\d])`, 'g');
        normalized = normalized.replace(pattern1, '$1 $2');

        const pattern2 = new RegExp(`(${keyword})([:：])([^\\s])`, 'g');
        normalized = normalized.replace(pattern2, '$1$2 $3');
      }

      return normalized;
    });

    return normalizedSegments.join('').replace(/[ \t]+/g, ' ').trim();
  };

  const lines = raw.split(/\r?\n/);
  const normalizedLines = lines.map((line) => normalizeLine(line));
  return normalizedLines.join('\n');
}

/**
 * Normalize number string (handle commas, dots, Thai format)
 */
function normalizeNumber(text: string): number | null {
  // Remove currency symbols
  let normalized = text.replace(/[฿$€£¥บาท\s]/gi, '').trim();

  // Handle Thai format: 1.500 (thousands separator) vs 1.50 (decimal)
  // Assume comma = thousands, dot = decimal (Thai/US format)
  normalized = normalized.replace(/,/g, '');

  // Convert to number
  const num = parseFloat(normalized);
  return isNaN(num) || num <= 0 ? null : num;
}

/**
 * Detect phone number (Thai format)
 */
function detectPhone(text: string): string | null {
  // Remove common prefixes and normalize
  const cleaned = text.replace(/^(โทร|เบอร์|เบอร์โทร|tel|phone)[:：]?\s*/i, '').trim();

  // Remove all non-digits
  const digits = cleaned.replace(/\D/g, '');

  // Thai mobile: 10 digits (08x, 09x, 06x)
  // Thai landline: 9-10 digits
  if (digits.length >= 9 && digits.length <= 10 && /^[0-9]+$/.test(digits)) {
    // Format: 08x-xxx-xxxx or 08xxxxxxxx
    if (digits.startsWith('0')) {
      return digits;
    }
  }

  return null;
}

/**
 * Detect payment-related messages that should NOT be parsed as items.
 * CRITICAL: Must run BEFORE item parsing to prevent "จ่ายซื้อไปแล้ว11มีนา 20.49"
 * from becoming a line item.
 *
 * Returns true if the message is about payment/money transfer claims.
 */
function isPaymentClaimMessage(text: string): boolean {
  const normalized = text.toLowerCase().trim();

  // Pattern 1: "จ่าย...แล้ว" / "โอน...แล้ว" / "ชำระ...แล้ว" (already paid/transferred)
  if (/(จ่าย|โอน|ชำระ|transfer|paid).*แล้ว/i.test(normalized)) return true;

  // Pattern 2: Starts with payment verb + context (date, amount, reference)
  // "จ่ายซื้อไปแล้ว11มีนา", "โอนเงินเมื่อวาน", "ชำระเงินวันที่ 11"
  if (/^(จ่าย|โอน|ชำระ)(ซื้อ|เงิน|ค่า|ไป|มา|ให้|ตั้งแต่)/i.test(normalized)) return true;

  // Pattern 3: "ทำไม...ฟรี" / "ทำไม...ไม่ขึ้น" / "ทำไม...ไม่อัพเกรด" (why still free / not upgraded)
  if (/ทำไม.*(ฟรี|free|ไม่ขึ้น|ไม่อัพเกรด|ไม่เปลี่ยน|ยังเหมือนเดิม)/i.test(normalized)) return true;

  // Pattern 4: Complaint about payment status
  // "จ่ายเงินไปแล้ว", "จ่ายไปแล้วนะ", "โอนไปแล้ว"
  if (/(จ่าย|โอน|ชำระ).*(ไปแล้ว|เรียบร้อย|เมื่อ|ตอน|วันที่)/i.test(normalized)) return true;

  // Pattern 5: "อ้าว...จ่าย" / "เอ๊ะ...จ่าย" (surprised + payment)
  if (/^(อ้าว|เอ๊ะ|เห้ย|แล้ว|ก็).*(จ่าย|โอน|ชำระ)/i.test(normalized)) return true;

  // Pattern 6: "ซื้อไปแล้ว" / "สมัครไปแล้ว" (already purchased/subscribed)
  if (/(ซื้อ|สมัคร)(ไป)?แล้ว/i.test(normalized)) return true;

  return false;
}

/**
 * Parse item line: "name price" or "name qty x price" or "name qty price" (NATURAL_ITEM_3TOKENS)
 * ✅ Now handles both spaced and unspaced forms (after normalization)
 */
function parseItemLine(line: string): { name: string; qty: number; price: number } | null {
  // Normalize
  let normalized = line.trim();
  if (!normalized || normalized.length < 2) return null;

  // ✅ PRE-STRIP: Remove trailing currency words BEFORE tokenizing
  // "ค่าแก๊ป 120 บาท" → "ค่าแก๊ป 120"
  // "สายไฟ 303 บาท" → "สายไฟ 303"
  normalized = normalized.replace(/\s+(บาท|฿|baht)\s*$/i, '').trim();

  // ✅ HANDLE "รวม" price prefix: "... รวม 505" → name = before รวม, price = 505
  // "แท่งกาวน์ชุบ 1.80m และแคมป์หัวใจ รวม 505" → name="แท่งกาวน์ชุบ 1.80m และแคมป์หัวใจ", price=505
  const totalMatch = normalized.match(/^(.+?)\s+รวม\s*(\d+(?:[,.]\d+)*)\s*$/);
  if (totalMatch) {
    const name = totalMatch[1].trim();
    const price = normalizeNumber(totalMatch[2]);
    if (name && name.length >= 2 && price) {
      return { name, qty: 1, price };
    }
  }

  // Try pattern: "name qty x price" or "name qty* price"
  const qtyPattern = /(.+?)\s+(\d+(?:[,.]\d+)*)\s*[xX×*]\s*(\d+(?:[,.]\d+)*)\s*(?:บาท|฿)?/i;
  const qtyMatch = normalized.match(qtyPattern);

  if (qtyMatch) {
    const name = qtyMatch[1].trim();
    const qty = normalizeNumber(qtyMatch[2]);
    const price = normalizeNumber(qtyMatch[3]);

    if (name && qty && price) {
      return { name, qty, price };
    }
  }

  // ✅ NATURAL_ITEM_3TOKENS: "name qty price" (without x)
  // Pattern: "บริการออกแบบ 1 5000" → name="บริการออกแบบ", qty=1, price=5000
  const tokens = normalized.split(/\s+/);
  if (tokens.length >= 3) {
    const lastToken = tokens[tokens.length - 1];
    const secondLastToken = tokens[tokens.length - 2];
    const price = normalizeNumber(lastToken);
    const qty = normalizeNumber(secondLastToken);

    // If last 2 tokens are numbers, treat as qty + price
    if (price && qty) {
      const name = tokens.slice(0, -2).join(' ').trim();
      const cleanName = name.replace(/\s+(บาท|฿|baht)$/i, '').trim();

      if (cleanName && cleanName.length >= 2) {
        return { name: cleanName, qty, price };
      }
    }
  }

  // ✅ NATURAL_ITEM_2TOKENS: "name price" (simple) - works with normalized spacing
  // Split by space, last token should be price
  if (tokens.length >= 2) {
    const lastToken = tokens[tokens.length - 1];
    const price = normalizeNumber(lastToken);

    if (price) {
      const name = tokens.slice(0, -1).join(' ').trim();
      // Remove common suffixes
      const cleanName = name.replace(/\s+(บาท|฿|baht)$/i, '').trim();

      if (cleanName && cleanName.length >= 2) {
        return { name: cleanName, qty: 1, price };
      }
    }
  }

  // ✅ Enhanced: Try pattern without spaces (e.g., "ขนส่ง82749" after normalization should become "ขนส่ง 82749")
  // But if normalization didn't work, try direct pattern: letters followed by digits
  const directPattern = /^([\u0E00-\u0E7FA-Za-z]+)(\d+(?:[,.]\d+)*)\s*(?:บาท|฿)?$/i;
  const directMatch = normalized.match(directPattern);
  if (directMatch) {
    const name = directMatch[1].trim();
    const price = normalizeNumber(directMatch[2]);
    if (name && price) {
      return { name, qty: 1, price };
    }
  }

  return null;
}

/**
 * Check if text is a special command
 * ✅ Enhanced to detect commands even with punctuation or extra words
 */
function isSpecialCommand(text: string): ParsedActionType | null {
  const normalized = text.trim().toLowerCase();

  // Remove trailing punctuation for command detection
  const cleaned = normalized.replace(/[.,!?。，！？]+$/, '').trim();

  if (
    cleaned === 'ออกเอกสาร' ||
    cleaned === 'ยืนยัน' ||
    cleaned === 'ยืนยันออกเอกสาร' ||
    cleaned === 'ยืนยันเอกสาร' ||
    cleaned === 'confirm' ||
    cleaned.startsWith('ออกเอกสาร')
  ) {
    return ParsedActionType.CONFIRM;
  }

  if (cleaned === 'ช่วยเหลือ' || cleaned === 'help' || cleaned === 'usage') {
    return ParsedActionType.HELP;
  }

  if (cleaned === 'เมนู' || cleaned === 'menu') {
    return ParsedActionType.MENU;
  }

  if (cleaned === 'แบบฟอร์ม' || cleaned === 'template' || cleaned === 'copy' || cleaned === 'ก๊อป') {
    return ParsedActionType.TEMPLATE;
  }

  if (cleaned === 'ลบ' || cleaned === 'undo' || cleaned === 'ย้อนกลับ' || cleaned.startsWith('ลบรายการ')) {
    return ParsedActionType.UNDO_LAST;
  }

  if (cleaned === 'เริ่มใหม่' || cleaned === 'reset' || cleaned === 'ยกเลิก') {
    return ParsedActionType.RESET;
  }

  return null;
}

/**
 * Parse forgiving input - Human-First UX
 * 
 * ✅ Enhanced with Thai input normalization
 * 
 * @param rawText - Raw user input (preserved for logging)
 * @param context - Parsing context (hasActiveDraft, hasCustomer, etc.)
 * @returns Array of parsed actions (multiple actions for multiline)
 */
export function parseForgivingInput(
  rawText: string,
  context: ParsingContext
): ParsedAction[] {
  const actions: ParsedAction[] = [];

  // ✅ Normalize Thai input (insert spaces)
  const ITEM_PREFIX = '__ITEM__ ';

  const stripLineLabels = (line: string): string => {
    let cleaned = line.replace(/^[\s•\-*]+/g, '').trim();
    if (/^\d+\)\s*/.test(cleaned)) {
      return '';
    }
    if (/^สถานะ[:：]/i.test(cleaned)) {
      return '';
    }
    if (/(ร่าง)/.test(cleaned)) {
      return '';
    }
    if (/^(พิมพ์|พร้อมแล้วพิมพ์|ตัวอย่าง|ส่งข้อมูลได้เลย|รับทราบ|รับข้อความแล้ว|รับคำสั่งแล้ว|เริ่มทำ|เริ่มได้เลย|ก๊อป-แก้-ส่ง|ตอนนี้พิมพ์ได้|บอทจะสรุป|ด๊อก|ติ๊ด|บี๊บ|หรือพิมพ์|ถ้าต้องการ|เพื่อเริ่ม|เพื่อออกเอกสาร|วิธีใช้|ใบวางบิลทำต่อจาก|ใบเสร็จทำต่อจาก|ไปต่อได้เลย|รอสักครู่|กำลังประมวลผล)/i.test(cleaned)) {
      return '';
    }
    if (/^(รายการ|ประเภทเอกสาร|หมายเหตุ|วันที่)$/i.test(cleaned)) {
      return '';
    }
    if (/^(ลูกค้า|ชื่อลูกค้า)\s*[:：]?\s*$/i.test(cleaned)) {
      return '';
    }
    if (/^(รายการ|หมายเหตุ|ประเภทเอกสาร|วันที่)\s*[:：]?\s*$/i.test(cleaned)) {
      return '';
    }
    cleaned = cleaned.replace(/^(ชื่อลูกค้า|ลูกค้า)\s*[:：]\s*/i, 'ลูกค้า ');
    cleaned = cleaned.replace(/^(รายการ)\s*[:：]\s*/i, ITEM_PREFIX);
    cleaned = cleaned.replace(/^(หมายเหตุ)\s*[:：]\s*/i, '');
    return cleaned.trim();
  };

  const normalizeOneLineInput = (input: string): string => {
    if (!/[|｜]/.test(input)) return input;
    if (/\ben\s*:/i.test(input)) return input;
    const parts = input.split(/[|｜]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return input;
    const keywordRe = /(ลูกค้า|รายการ|ประเภทเอกสาร|หมายเหตุ|วันที่|ใบเสนอราคา|ใบวางบิล|ใบเสร็จ|ทำใบ)/i;
    const score = parts.filter((p) => keywordRe.test(p) || /\d/.test(p)).length;
    return score >= 2 ? parts.join('\n') : input;
  };

  const text = normalizeThaiInput(normalizeOneLineInput(rawText.trim()));
  const cleanedText = text
    .split('\n')
    .map(stripLineLabels)
    .filter((line) => line.length > 0)
    .join('\n');

  if (!cleanedText || cleanedText.length === 0) {
    return [{ type: ParsedActionType.UNKNOWN, confidence: 0 }];
  }

  // ✅ Log both raw and normalized (for debugging, but don't expose normalized to user)
  // This will be logged by the caller (humanFirstHandler) with structured logging

  // RULE 1: Check special commands first
  const specialCommand = isSpecialCommand(cleanedText);
  if (specialCommand) {
    return [{ type: specialCommand, confidence: 1.0 }];
  }

  // ✅ CONTEXT EDIT: Check for "Edit Last Item" pattern
  // "แก้รายการเมื่อกี้เป็น...", "แก้เป็น...", "เปลี่ยนเป็น..."
  if (/^(แก้|เปลี่ยน|แก้ไข)(?:รายการ)?(?:เมื่อกี้|ล่าสุด|ที่แล้ว)?(?:เป็น)?\s*/i.test(cleanedText)) {
    // Only valid if we have items
    if (context.hasItems) {
      // Try to parse the new content: "แก้เป็น 500" -> Price only, "แก้เป็น ค่าออกแบบ 500" -> Name+Price
      const coreText = cleanedText.replace(/^(แก้|เปลี่ยน|แก้ไข)(?:รายการ)?(?:เมื่อกี้|ล่าสุด|ที่แล้ว)?(?:เป็น)?\s*/i, '').trim();

      const itemAction = parseItemLine(coreText);
      const priceOnly = normalizeNumber(coreText);

      // 1. Full item edit
      if (itemAction) {
        actions.push({
          type: ParsedActionType.EDIT_LAST_ITEM,
          confidence: 0.95,
          payload: { item: itemAction },
        });
        return actions;
      }

      // 2. Price only edit
      if (priceOnly !== null) {
        actions.push({
          type: ParsedActionType.EDIT_LAST_ITEM,
          confidence: 0.9,
          payload: { item: { name: context.lastItemName || '', qty: 1, price: priceOnly } },
        });
        return actions;
      }
    }
  }

  // ✅ MIXED SENTENCE: Check for "For Customer [Name] Item [Price]" in one go
  // Pattern: "ขอใบเสนอราคาให้[Name] [Item]" or just "[Name] [Item]"
  // This requires `hasLetters` check to succeed
  // Example: "ขอใบเสนอราคาให้คุณสมชาย ค่าทำเว็บ 50000"
  // Example: "สร้างบิลให้ ABC ค่าปูน 20 ถุง"

  // Try to find "ให้[Name]" or "สำหรับ[Name]" pattern from normalized text (space inserted by normalizeThaiInput)
  const customerInSentenceMatch = cleanedText.match(/(?:ให้|สำหรับ)\s+([^\s]+(?:[ \t][^\s]+)*?)\s+(.+)$/i);
  if (customerInSentenceMatch) {
    const customerName = customerInSentenceMatch[1].trim();
    const possibleItemText = customerInSentenceMatch[2].trim();

    // Check if the rest looks like an item
    const itemAction = parseItemLine(possibleItemText);

    if (customerName && itemAction) {
      // Found both!
      actions.push({
        type: ParsedActionType.SET_CUSTOMER_NAME,
        confidence: 0.95,
        payload: { customerName },
      });
      actions.push({
        type: ParsedActionType.ADD_ITEM,
        confidence: 0.95,
        payload: { item: itemAction },
      });

      // Check for installments in the same sentence?
      // "ค่าทำเว็บ 50000 แบ่งจ่าย 2 งวด" is inside possibleItemText?
      // parseItemLine extracts name/price, but text might have "แบ่งจ่าย..." at end
      // Let's check installments on the item part
      const installmentActions = expandInstallments(itemAction.name, itemAction.price, possibleItemText);
      if (installmentActions.length > 0) {
        // Replace the single ADD_ITEM with installments
        actions.pop(); // Remove the single item
        actions.push(...installmentActions);
      }

      return actions;
    }
  }

  const hasDigits = /\d/.test(cleanedText);
  const hasLetters = /[A-Za-z\u0E00-\u0E7F]/.test(cleanedText);
  const hasKeywords = /(ลูกค้า|เพิ่มรายการ|รายการ|ยืนยัน|ลบ|เริ่มใหม่|เมนู|ช่วยเหลือ|แบบฟอร์ม)/i.test(cleanedText);
  if (!hasDigits && !hasKeywords && !hasLetters) {
    return [{ type: ParsedActionType.UNKNOWN, confidence: 0.05 }];
  }

  // RULE 2: Split multiline
  const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length > 1) {
    // Multiline input - parse line by line
    for (const line of lines) {
      const lineActions = parseForgivingInput(line, context);
      actions.push(...lineActions);
    }
    return actions;
  }

  // Single line parsing

  // RULE 3: Phone detection
  const phone = detectPhone(cleanedText);
  if (phone) {
    actions.push({
      type: ParsedActionType.SET_PHONE,
      confidence: 0.9,
      payload: { phone },
    });
    // Continue parsing for other parts if any
    const withoutPhone = cleanedText.replace(/^(โทร|เบอร์|เบอร์โทร|tel|phone)[:：]?\s*/i, '').replace(/\d+/g, '').trim();
    if (withoutPhone && withoutPhone.length > 0) {
      const remainingActions = parseForgivingInput(withoutPhone, context);
      actions.push(...remainingActions);
    }
    return actions;
  }

  // ✅ RULE 3.5: Payment claim detection — BEFORE item parsing
  // CRITICAL: Prevents "จ่ายซื้อไปแล้ว11มีนา 20.49" from becoming a line item
  if (isPaymentClaimMessage(cleanedText)) {
    actions.push({
      type: ParsedActionType.PAYMENT_CLAIM,
      confidence: 0.95,
    });
    return actions;
  }

  // ✅ RULE 4: Item detection - "คำ + ตัวเลข" (now handles unspaced forms after normalization)
  const hasAddItemPrefix = /^เพิ่มรายการ\s+/i.test(cleanedText);
  const strippedAddItem = hasAddItemPrefix
    ? cleanedText.replace(/^เพิ่มรายการ\s+/i, '').trim()
    : cleanedText;

  const isItemLabeled = strippedAddItem.startsWith(ITEM_PREFIX);
  const itemCandidate = isItemLabeled
    ? strippedAddItem.replace(ITEM_PREFIX, '').trim()
    : strippedAddItem;

  // ✅ PRE-PROCESSING: Extract suffixes (Installments) before parsing item
  // This allows "Name Price Installment" to work by stripping Installment first
  let cleanedItemCandidate = itemCandidate;
  let pendingInstallment: { total: number } | null = null;

  const installmentMatch = itemCandidate.match(/\s+แบ่งจ่าย\s*(\d+)\s*งวด/i);
  if (installmentMatch) {
    const total = parseInt(installmentMatch[1], 10);
    if (!isNaN(total) && total >= 2) {
      pendingInstallment = { total };
      // Remove from candidates
      cleanedItemCandidate = itemCandidate.replace(installmentMatch[0], '').trim();
    }
  }

  if (isItemLabeled) {
    const labeledItem = parseItemLine(cleanedItemCandidate);
    if (labeledItem) {
      // ✅ Check for installments (using extracted info)
      if (pendingInstallment) {
        const textForExpansion = `แบ่งจ่าย ${pendingInstallment.total} งวด`;
        const installmentActions = expandInstallments(labeledItem.name, labeledItem.price, textForExpansion);
        if (installmentActions.length > 0) {
          actions.push(...installmentActions);
          return actions;
        }
      }

      actions.push({
        type: ParsedActionType.ADD_ITEM,
        confidence: 0.9,
        payload: { item: labeledItem },
      });
      return actions;
    }

    if (cleanedItemCandidate.length >= 2) {
      actions.push({
        type: ParsedActionType.MISSING_ITEM_PRICE,
        confidence: 0.8,
        payload: { item: { name: cleanedItemCandidate, qty: 1, price: 0 } },
      });
      return actions;
    }
  }

  const item = parseItemLine(cleanedItemCandidate);
  if (item) {
    // ✅ Check for installments (using extracted info)
    if (pendingInstallment) {
      const textForExpansion = `แบ่งจ่าย ${pendingInstallment.total} งวด`;
      const installmentActions = expandInstallments(item.name, item.price, textForExpansion);
      if (installmentActions.length > 0) {
        actions.push(...installmentActions);
        return actions;
      }
    } else {
      // Fallback logic
      const installmentActions = expandInstallments(item.name, item.price, itemCandidate);
      if (installmentActions.length > 0) {
        actions.push(...installmentActions);
        return actions;
      }
    }

    actions.push({
      type: ParsedActionType.ADD_ITEM,
      confidence: 0.85,
      payload: { item },
    });
    return actions;
  }


  // ✅ RULE 5: Customer detection - "ลูกค้า<name>" now works after normalization
  // Check if starts with "ลูกค้า" keyword (after normalization, should have space)
  const customerMatch = cleanedText.match(/^ลูกค้า\s+(.+)$/i);
  if (customerMatch) {
    const customerName = customerMatch[1].trim();
    if (customerName && customerName.length >= 2) {
      actions.push({
        type: ParsedActionType.SET_CUSTOMER_NAME,
        confidence: 0.9,
        payload: { customerName },
      });
      return actions;
    }
  }

  // RULE 6: No digits but has customer already → likely missing item price
  if (!hasDigits && context.hasCustomer && cleanedText.length >= 2) {
    const isGreeting = /^(สวัสดี|ขอบคุณ|โอเค|ok|ครับ|ค่ะ|yes|no)$/i.test(cleanedText);
    const isCommand = /^(เพิ่ม(?:รายการ)?|แก้(?:ไข)?(?:รายการ)?|ลบ(?:รายการ)?|ยืนยัน|ออก|เริ่ม|เติมเครดิต|เครดิต|ซื้อแพ็ค|แพ็ค|แพ็ก|สถานะแพ็ค|เช็คสลิป|ตรวจสลิป|เมนู|ช่วยเหลือ|แบบฟอร์ม|รายงาน|เอกสารล่าสุด|ตั้งค่า|ตั้งค่าธุรกิจ|เชื่อมต่อ|คูปอง|แนะนำเพื่อน|เชิญทีม|เข้ที?ม|ออกครบชุด|ใบวางบิล|ใบเสร็จ|ใบเสนอราคา|ธีม|รายงานปัญหา|บริการขายดี|ลูกค้ายอดสูง|บิลค้าง|รายการ|หมายเหตุ|ประเภทเอกสาร|วันที่|ชื่อลูกค้า|จ่ายเงินสด|จ่ายสด|ชำระเงินสด|เงินสด|โอนเงิน|พร้อมเพย์|promptpay|บัตรเครดิต)$/i.test(cleanedText);
    if (!isCommand && !isGreeting) {
      actions.push({
        type: ParsedActionType.MISSING_ITEM_PRICE,
        confidence: 0.7,
        payload: { item: { name: cleanedText, qty: 1, price: 0 } },
      });
      return actions;
    }
  }

  // RULE 7: Pure short text (<50 char, no digits) → customer name
  if (!hasDigits && cleanedText.length < 50 && cleanedText.length >= 2) {
    // Check if it looks like a name (not a command or casual word)
    const isCommand = /^(เพิ่ม(?:รายการ)?|แก้(?:ไข)?(?:รายการ)?|ลบ(?:รายการ)?|ยืนยัน|ออก|เริ่ม|เติมเครดิต|เครดิต|ซื้อแพ็ค|แพ็ค|แพ็ก|สถานะแพ็ค|เช็คสลิป|ตรวจสลิป|เมนู|ช่วยเหลือ|แบบฟอร์ม|รายงาน|เอกสารล่าสุด|ตั้งค่า|ตั้งค่าธุรกิจ|เชื่อมต่อ|คูปอง|แนะนำเพื่อน|เชิญทีม|เข้ที?ม|ออกครบชุด|ใบวางบิล|ใบเสร็จ|ใบเสนอราคา|ธีม|รายงานปัญหา|บริการขายดี|ลูกค้ายอดสูง|บิลค้าง|รายการ|หมายเหตุ|ประเภทเอกสาร|วันที่|ชื่อลูกค้า|จ่ายเงินสด|จ่ายสด|ชำระเงินสด|เงินสด|โอนเงิน|พร้อมเพย์|promptpay|บัตรเครดิต)$/i.test(cleanedText);
    // ✅ Stopword list: common Thai/English casual words that are NOT customer names
    const isCasualWord = /^(โอเค|โอเค็|โอ?เค|ดี|ได้|เข้าใจ|ขอบคุณ|สวัสดี|ok|okay|yes|no|ครับ|ค่ะ|คะ|จ้า|จ้ะ|นะ|นะครับ|นะคะ|ดีครับ|ดีค่ะ|ได้ครับ|ได้ค่ะ|ไม่|ไม่ใช่|ใช่|หิว|อิ่ม|ง่วง|เหนื่อย|ว่าง|ยุ่ง|ไม่ว่าง|ชอบ|ไม่ชอบ|เบื่อ|สนุก|ดีจ้า|โอเคครับ|โอเคค่ะ|ไม่เป็นไร|เฉยๆ|งง|ไม่รู้|ไม่ทราบ|hi|hello|hey|thanks|thank you|bye|good|bad|fine|cool|nice|great|wow|lol|อะไร|ทำไม|ยังไง|ที่ไหน|เมื่อไหร่|หิวข้าว|กินข้าว|ไปไหน|ทำอะไร|อะไรนะ|อ้อ|เออ|อืม|หา|อ๋อ|555|hhh|haha|รู้แล้ว|เข้าใจแล้ว|โอเคเลย|บันทึกรายจ่าย|บันทึกค่าใช้จ่าย|ขอบคุณครับ|ขอบคุณค่ะ|ขอบคุณนะ|ขอบคุณมาก)$/i.test(cleanedText);
    if (!isCommand && !isCasualWord) {
      actions.push({
        type: ParsedActionType.SET_CUSTOMER_NAME,
        confidence: 0.7,
        payload: { customerName: cleanedText },
      });
      return actions;
    }
  }

  // RULE 7: Price-only number
  const priceOnly = normalizeNumber(cleanedText);
  if (priceOnly !== null && cleanedText.trim().replace(/[^\d,.\s]/g, '').trim() === cleanedText.trim().replace(/\s/g, '')) {
    // If we have context (last item name), this is likely a price
    if (context.lastItemName) {
      actions.push({
        type: ParsedActionType.SET_PENDING_PRICE,
        confidence: 0.6,
        payload: { item: { name: context.lastItemName, qty: 1, price: priceOnly } },
      });
    } else {
      // Price-only without context - lower confidence
      actions.push({
        type: ParsedActionType.SET_PENDING_PRICE,
        confidence: 0.4,
        payload: { item: { name: '', qty: 1, price: priceOnly } },
      });
    }
    return actions;
  }

  // Fallback: UNKNOWN
  return [{ type: ParsedActionType.UNKNOWN, confidence: 0.1 }];
}
