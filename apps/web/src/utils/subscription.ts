import { db, storage, functions } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import type { AuthUser } from './authSession';
import generatePayload from 'promptpay-qr';

// ─── Types ───────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: 'solo' | 'team';
  name: string;
  price: number;
  originalPrice: number;
  maxUsers: number;
  description: string;
  headline: string;
  ctaLabel: string;
  features: string[];
}

export interface FreeTierPlan {
  id: 'free';
  name: string;
  price: number;
  maxUsers: number;
  description: string;
  headline: string;
  ctaLabel: string;
  features: string[];
}

export type SubscriptionStatusType = 'pending' | 'active' | 'expired' | 'cancelled';

export interface PaymentRecord {
  amount: number;
  date: string;
  method: 'promptpay';
  note?: string;
}

export interface DiscountCoupon {
  code: string;
  type: 'percent' | 'fixed';  // percent: 0-1 (e.g. 0.2 = 20%), fixed: baht
  value: number;
  expiresAt: string | null;
  applicablePlans: ('solo' | 'team')[];
  maxUses: number | null;
  usedCount: number;
  active: boolean;
}

export interface AppliedCoupon {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  discountAmount: number;
  finalPrice: number;
}

export interface SubscriptionStatus {
  plan: 'solo' | 'team' | null;
  status: SubscriptionStatusType;
  startDate: string | null;
  endDate: string | null;
  paymentHistory: PaymentRecord[];
  createdAt: string;
  userName?: string;
  userEmail?: string;
  workspaceId?: string;
  workspaceName?: string;
  appliedCoupon?: AppliedCoupon;
}

const PENDING_SUBSCRIPTION_STORAGE_KEY = 'ezboq_pending_sub';

// ─── Plans Data ──────────────────────────────────────────────────────

export const FREE_TIER: FreeTierPlan = {
  id: 'free',
  name: 'Free',
  price: 0,
  maxUsers: 1,
  description: 'เริ่มทดลองก่อนจ่าย เมื่อพร้อมค่อยอัปเกรด',
  headline: 'เหมาะกับช่างหรือเจ้าของกิจการที่ต้องการลองระบบก่อน',
  ctaLabel: 'เริ่มใช้ฟรีเร็ว ๆ นี้',
  features: [
    'สร้างใบเสนอราคาได้สูงสุด 10 ใบ/เดือน',
    'ใช้งานได้ 1 ผู้ใช้',
    'มีลายน้ำ EzBOQ',
    'เหมาะสำหรับทดลอง workflow ก่อนขายงานจริง',
  ],
};

export const PLAN_LABELS: Record<Exclude<SubscriptionStatus['plan'], null>, string> = {
  solo: 'Pro',
  team: 'Business',
};

export function getSubscriptionPlanLabel(plan: SubscriptionStatus['plan']): string {
  if (!plan) return 'Free';
  return PLAN_LABELS[plan] ?? 'Free';
}

export const PLANS: SubscriptionPlan[] = [
  {
    id: 'solo',
    name: 'Pro',
    price: 99,
    originalPrice: 99,
    maxUsers: 1,
    description: 'สำหรับเจ้าของกิจการหรือช่างที่ต้องออกเอกสารครบวงจรคนเดียว',
    headline: 'ปิดงาน จ่ายบิล รับเงิน ได้ครบในแพ็กเดียว',
    ctaLabel: 'อัปเกรดเป็น Pro',
    features: [
      'ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ ไม่จำกัด',
      'ไม่มีลายน้ำ พร้อมโลโก้และลายเซ็น',
      'Export PDF และเก็บเอกสารบนคลาวด์',
      'เหมาะกับ 1 ผู้ใช้ที่ต้องการ workflow จบงานเร็ว',
    ],
  },
  {
    id: 'team',
    name: 'Business',
    price: 279,
    originalPrice: 279,
    maxUsers: 3,
    description: 'สำหรับทีมขาย ทีมประสานงาน หรือธุรกิจที่มีหลายคนช่วยกันปิดงาน',
    headline: 'แชร์งานในทีม ดูสถานะเดียวกัน และควบคุมสิทธิ์ได้',
    ctaLabel: 'อัปเกรดเป็น Business',
    features: [
      'ทุกอย่างใน Pro',
      'สูงสุด 3 ผู้ใช้',
      'แชร์โปรเจคในทีม',
      'สิทธิ์สมาชิก รายงาน และ audit log',
    ],
  },
];

