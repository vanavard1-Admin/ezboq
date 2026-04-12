import { getDb } from './firebaseAdmin';
/**
 * EzDoc - Business Settings Service
 *
 * Handles LINE commands for configuring business profile and payment settings.
 * Settings are stored in:
 * - Business profile: users/{uid}/businesses/{bid}
 * - Payment settings: users/{uid}/businesses/{bid}/settings/payment
 * - Document terms: users/{uid}/businesses/{bid}/settings/terms
 */

import * as admin from 'firebase-admin';
import { getPromptPayLogoUrl } from '../shared/paymentAssets';

const SETTINGS_SUMMARY_TTL_MS = 15000;
const settingsSummaryCache = new Map<string, { expiresAt: number; value: string }>();

const getSettingsSummaryCacheKey = (userId: string, businessId: string): string =>
  `${userId}:${businessId}`;

const getCachedSettingsSummary = (key: string): string | null => {
  const entry = settingsSummaryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    settingsSummaryCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCachedSettingsSummary = (key: string, value: string): void => {
  settingsSummaryCache.set(key, { value, expiresAt: Date.now() + SETTINGS_SUMMARY_TTL_MS });
};
import { getBankByCode } from '../services/bankMasterService';

const db = getDb();

/**
 * Settings command types
 */
type SettingsType =
  | 'BUSINESS_NAME'
  | 'ADDRESS'
  | 'TAX_ID'
  | 'PHONE'
  | 'EMAIL'
  | 'PROMPTPAY'
  | 'BANK'
  | 'SIGNATURE'
  | 'STAMP'
  | 'SIGNATORY'
  | 'TERMS_QUO'
  | 'TERMS_INVOICE'
  | 'TERMS_RECEIPT'
  | 'THEME'
  | 'THEME_DOC'
  | 'THEME_HELP'
  | 'SHOW'
  | 'HELP'
  | 'FORM_TEMPLATE'
  | 'FORM_SUBMIT'
  | null;

/**
 * Get business form template (copy-paste ready)
 */
export function getBusinessFormTemplate(): string {
  return `บี๊บ! ตั้งค่าธุรกิจแบบฟอร์ม

คัดลอกฟอร์มด้านล่าง ใส่ข้อมูล แล้วส่งกลับมา:

ชื่อธุรกิจ: ...
ที่อยู่: ...
เลขผู้เสียภาษี: ...
โทร: ...
อีเมล: ...
ธนาคาร: ...
เลขบัญชี: ...
ชื่อบัญชี: ...
พร้อมเพย์: ...

(แนบรูปโลโก้/ลายเซ็น/ตราประทับได้ ส่งรูป แล้วพิมพ์ โลโก้ / ลายเซ็น / ตราประทับ)`;
}

/**
 * Parse multiline business form
 * Tolerant of spaces, colons, Thai/English variants
 */
export function parseBusinessForm(multilineText: string): {
  name?: string;
  address?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  bank?: string;
  bankAccount?: string;
  bankAccountName?: string;
  promptpay?: string;
} {
  const result: {
    name?: string;
    address?: string;
    taxId?: string;
    phone?: string;
    email?: string;
    bank?: string;
    bankAccount?: string;
    bankAccountName?: string;
    promptpay?: string;
  } = {};

  // Normalize line breaks
  const lines = multilineText.split(/\r?\n/).map(line => line.trim()).filter(line => line);

  for (const line of lines) {
    // Try to match key-value patterns
    // Patterns: "key: value", "key - value", "key value" (if key is short)

    // Name patterns
    if (/^(?:ชื่อธุรกิจ|ชื่อ|business name|name)[:：\s-]+(.+)$/i.test(line)) {
      const match = line.match(/^(?:ชื่อธุรกิจ|ชื่อ|business name|name)[:：\s-]+(.+)$/i);
      if (match) result.name = match[1].trim();
      continue;
    }

    // Address patterns
    if (/^(?:ที่อยู่|ที่อยู่ธุรกิจ|address)[:：\s-]+(.+)$/i.test(line)) {
      const match = line.match(/^(?:ที่อยู่|ที่อยู่ธุรกิจ|address)[:：\s-]+(.+)$/i);
      if (match) result.address = match[1].trim();
      continue;
    }

    // Tax ID patterns
    if (/^(?:เลขผู้เสียภาษี|เลขภาษี|tax id|taxid|tin)[:：\s-]+(.+)$/i.test(line)) {
      const match = line.match(/^(?:เลขผู้เสียภาษี|เลขภาษี|tax id|taxid|tin)[:：\s-]+(.+)$/i);
      if (match) result.taxId = match[1].trim();
      continue;
    }

    // Phone patterns
    if (/^(?:โทร|เบอร์โทร|phone|tel)[:：\s-]+(.+)$/i.test(line)) {
      const match = line.match(/^(?:โทร|เบอร์โทร|phone|tel)[:：\s-]+(.+)$/i);
      if (match) {
        // Normalize phone (remove hyphens, spaces)
        result.phone = match[1].trim().replace(/[\s-]/g, '');
      }
      continue;
    }

    // Email patterns
    if (/^(?:อีเมล|email)[:：\s-]+(.+)$/i.test(line)) {
      const match = line.match(/^(?:อีเมล|email)[:：\s-]+(.+)$/i);
      if (match) result.email = match[1].trim();
      continue;
    }

    // Bank patterns (simple - just bank name)
    if (/^(?:ธนาคาร|bank)[:：\s-]+(.+)$/i.test(line)) {
      const match = line.match(/^(?:ธนาคาร|bank)[:：\s-]+(.+)$/i);
      if (match) result.bank = match[1].trim();
      continue;
    }

    // Bank account patterns
    if (/^(?:เลขบัญชี|เลขที่บัญชี|account|acc)[:：\s-]+(.+)$/i.test(line)) {
      const match = line.match(/^(?:เลขบัญชี|เลขที่บัญชี|account|acc)[:：\s-]+(.+)$/i);
      if (match) {
        // Normalize account (remove hyphens, spaces)
        result.bankAccount = match[1].trim().replace(/[\s-]/g, '');
      }
      continue;
    }

    // Bank account name patterns
    if (/^(?:ชื่อบัญชี|account name)[:：\s-]+(.+)$/i.test(line)) {
      const match = line.match(/^(?:ชื่อบัญชี|account name)[:：\s-]+(.+)$/i);
      if (match) result.bankAccountName = match[1].trim();
      continue;
    }

    // PromptPay patterns
    if (/^(?:พร้อมเพย์|promptpay)[:：\s-]+(.+)$/i.test(line)) {
      const match = line.match(/^(?:พร้อมเพย์|promptpay)[:：\s-]+(.+)$/i);
      if (match) {
        // Normalize promptpay (remove hyphens, spaces)
        result.promptpay = match[1].trim().replace(/[\s-]/g, '');
      }
      continue;
    }
  }

  return result;
}

/**
 * Apply business form data to profile
 */
export async function applyBusinessForm(
  userId: string,
  businessId: string,
  formData: ReturnType<typeof parseBusinessForm>
): Promise<{ saved: number; summary: string }> {
  let saved = 0;
  const bizRef = db.doc(`users/${userId}/businesses/${businessId}`);
  const updates: Record<string, string> = {};

  if (formData.name) {
    updates.name = formData.name;
    saved++;
  }
  if (formData.address) {
    updates.address = formData.address;
    saved++;
  }
  if (formData.taxId) {
    updates.taxId = formData.taxId;
    saved++;
  }
  if (formData.phone) {
    updates.phone = formData.phone;
    saved++;
  }
  if (formData.email) {
    updates.email = formData.email;
    saved++;
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp() as any;
    await bizRef.set(updates, { merge: true });
  }

  // Handle payment settings
  if (formData.promptpay) {
    await setPromptPay(userId, businessId, formData.promptpay);
    saved++;
  }

  if (formData.bank && formData.bankAccount && formData.bankAccountName) {
    // Bank will be handled separately (requires bank code mapping)
    // For now, just note it
    saved += 3;
  }

  // Get summary
  const summary = await getSettingsSummary(userId, businessId);

  return { saved, summary };
}

/**
 * Parse settings command from LINE message
 */
export function parseSettingsCommand(message: string): {
  type: SettingsType;
  value?: string;
  bankCode?: string;
  bankAccount?: string;
  bankAccountName?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  docType?: 'QUO' | 'BILL' | 'RECEIPT';
  formData?: ReturnType<typeof parseBusinessForm>;
} {
  const text = message.trim();

  // ตั้งค่าธุรกิจแบบฟอร์ม (show template)
  if (/^ตั้งค่าธุรกิจแบบฟอร์ม$/i.test(text)) {
    return { type: 'FORM_TEMPLATE' };
  }

  // Multiline form submission (starts with "ชื่อธุรกิจ:" or similar)
  if (text.includes('\n') && /^(?:ชื่อธุรกิจ|ชื่อ|business name|name)[:：\s-]/i.test(text)) {
    const formData = parseBusinessForm(text);
    if (Object.keys(formData).length > 0) {
      return { type: 'FORM_SUBMIT', formData };
    }
  }

  // ตั้งค่าธุรกิจ (show current settings or help)
  if (/^ตั้งค่าธุรกิจ$/i.test(text)) {
    return { type: 'SHOW' };
  }

  // ชื่อธุรกิจ <value> (tolerant: allow colon, extra spaces)
  const nameMatch = text.match(/^(?:ตั้งค่าธุรกิจ\s+ชื่อ|ชื่อธุรกิจ)[:：\s-]+(.+)$/i);
  if (nameMatch) {
    return { type: 'BUSINESS_NAME', value: nameMatch[1].trim() };
  }

  // ที่อยู่ <value> (tolerant)
  const addressMatch = text.match(/^(?:ตั้งค่าธุรกิจ\s+ที่อยู่|ที่อยู่ธุรกิจ|ที่อยู่)[:：\s-]+(.+)$/i);
  if (addressMatch) {
    return { type: 'ADDRESS', value: addressMatch[1].trim() };
  }

  // เลขผู้เสียภาษี <value> (tolerant: allow "เลขภาษี", "Tax ID", etc.)
  const taxMatch = text.match(/^(?:เลขผู้เสียภาษี|เลขภาษี|tax\s*id|taxid|tin)[:：\s-]+(.+)$/i);
  if (taxMatch) {
    return { type: 'TAX_ID', value: taxMatch[1].trim() };
  }

  // โทร <value> (tolerant: allow hyphens in phone)
  const phoneMatch = text.match(/^(?:โทร|เบอร์โทร|phone|tel)[:：\s-]+(.+)$/i);
  if (phoneMatch) {
    // Normalize: remove extra spaces, but keep numbers
    return { type: 'PHONE', value: phoneMatch[1].trim().replace(/\s+/g, '') };
  }

  // อีเมล <value> (tolerant)
  const emailMatch = text.match(/^(?:อีเมล|email)[:：\s-]+(.+)$/i);
  if (emailMatch) {
    return { type: 'EMAIL', value: emailMatch[1].trim() };
  }

  // ตั้งค่าพร้อมเพย์ <number>
  const promptpayMatch = text.match(/^ตั้งค่าพร้อมเพย์\s+(\d[\d-]+)$/i);
  if (promptpayMatch) {
    return { type: 'PROMPTPAY', value: promptpayMatch[1].replace(/-/g, '').trim() };
  }

  // ตั้งค่าธนาคาร (show list)
  if (/^ตั้งค่าธนาคาร$/i.test(text)) {
    return { type: 'BANK', bankCode: 'SHOW_LIST' };
  }

  // ตั้งค่าธนาคาร <bank_name_or_code> <account> <name>
  const bankMatch = text.match(/^ตั้งค่าธนาคาร\s+(.+?)\s+(\d[\d-]+)\s+(.+)$/i);
  if (bankMatch) {
    return {
      type: 'BANK',
      bankCode: bankMatch[1].trim(), // Will be resolved to code in handler
      bankAccount: bankMatch[2].replace(/-/g, '').trim(),
      bankAccountName: bankMatch[3].trim(),
    };
  }

  // ตั้งลายเซ็น <URL>
  const signatureMatch = text.match(/^(?:ตั้งลายเซ็น|ลายเซ็น)\s+(https?:\/\/.+)$/i);
  if (signatureMatch) {
    return { type: 'SIGNATURE', value: signatureMatch[1].trim() };
  }

  // ตั้งตราประทับ <URL>
  const stampMatch = text.match(/^(?:ตั้งตราประทับ|ตราประทับ)\s+(https?:\/\/.+)$/i);
  if (stampMatch) {
    return { type: 'STAMP', value: stampMatch[1].trim() };
  }

  // ตั้งผู้ลงนาม <ชื่อ> <ตำแหน่ง>
  const signatoryMatch = text.match(/^(?:ตั้งผู้ลงนาม|ผู้ลงนาม)\s+(.+?)\s+ตำแหน่ง\s+(.+)$/i);
  if (signatoryMatch) {
    return {
      type: 'SIGNATORY',
      signatoryName: signatoryMatch[1].trim(),
      signatoryTitle: signatoryMatch[2].trim(),
    };
  }

  // ตั้งเงื่อนไขใบเสนอราคา <text>
  const termsQuoMatch = text.match(/^(?:เงื่อนไขใบเสนอราคา|terms quo)\s+(.+)$/i);
  if (termsQuoMatch) {
    return { type: 'TERMS_QUO', value: termsQuoMatch[1].trim() };
  }

  // ตั้งเงื่อนไขใบวางบิล <text>
  const termsInvoiceMatch = text.match(/^(?:เงื่อนไขใบวางบิล|terms invoice)\s+(.+)$/i);
  if (termsInvoiceMatch) {
    return { type: 'TERMS_INVOICE', value: termsInvoiceMatch[1].trim() };
  }

  // ตั้งเงื่อนไขใบเสร็จ <text>
  const termsReceiptMatch = text.match(/^(?:เงื่อนไขใบเสร็จ|terms receipt)\s+(.+)$/i);
  if (termsReceiptMatch) {
    return { type: 'TERMS_RECEIPT', value: termsReceiptMatch[1].trim() };
  }

  // ตั้งค่าธีมตามประเภทเอกสาร <docType> <theme>
  const themeHelpMatch = text.match(
    /^(?:(?:ตั้งค่า|เปลี่ยน)(?:\s+)?(?:ธีม|theme)(?:\s+)?(?:ยังไง|อย่างไร|ไง)?|(?:ธีม|theme)(?:\s+)?(?:ยังไง|อย่างไร|ไง|คืออะไร|ทำไง))$/i
  );
  if (themeHelpMatch) {
    return { type: 'THEME_HELP' };
  }

  const themeDocMatch = text.match(
    /^ตั้งค่า(?:ธีม|theme)(?:\s+)?(ใบเสนอราคา|ใบวางบิล|ใบเสร็จ|ใบแจ้งหนี้|quotation|invoice|bill|receipt)\s+(เขียว|แดง|น้ำเงิน|ขาวดำ|green|red|blue|mono)$/i
  );
  if (themeDocMatch) {
    const docTypeInput = themeDocMatch[1].toLowerCase();
    const themeInput = themeDocMatch[2].toLowerCase();
    const themeMap: Record<string, string> = {
      'เขียว': 'green',
      'แดง': 'red',
      'น้ำเงิน': 'blue',
      'ขาวดำ': 'mono',
      'green': 'green',
      'red': 'red',
      'blue': 'blue',
      'mono': 'mono',
    };
    const docTypeMap: Record<string, 'QUO' | 'BILL' | 'RECEIPT'> = {
      'ใบเสนอราคา': 'QUO',
      'quotation': 'QUO',
      'ใบวางบิล': 'BILL',
      'invoice': 'BILL',
      'bill': 'BILL',
      'ใบแจ้งหนี้': 'BILL',
      'ใบเสร็จ': 'RECEIPT',
      'receipt': 'RECEIPT',
    };
    const theme = themeMap[themeInput] || 'green';
    const docType = docTypeMap[docTypeInput];
    if (docType) {
      return { type: 'THEME_DOC', value: theme, docType };
    }
  }

  // ตั้งค่าธีม <theme>
  const themeMatch = text.match(/^ตั้งค่า(?:ธีม|theme)\s+(เขียว|แดง|น้ำเงิน|ขาวดำ|green|red|blue|mono)$/i);
  if (themeMatch) {
    const themeInput = themeMatch[1].toLowerCase();
    // Map Thai to English
    const themeMap: Record<string, string> = {
      'เขียว': 'green',
      'แดง': 'red',
      'น้ำเงิน': 'blue',
      'ขาวดำ': 'mono',
      'green': 'green',
      'red': 'red',
      'blue': 'blue',
      'mono': 'mono',
    };
    const theme = themeMap[themeInput] || 'green';
    return { type: 'THEME', value: theme };
  }

  return { type: null };
}

/**
 * Update business profile field
 */
export async function updateBusinessProfile(
  userId: string,
  businessId: string,
  field: string,
  value: string
): Promise<void> {
  const bizRef = db.doc(`users/${userId}/businesses/${businessId}`);
  await bizRef.set(
    {
      [field]: value,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Update PromptPay settings
 */
export async function setPromptPay(
  userId: string,
  businessId: string,
  promptpayAccount: string,
  promptpayName?: string
): Promise<void> {
  const paymentRef = db.doc(`users/${userId}/businesses/${businessId}/settings/payment`);
  await paymentRef.set(
    {
      method: 'PROMPTPAY',
      promptpay_account: promptpayAccount,
      promptpay_name: promptpayName || null,
      promptpay_logo_url: getPromptPayLogoUrl(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Update bank transfer settings
 */
export async function setBankTransfer(
  userId: string,
  businessId: string,
  bankCode: string,
  bankAccount: string,
  bankAccountName: string
): Promise<void> {
  const bank = getBankByCode(bankCode);

  const paymentRef = db.doc(`users/${userId}/businesses/${businessId}/settings/payment`);
  await paymentRef.set(
    {
      method: 'BANK_TRANSFER',
      bank_code: bankCode,
      bank_name: bank?.name_th || bankCode,
      bank_account: bankAccount,
      bank_account_name: bankAccountName,
      bank_logo_url: bank?.logo_url || null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Update signature settings
 */
export async function setSignature(
  userId: string,
  businessId: string,
  signatureUrl: string
): Promise<void> {
  const bizRef = db.doc(`users/${userId}/businesses/${businessId}`);
  await bizRef.set(
    {
      signature_url: signatureUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Update stamp settings
 */
export async function setStamp(
  userId: string,
  businessId: string,
  stampUrl: string
): Promise<void> {
  const bizRef = db.doc(`users/${userId}/businesses/${businessId}`);
  await bizRef.set(
    {
      stamp_url: stampUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Update signatory info
 */
export async function setSignatory(
  userId: string,
  businessId: string,
  signatoryName: string,
  signatoryTitle: string
): Promise<void> {
  const bizRef = db.doc(`users/${userId}/businesses/${businessId}`);
  await bizRef.set(
    {
      signatory_name: signatoryName,
      signatory_title: signatoryTitle,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Update document terms
 */
export async function setDocumentTerms(
  userId: string,
  businessId: string,
  docType: 'quotation' | 'invoice' | 'receipt',
  terms: string
): Promise<void> {
  const termsRef = db.doc(`users/${userId}/businesses/${businessId}/settings/terms`);
  await termsRef.set(
    {
      [`${docType}_terms`]: terms,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Get current business settings summary
 */
export async function getSettingsSummary(
  userId: string,
  businessId: string
): Promise<string> {
  const cacheKey = getSettingsSummaryCacheKey(userId, businessId);
  const cached = getCachedSettingsSummary(cacheKey);
  if (cached) return cached;

  const bizRef = db.doc(`users/${userId}/businesses/${businessId}`);
  const bizSnap = await bizRef.get();
  const biz = bizSnap.data() || {};

  const paymentRef = db.doc(`users/${userId}/businesses/${businessId}/settings/payment`);
  const paymentSnap = await paymentRef.get();
  const payment = paymentSnap.data() || {};

  const termsRef = db.doc(`users/${userId}/businesses/${businessId}/settings/terms`);
  const termsSnap = await termsRef.get();
  const terms = termsSnap.data() || {};

  const lines: string[] = ['📋 ตั้งค่าธุรกิจปัจจุบัน', ''];

  lines.push(`ชื่อ ${biz.name || '(ยังไม่ระบุ)'}`);
  lines.push(`ที่อยู่ ${biz.address || '(ยังไม่ระบุ)'}`);
  lines.push(`เลขผู้เสียภาษี ${biz.taxId || '(ยังไม่ระบุ)'}`);
  lines.push(`โทร ${biz.phone || '(ยังไม่ระบุ)'}`);
  lines.push(`อีเมล ${biz.email || '(ยังไม่ระบุ)'}`);

  const themeNames: Record<string, string> = {
    green: 'Executive Canvas (เขียว)',
    red: 'Luxury Atelier (แดง)',
    blue: 'Modern Commerce (น้ำเงิน)',
    mono: 'Legal Minimal (ขาวดำ)',
  };
  const globalTheme = themeNames[biz.pdfTheme as string] || 'อัตโนมัติ';
  const quoTheme = themeNames[biz.pdfThemeQuo as string] || 'ตามค่าเริ่มต้น';
  const billTheme = themeNames[biz.pdfThemeBill as string] || 'ตามค่าเริ่มต้น';
  const receiptTheme = themeNames[biz.pdfThemeReceipt as string] || 'ตามค่าเริ่มต้น';
  lines.push(`ธีม PDF (ค่าเริ่มต้น) ${globalTheme}`);
  lines.push(`  ใบเสนอราคา ${quoTheme}`);
  lines.push(`  ใบวางบิล ${billTheme}`);
  lines.push(`  ใบเสร็จ ${receiptTheme}`);

  lines.push('');
  lines.push('✍️ ลายเซ็น/ตราประทับ');
  lines.push(`ลายเซ็น ${biz.signature_url ? '✅ ตั้งค่าแล้ว' : '(ยังไม่ระบุ)'}`);
  lines.push(`ตราประทับ ${biz.stamp_url ? '✅ ตั้งค่าแล้ว' : '(ยังไม่ระบุ)'}`);
  lines.push(`ผู้ลงนาม ${biz.signatory_name || '(ยังไม่ระบุ)'}`);
  if (biz.signatory_title) {
    lines.push(`ตำแหน่ง ${biz.signatory_title}`);
  }

  lines.push('');
  lines.push('💳 ข้อมูลชำระเงิน');

  if (payment.method === 'PROMPTPAY' && payment.promptpay_account) {
    lines.push(`พร้อมเพย์ ${payment.promptpay_account}`);
    lines.push(`(โลโก้ PromptPay จะแสดงใน PDF)`);
  } else if (payment.method === 'BANK_TRANSFER' && payment.bank_account) {
    lines.push(`ธนาคาร ${payment.bank_name || payment.bank_code}`);
    lines.push(`เลขบัญชี ${payment.bank_account}`);
    lines.push(`ชื่อบัญชี ${payment.bank_account_name}`);
    lines.push(`(โลโก้ธนาคารจะแสดงใน PDF)`);
  } else {
    lines.push('(ยังไม่ได้ตั้งค่า)');
  }

  lines.push('');
  lines.push('📄 เงื่อนไขเอกสาร');
  lines.push(`ใบเสนอราคา ${terms.quotation_terms || '(ค่าเริ่มต้น)'}`);
  lines.push(`ใบวางบิล ${terms.invoice_terms || '(ค่าเริ่มต้น)'}`);
  lines.push(`ใบเสร็จ ${terms.receipt_terms || '(ค่าเริ่มต้น)'}`);

  lines.push('');
  lines.push('🛠️ แก้ไข/ตั้งค่า');
  lines.push('1. ตั้งค่าธนาคาร <ชื่อหรือรหัส> <เลขบัญชี> <ชื่อบัญชี>');
  lines.push('2. ตั้งค่าพร้อมเพย์ <เลข>');
  lines.push('3. ตั้งค่าธีม เขียว | แดง | น้ำเงิน | ขาวดำ');
  lines.push('4. ตั้งค่าธีม ใบเสนอราคา|ใบวางบิล|ใบเสร็จ <สี>');
  lines.push('5. ตั้งผู้ลงนาม <ชื่อ> ตำแหน่ง <ตำแหน่ง>');
  lines.push('6. ส่งรูป แล้วพิมพ์ โลโก้ / ลายเซ็น / ตราประทับ');
  lines.push('(รูป/ผู้ลงนามจะมีผลกับเอกสารที่สร้างใหม่เท่านั้น)');

  const summary = lines.join('\n');
  setCachedSettingsSummary(cacheKey, summary);
  return summary;
}

/**
 * Get help text for settings commands
 */
export function getSettingsHelpText(): string {
  return `ติ๊ดๆ คำสั่งตั้งค่าธุรกิจครับเจ้านาย

💡 วิธีง่ายที่สุด
พิมพ์ "ตั้งค่าธุรกิจแบบฟอร์ม"
แล้วคัดลอกฟอร์ม ใส่ข้อมูล ส่งกลับมา

📝 ตั้งค่าแบบคำสั่งเดียว
1. ชื่อธุรกิจ [ชื่อ]
2. ที่อยู่ [ที่อยู่]
3. เลขผู้เสียภาษี [เลข]
4. โทร [เบอร์]
5. อีเมล [อีเมล]
6. ตั้งค่าพร้อมเพย์ [เลข]
7. ตั้งค่าธนาคาร [ชื่อหรือรหัส] [เลข] [ชื่อ]
8. ตั้งค่าธีม [เขียว|แดง|น้ำเงิน|ขาวดำ]

ตัวอย่าง
"ชื่อธุรกิจ บริษัท ABC จำกัด"
"ตั้งค่าธนาคาร กสิกร 1234567890 บริษัท ABC"
"ตั้งค่าพร้อมเพย์ 0812345678"
"ตั้งค่าธีม ใบเสนอราคา แดง"
"ตั้งค่าธีม เขียว"

พิมพ์ "ตั้งค่าธุรกิจ" เพื่อดูค่าปัจจุบันครับ`;
}

export function getThemeHelpText(): string {
  return `🎨 ตั้งธีมเอกสารผ่าน LINE ได้เลยครับเจ้านาย

คำสั่งที่ใช้ได้
1. ตั้งค่าธีม เขียว
2. ตั้งค่าธีม แดง
3. ตั้งค่าธีม น้ำเงิน
4. ตั้งค่าธีม ขาวดำ

ถ้าจะตั้งแยกเฉพาะเอกสาร
• ตั้งค่าธีม ใบเสนอราคา แดง
• ตั้งค่าธีม ใบวางบิล น้ำเงิน
• ตั้งค่าธีม ใบเสร็จ ขาวดำ

ถ้าถนัดพิมพ์อังกฤษก็ใช้ได้
• ตั้งค่าtheme red
• ตั้งค่าtheme invoice blue

ธีมจะมีผลกับ PDF ที่ออกใหม่ครั้งถัดไปครับ`;
}

/**
 * Handle settings command and return response
 */
export async function handleSettingsCommand(
  userId: string,
  businessId: string,
  message: string
): Promise<string> {
  const cmd = parseSettingsCommand(message);

  if (!cmd.type) {
    return getSettingsHelpText();
  }

  switch (cmd.type) {
    case 'FORM_TEMPLATE':
      return getBusinessFormTemplate();

    case 'FORM_SUBMIT': {
      if (!cmd.formData) {
        return 'โอ๊ะ! ไม่พบข้อมูลในฟอร์มครับเจ้านาย ลองส่งฟอร์มใหม่อีกครั้งนะครับ';
      }
      const { saved, summary } = await applyBusinessForm(userId, businessId, cmd.formData);

      // Handle bank if provided (requires bank name mapping)
      if (cmd.formData.bank && cmd.formData.bankAccount && cmd.formData.bankAccountName) {
        const { findBankByName } = await import('../services/bankMasterService');
        const bank = findBankByName(cmd.formData.bank);

        if (bank) {
          await setBankTransfer(userId, businessId, bank.code, cmd.formData.bankAccount, cmd.formData.bankAccountName);
        } else {
          // Bank not found - user will need to set it separately
          // Just continue with other fields saved
        }
      }

      const lines = [
        `ติ๊ดๆ บันทึกข้อมูล ${saved} รายการแล้วครับเจ้านาย`,
        '',
        summary,
      ];
      return lines.join('\n');
    }

    case 'SHOW':
      return await getSettingsSummary(userId, businessId);

    case 'THEME_HELP':
      return getThemeHelpText();

    case 'BUSINESS_NAME':
      await updateBusinessProfile(userId, businessId, 'name', cmd.value!);
      return `ติ๊ดๆ บันทึกชื่อธุรกิจ ${cmd.value} แล้วครับเจ้านาย`;

    case 'ADDRESS':
      await updateBusinessProfile(userId, businessId, 'address', cmd.value!);
      return `ติ๊ดๆ บันทึกที่อยู่ ${cmd.value} แล้วครับเจ้านาย`;

    case 'TAX_ID':
      await updateBusinessProfile(userId, businessId, 'taxId', cmd.value!);
      return `ติ๊ดๆ บันทึกเลขผู้เสียภาษี ${cmd.value} แล้วครับเจ้านาย`;

    case 'PHONE':
      await updateBusinessProfile(userId, businessId, 'phone', cmd.value!);
      return `ติ๊ดๆ บันทึกเบอร์โทร ${cmd.value} แล้วครับเจ้านาย`;

    case 'EMAIL':
      await updateBusinessProfile(userId, businessId, 'email', cmd.value!);
      return `ติ๊ดๆ บันทึกอีเมล ${cmd.value} แล้วครับเจ้านาย`;

    case 'PROMPTPAY':
      await setPromptPay(userId, businessId, cmd.value!);
      return `ติ๊ดๆ บันทึกพร้อมเพย์ ${cmd.value} แล้วครับเจ้านาย`;

    case 'THEME': {
      const theme = cmd.value || 'green';
      const themeNames: Record<string, string> = {
        green: 'Executive Canvas (เขียว)',
        red: 'Luxury Atelier (แดง)',
        blue: 'Modern Commerce (น้ำเงิน)',
        mono: 'Legal Minimal (ขาวดำ)',
      };
      const themeEmojis: Record<string, string> = {
        green: '🟢',
        red: '🔴',
        blue: '🔵',
        mono: '⚫',
      };
      await updateBusinessProfile(userId, businessId, 'pdfTheme', theme);
      const themeName = themeNames[theme] || theme;
      const themeEmoji = themeEmojis[theme] || '🎨';
      return `${themeEmoji} ติ๊ดๆ ตั้งธีมเอกสารเป็น "${themeName}" แล้วครับเจ้านาย\nเอกสาร PDF จะใช้ธีมนี้ในครั้งต่อไป`;
    }

    case 'THEME_DOC': {
      const theme = cmd.value || 'green';
      const docType = cmd.docType || 'QUO';
      const themeNames: Record<string, string> = {
        green: 'Executive Canvas (เขียว)',
        red: 'Luxury Atelier (แดง)',
        blue: 'Modern Commerce (น้ำเงิน)',
        mono: 'Legal Minimal (ขาวดำ)',
      };
      const themeEmojis: Record<string, string> = {
        green: '🟢',
        red: '🔴',
        blue: '🔵',
        mono: '⚫',
      };
      const docLabels: Record<'QUO' | 'BILL' | 'RECEIPT', string> = {
        QUO: 'ใบเสนอราคา',
        BILL: 'ใบวางบิล',
        RECEIPT: 'ใบเสร็จ',
      };
      const fieldMap: Record<'QUO' | 'BILL' | 'RECEIPT', string> = {
        QUO: 'pdfThemeQuo',
        BILL: 'pdfThemeBill',
        RECEIPT: 'pdfThemeReceipt',
      };
      const field = fieldMap[docType];
      await updateBusinessProfile(userId, businessId, field, theme);
      const themeName = themeNames[theme] || theme;
      const themeEmoji = themeEmojis[theme] || '🎨';
      return `${themeEmoji} ติ๊ดๆ ตั้งธีม${docLabels[docType]}เป็น "${themeName}" แล้วครับเจ้านาย\nเอกสารประเภทนี้จะใช้ธีมนี้ในครั้งต่อไป`;
    }

    case 'BANK': {
      // Show bank list if no parameters
      if (cmd.bankCode === 'SHOW_LIST') {
        const { getPopularBanks } = await import('../services/bankMasterService');
        const popular = getPopularBanks();
        const lines = [
          '🏦 ธนาคารที่รองรับครับเจ้านาย',
          '',
          'ธนาคารยอดนิยม',
          ...popular.map((b, i) => `${i + 1}. ${b.name_th} (${b.code})`),
          '',
          'ตัวอย่าง',
          '"ตั้งค่าธนาคาร กสิกร 1234567890 บริษัท ABC"',
          '"ตั้งค่าธนาคาร KBANK 1234567890 บริษัท ABC"',
          '',
          'พิมพ์ "ตั้งค่าธนาคาร <ชื่อหรือรหัส> <เลขบัญชี> <ชื่อบัญชี>"',
        ];
        return lines.join('\n');
      }

      // Resolve bank name/code to BankMaster
      const { findBankByName, findBanksWithSuggestions } = await import('../services/bankMasterService');
      const bankInput = cmd.bankCode!;
      const bank = findBankByName(bankInput);

      // If not found, show suggestions
      if (!bank) {
        const suggestions = findBanksWithSuggestions(bankInput, 5);
        if (suggestions.length === 0) {
          return `โอ๊ะ! ไม่พบธนาคาร "${bankInput}" ครับเจ้านาย\nพิมพ์ "ตั้งค่าธนาคาร" เพื่อดูรายชื่อธนาคารนะครับ`;
        }

        const lines = [
          `โอ๊ะ! เจ้านายหมายถึงธนาคารไหนครับ?`,
          '',
          ...suggestions.map((b, i) => `${i + 1}. ${b.name_th} (${b.code})`),
          '',
          'พิมพ์ "ตั้งค่าธนาคาร <ชื่อหรือรหัส> <เลขบัญชี> <ชื่อบัญชี>"',
        ];
        return lines.join('\n');
      }

      // Bank found - save settings
      await setBankTransfer(userId, businessId, bank.code, cmd.bankAccount!, cmd.bankAccountName!);
      return `ติ๊ดๆ บันทึกบัญชีธนาคารแล้วครับเจ้านาย\n${bank.name_th}\nเลขบัญชี ${cmd.bankAccount}\nชื่อ ${cmd.bankAccountName}`;
    }

    case 'SIGNATURE':
      await setSignature(userId, businessId, cmd.value!);
      return `ติ๊ดๆ บันทึกลายเซ็นแล้วครับเจ้านาย`;

    case 'STAMP':
      await setStamp(userId, businessId, cmd.value!);
      return `ติ๊ดๆ บันทึกตราประทับแล้วครับเจ้านาย`;

    case 'SIGNATORY':
      await setSignatory(userId, businessId, cmd.signatoryName!, cmd.signatoryTitle!);
      return `ติ๊ดๆ บันทึกผู้ลงนามแล้วครับเจ้านาย\n${cmd.signatoryName}\nตำแหน่ง ${cmd.signatoryTitle}`;

    case 'TERMS_QUO':
      await setDocumentTerms(userId, businessId, 'quotation', cmd.value!);
      return `ติ๊ดๆ บันทึกเงื่อนไขใบเสนอราคาแล้วครับเจ้านาย\n${cmd.value}`;

    case 'TERMS_INVOICE':
      await setDocumentTerms(userId, businessId, 'invoice', cmd.value!);
      return `ติ๊ดๆ บันทึกเงื่อนไขใบวางบิลแล้วครับเจ้านาย\n${cmd.value}`;

    case 'TERMS_RECEIPT':
      await setDocumentTerms(userId, businessId, 'receipt', cmd.value!);
      return `ติ๊ดๆ บันทึกเงื่อนไขใบเสร็จแล้วครับเจ้านาย\n${cmd.value}`;

    case 'HELP':
    default:
      return getSettingsHelpText();
  }
}
