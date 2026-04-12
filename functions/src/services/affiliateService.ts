import { getDb } from '../core/firebaseAdmin';
import * as admin from 'firebase-admin';
import type { PromoCodeDoc } from './promoCodeService';
import { PACKAGE_TYPE_PRO, PACKAGE_TYPE_TEAM } from './purchaseService';

const db = getDb();

const LINE_OA_URL = 'https://line.me/R/ti/p/@ezdoc';
const AFFILIATE_DISCOUNT_PERCENT = 10;
const AFFILIATE_DURATION_MONTHS = 1;

function generateAffiliateCode(seed: string): string {
  const clean = seed.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const suffix = clean.slice(-4) || Math.random().toString(36).substring(2, 6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `AFF-${suffix}${random}`;
}

async function ensureAffiliateCode(userId: string): Promise<string> {
  const userRef = db.doc(`users/${userId}`);
  const userSnap = await userRef.get();
  const existingCode = userSnap.exists ? (userSnap.data()?.affiliate_code as string | undefined) : undefined;
  if (existingCode) return existingCode;

  let code = '';
  for (let i = 0; i < 5; i += 1) {
    const candidate = generateAffiliateCode(userId);
    const snap = await db.collection('promo_codes').doc(candidate).get();
    if (!snap.exists) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    code = generateAffiliateCode(`${userId}-${Date.now()}`);
  }

  await userRef.set({ affiliate_code: code }, { merge: true });
  return code;
}

async function ensureAffiliatePromo(code: string, userId: string): Promise<void> {
  const promoRef = db.collection('promo_codes').doc(code);
  const promoSnap = await promoRef.get();
  const promo: PromoCodeDoc = {
    code,
    active: true,
    applies_to: 'ALL',
    discount_percent: AFFILIATE_DISCOUNT_PERCENT,
    duration_months: AFFILIATE_DURATION_MONTHS,
    type: 'AFFILIATE',
    owner_user_id: userId,
    package_types: [PACKAGE_TYPE_PRO, PACKAGE_TYPE_TEAM],
  };

  if (promoSnap.exists) {
    await promoRef.set(
      {
        ...promo,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }

  await promoRef.set(
    {
      ...promo,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      redeemed_count: 0,
    },
    { merge: true }
  );
}

export async function buildAffiliateInfoMessage(userId: string): Promise<string> {
  const code = await ensureAffiliateCode(userId);
  await ensureAffiliatePromo(code, userId);

  return (
    'ติ๊ดๆ โค้ดแนะนำเพื่อนของเจ้านายพร้อมแล้วครับ 🎟️\n\n' +
    `โค้ด ${code}\n` +
    `ลิงก์แอด ${LINE_OA_URL}\n\n` +
    'ให้เพื่อนพิมพ์ว่า "ใช้โค้ด <โค้ด>"\n' +
    'แล้วพิมพ์ซื้อแพ็ค 99 ครับ\n' +
    `ส่วนลดตามโค้ดสูงสุด ${AFFILIATE_DISCOUNT_PERCENT}%`
  );
}