// ─── PromptPay & Bank Account ─────────────────────────────────────────

const PROMPTPAY_ID = '0933299990';

export const COMPANY_BANK_ACCOUNT = {
  bankName: 'ธนาคารกสิกรไทย (KBank)',
  accountName: 'นาย ฉัตรดนัย จิตต์เพ็ชร',
  accountNameEn: 'MR. CHATDANAI JITPHET',
  accountNumber: '219-8-03162-6',
  branch: 'สาขาเอสพละนาด รัชดาภิเษก',
  accountType: 'ออมทรัพย์อิเล็กทรอนิกส์ (K-eSavings)',
  promptpayRef: '004999230534827',
} as const;

export function generatePromptPayQRPayload(amount: number): string {
  return generatePayload(PROMPTPAY_ID, { amount });
}

// ─── Firestore Helpers ───────────────────────────────────────────────

function subscriptionDocRef(workspaceId: string) {
  return doc(db, 'workspaces', workspaceId, 'subscription', 'current');
}

export async function checkSubscription(user: AuthUser): Promise<SubscriptionStatus | null> {
  try {
    const ref = subscriptionDocRef(user.workspaceId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as SubscriptionStatus;
  } catch {
    return null;
  }
}

export async function isSubscriptionActive(user: AuthUser): Promise<boolean> {
  const sub = await checkSubscription(user);
  if (!sub) return false;
  if (sub.status !== 'active') return false;
  if (sub.endDate && new Date(sub.endDate) < new Date()) return false;
  return true;
}

export async function createPendingSubscription(
  user: AuthUser,
  planId: 'solo' | 'team',
): Promise<void> {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error('Invalid plan');

  const now = new Date().toISOString();
  const data: SubscriptionStatus = {
    plan: planId,
    status: 'pending',
    startDate: null,
    endDate: null,
    paymentHistory: [
      {
        amount: plan.price,
        date: now,
        method: 'promptpay',
        note: 'รอตรวจสอบการโอนเงิน',
      },
    ],
    createdAt: now,
    userName: user.name,
    userEmail: user.email,
    workspaceId: user.workspaceId,
    workspaceName: user.workspaceName,
  };

  // Save to workspace subcollection
  await setDoc(subscriptionDocRef(user.workspaceId), data);
  // Also save to flat collection for admin queries
  await setDoc(doc(db, 'subscription_requests', user.workspaceId), data);
}

export function loadPendingSubscriptionCache(): SubscriptionStatus | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(PENDING_SUBSCRIPTION_STORAGE_KEY);
    return stored ? JSON.parse(stored) as SubscriptionStatus : null;
  } catch {
    return null;
  }
}

export function savePendingSubscriptionCache(subscription: SubscriptionStatus): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PENDING_SUBSCRIPTION_STORAGE_KEY, JSON.stringify(subscription));
}

export function clearPendingSubscriptionCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PENDING_SUBSCRIPTION_STORAGE_KEY);
}

export async function approveSubscription(workspaceId: string): Promise<void> {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30);

  const updates = {
    status: 'active',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
  };

  await updateDoc(subscriptionDocRef(workspaceId), updates);
  await updateDoc(doc(db, 'subscription_requests', workspaceId), updates);
}

export async function getAllPendingSubscriptions(): Promise<SubscriptionStatus[]> {
  const ref = collection(db, 'subscription_requests');
  const q = query(ref, where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), workspaceId: d.id } as SubscriptionStatus));
}

export interface SubmitPaymentResult {
  autoApproved: boolean;
  status: 'active' | 'pending_review' | 'error';
  reason: string;
}

