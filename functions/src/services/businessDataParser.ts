/**
 * Business Data Parser
 * 
 * Forgiving parser for business setup data
 * 
 * RULES:
 * - Keyword-based matching (not position-based)
 * - Recognizes synonyms (ชื่อธุรกิจ, ชื่อร้าน, business name, บริษัท)
 * - Ignores numbering (1., 2), -)
 * - Ignores extra text
 * - Missing field = null (not error)
 * - Never rejects input
 * - Never blames user
 */

/**
 * Parsed business data
 * Compatible with BusinessData but allows null for missing fields
 */
export interface ParsedBusinessData {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  taxId?: string | null;
  email?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankAccountName?: string | null;
}

export const CLEAR_TOKEN = '__CLEAR__';

/**
 * Keywords for each field (case-insensitive matching)
 */
const FIELD_KEYWORDS: Record<keyof ParsedBusinessData, string[]> = {
  name: [
    'ชื่อธุรกิจ',
    'ชื่อร้าน',
    'business name',
    'บริษัท',
    'ชื่อ',
    'company name',
    'ร้าน',
    'shop name',
  ],
  address: [
    'ที่อยู่',
    'address',
    'ที่ตั้ง',
    'location',
    'ที่อยู่บริษัท',
    'ที่อยู่ร้าน',
  ],
  phone: [
    'เบอร์โทร',
    'phone',
    'โทร',
    'tel',
    'telephone',
    'เบอร์',
    'เบอร์โทรศัพท์',
    'contact',
  ],
  taxId: [
    'เลขผู้เสียภาษี',
    'tax id',
    'taxid',
    'เลขภาษี',
    'tax number',
    'เลขประจำตัวผู้เสียภาษี',
    'vat id',
  ],
  email: [
    'อีเมล',
    'email',
    'e-mail',
    'อีเมล์',
    'mail',
  ],
  bankName: [
    'ธนาคาร',
    'bank',
    'bank name',
  ],
  bankAccountNo: [
    'เลขบัญชี',
    'account no',
    'account number',
    'เลขที่บัญชี',
    'บัญชี',
  ],
  bankAccountName: [
    'ชื่อบัญชี',
    'account name',
    'ชื่อบัญชีธนาคาร',
  ],
};

/**
 * Normalize text for matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[：]/g, ':')
    .replace(/\s+/g, ' ')
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s:-]/g, ''); // Keep Thai, English, numbers, spaces, colons, hyphen
}

function sanitizeInput(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[：]/g, ':');
}

function isClearValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  return [
    '-',
    '--',
    'ลบ',
    'ล้าง',
    'clear',
    'none',
    'n/a',
    'na',
    'ไม่ใช้',
    'ไม่ต้อง',
  ].includes(v);
}

/**
 * Extract value after keyword
 * 
 * CRITICAL: Forgiving parsing - accepts multiple formats
 */
function extractValueAfterKeyword(
  text: string,
  keywords: string[]
): string | null {
  const normalized = normalizeText(text);
  
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    
    // Try multiple patterns (forgiving)
    // Pattern 1: "keyword: value" (with colon)
    // Pattern 2: "keyword value" (space-separated)
    // Pattern 3: "keyword\nvalue" (newline-separated)
    // Pattern 4: "keywordvalue" (no separator, but value starts with different char)
    const patterns = [
      // "keyword: value" or "keyword： value" (Thai/English colon)
      new RegExp(`${normalizedKeyword}\\s*[:：]\\s*(.+?)(?=\\n|$|ชื่อ|ที่อยู่|เบอร์|เลข|อีเมล|business|address|phone|tax|email)`, 'i'),
      // "keyword value" (space-separated, stop at next keyword or end)
      new RegExp(`${normalizedKeyword}\\s+(.+?)(?=\\n|$|ชื่อ|ที่อยู่|เบอร์|เลข|อีเมล|business|address|phone|tax|email)`, 'i'),
      // "keyword\nvalue" (newline-separated)
      new RegExp(`${normalizedKeyword}\\s*\\n\\s*(.+?)(?=\\n|$|ชื่อ|ที่อยู่|เบอร์|เลข|อีเมล|business|address|phone|tax|email)`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        let value = match[1].trim();
        
        // Clean up value
        // Remove leading colon if present
        value = value.replace(/^[:：]\s*/, '');
        // Remove trailing separators
        value = value.replace(/[━─\-=]+$/, '').trim();
        
        if (value.length > 0 && value !== normalizedKeyword) {
          if (isClearValue(value)) {
            return CLEAR_TOKEN;
          }
          return value;
        }
      }
    }
  }
  
  return null;
}

