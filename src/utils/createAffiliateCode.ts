/**
 * Helper utility to create affiliate/promo codes
 * 
 * Usage:
 * - Open browser console on your app
 * - Run: await createAffiliateCode({ code: 'INFLUENCER10', ownerName: 'John Doe', ... })
 */

import { projectId, publicAnonKey } from './supabase/info';

export interface CreateAffiliateCodeParams {
  code: string;
  ownerId: string;
  ownerName: string;
  discountPercent: number;
  commissionPercent: number;
  maxUsage?: number;
  expiresAt?: number;
}

export async function createAffiliateCode(params: CreateAffiliateCodeParams) {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/affiliate/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create affiliate code');
  }

  const result = await response.json();
  console.log('✅ Affiliate code created:', result.affiliate);
  return result.affiliate;
}

// Example codes to create
export const EXAMPLE_AFFILIATE_CODES: CreateAffiliateCodeParams[] = [
  {
    code: 'WELCOME10',
    ownerId: 'system',
    ownerName: 'BOQ System',
    discountPercent: 10,
    commissionPercent: 0,
  },
  {
    code: 'INFLUENCER15',
    ownerId: 'influencer-001',
    ownerName: 'Top Influencer',
    discountPercent: 15,
    commissionPercent: 25,
  },
  {
    code: 'PARTNER20',
    ownerId: 'partner-001',
    ownerName: 'Business Partner',
    discountPercent: 20,
    commissionPercent: 30,
  },
  {
    code: 'NEWYEAR2025',
    ownerId: 'system',
    ownerName: 'New Year Promotion',
    discountPercent: 25,
    commissionPercent: 0,
    expiresAt: new Date('2025-12-31').getTime(),
  },
];

// Helper to create all example codes
export async function createExampleAffiliateCodes() {
  console.log('🎯 Creating example affiliate codes...');
  
  for (const codeData of EXAMPLE_AFFILIATE_CODES) {
    try {
      await createAffiliateCode(codeData);
      console.log(`✅ Created: ${codeData.code}`);
    } catch (error: any) {
      console.error(`❌ Failed to create ${codeData.code}:`, error.message);
    }
  }
  
  console.log('🎉 Done!');
}

// Make it globally available for console usage
if (typeof window !== 'undefined') {
  (window as any).createAffiliateCode = createAffiliateCode;
  (window as any).createExampleAffiliateCodes = createExampleAffiliateCodes;
  (window as any).EXAMPLE_AFFILIATE_CODES = EXAMPLE_AFFILIATE_CODES;
}
