import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Subscription Purchase Service
 * 
 * Handles subscription purchases (99) via PromptPay QR.
 * 
 * CRITICAL:
 * - Webhook replies immediately (<300ms)
 * - QR generation is async (fire-and-forget)
 * - Never await QR generation in webhook
 */

import * as admin from 'firebase-admin';
import generatePayload from 'promptpay-qr';
import * as QRCode from 'qrcode';
import { getLineChannelAccessToken } from '../shared/config';

const db = getDb();
const storage = admin.storage();

// ========================
// PAYMENT CONFIG (HARDCODED)
// ========================
const PROMPTPAY_ID = '0933299990';
const PROMPTPAY_NAME = 'นายฉัตรดนัย จิตต์เพ็ชร';
const BANK_NAME = 'KBANK';

// ========================
// PACKAGE CONFIG (AUTHORITATIVE - SINGLE SOURCE OF TRUTH)
// ========================
export type PackageKind = 'SUBSCRIPTION';

export interface PackageDefinition {
  amount: number;
  credits: number | null;  // deprecated
  name: string;
  type: PackageKind;
  plan: 'PRO' | 'TEAM';
  seats: number;
  durationMonths: number;
}

export const PACKAGE_TYPE_PRO = 99;
export const PACKAGE_TYPE_PRO_YEAR = 990;
export const PACKAGE_TYPE_TEAM = 279;
export const PACKAGE_TYPE_TEAM_YEAR = 2790;
export type PackageType = typeof PACKAGE_TYPE_PRO | typeof PACKAGE_TYPE_PRO_YEAR | typeof PACKAGE_TYPE_TEAM | typeof PACKAGE_TYPE_TEAM_YEAR;
export type LegacyPackageType = 199 | 299 | 399 | 3990;
export type AnyPackageType = PackageType | LegacyPackageType;

export const LEGACY_PACKAGE_TYPE_MAP: Record<LegacyPackageType, PackageType> = {
  199: PACKAGE_TYPE_PRO,
  299: PACKAGE_TYPE_TEAM,
  399: PACKAGE_TYPE_TEAM,
  3990: PACKAGE_TYPE_TEAM_YEAR,
};

export const PACKAGES: Record<PackageType, PackageDefinition> = {
  [PACKAGE_TYPE_PRO]: {
    amount: 99,
    credits: null,
    name: 'EzDOC Pro รายเดือน',
    type: 'SUBSCRIPTION',
    plan: 'PRO',
    seats: 1,
    durationMonths: 1,
  },
  [PACKAGE_TYPE_PRO_YEAR]: {
    amount: 891,
    credits: null,
    name: 'แพ็ก Pro รายปี (ลด 25%)',
    type: 'SUBSCRIPTION',
    plan: 'PRO',
    seats: 1,
    durationMonths: 12,
  },
  [PACKAGE_TYPE_TEAM]: {
    amount: 279,
    credits: null,
    name: 'EzDOC Team รายเดือน',
    type: 'SUBSCRIPTION',
    plan: 'TEAM',
    seats: 3,
    durationMonths: 1,
  },
  [PACKAGE_TYPE_TEAM_YEAR]: {
    amount: 2511,
    credits: null,
    name: 'แพ็ก Team รายปี (ลด 25%)',
    type: 'SUBSCRIPTION',
    plan: 'TEAM',
    seats: 3,
    durationMonths: 12,
  },
};

export function normalizePackageType(type: AnyPackageType): PackageType {
  return LEGACY_PACKAGE_TYPE_MAP[type as LegacyPackageType] || (type as PackageType);
}

export function getPackageDefinition(type: AnyPackageType): PackageDefinition | null {
  const normalized = normalizePackageType(type);
  return PACKAGES[normalized] || null;
}

export function getPackagePlan(type: AnyPackageType): 'PRO' | 'TEAM' {
  const pkg = getPackageDefinition(type);
  return pkg?.plan || 'PRO';
}

export function getPackageSeats(type: AnyPackageType): number {
  const pkg = getPackageDefinition(type);
  return pkg?.seats || 1;
}

// ========================
// TIMING CONFIG
// ========================
const QR_EXPIRY_MINUTES = 15;
const REMINDER_AFTER_MINUTES = 10;

// ========================
// PURCHASE STATUSES
// ========================
export type PurchaseStatus = 
  | 'PENDING'           // QR not yet generated
  | 'WAITING_FOR_SLIP'  // QR sent, waiting for slip image
  | 'PENDING_REVIEW'    // Slip received, pending admin review
  | 'PAID'              // Payment confirmed
  | 'EXPIRED'           // QR expired
  | 'FAILED'            // QR generation failed
  | 'REJECTED';         // Slip OCR rejected

// Instruction message after QR
export const SLIP_INSTRUCTION_MESSAGE = `📸 หลังโอนเงิน ส่งสลิปในแชทนี้ได้เลยครับเจ้านาย\nระบบจะตรวจสอบให้อัตโนมัติครับ`;

export interface CreditPurchase {
  id: string;
  userId: string;
  lineUserId: string;
  packageType: AnyPackageType;
  packageKind: PackageKind;
  plan?: 'PRO' | 'TEAM';
  seat_total?: number;
  amount: number;
  promo_code?: string;
  promo_original_amount?: number;
  promo_discount_amount?: number;
  promo_discount_percent?: number;
  promo_duration_months?: number;
  promo_applied_at?: admin.firestore.Timestamp;
  credits: number | null;  // deprecated
  status: PurchaseStatus;
  referenceId: string;
  promptpayId: string;
  promptpayName: string;
  qrDataUrl?: string;
  qrImageUrl?: string;
  qrPayload?: string;
  createdAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
  paidAt?: admin.firestore.Timestamp;
  payment_pending_reminded?: boolean;
  // Slip OCR fields
  slipMessageId?: string;
  slip_message_id?: string;
  slipReceivedAt?: admin.firestore.Timestamp;
  slip_received_at?: admin.firestore.Timestamp;
  slip_image_url?: string;
  slip_uploaded_at?: admin.firestore.Timestamp;
  slip_hash?: string;
  slip_transaction_ref?: string;
  slip_ocr_raw_text?: string;
  slip_ocr_confidence?: number;
  slip_parsed_result?: {
    amount: number | null;
    receiverMatched: boolean;
    suffixMatched: boolean;
    ref: string | null;
    transaction_datetime?: Date | null;
  };
  verified_by?: 'OCR' | 'ADMIN' | null;
  // Fraud detection fields
  fraud_score?: number;
  fraud_flags?: string[];
  fraud_reason?: string;
  time_check_result?: 'PASS' | 'FAIL' | 'UNKNOWN';
  reviewed_by?: string;
  reviewed_at?: admin.firestore.Timestamp;
  manual_review_required?: boolean;
  needs_review?: boolean;
  auto_verification_status?: PurchaseStatus;
  auto_verification_reason?: string;
  // Retry tracking
  retry_count?: number;
  last_retry_at?: admin.firestore.Timestamp;
  // OCR delay notification
  delay_notified?: boolean;
  delay_notified_at?: admin.firestore.Timestamp;
  admin_notified?: boolean;
  admin_notified_at?: admin.firestore.Timestamp;
  slip_upload_missing?: boolean;
  slip_upload_missing_at?: admin.firestore.Timestamp;
  // Image quality
  image_quality_score?: number;
  image_quality_issues?: string[];
  // Delivery idempotency (Task D4)
  delivery_sent?: boolean;
  delivery_sent_at?: admin.firestore.Timestamp;
  delivery_sent_status?: PurchaseStatus;
  // Updated timestamp
  updatedAt?: admin.firestore.Timestamp;
  updated_at?: admin.firestore.Timestamp;
  traceId?: string;
  trace_id?: string;
  // Payment settlement fields (P0 hardening)
  credit_applied?: boolean;
  credit_applied_at?: admin.firestore.Timestamp;
  payment_verified_at?: admin.firestore.Timestamp;
  settlement_trace_id?: string;
  settlement_version?: string;
  subscription_success_message_sent_at?: admin.firestore.Timestamp;
  subscription_receipt_doc_no?: string;
  subscription_receipt_pdf_path?: string;
  subscription_receipt_short_url?: string;
  subscription_receipt_sent_at?: admin.firestore.Timestamp;
  subscription_receipt_admin_sent_at?: admin.firestore.Timestamp;
  subscription_receipt_admin_line_sent_count?: number;
}