/**
 * Parse business data from user input
 * 
 * Accepts any format:
 * - Template with labels
 * - Numbered list
 * - Free text with keywords
 * - Mixed Thai/English
 */
export function parseBusinessData(input: string): ParsedBusinessData {
  const result: ParsedBusinessData = {
    name: null,
    address: null,
    phone: null,
    taxId: null,
    email: null,
    bankName: null,
    bankAccountNo: null,
    bankAccountName: null,
  };
  
  // Normalize input - remove numbering, extra whitespace, separators
  // CRITICAL: Be very forgiving - strip everything that's not data
  const sanitizedInput = sanitizeInput(input);
  const lines = sanitizedInput
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const lineHasColon = (line: string): boolean => line.includes(':');
  const allHaveColon = lines.length > 0 && lines.every(lineHasColon);
  const normalizedInput =
    lines.length > 1 && !allHaveColon
      ? lines.map((l) => l.replace(/:/g, '')).join('\n')
      : sanitizedInput;

  const normalized = normalizedInput
    .replace(/^\d+[.)]\s*/gm, '') // Remove "1. ", "2) "
    .replace(/^[-•●○]\s*/gm, '') // Remove "- ", "• ", "● ", "○ "
    .replace(/^[━─=─]+$/gm, '') // Remove separator lines (━━━━━━━━━━━━━━)
    .replace(/^\s*[━─=─]+\s*$/gm, '') // Remove separator lines with spaces
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .replace(/^\s*ข้อมูลธุรกิจ.*$/gmi, '') // Remove "ข้อมูลธุรกิจของฉัน:" etc
    .replace(/^\s*สวัสดี.*$/gmi, '') // Remove greetings
    .replace(/^\s*ขอบคุณ.*$/gmi, '') // Remove thank you messages
    .replace(/^\s*ได้เลยค่ะ.*$/gmi, '')
    .replace(/^\s*กรุณาก๊อปปี้.*$/gmi, '')
    .replace(/^\s*แล้วแก้ไขข้อมูลของคุณแทนที่ได้เลยค่ะ.*$/gmi, '')
    .replace(/^\s*เมื่อแก้ไขเสร็จ.*$/gmi, '')
    .trim();
  
  // Try to extract each field
  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    const value = extractValueAfterKeyword(normalized, keywords);
    if (value) {
      // Clean up value
      const cleaned = value
        .replace(/^[:：]\s*/, '') // Remove leading colon
        .trim();

      if (cleaned.length > 0) {
        result[field as keyof ParsedBusinessData] = cleaned === CLEAR_TOKEN ? CLEAR_TOKEN : cleaned;
      }
    }
  }
  
  // Special handling for phone (extract numbers)
  if (result.phone) {
    // Extract phone number (Thai format: 08xxxxxxxx or 0x-xxx-xxxx)
    const phoneMatch = result.phone.match(/0\d{1,2}[\s-]?\d{3}[\s-]?\d{4}/);
    if (phoneMatch) {
      result.phone = phoneMatch[0].replace(/[\s-]/g, '');
    }
  }
  
  // Special handling for email (validate format)
  if (result.email) {
    const emailMatch = result.email.match(/[^\s<>]+@[^\s<>]+\.[^\s<>]+/);
    if (emailMatch) {
      result.email = emailMatch[0];
    } else {
      // If doesn't look like email, set to null
      result.email = null;
    }
  }
  
  // Special handling for tax ID (extract numbers)
  if (result.taxId) {
    // Extract tax ID (Thai format: 13 digits)
    const taxIdMatch = result.taxId.match(/\d{13}/);
    if (taxIdMatch) {
      result.taxId = taxIdMatch[0];
    } else {
      // Try shorter format
      const shortMatch = result.taxId.match(/\d{9,13}/);
      if (shortMatch) {
        result.taxId = shortMatch[0];
      }
    }
  }

  // Special handling for bank account number (extract digits only)
  if (result.bankAccountNo) {
    const digits = result.bankAccountNo.replace(/[^\d]/g, '');
    result.bankAccountNo = digits.length > 0 ? digits : result.bankAccountNo.trim();
  }
  
  return result;
}

/**
 * Validate parsed data (check required fields)
 */
export function validateBusinessData(parsed: ParsedBusinessData): {
  valid: boolean;
  missingFields: string[];
} {
  const required: (keyof ParsedBusinessData)[] = ['name', 'address', 'phone'];
  const missingFields: string[] = [];
  
  for (const field of required) {
    if (!parsed[field] || parsed[field]!.trim().length === 0) {
      const fieldNames: Record<string, string> = {
        name: 'ชื่อธุรกิจ',
        address: 'ที่อยู่',
        phone: 'เบอร์โทร',
      };
      missingFields.push(fieldNames[field] || field);
    }
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
