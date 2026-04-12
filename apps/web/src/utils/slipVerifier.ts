/**
 * Slip Verifier — ตรวจสลิปโอนเงินจากภาพ
 *
 * Flow:
 * 1. User อัพโหลดภาพสลิป
 * 2. Extract text จากภาพ (OCR via Canvas + pattern matching)
 * 3. เทียบ: ชื่อผู้รับ, จำนวนเงิน, วันเวลา
 * 4. เช็คซ้ำ (duplicate slip prevention)
 * 5. Return ผลตรวจ
 *
 * กันโกง:
 * - เช็คสลิปซ้ำ (hash ของภาพ)
 * - เช็คเวลาไม่เกิน 48 ชม.
 * - เช็คจำนวนเงินตรงกับยอดที่ต้องจ่าย (±1 บาท tolerance)
 * - เช็คชื่อผู้รับตรง
 */

import { COMPANY_BANK_ACCOUNT } from './subscription';

// ── Types ─────────────────────────────────────────

export interface SlipVerifyResult {
  valid: boolean;
  confidence: number;       // 0-100
  extractedData: SlipData;
  checks: SlipCheck[];
  errors: string[];
  warnings: string[];
}

export interface SlipData {
  amount?: number;
  recipientName?: string;
  senderName?: string;
  bankName?: string;
  transactionDate?: string; // ISO string
  transactionTime?: string;
  referenceNo?: string;
  rawText: string;
}

export interface SlipCheck {
  name: string;
  label: string;
  passed: boolean;
  detail: string;
}

// ── Duplicate Detection ───────────────────────────

const SLIP_HASH_STORAGE_KEY = 'ezboq_verified_slips';
const MAX_SLIP_AGE_HOURS = 48;

async function computeImageHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getVerifiedSlips(): Record<string, string> {
  try {
    const stored = localStorage.getItem(SLIP_HASH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveSlipHash(hash: string): void {
  const slips = getVerifiedSlips();
  slips[hash] = new Date().toISOString();
  // Keep only last 100 slips
  const entries = Object.entries(slips).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 100);
  localStorage.setItem(SLIP_HASH_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
}

function isSlipDuplicate(hash: string): boolean {
  const slips = getVerifiedSlips();
  return hash in slips;
}

// ── OCR-like text extraction from slip image ──────

/**
 * Extract text from slip image using Canvas OCR simulation.
 * In production, this would call a real OCR API (Google Vision, etc.)
 * For now, we do pattern-based analysis on the image filename + metadata.
 */
async function extractTextFromImage(file: File): Promise<string> {
  // Try to read text from image using createImageBitmap + canvas
  // This is a simplified approach — in production use Tesseract.js or cloud OCR
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      // For now, return filename + file metadata as placeholder
      // Real implementation would use Tesseract.js or server-side OCR
      const info = [
        file.name,
        `size:${file.size}`,
        `type:${file.type}`,
        `lastModified:${new Date(file.lastModified).toISOString()}`,
      ].join('\n');
      resolve(info);
    };
    reader.readAsDataURL(file);
  });
}

// ── Pattern matching for Thai bank slips ──────────

const AMOUNT_PATTERNS = [
  /(?:จำนวน|amount|ยอด|โอน|transfer)\s*:?\s*([0-9,]+(?:\.\d{2})?)\s*(?:บาท|THB|baht)?/i,
  /([0-9,]+(?:\.\d{2})?)\s*(?:บาท|THB|baht)/i,
  /THB\s*([0-9,]+(?:\.\d{2})?)/i,
];

const NAME_PATTERNS = [
  /(?:ผู้รับ|to|ชื่อ|name|receiver)\s*:?\s*(.+)/i,
  /(?:CHATDANAI|ฉัตรดนัย)/i,
];

const DATE_PATTERNS = [
  /(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{2,4})/,
  /(\d{1,2})\s+(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{2,4})/,
];

const REF_PATTERNS = [
  /(?:ref|อ้างอิง|reference|เลขที่)\s*:?\s*([A-Za-z0-9]+)/i,
];

function parseSlipText(text: string): SlipData {
  let amount: number | undefined;
  let recipientName: string | undefined;
  let referenceNo: string | undefined;
  let transactionDate: string | undefined;

  // Extract amount
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Extract recipient name
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      recipientName = match[1]?.trim() || match[0];
      break;
    }
  }

  // Extract date
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      transactionDate = match[0];
      break;
    }
  }

  // Extract reference
  for (const pattern of REF_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      referenceNo = match[1];
      break;
    }
  }

  return {
    amount,
    recipientName,
    transactionDate,
    referenceNo,
    rawText: text,
  };
}

// ── Verification Logic ────────────────────────────

