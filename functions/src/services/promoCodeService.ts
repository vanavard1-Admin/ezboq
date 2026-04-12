import { getDb } from '../core/firebaseAdmin';
import * as admin from 'firebase-admin';
import {
  PACKAGE_TYPE_PRO,
  PACKAGE_TYPE_TEAM,
  normalizePackageType,
  type AnyPackageType,
  type PackageType,
} from './purchaseService';

export type PromoAppliesTo = 'PRO' | 'TEAM' | 'ALL';
export type PromoCodeType = 'PROMO' | 'AFFILIATE';

export interface PromoCodeDoc {
  code: string;
  active?: boolean;
  applies_to?: PromoAppliesTo;
  discounted_amount?: number;
  discount_amount?: number;
  discount_percent?: number;
  duration_months?: number;
  max_redemptions?: number;
  redeemed_count?: number;
  starts_at?: admin.firestore.Timestamp;
  expires_at?: admin.firestore.Timestamp;
  type?: PromoCodeType;
  owner_user_id?: string;
  package_types?: AnyPackageType[];
  packageTypes?: AnyPackageType[];
}

export interface PromoCodePreview {
  valid: boolean;
  code: string;
  appliesTo?: PromoAppliesTo;
  discountedAmount?: number;
  discountAmount?: number;
  discountPercent?: number;
  durationMonths?: number;
  packageTypes?: PackageType[];
  reason?: string;
}

const db = getDb();
const PENDING_PROMO_TTL_MS = 60 * 60 * 1000;

const DEFAULT_PROMOS: Record<string, PromoCodeDoc> = {
  PRO99: {
    code: 'PRO99',
    active: true,
    applies_to: 'PRO',
    discounted_amount: 99,
    duration_months: 3,
    type: 'PROMO',
    package_types: [PACKAGE_TYPE_PRO],
  },
  START99: {
    code: 'START99',
    active: true,
    applies_to: 'PRO',
    discounted_amount: 99,
    duration_months: 3,
    type: 'PROMO',
    package_types: [PACKAGE_TYPE_PRO],
  },
};

function normalizePromoCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
}

