import { 
  PAYMENT_LOGOS, 
  BankKey, 
  CardKey, 
  WalletKey,
  PaymentCategory 
} from './paymentLogos';

export interface PaymentMethods {
  banks?: string[];
  cards?: string[];
  wallets?: string[];
}

/**
 * Get the display name for a payment method key
 */
export function getPaymentMethodName(key: string): string {
  const names: Record<string, string> = {
    // Banks
    KBANK: 'ธนาคารกสิกรไทย',
    SCB: 'ธนาคารไทยพาณิชย์',
    BBL: 'ธนาคารกรุงเทพ',
    KTB: 'ธนาคารกรุงไทย',
    BAY: 'ธนาคารกรุงศรีอยุธยา',
    TTB: 'ธนาคารทีเอ็มบีธนชาต',
    GSB: 'ธนาคารออมสิน',
    GHB: 'ธนาคารอาคารสงเคราะห์',
    BAAC: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร',
    CIMB: 'ธนาคารซีไอเอ็มบี',
    UOB: 'ธนาคารยูโอบี',
    TISCO: 'ธนาคารทิสโก้',
    KKP: 'ธนาคารเกียรตินาคินภัทร',
    IBANK: 'ธนาคารอิสลามแห่งประเทศไทย',
    LHB: 'ธนาคารแลนด์ แอนด์ เฮ้าส์',
    TCRB: 'ธนาคารไทยเครดิต',
    ICBC: 'ธนาคารไอซีบีซี (ไทย)',
    CITI: 'ธนาคารซิตี้แบงก์',
    HSBC: 'ธนาคารเอชเอสบีซี',
    THANACHART: 'ธนาคารธนชาต',
    
    // Cards
    VISA: 'Visa',
    MASTERCARD: 'Mastercard',
    JCB: 'JCB',
    
    // Wallets
    PROMPTPAY: 'พร้อมเพย์',
    TRUEMONEY: 'TrueMoney Wallet',
    LINEPAY: 'LINE Pay',
  };
  
  return names[key] || key;
}

/**
 * Get logo URL for a payment method key
 */
export function getPaymentLogoUrl(key: string, category: PaymentCategory): string | null {
  const logos = PAYMENT_LOGOS[category];
  return logos[key as keyof typeof logos] || null;
}

/**
 * Get all available payment methods by category
 */
export function getAllPaymentMethods() {
  return {
    banks: Object.keys(PAYMENT_LOGOS.banks) as BankKey[],
    cards: Object.keys(PAYMENT_LOGOS.cards) as CardKey[],
    wallets: Object.keys(PAYMENT_LOGOS.wallets) as WalletKey[],
  };
}

/**
 * Validate if a payment method key exists
 */
export function isValidPaymentMethod(key: string, category: PaymentCategory): boolean {
  return key in PAYMENT_LOGOS[category];
}
