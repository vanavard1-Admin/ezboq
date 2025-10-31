/**
 * Helper utility to create affiliate/promo codes
 * 
 * Usage:
 * - Open browser console on your app
 * - Run: await createAffiliateCode({ code: 'INFLUENCER10', ownerName: 'John Doe', ... })
 */

import { projectId } from './supabase/info';
import { supabase } from './supabase/client';

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
  // 🔒 Get access token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('กรุณาเข้าสู่ระบบก่อนสร้างรหัสส่วนลด');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/affiliate/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
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