/**
 * Generate unique reference ID for purchase
 */
function generateReferenceId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `EZ${dateStr}${random}`;
}

const ACTIVE_PURCHASE_STATUSES: PurchaseStatus[] = ['PENDING', 'WAITING_FOR_SLIP', 'PENDING_REVIEW'];
const QR_EXPIRY_GRACE_MS = 5 * 60 * 1000;
const REVIEW_ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function getPurchaseActivityTimestamp(purchase: CreditPurchase): admin.firestore.Timestamp | null {
  return (
    purchase.slip_uploaded_at ||
    purchase.slip_received_at ||
    purchase.slipReceivedAt ||
    purchase.updatedAt ||
    purchase.updated_at ||
    purchase.createdAt ||
    null
  );
}

function hasPendingSlipReceipt(purchase: CreditPurchase): boolean {
  const slipReceivedAt = purchase.slipReceivedAt || purchase.slip_received_at;
  return Boolean(
    (purchase.status === 'WAITING_FOR_SLIP' || purchase.status === 'EXPIRED') &&
    slipReceivedAt &&
    !purchase.slip_image_url
  );
}

function isRecoverableSlipUpload(purchase: CreditPurchase): boolean {
  return Boolean(
    !purchase.slip_image_url &&
    (hasPendingSlipReceipt(purchase) || purchase.slip_upload_missing)
  );
}

function isPurchaseStillActive(purchase: CreditPurchase, nowMs: number): boolean {
  if (purchase.status === 'PENDING_REVIEW') {
    const activity = getPurchaseActivityTimestamp(purchase);
    return Boolean(activity && nowMs - activity.toMillis() <= REVIEW_ACTIVE_WINDOW_MS);
  }

  if (hasPendingSlipReceipt(purchase)) {
    const activity = getPurchaseActivityTimestamp(purchase);
    return Boolean(activity && nowMs - activity.toMillis() <= REVIEW_ACTIVE_WINDOW_MS);
  }

  if (!purchase.expiresAt) {
    return false;
  }

  return purchase.expiresAt.toMillis() + QR_EXPIRY_GRACE_MS > nowMs;
}

