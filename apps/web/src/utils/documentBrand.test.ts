import { describe, expect, it } from 'vitest';
import { getDocumentCompanyTagline, getDocumentCompanyTitle } from './documentBrand';

describe('documentBrand helpers', () => {
  it('prefers companyName and uppercases the title', () => {
    expect(getDocumentCompanyTitle({
      companyName: 'EzBOQ Studio',
      companyNameTh: 'อีซี่บีโอคิว',
    })).toBe('EZBOQ STUDIO');
  });

  it('falls back to Thai name or generic title when missing', () => {
    expect(getDocumentCompanyTitle({
      companyName: '',
      companyNameTh: 'บริษัท ทดสอบ จำกัด',
    })).toBe('บริษัท ทดสอบ จำกัด');
    expect(getDocumentCompanyTitle()).toBe('COMPANY NAME');
  });

  it('uses company tagline when provided', () => {
    expect(getDocumentCompanyTagline({ tagline: 'Luxury Interior Studio' })).toBe('Luxury Interior Studio');
    expect(getDocumentCompanyTagline()).toBe('Interior Design & Construction');
  });
});
