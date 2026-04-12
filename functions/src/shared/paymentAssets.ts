/**
 * EzDoc - Payment Assets & Bank Logo Resolver
 *
 * Maps bank codes to logo URLs from public ezdoc-assets bucket.
 * All logos are static public assets (no signed URLs needed).
 */

import { resolveBankCode } from '../services/bankMasterService';

// Public asset base URL
const ASSETS_BASE = 'https://storage.googleapis.com/ezdoc-assets';

// Supported Thai bank codes
export type BankCode =
  | 'KBANK' // กสิกรไทย
  | 'SCB'   // ไทยพาณิชย์
  | 'BBL'   // กรุงเทพ
  | 'KTB'   // กรุงไทย
  | 'BAY'   // กรุงศรี
  | 'TTB'   // ทหารไทยธนชาต
  | 'GSB'   // ออมสิน
  | 'CIMB'  // ซีไอเอ็มบี
  | 'UOB'   // ยูโอบี
  | 'TBANK' // ธนชาต
  | 'LH'    // แลนด์ แอนด์ เฮ้าส์
  | 'BAAC'  // ธ.ก.ส.
  | 'IBANK' // อิสลามิค
  | 'TISCO'; // ทิสโก้

// Bank display names (Thai)
export const BANK_NAMES: Record<BankCode, string> = {
  KBANK: 'ธนาคารกสิกรไทย',
  SCB: 'ธนาคารไทยพาณิชย์',
  BBL: 'ธนาคารกรุงเทพ',
  KTB: 'ธนาคารกรุงไทย',
  BAY: 'ธนาคารกรุงศรีอยุธยา',
  TTB: 'ธนาคารทหารไทยธนชาต',
  GSB: 'ธนาคารออมสิน',
  CIMB: 'ธนาคารซีไอเอ็มบี ไทย',
  UOB: 'ธนาคารยูโอบี',
  TBANK: 'ธนาคารธนชาต',
  LH: 'ธนาคารแลนด์ แอนด์ เฮ้าส์',
  BAAC: 'ธนาคารเพื่อการเกษตรฯ',
  IBANK: 'ธนาคารอิสลามแห่งประเทศไทย',
  TISCO: 'ธนาคารทิสโก้',
};

/**
 * Resolve bank logo URL from bank code
 * Returns public URL to bank logo PNG
 */
export function resolveBankLogoUrl(bankCode: string | undefined | null): string | null {
  if (!bankCode) return null;

  const code = bankCode.toUpperCase();
  if (code in BANK_NAMES) {
    return `${ASSETS_BASE}/payment-logos/banks/${code}.png`;
  }
  return null;
}

/**
 * Get PromptPay logo URL
 */
export function getPromptPayLogoUrl(): string {
  return `${ASSETS_BASE}/payment-logos/wallets/PROMPTPAY.png`;
}

/**
 * Get bank display name from code
 */
export function getBankName(bankCode: string | undefined | null): string | null {
  if (!bankCode) return null;
  const code = bankCode.toUpperCase() as BankCode;
  return BANK_NAMES[code] || null;
}

/**
 * Payment method types
 */
export type PaymentMethod = 'PROMPTPAY' | 'BANK_TRANSFER' | 'CASH' | 'OTHER';

/**
 * Payment snapshot interface (to be stored with document)
 */
export interface PaymentSnapshot {
  method: PaymentMethod;
  // PromptPay fields
  promptpay_account?: string;
  promptpay_name?: string;
  promptpay_logo_url?: string;
  promptpay_qr_url?: string | null;
  // Bank transfer fields
  bank_code?: string;
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
  bank_logo_url?: string;
}

/**
 * Build payment snapshot from business settings
 */
export function buildPaymentSnapshot(settings: {
  method?: string;
  promptpay_account?: string;
  promptpay_name?: string;
  promptpay_qr_url?: string;
  bank_code?: string;
  bank_account?: string;
  bank_account_name?: string;
}): PaymentSnapshot | null {
  const method = (settings.method?.toUpperCase() || 'PROMPTPAY') as PaymentMethod;
  const hasPromptPay = Boolean(settings.promptpay_account || settings.promptpay_qr_url);
  const normalizedBankCode = resolveBankCode(settings.bank_code) || settings.bank_code || null;

  if (method === 'PROMPTPAY' && hasPromptPay) {
    return {
      method: 'PROMPTPAY',
      promptpay_account: settings.promptpay_account || null,
      promptpay_name: settings.promptpay_name || null,
      promptpay_logo_url: getPromptPayLogoUrl(),
      promptpay_qr_url: settings.promptpay_qr_url || null,
      // Include bank details if provided (hybrid display)
      bank_code: normalizedBankCode,
      bank_name: getBankName(normalizedBankCode) || settings.bank_code || null,
      bank_account: settings.bank_account || null,
      bank_account_name: settings.bank_account_name || null,
      bank_logo_url: resolveBankLogoUrl(normalizedBankCode),
    } as PaymentSnapshot;
  }

  if (method === 'BANK_TRANSFER' && normalizedBankCode) {
    return {
      method: 'BANK_TRANSFER',
      bank_code: normalizedBankCode,
      bank_name: getBankName(normalizedBankCode) || settings.bank_code || null,
      bank_account: settings.bank_account || null,
      bank_account_name: settings.bank_account_name || null,
      bank_logo_url: resolveBankLogoUrl(normalizedBankCode),
    } as PaymentSnapshot;
  }

  // Default: return PromptPay if available from legacy fields
  if (hasPromptPay) {
    return {
      method: 'PROMPTPAY',
      promptpay_account: settings.promptpay_account || null,
      promptpay_name: settings.promptpay_name || null,
      promptpay_logo_url: getPromptPayLogoUrl(),
      promptpay_qr_url: settings.promptpay_qr_url || null,
      // Include bank details if provided (hybrid display)
      bank_code: normalizedBankCode,
      bank_name: getBankName(normalizedBankCode) || settings.bank_code || null,
      bank_account: settings.bank_account || null,
      bank_account_name: settings.bank_account_name || null,
      bank_logo_url: resolveBankLogoUrl(normalizedBankCode),
    } as PaymentSnapshot;
  }

  return null;
}
