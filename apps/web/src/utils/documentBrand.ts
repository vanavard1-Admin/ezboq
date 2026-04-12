import type { CompanyProfile } from './companyProfile';

type BrandProfile = Pick<CompanyProfile, 'companyName' | 'companyNameTh' | 'tagline'>;

export function getDocumentCompanyTitle(profile?: Partial<BrandProfile>): string {
  const englishName = profile?.companyName?.trim();
  const thaiName = profile?.companyNameTh?.trim();
  const title = englishName || thaiName;
  return title ? title.toUpperCase() : 'COMPANY NAME';
}

export function getDocumentCompanyTagline(profile?: Partial<BrandProfile>): string {
  return profile?.tagline?.trim() || 'Interior Design & Construction';
}