async function findExistingActivePurchase(
  userId: string,
  now: admin.firestore.Timestamp,
  lineUserId?: string
): Promise<{ purchaseId: string; purchase: CreditPurchase } | null> {
  const existingQuery = await db
    .collection('credit_purchases')
    .where('userId', '==', userId)
    .limit(20)
    .get();

  const nowMs = now.toMillis();
  const activeDocs = existingQuery.docs
    .map((doc) => ({ purchaseId: doc.id, purchase: doc.data() as CreditPurchase }))
    .filter(({ purchase }) =>
      (ACTIVE_PURCHASE_STATUSES.includes(purchase.status) || isRecoverableSlipUpload(purchase)) &&
      isPurchaseStillActive(purchase, nowMs)
    )
    .sort((a, b) => b.purchase.createdAt.toMillis() - a.purchase.createdAt.toMillis());

  if (activeDocs[0]) {
    return activeDocs[0];
  }

  if (!lineUserId) {
    return null;
  }

  const fallbackQuery = await db
    .collection('credit_purchases')
    .where('lineUserId', '==', lineUserId)
    .limit(20)
    .get();

  if (fallbackQuery.empty) {
    return null;
  }

  const fallbackDocs = fallbackQuery.docs
    .map((doc) => ({ doc, purchase: doc.data() as CreditPurchase }))
    .filter(({ purchase }) =>
      (ACTIVE_PURCHASE_STATUSES.includes(purchase.status) || isRecoverableSlipUpload(purchase)) &&
      isPurchaseStillActive(purchase, nowMs)
    )
    .sort((a, b) => b.purchase.createdAt.toMillis() - a.purchase.createdAt.toMillis());

  for (const { doc, purchase } of fallbackDocs) {
    if (purchase.userId !== lineUserId && purchase.userId !== userId) {
      continue;
    }

    if (purchase.userId === lineUserId) {
      await doc.ref.update({
        userId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[purchaseService] Normalized legacy purchase owner: purchaseId=${doc.id}, lineUserId=${lineUserId}, userId=${userId}`);
    }

    return {
      purchaseId: doc.id,
      purchase: {
        ...purchase,
        userId,
      },
    };
  }

  return null;
}

function buildExistingPurchaseResponse(
  lineUserId: string,
  existingPurchaseId: string,
  existingData: CreditPurchase
): { purchaseId: string; message: string } {
  if (hasPendingSlipReceipt(existingData)) {
    return existingData.slip_upload_missing
      ? {
          purchaseId: existingPurchaseId,
          message:
            'ติ๊ดๆ ระบบต้องการรูปสลิปเดิมอีกครั้งครับเจ้านาย\n🚫 ไม่ต้องโอนซ้ำ ส่งรูปสลิปเดิมในแชทนี้ได้เลยครับ',
        }
      : {
          purchaseId: existingPurchaseId,
          message:
            'ติ๊ดๆ ได้รับรูปสลิปแล้วครับเจ้านาย กำลังประมวลผลอยู่\n🚫 ไม่ต้องโอนซ้ำนะครับ',
        };
  }

  if (existingData.status === 'PENDING_REVIEW') {
    return {
      purchaseId: existingPurchaseId,
      message:
        'ติ๊ดๆ ระบบกำลังตรวจสอบสลิปเดิมอยู่ครับเจ้านาย\n🚫 ไม่ต้องโอนซ้ำนะครับ',
    };
  }

  if (existingData.qrDataUrl || existingData.qrImageUrl) {
    console.log(`[purchaseService] Reusing existing purchase: ${existingPurchaseId}`);
    pushQrToLineAsync(lineUserId, existingData, existingPurchaseId).catch((error) => {
      console.error('[purchaseService] Failed to push existing QR:', error);
    });

    return {
      purchaseId: existingPurchaseId,
      message: `ติ๊ดๆ กำลังส่ง QR ชำระเงิน ${existingData.amount} บาทครับเจ้านาย รอสักครู่นะครับ`,
    };
  }

  return {
    purchaseId: existingPurchaseId,
    message: 'ติ๊ดๆ QR กำลังสร้าง รอสักครู่ได้นะครับเจ้านาย',
  };
}

/**
 * Create a new credit purchase (PENDING) and trigger async QR generation
 * 
 * This function returns IMMEDIATELY with a confirmation message.
 * QR generation happens in the background (fire-and-forget).
 * 
 * @returns Immediate reply message for webhook
 */
export async function createPurchase(params: {
  userId: string;
  lineUserId: string;
  packageType: AnyPackageType;
  allowRenewal?: boolean;
}): Promise<{ purchaseId: string; message: string }> {
  const { userId, lineUserId, packageType, allowRenewal } = params;
  const normalizedPackageType = normalizePackageType(packageType);
  const pkg = getPackageDefinition(normalizedPackageType);
  if (!pkg) {
    return {
      purchaseId: '',
      message: 'โอ๊ะ! แพ็กที่เลือกไม่รองรับแล้วครับเจ้านาย',
    };
  }

  // ✅ KILL-SWITCH: Check global purchases feature flag
  try {
    const purchaseFlag = await db.collection('feature_flags').doc('global_purchases_enabled').get();
    if (purchaseFlag.exists) {
      const flagData = purchaseFlag.data();
      if (flagData?.enabled === false) {
        console.log(`[BUY_FLOW_ABORTED] reason=kill_switch_enabled, userId=${userId}, lineUserId=${lineUserId}, packageType=${packageType}`);
        return { purchaseId: '', message: 'โอ๊ะ! ระบบซื้อแพ็คปิดชั่วคราวครับเจ้านาย ลองใหม่ทีหลังนะครับ' };
      }
    }
    // If flag doesn't exist or enabled=true, continue (default: allow)
  } catch (error) {
    console.warn(`[createPurchase] Error checking feature flag (non-blocking):`, error);
    // Fail-safe: if flag check fails, allow purchase (don't block on flag read error)
  }

  // ✅ GUARD 1: Validate userId
  if (!userId || userId.trim() === '') {
    console.log(`[BUY_FLOW_ABORTED] reason=invalid_userId, lineUserId=${lineUserId}, packageType=${packageType}`);
    return { purchaseId: '', message: 'โอ๊ะ! ไม่พบข้อมูลผู้ใช้ครับเจ้านาย\nเชื่อมต่อบัญชีอีกครั้งได้เลยนะครับ' };
  }

  // ✅ GUARD 2: Validate lineUserId
  if (!lineUserId || lineUserId.trim() === '') {
    console.log(`[BUY_FLOW_ABORTED] reason=invalid_lineUserId, userId=${userId}, packageType=${packageType}`);
    return { purchaseId: '', message: 'โอ๊ะ! ไม่พบข้อมูล LINE ครับเจ้านาย\nลองใหม่ได้เลยนะครับ' };
  }

  // ✅ GUARD 3: Validate package config
  if (!pkg.amount || pkg.amount <= 0) {
    console.log(`[BUY_FLOW_ABORTED] reason=missing_package_amount, userId=${userId}, packageType=${normalizedPackageType}, pkg=${JSON.stringify(pkg)}`);
    return { purchaseId: '', message: 'โอ๊ะ! หาแพ็คไม่เจอครับเจ้านาย\nลองใหม่ได้เลยนะครับ' };
  }

  const now = admin.firestore.Timestamp.now();

  // ✅ GUARD 5: Prevent duplicate subscription purchase while active
  try {
    const { getOrCreateSubscription } = await import('../core/subscriptionService');
    const { normalizePlan } = await import('../core/planService');
    const subscription = await getOrCreateSubscription(userId);
    const currentPlan = normalizePlan(subscription.plan as string);
    const targetPlan = pkg.plan;
    const periodEnd = subscription.periodEnd;
    const isActive =
      subscription.status === 'ACTIVE' &&
      periodEnd &&
      periodEnd.toMillis() > now.toMillis();

    const planRank: Record<string, number> = { FREE: 0, PRO: 1, TEAM: 2 };
    if (isActive) {
      const currentRank = planRank[currentPlan] ?? 0;
      const targetRank = planRank[targetPlan] ?? 0;
      const until = periodEnd?.toDate().toLocaleDateString('th-TH') || 'ไม่ทราบ';
      const currentLabel = currentPlan === 'TEAM' ? 'Team' : currentPlan === 'PRO' ? 'Pro' : 'Free';
      const targetLabel = targetPlan === 'TEAM' ? 'Team' : targetPlan === 'PRO' ? 'Pro' : 'Free';

      if (targetRank < currentRank) {
        return {
          purchaseId: '',
          message:
            `คุณมีแพ็ก ${currentLabel} ใช้งานได้ถึง ${until}\n` +
            `ไม่สามารถดาวน์เกรดเป็น ${targetLabel} ได้\n\n` +
            `พิมพ์: สถานะแพ็ก`,
        };
      }

      if (targetRank === currentRank && !allowRenewal) {
        return {
          purchaseId: '',
          message:
            `คุณมีแพ็ก ${currentLabel} ใช้งานได้ถึง ${until}\n` +
            `ยังไม่สามารถซื้อซ้ำได้\n\n` +
            `พิมพ์: สถานะแพ็ก`,
        };
      }
    }
  } catch (error) {
    console.warn('[createPurchase] Subscription check failed (non-blocking):', error);
  }

  let finalAmount = pkg.amount;
  let promoCodeApplied: string | null = null;
  let promoDiscountAmount = 0;
  let promoDiscountPercent: number | undefined;
  let promoDurationMonths: number | undefined;
  let promoNotice: string | null = null;

  try {
    const {
      getPendingPromoCode,
      resolvePromoCode,
      applyPromoToAmount,
      clearPendingPromoCode,
      isPendingPromoExpired,
    } = await import('./promoCodeService');

    const pending = await getPendingPromoCode(userId);
    if (pending.code) {
      if (isPendingPromoExpired(pending.appliedAt)) {
        await clearPendingPromoCode(userId);
        promoNotice = '⚠️ โค้ดส่วนลดหมดเวลาแล้ว ระบบจะคิดราคาเต็ม';
      } else if (
        pending.packageType !== null &&
        pending.packageType !== undefined &&
        normalizePackageType(pending.packageType) !== normalizedPackageType
      ) {
        await clearPendingPromoCode(userId);
        promoNotice = '⚠️ โค้ดส่วนลดใช้กับแพ็กที่เลือกตอนนี้ไม่ได้ ระบบจะคิดราคาเต็ม';
      } else {
        const promo = await resolvePromoCode(pending.code);
        if (!promo) {
          await clearPendingPromoCode(userId);
          promoNotice = '⚠️ โค้ดส่วนลดใช้ไม่ได้แล้ว ระบบจะคิดราคาเต็ม';
        } else {
          const applied = applyPromoToAmount({
            baseAmount: pkg.amount,
            promo,
            plan: pkg.plan,
            packageType: normalizedPackageType,
          });

          if (!applied.ok) {
            await clearPendingPromoCode(userId);
            promoNotice = applied.reason === 'PACKAGE_MISMATCH'
              ? '⚠️ โค้ดใช้กับรอบชำระเงินนี้ไม่ได้ ระบบจะคิดราคาเต็ม'
              : '⚠️ โค้ดใช้ได้เฉพาะแพ็กอื่น ระบบจะคิดราคาเต็ม';
          } else {
            finalAmount = applied.finalAmount;
            promoCodeApplied = promo.code;
            promoDiscountAmount = applied.discountAmount;
            promoDiscountPercent = applied.discountPercent;
            promoDurationMonths = applied.durationMonths;
          }
        }
      }
    }
  } catch (error) {
    console.warn('[createPurchase] Promo code check failed (non-blocking):', error);
  }

  // ✅ CRITICAL: Use transaction to prevent race condition (double purchase creation)
  // Two concurrent requests could both pass the check and create duplicate purchases

  // First, check for existing purchases (outside transaction for query)
  const existingActivePurchase = await findExistingActivePurchase(userId, now, lineUserId);
  if (existingActivePurchase) {
    console.log(
      `[BUY_FLOW_ABORTED] reason=existing_active_purchase, userId=${userId}, existingPurchaseId=${existingActivePurchase.purchaseId}, status=${existingActivePurchase.purchase.status}, hasQR=${!!existingActivePurchase.purchase.qrImageUrl}`
    );
    return buildExistingPurchaseResponse(
      lineUserId,
      existingActivePurchase.purchaseId,
      existingActivePurchase.purchase
    );
  }

  // ✅ CRITICAL: Use lock document to prevent race condition (double purchase creation)
  // Pattern: Create lock document atomically, then create purchase
  // If lock exists, another request is creating purchase - wait and retry check
  const lockId = `purchase_lock_${userId}_${normalizedPackageType}`;
  const lockRef = db.collection('_purchase_locks').doc(lockId);
  let purchaseRefFinal: admin.firestore.DocumentReference;
  let referenceId: string;
  let lockAcquired = false;

  try {
    // Try to acquire lock (atomic create - fails if exists)
    await lockRef.create({
      userId,
      packageType: normalizedPackageType,
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 60000), // 1 min TTL
    });
    lockAcquired = true;

    // Lock acquired - proceed with purchase creation
    referenceId = generateReferenceId();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + QR_EXPIRY_MINUTES * 60 * 1000
    );

    purchaseRefFinal = db.collection('credit_purchases').doc();
    const purchaseData: Omit<CreditPurchase, 'id'> = {
      userId,
      lineUserId,
      packageType: normalizedPackageType,
      packageKind: pkg.type,
      plan: pkg.plan,
      seat_total: pkg.seats,
      amount: finalAmount,
      ...(promoCodeApplied
        ? {
            promo_code: promoCodeApplied,
            promo_original_amount: pkg.amount,
            promo_discount_amount: promoDiscountAmount,
            promo_discount_percent: promoDiscountPercent,
            promo_duration_months: promoDurationMonths,
            promo_applied_at: now,
          }
        : {}),
      credits: pkg.credits,
      status: 'PENDING',
      referenceId,
      promptpayId: PROMPTPAY_ID,
      promptpayName: PROMPTPAY_NAME,
      createdAt: now,
      expiresAt,
      payment_pending_reminded: false,
    };

    await purchaseRefFinal.set(purchaseData);

    // Release lock immediately after purchase creation
    if (lockAcquired) {
      await lockRef.delete().catch(() => {
        // Ignore delete errors (lock may have expired)
      });
    }

  } catch (lockError: any) {
    console.error('[purchaseService] Lock flow error:', lockError);
    if (lockAcquired) {
      await lockRef.delete().catch(() => {
        // ignore lock cleanup failure
      });
    }
    // Lock already exists - another request is creating purchase
    // Re-check for existing purchase (may have been created by other request)
    console.log(`[PURCHASE_LOCK_EXISTS] userId=${userId}, packageType=${normalizedPackageType}, re-checking for existing purchase`);

    const recheckedPurchase = await findExistingActivePurchase(userId, now, lineUserId);
    if (recheckedPurchase) {
      return buildExistingPurchaseResponse(
        lineUserId,
        recheckedPurchase.purchaseId,
        recheckedPurchase.purchase
      );
    }

    // Lock exists but no purchase found - retry after short delay
    // This is a rare race condition - wait 500ms and retry once
    await new Promise(resolve => setTimeout(resolve, 500));

    const finalCheck = await findExistingActivePurchase(userId, admin.firestore.Timestamp.now(), lineUserId);
    if (finalCheck) {
      return buildExistingPurchaseResponse(
        lineUserId,
        finalCheck.purchaseId,
        finalCheck.purchase
      );
    }

    // Still no purchase - return a safe fallback instead of throwing
    return {
      purchaseId: '',
      message: 'ระบบกำลังสร้าง QR อยู่\nลองใหม่อีกครั้งใน 10 วินาทีได้นะ',
    };
  }

  // Purchase created successfully - continue with setup
  console.log(`[PURCHASE_CREATED] ✅ purchaseId=${purchaseRefFinal.id}, userId=${userId}, packageType=${normalizedPackageType}, amount=${finalAmount}, ref=${referenceId}, status=PENDING`);

  if (promoCodeApplied) {
    try {
      const { markPromoRedeemed, clearPendingPromoCode } = await import('./promoCodeService');
      await markPromoRedeemed({
        userId,
        promoCode: promoCodeApplied,
        purchaseId: purchaseRefFinal.id,
        plan: pkg.plan,
        amount: finalAmount,
        originalAmount: pkg.amount,
      });
      await clearPendingPromoCode(userId);
    } catch (error) {
      console.warn('[purchaseService] Promo redeem tracking failed (non-blocking):', error);
    }
  }

  // Set image_mode to SLIP (user will send slip image next)
  const { setUserImageMode } = await import('./userStateService');
  await setUserImageMode(userId, 'SLIP').catch((err) => {
    console.error('[purchaseService] Failed to set image_mode:', err);
  });

  // Fire-and-forget: Generate QR and push to LINE (do NOT await)
  generateAndPushQrAsync(purchaseRefFinal.id, lineUserId, finalAmount).catch((e) => {
    console.error('[purchaseService] Async QR generation failed:', e);
  });

  const baseMessage = promoCodeApplied
    ? `⏳ กำลังสร้าง QR ราคาโปร ${finalAmount} บาท (โค้ด ${promoCodeApplied})`
    : `⏳ กำลังสร้าง QR สำหรับการชำระเงิน`;
  const message = promoNotice ? `${baseMessage}\n${promoNotice}` : baseMessage;

  return {
    purchaseId: purchaseRefFinal.id,
    message,
  };
}

/**
 * Generate PromptPay QR and push to LINE (async, fire-and-forget)
 */
async function generateAndPushQrAsync(
  purchaseId: string,
  lineUserId: string,
  amount: number
): Promise<void> {
  const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
  const purchaseDoc = await purchaseRef.get();

  if (!purchaseDoc.exists) {
    console.error(`[purchaseService] Purchase not found: ${purchaseId}`);
    return;
  }

  const purchaseData = purchaseDoc.data() as CreditPurchase;
  const referenceId = purchaseData.referenceId;

  try {
    // Generate PromptPay payload (convert to E.164 format for Thai mobile)
    let promptpayId = PROMPTPAY_ID.replace(/-/g, '');
    // Convert Thai mobile 0xxxxxxxxx to +66xxxxxxxxx
    if (promptpayId.startsWith('0') && promptpayId.length === 10) {
      promptpayId = '+66' + promptpayId.substring(1);
    }
    const payload = generatePayload(promptpayId, { amount });

    // Generate QR as PNG buffer
    const qrBuffer = await QRCode.toBuffer(payload, {
      type: 'png',
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });

    // Upload QR to Cloud Storage
    const bucket = storage.bucket();
    const qrPath = `payment-qr/${purchaseId}.png`;
    const file = bucket.file(qrPath);

    await file.save(qrBuffer, {
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=86400',
      },
    });

    // Generate signed URL (valid for 1 hour - enough for payment)
    const [qrImageUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    // Update purchase with QR URL
    await purchaseRef.update({
      qrImageUrl,
      qrPayload: payload,
    });

    console.log(`[purchaseService] QR uploaded for purchase: ${purchaseId}`);

    // Push QR to LINE
    await pushQrToLine(lineUserId, {
      amount,
      qrImageUrl,
      referenceId,
      promptpayName: PROMPTPAY_NAME,
      bankName: BANK_NAME,
    });

    console.log(`[QR_SENT] 📤 purchaseId=${purchaseId}, lineUserId=${lineUserId}, amount=${amount}, ref=${referenceId}`);

    // Update status to WAITING_FOR_SLIP
    await purchaseRef.update({
      status: 'WAITING_FOR_SLIP',
    });

    console.log(`[PAYMENT_WAITING_FOR_SLIP] ✅ purchaseId=${purchaseId}, status=WAITING_FOR_SLIP`);

    // Send instruction message after QR
    try {
      const { pushLineMessage } = await import('./lineService');
      await pushLineMessage(lineUserId, SLIP_INSTRUCTION_MESSAGE);
    } catch (e) {
      console.error('[purchaseService] Failed to send slip instruction:', e);
    }

    console.log(`[purchaseService] QR sent, status=WAITING_FOR_SLIP for purchase: ${purchaseId}`);

  } catch (error) {
    console.error(`[purchaseService] QR generation failed for ${purchaseId}:`, error);

    // Mark as failed
    await purchaseRef.update({ status: 'FAILED' });

    // Notify user
    try {
      const { pushLineMessage } = await import('./lineService');
      await pushLineMessage(
        lineUserId,
        `โอ๊ะ! สร้าง QR ไม่สำเร็จครับเจ้านาย\nลองใหม่ได้เลยนะครับ\n\nRef: ${referenceId}`
      );
    } catch (e) {
      console.error('[purchaseService] Failed to notify user of QR failure:', e);
    }
  }
}

/**
 * Push QR to LINE (for reusing existing QR)
 */
async function pushQrToLineAsync(lineUserId: string, purchase: CreditPurchase, purchaseId: string): Promise<void> {
  const qrUrl = purchase.qrImageUrl || purchase.qrDataUrl;
  if (!qrUrl) return;

  await pushQrToLine(lineUserId, {
    amount: purchase.amount,
    qrImageUrl: qrUrl,
    referenceId: purchase.referenceId,
    promptpayName: PROMPTPAY_NAME,
    bankName: BANK_NAME,
  });

  // Update status to WAITING_FOR_SLIP if not already
  if (purchase.status === 'PENDING') {
    await db.collection('credit_purchases').doc(purchaseId).update({
      status: 'WAITING_FOR_SLIP',
    });
  }

  // Send instruction message
  try {
    const { pushLineMessage } = await import('./lineService');
    await pushLineMessage(lineUserId, SLIP_INSTRUCTION_MESSAGE);
  } catch (e) {
    console.error('[purchaseService] Failed to send slip instruction:', e);
  }
}

/**
 * Push QR message to LINE
 */
async function pushQrToLine(
  lineUserId: string,
  params: {
    amount: number;
    qrImageUrl: string;
    referenceId: string;
    promptpayName: string;
    bankName: string;
  }
): Promise<void> {
  const { amount, qrImageUrl, referenceId, promptpayName, bankName } = params;
  const token = getLineChannelAccessToken();

  if (!token) {
    console.error('[purchaseService] LINE_CHANNEL_ACCESS_TOKEN not configured');
    return;
  }

  // Build Flex message with QR
  const flexMessage = {
    type: 'flex',
    altText: `💳 ชำระเงิน ${amount} บาท`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '💳 ชำระเงินผ่าน PromptPay',
            weight: 'bold',
            size: 'lg',
            color: '#1DB446',
          },
        ],
        backgroundColor: '#F7F7F7',
        paddingAll: '15px',
      },
      hero: {
        type: 'image',
        url: qrImageUrl,
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'fit',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `ยอดชำระ: ${amount} บาท`,
            weight: 'bold',
            size: 'xl',
            align: 'center',
            color: '#1DB446',
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  { type: 'text', text: 'ชื่อบัญชี:', size: 'sm', color: '#666666', flex: 2 },
                  { type: 'text', text: promptpayName, size: 'sm', color: '#333333', flex: 4, wrap: true },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  { type: 'text', text: 'ธนาคาร:', size: 'sm', color: '#666666', flex: 2 },
                  { type: 'text', text: bankName, size: 'sm', color: '#333333', flex: 4 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  { type: 'text', text: 'Ref:', size: 'sm', color: '#666666', flex: 2 },
                  { type: 'text', text: referenceId, size: 'sm', color: '#333333', flex: 4 },
                ],
              },
            ],
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: `⏰ QR หมดอายุใน ${QR_EXPIRY_MINUTES} นาที`,
            size: 'xs',
            color: '#FF5555',
            align: 'center',
            margin: 'lg',
          },
          {
            type: 'text',
            text: '━━━━━━━━━━━━━━━━',
            size: 'sm',
            color: '#AAAAAA',
            align: 'center',
            margin: 'md',
          },
          {
            type: 'text',
            text: 'โอนแล้วพิมพ์',
            size: 'sm',
            color: '#666666',
            align: 'center',
          },
          {
            type: 'text',
            text: '"ยืนยันการชำระเงิน"',
            weight: 'bold',
            size: 'lg',
            color: '#1DB446',
            align: 'center',
          },
        ],
        paddingAll: '20px',
      },
    },
  };

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [flexMessage],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LINE API error ${response.status}: ${errorText}`);
  }

  console.log(`[purchaseService] QR pushed to LINE: ${lineUserId}`);
}

/**
 * Confirm credit payment
 */
/**
 * Apply entitlements based on package type
 * 
 * ⚠️ DEPRECATED: This function now delegates to paymentSettlementService for atomic settlement
 * Kept for backward compatibility but all new code should use settleVerifiedPurchase directly
 */
export async function applyEntitlement(
  userId: string,
  purchase: CreditPurchase,
  purchaseId: string,
  verifiedBy: 'OCR' | 'ADMIN' | 'MANUAL' = 'MANUAL'
): Promise<{ success: boolean; message: string }> {
  // ✅ P0 HARDENING: Use settlement service for atomic, idempotent settlement
  const { settleVerifiedPurchase } = await import('./paymentSettlementService');

  const settlementResult = await settleVerifiedPurchase({
    purchaseId,
    verifiedBy,
    traceId: `applyEntitlement_${Date.now()}`,
  });

  if (!settlementResult.ok) {
    throw new Error(`Settlement failed for purchase ${purchaseId}`);
  }

  // Clear image_mode after slip is accepted
  const { clearUserImageMode } = await import('./userStateService');
  await clearUserImageMode(userId).catch((err) => {
    console.error('[purchaseService] Failed to clear image_mode:', err);
  });

  const pkg = getPackageDefinition(purchase.packageType);
  const effectiveDurationMonths =
    typeof purchase.promo_duration_months === 'number' && purchase.promo_duration_months > 0
      ? Math.round(purchase.promo_duration_months)
      : (pkg?.durationMonths || 1);

  // ✅ Telemetry: Log subscription activated (if not already settled)
  if (!settlementResult.alreadySettled) {
    try {
      const { logSubscriptionActivated } = await import('./paymentTelemetry');
      await logSubscriptionActivated(
        userId,
        purchaseId,
        getPackagePlan(purchase.packageType),
        getPackageSeats(purchase.packageType) || purchase.seat_total || 1,
        normalizePackageType(purchase.packageType),
        verifiedBy
      );
    } catch (telemetryError) {
      console.warn(`[purchaseService] Failed to log subscription activated:`, telemetryError);
    }
  }

  // ✅ MESSAGE: Return subscription activation message (not credit-based)
  const planName = pkg?.plan === 'TEAM' ? 'Team' : 'Pro';
  const seatText = pkg?.plan === 'TEAM' ? ` (รองรับ ${pkg.seats} คน)` : ' (1 คน)';
  const durationText =
    effectiveDurationMonths === 12
      ? 'รายปี'
      : effectiveDurationMonths === 1
        ? 'รายเดือน'
        : `${effectiveDurationMonths} เดือน`;
  const renewText =
    effectiveDurationMonths === 12
      ? `\n🔄 ต่ออายุอัตโนมัติทุกปี`
      : effectiveDurationMonths === 1
        ? `\n🔄 ต่ออายุอัตโนมัติทุกเดือน`
        : `\n🔄 ต่ออายุอัตโนมัติทุก ${effectiveDurationMonths} เดือน`;
  return {
    success: true,
    message:
      `✅ รับชำระเงินแล้ว\n\n` +
      `🎉 เปิดใช้งานแพ็ก ${planName} (${durationText})${seatText} เรียบร้อย${renewText}\n` +
      `📝 Ref: ${purchase.referenceId}\n\n` +
      `ขอบคุณที่ใช้ EzDoc!`,
  };
}

/**
 * Manual confirmation (deprecated - use slip OCR instead)
 * Keep for backward compatibility
 */
export async function confirmPayment(
  userId: string
): Promise<{ success: boolean; message: string; credits?: number }> {
  const now = admin.firestore.Timestamp.now();

  // Find PENDING purchases for user
  const purchaseQuery = await db
    .collection('credit_purchases')
    .where('userId', '==', userId)
    .where('status', '==', 'PENDING')
    .limit(5)
    .get();

  // Filter expired in-memory and get latest
  const validPurchases = purchaseQuery.docs
    .filter(doc => {
      const data = doc.data() as CreditPurchase;
      return data.expiresAt && data.expiresAt.toMillis() > now.toMillis();
    })
    .sort((a, b) => {
      const aData = a.data() as CreditPurchase;
      const bData = b.data() as CreditPurchase;
      return bData.createdAt.toMillis() - aData.createdAt.toMillis();
    });

  if (validPurchases.length === 0) {
    return {
      success: false,
      message: 'โอ๊ะ! ไม่พบรายการที่รอชำระ หรือ QR หมดอายุแล้วครับเจ้านาย\nสั่งซื้อใหม่ได้เลยนะครับ',
    };
  }

  const purchaseDoc = validPurchases[0];
  const purchase = purchaseDoc.data() as CreditPurchase;

  // Use new entitlement function
  const result = await applyEntitlement(userId, purchase, purchaseDoc.id, 'MANUAL');

  return {
    success: result.success,
    message: result.message,
    credits: purchase.credits || undefined,
  };
}

/**
 * Get purchase history for user
 */
export async function getPurchaseHistory(
  userId: string,
  limit: number = 5
): Promise<string> {
  const purchaseQuery = await db
    .collection('credit_purchases')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  if (purchaseQuery.empty) {
    return '📋 ยังไม่มีประวัติการซื้อแพ็ก';
  }

  const lines = ['📋 ประวัติการซื้อแพ็ก (ล่าสุด 5 รายการ)', ''];

  for (const doc of purchaseQuery.docs) {
    const p = doc.data() as CreditPurchase;
    const date = p.createdAt.toDate().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const statusIcon =
      p.status === 'PAID' ? '✅' :
      p.status === 'EXPIRED' ? '⏰' :
      p.status === 'FAILED' ? '❌' :
      p.status === 'PENDING_REVIEW' ? '🔍' :
      p.status === 'WAITING_FOR_SLIP' ? '📸' : '⏳';
    const statusText =
      p.status === 'PAID' ? 'ชำระแล้ว' :
      p.status === 'EXPIRED' ? 'หมดอายุ' :
      p.status === 'FAILED' ? 'ล้มเหลว' :
      p.status === 'PENDING_REVIEW' ? 'รอตรวจสอบ' :
      p.status === 'WAITING_FOR_SLIP' ? 'รอรับสลิป' : 'รอชำระ';

    // ✅ HISTORY: Show subscription plan (not credits)
    const pkg = getPackageDefinition(p.packageType);
    const durationMonths =
      typeof p.promo_duration_months === 'number' && p.promo_duration_months > 0
        ? Math.round(p.promo_duration_months)
        : (pkg?.durationMonths || 1);
    const durationLabel =
      durationMonths === 12
        ? 'รายปี'
        : durationMonths === 1
          ? 'รายเดือน'
          : `${durationMonths} เดือน`;
    const planName = pkg?.plan === 'TEAM' ? 'Team (3 คน)' : 'Pro (1 คน)';
    lines.push(`${statusIcon} ${date}`);
    lines.push(`   ${pkg?.name || 'แพ็ก'} - ${p.amount}฿ (${planName}, ${durationLabel})`);
    lines.push(`   สถานะ: ${statusText}`);
    if (p.status === 'PAID' && p.plan) {
      lines.push(`   แพ็ก: ${p.plan === 'TEAM' ? 'Team' : 'Pro'}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Expire pending purchases (called by scheduled function)
 * Handles both PENDING and WAITING_FOR_SLIP statuses
 */
export async function expirePendingPurchases(): Promise<number> {
  const now = admin.firestore.Timestamp.now();
  let totalExpired = 0;

  // Check PENDING purchases
  const pendingQuery = await db
    .collection('credit_purchases')
    .where('status', '==', 'PENDING')
    .limit(100)
    .get();

  // Check WAITING_FOR_SLIP purchases
  const waitingQuery = await db
    .collection('credit_purchases')
    .where('status', '==', 'WAITING_FOR_SLIP')
    .limit(100)
    .get();

  const allDocs = [...pendingQuery.docs, ...waitingQuery.docs];

  // ✅ PATCH 4: Expire stuck PENDING_REVIEW purchases (7 days timeout)
  // ✅ FIX 2: Use Firestore query with where clause (more efficient than in-memory filtering)
  const reviewExpiry = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - 7 * 24 * 60 * 60 * 1000 // 7 days
  );

  // Avoid composite-index dependence here; status-only query plus in-memory
  // filtering keeps the expiry job working even while indexes are building.
  const stuckQuery = await db
    .collection('credit_purchases')
    .where('status', '==', 'PENDING_REVIEW')
    .limit(200)
    .get();

  const stuckDocs = stuckQuery.docs
    .filter((doc) => {
      const data = doc.data() as CreditPurchase;
      return data.slip_uploaded_at && data.slip_uploaded_at.toMillis() < reviewExpiry.toMillis();
    })
    .sort((left, right) => {
      const leftData = left.data() as CreditPurchase;
      const rightData = right.data() as CreditPurchase;
      return leftData.slip_uploaded_at!.toMillis() - rightData.slip_uploaded_at!.toMillis();
    })
    .slice(0, 100);

  console.log(`[purchaseService] Found ${stuckDocs.length} stuck PENDING_REVIEW purchases via status-only fallback query`);

  if (allDocs.length === 0 && stuckDocs.length === 0) {
    return 0;
  }

  // Filter expired in memory (for PENDING and WAITING_FOR_SLIP)
  const expiredDocs = allDocs.filter(doc => {
    const data = doc.data() as CreditPurchase;
    if (!data.expiresAt || data.expiresAt.toMillis() >= now.toMillis()) {
      return false;
    }

    // If a slip was already received but storage/upload failed, keep the purchase recoverable.
    if (isRecoverableSlipUpload(data)) {
      return false;
    }

    return true;
  });

  if (expiredDocs.length === 0 && stuckDocs.length === 0) {
    return 0;
  }

  const batch = db.batch();
  for (const doc of expiredDocs) {
    batch.update(doc.ref, { status: 'EXPIRED' });
  }

  // Update stuck PENDING_REVIEW purchases
  for (const doc of stuckDocs) {
    batch.update(doc.ref, { 
      status: 'EXPIRED',
      expired_reason: 'PENDING_REVIEW_TIMEOUT'
    });
  }

  await batch.commit();

  totalExpired = expiredDocs.length + stuckDocs.length;
  if (stuckDocs.length > 0) {
    console.log(`[purchaseService] Expired ${stuckDocs.length} stuck PENDING_REVIEW purchases (7+ days old)`);
  }
  console.log(`[purchaseService] Expired ${totalExpired} total purchases (${expiredDocs.length} pending/waiting, ${stuckDocs.length} stuck reviews)`);
  return totalExpired;
}

/**
 * Send reminders for purchases waiting for slip (called by scheduled function)
 */
export async function sendPendingReminders(): Promise<number> {
  const now = admin.firestore.Timestamp.now();
  const reminderThreshold = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - REMINDER_AFTER_MINUTES * 60 * 1000
  );

  // Query WAITING_FOR_SLIP purchases (these have QR but no slip yet)
  const waitingQuery = await db
    .collection('credit_purchases')
    .where('status', '==', 'WAITING_FOR_SLIP')
    .limit(50)
    .get();

  if (waitingQuery.empty) {
    return 0;
  }

  // Filter: older than REMINDER_AFTER_MINUTES, not expired, not reminded
  const toRemind = waitingQuery.docs.filter(doc => {
    const p = doc.data() as CreditPurchase;
    const isOldEnough = p.createdAt && p.createdAt.toMillis() < reminderThreshold.toMillis();
    const notExpired = p.expiresAt && p.expiresAt.toMillis() > now.toMillis();
    const notReminded = !p.payment_pending_reminded;
    const noSlipSeenYet = !p.slipReceivedAt && !p.slip_image_url;
    return isOldEnough && notExpired && notReminded && noSlipSeenYet;
  });

  if (toRemind.length === 0) {
    return 0;
  }

  let count = 0;
  const { pushLineMessage } = await import('./lineService');

  for (const doc of toRemind) {
    const p = doc.data() as CreditPurchase;

    // Calculate remaining time
    const remainingMs = p.expiresAt.toMillis() - now.toMillis();
    const remainingMin = Math.ceil(remainingMs / 60000);

    // Send reminder
    try {
      await pushLineMessage(
        p.lineUserId,
        `⏰ QR ใกล้หมดอายุครับเจ้านาย!\n\nเหลือเวลา ${remainingMin} นาที\n\nถ้าโอนแล้ว ส่งสลิปในแชทนี้ได้เลยนะครับ`
      );

      await doc.ref.update({ payment_pending_reminded: true });
      count++;
    } catch (e) {
      console.error(`[purchaseService] Failed to send reminder for ${doc.id}:`, e);
    }
  }

  if (count > 0) {
    console.log(`[purchaseService] Sent ${count} payment reminders`);
  }

  return count;
}

/**
 * Check if user has a recent pending purchase (within time window)
 * Used to handle race conditions where status hasn't updated yet
 */
export async function hasRecentPendingPurchase(
  userId: string,
  minutes: number = 15,
  lineUserId?: string
): Promise<{ purchase: CreditPurchase; purchaseId: string } | null> {
  const now = admin.firestore.Timestamp.now();
  const cutoffTime = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - minutes * 60 * 1000
  );

  // Check for recent purchases still active in the payment flow.
  // Note: Using 'in' query without orderBy to avoid composite index requirement
  // Results are sorted in memory by createdAt
  const pendingQuery = await db
    .collection('credit_purchases')
    .where('userId', '==', userId)
    .limit(10) // Get more to filter in memory
    .get();

  // Sort by createdAt descending in memory
  const sortedDocs = pendingQuery.docs.sort((a, b) => {
    const aData = a.data() as CreditPurchase;
    const bData = b.data() as CreditPurchase;
    return bData.createdAt.toMillis() - aData.createdAt.toMillis();
  });

  const nowMs = now.toMillis();

  // Find the most recent valid purchase (created within time window and still active)
  for (const doc of sortedDocs) {
    const purchase = doc.data() as CreditPurchase;
    if (
      !ACTIVE_PURCHASE_STATUSES.includes(purchase.status) &&
      !isRecoverableSlipUpload(purchase)
    ) {
      continue;
    }

    // Must be created within the time window
    if (purchase.createdAt.toMillis() < cutoffTime.toMillis()) {
      continue;
    }

    if (isPurchaseStillActive(purchase, nowMs)) {
      return { purchase, purchaseId: doc.id };
    }
  }

  if (!lineUserId) {
    return null;
  }

  const fallbackQuery = await db
    .collection('credit_purchases')
    .where('lineUserId', '==', lineUserId)
    .limit(10)
    .get();

  if (fallbackQuery.empty) {
    return null;
  }

  const fallbackDocs = fallbackQuery.docs.sort((a, b) => {
    const aData = a.data() as CreditPurchase;
    const bData = b.data() as CreditPurchase;
    return bData.createdAt.toMillis() - aData.createdAt.toMillis();
  });

  for (const doc of fallbackDocs) {
    const purchase = doc.data() as CreditPurchase;
    if (
      !ACTIVE_PURCHASE_STATUSES.includes(purchase.status) &&
      !isRecoverableSlipUpload(purchase)
    ) {
      continue;
    }

    if (purchase.createdAt.toMillis() < cutoffTime.toMillis()) {
      continue;
    }

    if (!isPurchaseStillActive(purchase, nowMs)) {
      continue;
    }

    if (purchase.userId !== userId && purchase.userId !== lineUserId) {
      continue;
    }

    if (purchase.userId === lineUserId) {
      await doc.ref.update({
        userId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[purchaseService] Recovered recent purchase owner: purchaseId=${doc.id}, lineUserId=${lineUserId}, userId=${userId}`);
    }

    return {
      purchaseId: doc.id,
      purchase: {
        ...purchase,
        userId,
      },
    };
  }

  return null;
}

/**
 * Get purchase in WAITING_FOR_SLIP status for a user
 */
export async function getWaitingForSlipPurchase(
  userId: string,
  lineUserId?: string
): Promise<{ purchase: CreditPurchase; purchaseId: string } | null> {
  const now = admin.firestore.Timestamp.now();

  // Check for WAITING_FOR_SLIP purchases and recoverable expired purchases.
  const purchaseQuery = await db
    .collection('credit_purchases')
    .where('userId', '==', userId)
    .limit(10)
    .get();

  const nowMs = now.toMillis();
  const sortedDocs = purchaseQuery.docs.sort((a, b) => {
    const aData = a.data() as CreditPurchase;
    const bData = b.data() as CreditPurchase;
    return bData.createdAt.toMillis() - aData.createdAt.toMillis();
  });

  for (const doc of sortedDocs) {
    const purchase = doc.data() as CreditPurchase;
    if (purchase.status !== 'WAITING_FOR_SLIP' && !isRecoverableSlipUpload(purchase)) {
      continue;
    }
    if (isPurchaseStillActive(purchase, nowMs)) {
      return { purchase, purchaseId: doc.id };
    }
  }

  if (!lineUserId) {
    return null;
  }

  const fallbackQuery = await db
    .collection('credit_purchases')
    .where('lineUserId', '==', lineUserId)
    .limit(10)
    .get();

  if (fallbackQuery.empty) {
    return null;
  }

  const fallbackDocs = fallbackQuery.docs.sort((a, b) => {
    const aData = a.data() as CreditPurchase;
    const bData = b.data() as CreditPurchase;
    return bData.createdAt.toMillis() - aData.createdAt.toMillis();
  });

  for (const doc of fallbackDocs) {
    const purchase = doc.data() as CreditPurchase;
    if (purchase.status !== 'WAITING_FOR_SLIP' && !isRecoverableSlipUpload(purchase)) {
      continue;
    }

    if (!isPurchaseStillActive(purchase, nowMs)) {
      continue;
    }

    if (purchase.userId !== userId && purchase.userId !== lineUserId) {
      continue;
    }

    if (purchase.userId === lineUserId) {
      await doc.ref.update({
        userId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[purchaseService] Recovered waiting purchase owner: purchaseId=${doc.id}, lineUserId=${lineUserId}, userId=${userId}`);
    }

    return {
      purchaseId: doc.id,
      purchase: {
        ...purchase,
        userId,
      },
    };
  }

  return null;
}

/**
 * Upload slip image and update purchase status to PENDING_REVIEW
 */
export async function uploadSlipAndMarkPendingReview(
  purchaseId: string,
  userId: string,
  imageBuffer: Buffer
): Promise<{ success: boolean; message: string }> {
  // ✅ CRITICAL: Validate userId (prevent unauthorized access)
  if (!userId || userId.trim() === '') {
    console.error(`[uploadSlipAndMarkPendingReview] Missing userId for purchaseId=${purchaseId}`);
    return { success: false, message: 'โอ๊ะ! ไม่พบข้อมูลผู้ใช้ครับเจ้านาย\nเชื่อมต่อบัญชีอีกครั้งได้เลยนะครับ' };
  }

  const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
  const purchaseDoc = await purchaseRef.get();

  if (!purchaseDoc.exists) {
    console.error(`[uploadSlipAndMarkPendingReview] Purchase not found: purchaseId=${purchaseId}`);
    return { success: false, message: '❌ ไม่พบรายการซื้อ' };
  }

  const purchase = purchaseDoc.data() as CreditPurchase;

  // ✅ CRITICAL: Ownership check - ensure userId matches purchase owner
  if (purchase.userId !== userId) {
    console.error(`[uploadSlipAndMarkPendingReview] Ownership mismatch: purchase.userId=${purchase.userId}, provided userId=${userId}, purchaseId=${purchaseId}`);
    return { success: false, message: '❌ ไม่มีสิทธิ์เข้าถึงรายการนี้' };
  }

  // Validate status - accept PENDING or WAITING_FOR_SLIP (handles race condition)
  if (purchase.status !== 'WAITING_FOR_SLIP' && purchase.status !== 'PENDING') {
    if (purchase.status === 'PAID') {
      return { success: false, message: '✅ รายการนี้ชำระเงินแล้ว' };
    }
    if (purchase.status === 'EXPIRED') {
      if (!isRecoverableSlipUpload(purchase)) {
        return { success: false, message: 'โอ๊ะ! QR หมดอายุแล้วครับเจ้านาย\nสั่งซื้อใหม่ได้เลยนะครับ' };
      }
      console.warn(`[uploadSlipAndMarkPendingReview] EXPIRED but recoverable upload allowed: purchaseId=${purchaseId}`);
    }
    if (purchase.status === 'PENDING_REVIEW') {
      if (purchase.slip_image_url) {
        return { success: false, message: '🔍 รับสลิปแล้ว กำลังตรวจสอบ' };
      }
      console.warn(`[uploadSlipAndMarkPendingReview] PENDING_REVIEW without slip_image_url, allowing upload: purchaseId=${purchaseId}`);
    }
    if (purchase.status === 'REJECTED') {
      console.warn(`[uploadSlipAndMarkPendingReview] REJECTED but retrying upload: purchaseId=${purchaseId}`);
    }
  }

  try {
    // Upload slip to Cloud Storage
    const bucket = storage.bucket();
    const timestamp = Date.now();
    const slipPath = `credit-slips/${purchaseId}_${timestamp}.jpg`;
    const file = bucket.file(slipPath);

    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'private, max-age=86400',
      },
    });

    // Generate signed URL for admin review
    const [slipImageUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const uploadRecorded = await db.runTransaction(async (tx) => {
      const freshPurchaseDoc = await tx.get(purchaseRef);
      if (!freshPurchaseDoc.exists) {
        throw new Error(`Purchase ${purchaseId} not found during slip upload`);
      }

      const freshPurchase = freshPurchaseDoc.data() as CreditPurchase;
      if (freshPurchase.userId !== userId) {
        throw new Error(`Ownership mismatch during slip upload for purchase ${purchaseId}`);
      }

      if (freshPurchase.status === 'PAID') {
        return false;
      }

      if (freshPurchase.status === 'EXPIRED' && !isRecoverableSlipUpload(freshPurchase)) {
        return false;
      }

      if (freshPurchase.slip_image_url && freshPurchase.status !== 'REJECTED') {
        return false;
      }

      tx.update(purchaseRef, {
        status: 'PENDING_REVIEW',
        slip_image_url: slipImageUrl,
        slip_uploaded_at: admin.firestore.Timestamp.now(),
        slip_upload_missing: admin.firestore.FieldValue.delete(),
        slip_upload_missing_at: admin.firestore.FieldValue.delete(),
        delivery_sent: false,
        delivery_sent_at: admin.firestore.FieldValue.delete(),
        delivery_sent_status: admin.firestore.FieldValue.delete(),
        verified_by: admin.firestore.FieldValue.delete(),
        slip_hash: admin.firestore.FieldValue.delete(),
        slip_transaction_ref: admin.firestore.FieldValue.delete(),
        slip_ocr_raw_text: admin.firestore.FieldValue.delete(),
        slip_ocr_confidence: admin.firestore.FieldValue.delete(),
        slip_parsed_result: admin.firestore.FieldValue.delete(),
        fraud_score: admin.firestore.FieldValue.delete(),
        fraud_flags: admin.firestore.FieldValue.delete(),
        fraud_reason: admin.firestore.FieldValue.delete(),
        time_check_result: admin.firestore.FieldValue.delete(),
        reviewed_by: admin.firestore.FieldValue.delete(),
        reviewed_at: admin.firestore.FieldValue.delete(),
        manual_review_required: admin.firestore.FieldValue.delete(),
        auto_verification_status: admin.firestore.FieldValue.delete(),
        auto_verification_reason: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return true;
    });

    if (!uploadRecorded) {
      console.log(`[purchaseService] Slip already recorded for purchase ${purchaseId}, skipping duplicate OCR trigger`);
      return {
        success: true,
        message: 'ติ๊ดๆ รับสลิปแล้วครับเจ้านาย กำลังตรวจสอบอยู่นะครับ',
      };
    }

    console.log(`[purchaseService] Slip uploaded for purchase ${purchaseId}, triggering OCR`);

    // Notify admin for manual review (best-effort, idempotent)
    try {
      const { notifyAdminsForSlip } = await import('./adminNotificationService');
      await notifyAdminsForSlip(purchaseId);
    } catch (notifyError) {
      console.warn('[purchaseService] Failed to notify admin for slip:', notifyError);
    }

    // Trigger OCR verification (async, fire-and-forget)
    const { runSlipOcrAndVerify, applyVerificationResult } = await import('./slipOcrService');

    runSlipOcrAndVerify({
      imageUrl: slipImageUrl,
      expectedAmount: purchase.amount,
      expectedPromptPayName: 'นายฉัตรดนัย จิตต์เพ็ชร',
      purchaseId,
    })
      .then((verification) => {
        console.log(`[purchaseService] OCR verification completed for ${purchaseId}: ${verification.status}`);
        return applyVerificationResult(purchaseId, verification);
      })
      .catch((error) => {
        console.error(`[purchaseService] OCR verification failed for ${purchaseId}:`, error);
        // On error, ensure status is set to PENDING_REVIEW for manual review
        purchaseRef.update({ status: 'PENDING_REVIEW' }).catch((e) => {
          console.error(`[purchaseService] Failed to update status to PENDING_REVIEW:`, e);
        });
      });

    return {
      success: true,
      message: 'ติ๊ดๆ รับสลิปแล้วครับเจ้านาย กำลังตรวจสอบการชำระเงินอยู่นะครับ',
    };
  } catch (error) {
    console.error(`[purchaseService] Failed to upload slip for ${purchaseId}:`, error);
    return {
      success: false,
      message: 'โอ๊ะ! รับสลิปไม่สำเร็จครับ\nลองส่งใหม่ได้เลยนะเจ้านาย',
    };
  }
}

/**
 * Record that a slip image message was received before upload/OCR begins.
 *
 * This keeps receipt metadata without moving the purchase into PENDING_REVIEW
 * until the actual slip file is stored successfully.
 */
export async function recordSlipReceipt(
  purchaseId: string,
  messageId: string,
  traceId?: string
): Promise<boolean> {
  const purchaseRef = db.collection('credit_purchases').doc(purchaseId);

  try {
    // Use transaction for atomic update
    return await db.runTransaction(async (tx) => {
      const purchaseDoc = await tx.get(purchaseRef);

      if (!purchaseDoc.exists) {
        console.warn(`[recordSlipReceipt] Purchase not found: purchaseId=${purchaseId}`);
        return false;
      }

      const purchase = purchaseDoc.data() as CreditPurchase;

      if (purchase.status === 'PAID') {
        console.warn(`[recordSlipReceipt] Purchase already paid, ignoring: purchaseId=${purchaseId}`);
        return false;
      }

      if (purchase.status === 'EXPIRED' || purchase.status === 'FAILED') {
        console.warn(`[recordSlipReceipt] Purchase in terminal state, ignoring: purchaseId=${purchaseId}, status=${purchase.status}`);
        return false;
      }

      const receivedAt = admin.firestore.Timestamp.now();
      const updateData: Record<string, unknown> = {
        slipMessageId: messageId,
        slip_message_id: messageId,
        slipReceivedAt: receivedAt,
        slip_received_at: receivedAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (traceId) {
        updateData.traceId = traceId;
        updateData.trace_id = traceId;
      }

      tx.update(purchaseRef, updateData);
      console.log(`[recordSlipReceipt] Recorded slip receipt: purchaseId=${purchaseId}, messageId=${messageId}`);
      return true;
    });
  } catch (error) {
    console.error(`[recordSlipReceipt] Failed to record slip receipt: purchaseId=${purchaseId}`, error);
    throw error;
  }
}

export async function markPurchasePendingReview(
  purchaseId: string,
  messageId: string,
  traceId?: string
): Promise<boolean> {
  return recordSlipReceipt(purchaseId, messageId, traceId);
}