export function parsePromoCodeFromText(text: string): string | null {
  if (!text) return null;
  const normalizedText = text.trim();
  const patterns = [
    /(ใช้โค้ด|โค้ดส่วนลด|ใส่โค้ด|promo\s*code|discount\s*code)\s*[:=]?\s*([A-Za-z0-9-]+)/i,
    /(คูปอง|โค้ด)\s*[:=]?\s*([A-Za-z0-9-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (match && match[2]) return normalizePromoCode(match[2]);
  }

  const tokens = normalizedText.split(/\s+/).filter(Boolean);
  if (tokens.length === 1 && tokens[0].length >= 4) {
    return normalizePromoCode(tokens[0]);
  }

  return null;
}

function readPromoField<T>(promo: Record<string, any>, keys: string[]): T | undefined {
  for (const key of keys) {
    if (promo[key] !== undefined && promo[key] !== null) return promo[key] as T;
  }
  return undefined;
}

function coerceAppliesTo(promo: PromoCodeDoc): PromoAppliesTo {
  return (
    readPromoField<PromoAppliesTo>(promo as Record<string, any>, ['applies_to', 'appliesTo']) ||
    'ALL'
  );
}

function coercePackageTypes(promo: PromoCodeDoc): PackageType[] | undefined {
  const rawPackageTypes = readPromoField<unknown[]>(promo as Record<string, any>, ['package_types', 'packageTypes']);
  if (!Array.isArray(rawPackageTypes)) {
    return undefined;
  }

  const normalized = rawPackageTypes
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .map((value) => normalizePackageType(value as AnyPackageType));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
}

function normalizePromoDoc(promo: PromoCodeDoc, code: string): PromoCodeDoc {
  const normalizedCode = normalizePromoCode(code);
  const packageTypes = coercePackageTypes(promo);

  if (packageTypes && packageTypes.length > 0) {
    return {
      ...promo,
      code: normalizedCode,
      package_types: packageTypes,
    };
  }

  if (promo.type === 'AFFILIATE') {
    return {
      ...promo,
      code: normalizedCode,
      package_types: [PACKAGE_TYPE_PRO, PACKAGE_TYPE_TEAM],
    };
  }

  return {
    ...promo,
    code: normalizedCode,
  };
}

export function isPendingPromoExpired(value?: admin.firestore.Timestamp | null): boolean {
  if (!value) return false;
  return Date.now() - value.toMillis() > PENDING_PROMO_TTL_MS;
}

async function loadPromoCode(code: string): Promise<PromoCodeDoc | null> {
  const normalized = normalizePromoCode(code);
  const defaultPromo = DEFAULT_PROMOS[normalized];
  const doc = await db.collection('promo_codes').doc(normalized).get();
  if (doc.exists) {
    const data = doc.data() as PromoCodeDoc;
    return normalizePromoDoc({ ...defaultPromo, ...data }, normalized);
  }
  return defaultPromo ? normalizePromoDoc(defaultPromo, normalized) : null;
}

function validatePromo(promo: PromoCodeDoc): { ok: boolean; reason?: string } {
  const now = admin.firestore.Timestamp.now();
  const active = promo.active !== false;
  if (!active) return { ok: false, reason: 'โค้ดถูกปิดการใช้งาน' };

  const startsAt = readPromoField<admin.firestore.Timestamp>(promo as Record<string, any>, ['starts_at', 'startsAt']);
  if (startsAt && startsAt.toMillis() > now.toMillis()) {
    return { ok: false, reason: 'โค้ดยังไม่เริ่มใช้งาน' };
  }

  const expiresAt = readPromoField<admin.firestore.Timestamp>(promo as Record<string, any>, ['expires_at', 'expiresAt']);
  if (expiresAt && expiresAt.toMillis() <= now.toMillis()) {
    return { ok: false, reason: 'โค้ดหมดอายุ' };
  }

  const maxRedemptions = readPromoField<number>(promo as Record<string, any>, ['max_redemptions', 'maxRedemptions']);
  const redeemedCount = readPromoField<number>(promo as Record<string, any>, ['redeemed_count', 'redeemedCount']) || 0;
  if (maxRedemptions && redeemedCount >= maxRedemptions) {
    return { ok: false, reason: 'โค้ดเต็มแล้ว' };
  }

  return { ok: true };
}

export async function previewPromoCode(code: string): Promise<PromoCodePreview> {
  const normalized = normalizePromoCode(code);
  const promo = await loadPromoCode(normalized);
  if (!promo) return { valid: false, code: normalized, reason: 'ไม่พบโค้ด' };

  const validation = validatePromo(promo);
  if (!validation.ok) return { valid: false, code: normalized, reason: validation.reason };

  return {
    valid: true,
    code: normalized,
    appliesTo: coerceAppliesTo(promo),
    discountedAmount: readPromoField<number>(promo as Record<string, any>, ['discounted_amount', 'discountedAmount']),
    discountAmount: readPromoField<number>(promo as Record<string, any>, ['discount_amount', 'discountAmount']),
    discountPercent: readPromoField<number>(promo as Record<string, any>, ['discount_percent', 'discountPercent']),
    durationMonths: readPromoField<number>(promo as Record<string, any>, ['duration_months', 'durationMonths']),
    packageTypes: coercePackageTypes(promo),
  };
}

export async function resolvePromoCode(code: string): Promise<PromoCodeDoc | null> {
  const normalized = normalizePromoCode(code);
  const promo = await loadPromoCode(normalized);
  if (!promo) return null;

  const validation = validatePromo(promo);
  if (!validation.ok) return null;
  return { ...promo, code: normalized };
}

export async function setPendingPromoCode(
  userId: string,
  code: string,
  preview: PromoCodePreview,
  packageType?: AnyPackageType | null
): Promise<void> {
  const payload = {
    pending_promo_code: normalizePromoCode(code),
    pending_promo_preview: preview,
    pending_promo_at: admin.firestore.FieldValue.serverTimestamp(),
    pending_promo_package_type:
      packageType == null
        ? admin.firestore.FieldValue.delete()
        : normalizePackageType(packageType),
  };
  await db.doc(`users/${userId}`).set(payload, { merge: true });
}

export async function getPendingPromoCode(
  userId: string
): Promise<{
  code: string | null;
  preview?: PromoCodePreview | null;
  packageType?: PackageType | null;
  appliedAt?: admin.firestore.Timestamp | null;
}> {
  const snap = await db.doc(`users/${userId}`).get();
  if (!snap.exists) return { code: null, preview: null, packageType: null, appliedAt: null };
  const data = snap.data() || {};
  return {
    code: (data.pending_promo_code as string) || null,
    preview: (data.pending_promo_preview as PromoCodePreview) || null,
    packageType: data.pending_promo_package_type !== undefined
      ? normalizePackageType(Number(data.pending_promo_package_type) as AnyPackageType)
      : null,
    appliedAt: (data.pending_promo_at as admin.firestore.Timestamp | undefined) || null,
  };
}

export async function clearPendingPromoCode(userId: string): Promise<void> {
  await db.doc(`users/${userId}`).set(
    {
      pending_promo_code: admin.firestore.FieldValue.delete(),
      pending_promo_preview: admin.firestore.FieldValue.delete(),
      pending_promo_at: admin.firestore.FieldValue.delete(),
      pending_promo_package_type: admin.firestore.FieldValue.delete(),
    },
    { merge: true }
  );
}

export function applyPromoToAmount(params: {
  baseAmount: number;
  promo: PromoCodeDoc;
  plan: 'PRO' | 'TEAM';
  packageType: AnyPackageType;
}): {
  ok: boolean;
  finalAmount: number;
  discountAmount: number;
  discountPercent?: number;
  durationMonths?: number;
  reason?: string;
} {
  const { baseAmount, promo, plan, packageType } = params;
  const appliesTo = coerceAppliesTo(promo);
  if (appliesTo !== 'ALL' && appliesTo !== plan) {
    return {
      ok: false,
      finalAmount: baseAmount,
      discountAmount: 0,
      reason: 'PLAN_MISMATCH',
    };
  }

  const packageTypes = coercePackageTypes(promo);
  const normalizedPackageType = normalizePackageType(packageType);
  if (packageTypes && !packageTypes.includes(normalizedPackageType)) {
    return {
      ok: false,
      finalAmount: baseAmount,
      discountAmount: 0,
      reason: 'PACKAGE_MISMATCH',
    };
  }

  const discountedAmount = readPromoField<number>(promo as Record<string, any>, ['discounted_amount', 'discountedAmount']);
  const discountAmount = readPromoField<number>(promo as Record<string, any>, ['discount_amount', 'discountAmount']);
  const discountPercent = readPromoField<number>(promo as Record<string, any>, ['discount_percent', 'discountPercent']);
  const durationMonths = readPromoField<number>(promo as Record<string, any>, ['duration_months', 'durationMonths']);

  let finalAmount = baseAmount;
  let appliedDiscount = 0;

  if (typeof discountedAmount === 'number') {
    finalAmount = Math.max(1, Math.round(discountedAmount));
    appliedDiscount = Math.max(0, baseAmount - finalAmount);
  } else if (typeof discountPercent === 'number') {
    finalAmount = Math.max(1, Math.round(baseAmount * (1 - discountPercent / 100)));
    appliedDiscount = Math.max(0, baseAmount - finalAmount);
  } else if (typeof discountAmount === 'number') {
    finalAmount = Math.max(1, Math.round(baseAmount - discountAmount));
    appliedDiscount = Math.max(0, baseAmount - finalAmount);
  }

  return {
    ok: true,
    finalAmount,
    discountAmount: appliedDiscount,
    discountPercent: discountPercent,
    durationMonths,
  };
}

export async function markPromoRedeemed(params: {
  userId: string;
  promoCode: string;
  purchaseId: string;
  plan: 'PRO' | 'TEAM';
  amount: number;
  originalAmount: number;
}): Promise<void> {
  const { userId, promoCode, purchaseId, plan, amount, originalAmount } = params;
  const normalized = normalizePromoCode(promoCode);
  const promoRef = db.collection('promo_codes').doc(normalized);
  const redemptionRef = db.collection('promo_redemptions').doc();

  await redemptionRef.set({
    code: normalized,
    user_id: userId,
    purchase_id: purchaseId,
    plan,
    amount,
    original_amount: originalAmount,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  const promoSnap = await promoRef.get();
  if (promoSnap.exists) {
    await promoRef.set(
      {
        redeemed_count: admin.firestore.FieldValue.increment(1),
        last_redeemed_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
}
