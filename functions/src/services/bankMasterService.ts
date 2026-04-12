/**
 * EzDoc - Bank Master Service
 * 
 * Bank master data: code, name, logo URL, PromptPay support.
 * Users select banks by name only; system maps to code internally.
 */

const ASSETS_BASE = 'https://storage.googleapis.com/ezdoc-assets';

export interface BankMaster {
  code: string;
  name_th: string;
  logo_url: string;
  promptpay_supported: boolean;
}

/**
 * Bank master table (canonical list)
 */
export const BANK_MASTER: BankMaster[] = [
  { code: 'KBANK', name_th: 'กสิกรไทย', logo_url: `${ASSETS_BASE}/payment-logos/banks/KBANK.png`, promptpay_supported: true },
  { code: 'SCB', name_th: 'ไทยพาณิชย์', logo_url: `${ASSETS_BASE}/payment-logos/banks/SCB.png`, promptpay_supported: true },
  { code: 'BBL', name_th: 'กรุงเทพ', logo_url: `${ASSETS_BASE}/payment-logos/banks/BBL.png`, promptpay_supported: true },
  { code: 'KTB', name_th: 'กรุงไทย', logo_url: `${ASSETS_BASE}/payment-logos/banks/KTB.png`, promptpay_supported: true },
  { code: 'BAY', name_th: 'กรุงศรีอยุธยา', logo_url: `${ASSETS_BASE}/payment-logos/banks/BAY.png`, promptpay_supported: true },
  { code: 'TTB', name_th: 'ทีเอ็มบีธนชาต', logo_url: `${ASSETS_BASE}/payment-logos/banks/TTB.png`, promptpay_supported: true },
  { code: 'GSB', name_th: 'ออมสิน', logo_url: `${ASSETS_BASE}/payment-logos/banks/GSB.png`, promptpay_supported: true },
  { code: 'GHB', name_th: 'อาคารสงเคราะห์', logo_url: `${ASSETS_BASE}/payment-logos/banks/GHB.png`, promptpay_supported: true },
  { code: 'BAAC', name_th: 'ธ.ก.ส.', logo_url: `${ASSETS_BASE}/payment-logos/banks/BAAC.png`, promptpay_supported: true },
  { code: 'CIMB', name_th: 'ซีไอเอ็มบี', logo_url: `${ASSETS_BASE}/payment-logos/banks/CIMB.png`, promptpay_supported: true },
  { code: 'UOB', name_th: 'ยูโอบี', logo_url: `${ASSETS_BASE}/payment-logos/banks/UOB.png`, promptpay_supported: true },
  { code: 'TISCO', name_th: 'ทิสโก้', logo_url: `${ASSETS_BASE}/payment-logos/banks/TISCO.png`, promptpay_supported: true },
  { code: 'KKP', name_th: 'เกียรตินาคินภัทร', logo_url: `${ASSETS_BASE}/payment-logos/banks/KKP.png`, promptpay_supported: true },
  { code: 'IBANK', name_th: 'อิสลามแห่งประเทศไทย', logo_url: `${ASSETS_BASE}/payment-logos/banks/IBANK.png`, promptpay_supported: true },
  { code: 'LHB', name_th: 'แลนด์ แอนด์ เฮ้าส์', logo_url: `${ASSETS_BASE}/payment-logos/banks/LHB.png`, promptpay_supported: true },
  { code: 'TCRB', name_th: 'ไทยเครดิต', logo_url: `${ASSETS_BASE}/payment-logos/banks/TCRB.png`, promptpay_supported: false },
  { code: 'ICBC', name_th: 'ไอซีบีซี', logo_url: `${ASSETS_BASE}/payment-logos/banks/ICBC.png`, promptpay_supported: false },
  { code: 'CITI', name_th: 'ซิตี้แบงก์', logo_url: `${ASSETS_BASE}/payment-logos/banks/CITI.png`, promptpay_supported: false },
  { code: 'HSBC', name_th: 'เอชเอสบีซี', logo_url: `${ASSETS_BASE}/payment-logos/banks/HSBC.png`, promptpay_supported: false },
  { code: 'THANACHART', name_th: 'ธนชาต', logo_url: `${ASSETS_BASE}/payment-logos/banks/THANACHART.png`, promptpay_supported: true },
];

/**
 * Bank name synonyms mapping
 */
