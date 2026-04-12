import { getDb } from './firebaseAdmin';
/**
 * Subscription Service
 * Manages user subscriptions and credit checks
 * 
 * NOTE: Plan normalization handled by planService.ts
 * This service maintains backward compatibility with old plan IDs
 */

import * as admin from "firebase-admin";
import type { PlanId } from "../lib/promptpay";
import type { Plan } from "./planService";

const db = getDb();

export interface Subscription {
  uid: string;
  plan: "FREE" | PlanId | Plan; // Supports old and new plan formats
  status: "FREE" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  seatTotal: number;
  seatUsed: number;
  autoRenew: boolean;
  nextBillingAt: admin.firestore.Timestamp | null;
  periodStart: admin.firestore.Timestamp;
  periodEnd: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  creditsRemaining?: number; // Deprecated: legacy field
}

/**
 * Get user subscription (or create FREE tier)
 */
export async function getOrCreateSubscription(uid: string): Promise<Subscription> {
  const subRef = db.collection("subscriptions").doc(uid);
  const subSnap = await subRef.get();

  if (subSnap.exists) {
    return subSnap.data() as Subscription;
  }

  // Create FREE tier subscription
  const now = admin.firestore.Timestamp.now();
  const periodEnd = new Date(now.toDate());
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription: Subscription = {
    uid,
    plan: "FREE",
    status: "FREE",
    seatTotal: 1,
    seatUsed: 1,
    autoRenew: false,
    nextBillingAt: null,
    periodStart: now,
    periodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
    createdAt: now,
    updatedAt: now,
    // ✅ REMOVED: creditsRemaining (deprecated - subscriptions don't use credits)
  };

  await subRef.set(subscription);
  console.log(`[SUBSCRIPTION_FREE_CREATED] 🆓 uid=${uid}`);

  return subscription;
}

/**
 * ✅ REMOVED: Credit-based functions (deprecated - subscriptions don't use credits)
 * 
 * All credit checks are now plan-based via planService:
 * - Use canCreateDocumentType() for document type checks
 * - Use checkDailyDocLimit() for daily limit checks
 * - Use getUserPlan() to get current plan
 * 
 * @deprecated These functions are no-op and will be removed in future versions
 */
export async function requireCredits(uid: string, count = 1): Promise<void> {
  void count;
  await getOrCreateSubscription(uid);
}

export async function hasCredits(uid: string): Promise<boolean> {
  await getOrCreateSubscription(uid);
  return true;
}

export async function deductCredit(uid: string, count = 1, docId?: string): Promise<void> {
  void count;
  void docId;
  await getOrCreateSubscription(uid);
}

export async function addCredits(uid: string, credits: number): Promise<void> {
  void credits;
  await getOrCreateSubscription(uid);
}

/**
 * ✅ Get upsell message for subscription plans (not credit-based)
 */
export function getUpsellMessage(_unused: number): string {
  void _unused;
  return (
    "EzDOC Pro 99 บาท สำหรับ 1 ผู้ใช้ ออกเอกสารได้ไม่จำกัด\n" +
    "EzDOC Team 279 บาท สำหรับหลายผู้ใช้ ออกเอกสารได้ไม่จำกัด\n\n" +
    "พิมพ์: ซื้อแพ็ค 99 หรือ ซื้อแพ็ค 279"
  );
}