export async function submitPaymentWithSlip(
  user: AuthUser,
  planId: 'solo' | 'team',
  slipFile: File,
): Promise<SubmitPaymentResult> {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error('Invalid plan');

  // Upload slip to Storage
  const timestamp = Date.now();
  const ext = slipFile.name.split('.').pop() || 'jpg';
  const slipPath = `payment-slips/${user.workspaceId}/${timestamp}.${ext}`;
  const slipRef = ref(storage, slipPath);
  await uploadBytes(slipRef, slipFile, { contentType: slipFile.type });
  const slipUrl = await getDownloadURL(slipRef);

  const now = new Date().toISOString();
  const data: SubscriptionStatus & { slipUrl?: string; slipPath?: string } = {
    plan: planId,
    status: 'pending',
    startDate: null,
    endDate: null,
    paymentHistory: [
      {
        amount: plan.price,
        date: now,
        method: 'promptpay',
        note: 'กำลังตรวจสอบสลิป...',
      },
    ],
    createdAt: now,
    userName: user.name,
    userEmail: user.email,
    workspaceId: user.workspaceId,
    workspaceName: user.workspaceName,
    slipUrl,
    slipPath,
  };

  // Save pending subscription first
  await setDoc(subscriptionDocRef(user.workspaceId), data);
  await setDoc(doc(db, 'subscription_requests', user.workspaceId), data);

  // Call server-side verification for instant approval
  try {
    const verify = httpsCallable<
      { workspaceId: string; slipPath: string },
      { status: 'active' | 'pending_review' | 'error'; reason: string }
    >(functions, 'verifySubscriptionSlip');
    const result = await verify({ workspaceId: user.workspaceId, slipPath });
    return {
      autoApproved: result.data.status === 'active',
      status: result.data.status,
      reason: result.data.reason,
    };
  } catch (err) {
    console.warn('[submitPaymentWithSlip] Server verification failed, falling back to manual:', err);
    return {
      autoApproved: false,
      status: 'pending_review',
      reason: 'รอแอดมินตรวจสอบ (การตรวจอัตโนมัติไม่พร้อมใช้)',
    };
  }
}

// ─── Coupon Codes ─────────────────────────────────────────────────────

function couponDocRef(code: string) {
  return doc(db, 'discount_coupons', code.toUpperCase().trim());
}

export type CouponValidationResult =
  | { valid: true; coupon: DiscountCoupon; applied: AppliedCoupon }
  | { valid: false; reason: string };

export async function validateCouponCode(
  code: string,
  planId: 'solo' | 'team',
): Promise<CouponValidationResult> {
  const normalized = code.toUpperCase().trim();
  if (!normalized) return { valid: false, reason: 'กรุณากรอกรหัสส่วนลด' };

  const snap = await getDoc(couponDocRef(normalized));
  if (!snap.exists()) return { valid: false, reason: 'รหัสส่วนลดไม่ถูกต้อง' };

  const coupon = snap.data() as DiscountCoupon;

  if (!coupon.active) return { valid: false, reason: 'รหัสส่วนลดนี้ถูกปิดใช้งานแล้ว' };

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, reason: 'รหัสส่วนลดหมดอายุแล้ว' };
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, reason: 'รหัสส่วนลดถูกใช้งานครบแล้ว' };
  }

  if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(planId)) {
    return { valid: false, reason: `รหัสส่วนลดนี้ใช้ได้เฉพาะแพ็กเกจ ${coupon.applicablePlans.map((p) => PLAN_LABELS[p]).join(', ')}` };
  }

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return { valid: false, reason: 'ไม่พบแพ็กเกจ' };

  const discountAmount = coupon.type === 'percent'
    ? Math.round(plan.price * coupon.value)
    : Math.min(coupon.value, plan.price);
  const finalPrice = Math.max(0, plan.price - discountAmount);

  return {
    valid: true,
    coupon,
    applied: {
      code: normalized,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
      finalPrice,
    },
  };
}

export async function createPendingSubscriptionWithCoupon(
  user: AuthUser,
  planId: 'solo' | 'team',
  appliedCoupon?: AppliedCoupon,
): Promise<void> {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error('Invalid plan');

  const finalAmount = appliedCoupon ? appliedCoupon.finalPrice : plan.price;
  const now = new Date().toISOString();

  const data: SubscriptionStatus = {
    plan: planId,
    status: 'pending',
    startDate: null,
    endDate: null,
    paymentHistory: [
      {
        amount: finalAmount,
        date: now,
        method: 'promptpay',
        note: appliedCoupon
          ? `รอตรวจสอบการโอนเงิน (ใช้โค้ด ${appliedCoupon.code} ลด ${appliedCoupon.discountAmount} บาท)`
          : 'รอตรวจสอบการโอนเงิน',
      },
    ],
    createdAt: now,
    userName: user.name,
    userEmail: user.email,
    workspaceId: user.workspaceId,
    workspaceName: user.workspaceName,
    ...(appliedCoupon ? { appliedCoupon } : {}),
  };

  await setDoc(subscriptionDocRef(user.workspaceId), data);
  await setDoc(doc(db, 'subscription_requests', user.workspaceId), data);

  if (appliedCoupon) {
    await updateDoc(couponDocRef(appliedCoupon.code), { usedCount: increment(1) });
  }
}