const BANK_SYNONYMS: Record<string, string> = {
  // KBANK
  'กสิกร': 'KBANK',
  'กสิกรไทย': 'KBANK',
  'kbank': 'KBANK',
  'kasikorn': 'KBANK',
  // SCB
  'ไทยพาณิชย์': 'SCB',
  'scb': 'SCB',
  'siam commercial': 'SCB',
  // BBL
  'กรุงเทพ': 'BBL',
  'bbl': 'BBL',
  'bangkok bank': 'BBL',
  // KTB
  'กรุงไทย': 'KTB',
  'ktb': 'KTB',
  'krung thai': 'KTB',
  // BAY
  'กรุงศรี': 'BAY',
  'กรุงศรีอยุธยา': 'BAY',
  'bay': 'BAY',
  'ayudhya': 'BAY',
  // TTB
  'ทีเอ็มบี': 'TTB',
  'ทีเอ็มบีธนชาต': 'TTB',
  'ttb': 'TTB',
  'tmb': 'TTB',
  // GSB
  'ออมสิน': 'GSB',
  'gsb': 'GSB',
  // GHB
  'อาคารสงเคราะห์': 'GHB',
  'ghb': 'GHB',
  // THANACHART
  'ธนชาต': 'THANACHART',
  'thanachart': 'THANACHART',
};

/**
 * Find bank by name or code (with synonyms)
 */
export function findBankByName(name: string): BankMaster | null {
  const normalized = name.trim().toLowerCase();
  
  // Try code match first
  const codeMatch = getBankByCode(normalized.toUpperCase());
  if (codeMatch) {
    return codeMatch;
  }
  
  // Try synonyms
  if (BANK_SYNONYMS[normalized]) {
    const bank = getBankByCode(BANK_SYNONYMS[normalized]);
    if (bank) return bank;
  }
  
  // Exact match on Thai name
  for (const bank of BANK_MASTER) {
    if (bank.name_th.toLowerCase() === normalized) {
      return bank;
    }
  }
  
  // Partial match on Thai name
  for (const bank of BANK_MASTER) {
    const thaiLower = bank.name_th.toLowerCase();
    if (thaiLower.includes(normalized) || normalized.includes(thaiLower)) {
      return bank;
    }
  }
  
  // Remove common prefixes and try again
  const withoutPrefix = normalized.replace(/^(ธนาคาร|bank)\s*/i, '');
  for (const bank of BANK_MASTER) {
    const thaiLower = bank.name_th.toLowerCase();
    if (thaiLower.includes(withoutPrefix) || withoutPrefix.includes(thaiLower)) {
      return bank;
    }
  }
  
  // Try synonyms on normalized without prefix
  if (BANK_SYNONYMS[withoutPrefix]) {
    const bank = getBankByCode(BANK_SYNONYMS[withoutPrefix]);
    if (bank) return bank;
  }
  
  return null;
}

/**
 * Resolve any bank label/code/synonym into canonical bank code
 */
export function resolveBankCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const bank = findBankByName(value);
  return bank?.code || null;
}

/**
 * Find banks with suggestions (for ambiguous queries)
 * Returns top matches
 */
export function findBanksWithSuggestions(query: string, limit: number = 5): BankMaster[] {
  const normalized = query.trim().toLowerCase();
  const matches: Array<{ bank: BankMaster; score: number }> = [];
  
  for (const bank of BANK_MASTER) {
    let score = 0;
    const codeLower = bank.code.toLowerCase();
    const thaiLower = bank.name_th.toLowerCase();
    
    // Exact code match
    if (codeLower === normalized) {
      score = 100;
    }
    // Exact Thai name match
    else if (thaiLower === normalized) {
      score = 90;
    }
    // Synonym match
    else if (BANK_SYNONYMS[normalized] === bank.code) {
      score = 85;
    }
    // Starts with match
    else if (thaiLower.startsWith(normalized) || codeLower.startsWith(normalized)) {
      score = 70;
    }
    // Contains match
    else if (thaiLower.includes(normalized) || normalized.includes(thaiLower)) {
      score = 50;
    }
    
    if (score > 0) {
      matches.push({ bank, score });
    }
  }
  
  // Sort by score (desc) and return top matches
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit).map(m => m.bank);
}

/**
 * Get popular banks (most commonly used)
 */
export function getPopularBanks(): BankMaster[] {
  const popularCodes = ['KBANK', 'SCB', 'BBL', 'KTB', 'BAY', 'TTB'];
  return popularCodes.map(code => getBankByCode(code)).filter((b): b is BankMaster => b !== null);
}

/**
 * Get bank by code
 */
export function getBankByCode(code: string): BankMaster | null {
  const normalized = code.toUpperCase();
  return BANK_MASTER.find(b => b.code === normalized) || null;
}

/**
 * Get all banks (for selection UI)
 */
export function getAllBanks(): BankMaster[] {
  return BANK_MASTER;
}