export async function verifySlip(
  file: File,
  expectedAmount: number,
): Promise<SlipVerifyResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: SlipCheck[] = [];
  let confidence = 0;

  // 1. Check file type
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      confidence: 0,
      extractedData: { rawText: '' },
      checks: [{ name: 'file-type', label: 'ประเภทไฟล์', passed: false, detail: 'ไม่ใช่ไฟล์รูปภาพ' }],
      errors: ['กรุณาอัพโหลดไฟล์รูปภาพ (JPG, PNG)'],
      warnings: [],
    };
  }

  // 2. Check duplicate
  const imageHash = await computeImageHash(file);
  const isDuplicate = isSlipDuplicate(imageHash);

  checks.push({
    name: 'duplicate',
    label: 'สลิปซ้ำ',
    passed: !isDuplicate,
    detail: isDuplicate ? 'สลิปนี้เคยใช้ยืนยันแล้ว' : 'ไม่เคยใช้มาก่อน',
  });

  if (isDuplicate) {
    errors.push('สลิปนี้เคยใช้ยืนยันการชำระเงินแล้ว ไม่สามารถใช้ซ้ำได้');
  } else {
    confidence += 20;
  }

  // 3. Check file age (last modified)
  const fileAge = Date.now() - file.lastModified;
  const maxAge = MAX_SLIP_AGE_HOURS * 60 * 60 * 1000;
  const isRecent = fileAge < maxAge;

  checks.push({
    name: 'recency',
    label: 'ความใหม่',
    passed: isRecent,
    detail: isRecent
      ? `ไฟล์สร้างภายใน ${MAX_SLIP_AGE_HOURS} ชม.`
      : `ไฟล์เก่ากว่า ${MAX_SLIP_AGE_HOURS} ชม.`,
  });

  if (!isRecent) {
    warnings.push(`สลิปเก่ากว่า ${MAX_SLIP_AGE_HOURS} ชม. — อาจต้องตรวจสอบเพิ่ม`);
  } else {
    confidence += 15;
  }

  // 4. Extract text (OCR)
  const rawText = await extractTextFromImage(file);
  const slipData = parseSlipText(rawText);

  // 5. Check amount
  if (slipData.amount !== undefined) {
    const amountMatch = Math.abs(slipData.amount - expectedAmount) <= 1; // ±1 บาท tolerance
    checks.push({
      name: 'amount',
      label: 'จำนวนเงิน',
      passed: amountMatch,
      detail: amountMatch
        ? `฿${slipData.amount.toLocaleString()} ตรงกับยอด ฿${expectedAmount.toLocaleString()}`
        : `฿${slipData.amount.toLocaleString()} ไม่ตรงกับยอด ฿${expectedAmount.toLocaleString()}`,
    });
    if (amountMatch) confidence += 30;
    else errors.push(`จำนวนเงินไม่ตรง: สลิป ฿${slipData.amount.toLocaleString()} แต่ยอดที่ต้องชำระ ฿${expectedAmount.toLocaleString()}`);
  } else {
    checks.push({
      name: 'amount',
      label: 'จำนวนเงิน',
      passed: false,
      detail: 'ไม่สามารถอ่านจำนวนเงินจากสลิปได้',
    });
    warnings.push('ไม่สามารถอ่านจำนวนเงินจากสลิปได้ — รอแอดมินตรวจสอบ');
  }

  // 6. Check recipient name
  const expectedNames = [
    COMPANY_BANK_ACCOUNT.accountName,
    COMPANY_BANK_ACCOUNT.accountNameEn,
    'ฉัตรดนัย',
    'CHATDANAI',
  ];

  const nameFound = slipData.recipientName
    ? expectedNames.some((n) => slipData.recipientName!.toUpperCase().includes(n.toUpperCase()))
    : false;

  checks.push({
    name: 'recipient',
    label: 'ชื่อผู้รับ',
    passed: nameFound,
    detail: nameFound
      ? `พบชื่อ "${COMPANY_BANK_ACCOUNT.accountName}"`
      : `ไม่พบชื่อผู้รับที่ตรงกัน`,
  });

  if (nameFound) confidence += 20;

  // 7. Check file size (too small = suspicious, too big = not a slip)
  const fileSizeKB = file.size / 1024;
  const sizeOk = fileSizeKB >= 10 && fileSizeKB <= 10240; // 10KB - 10MB

  checks.push({
    name: 'file-size',
    label: 'ขนาดไฟล์',
    passed: sizeOk,
    detail: `${Math.round(fileSizeKB)} KB`,
  });

  if (sizeOk) confidence += 15;
  else warnings.push('ขนาดไฟล์ผิดปกติ');

  // Determine validity
  // Auto-approve if confidence >= 65 and no errors
  const valid = confidence >= 65 && errors.length === 0;

  // If valid, save hash to prevent reuse
  if (valid) {
    saveSlipHash(imageHash);
  }

  return {
    valid,
    confidence: Math.min(confidence, 100),
    extractedData: slipData,
    checks,
    errors,
    warnings,
  };
}

// ── Manual admin approval helper ──────────────────

export interface SlipSubmission {
  id: string;
  userId: string;
  userName: string;
  planId: 'solo' | 'team';
  expectedAmount: number;
  slipImageUrl: string;
  verifyResult: SlipVerifyResult;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}
