export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType?: string;
}

export interface CompanyProfile {
  companyName: string;
  companyNameTh?: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  taxId?: string;
  logoUrl?: string;
  signatureName: string;
  signatureUrl?: string;
  bankAccounts: BankAccount[];
  defaultVatRate?: number;
  vatExempt?: boolean;
  promptPayId?: string;
  promptPayQrUrl?: string;
}

import { scopedKey } from './userScope';

const BASE_STORAGE_KEY = 'ezboq_company_profile';

export const defaultCompanyProfile: CompanyProfile = {
  companyName: '',
  companyNameTh: '',
  tagline: '',
  phone: '',
  email: '',
  address: '',
  signatureName: '',
  bankAccounts: [
    {
      id: 'default-bank',
      bankName: '',
      accountName: '',
      accountNumber: '',
      accountType: 'ออมทรัพย์',
    },
  ],
};

export function loadCompanyProfile(): CompanyProfile {
  if (typeof window === 'undefined') return { ...defaultCompanyProfile };

  const STORAGE_KEY = scopedKey(BASE_STORAGE_KEY);

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultCompanyProfile, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load local company profile cache:', error);
  }

  return { ...defaultCompanyProfile };
}

export function saveCompanyProfile(profile: CompanyProfile): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(scopedKey(BASE_STORAGE_KEY), JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to save local company profile cache:', error);
  }
}

export function resetCompanyProfile(): CompanyProfile {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(scopedKey(BASE_STORAGE_KEY));
  }
  return { ...defaultCompanyProfile };
}
