import { getDb } from './firebaseAdmin';
/**
 * Plan Service
 * 
 * Centralized plan-aware feature gating and authorization
 * 
 * CORE PRINCIPLES:
 * - PRO (99฿) = Complete flow for solo users
 * - TEAM (279฿) = Team plan for up to 3 users
 * - Never gate core flow (Invoice/Receipt) behind TEAM
 * - Credits are deprecated; document flow uses subscription plans
 */

import type { PlanId } from "../lib/promptpay";

const db = getDb();
const PLAN_CACHE_TTL_MS = 15 * 1000; // 15s cache to reduce hot-path reads
const planCache = new Map<string, { plan: Plan; expiresAt: number }>();

const getCachedPlan = (uid: string): Plan | null => {
  const entry = planCache.get(uid);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    planCache.delete(uid);
    return null;
  }
  return entry.plan;
};

const setCachedPlan = (uid: string, plan: Plan): void => {
  planCache.set(uid, { plan, expiresAt: Date.now() + PLAN_CACHE_TTL_MS });
};

// ============================================================================
// PLAN DEFINITIONS
// ============================================================================

export type Plan = "FREE" | "PRO" | "TEAM";
export type CanonicalDocumentType = "QUO" | "INV" | "REC" | "CN" | "DN";
export type PlanAwareDocumentType =
  | CanonicalDocumentType
  | "BILL"
  | "INVOICE"
  | "RECEIPT"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE";

type TimestampLike = {
  toMillis(): number;
};

type SubscriptionLike = {
  plan?: string | PlanId | Plan | null;
  status?: string | null;
  periodEnd?: TimestampLike | null;
};

export interface PlanFeatures {
  // Document flow
  canCreateQuotation: boolean;
  canCreateInvoice: boolean;
  canCreateReceipt: boolean;
  canCreateInstallments: boolean;

  // Limits
  maxDocumentsPerMonth: number; // 0 = unlimited
  maxDocumentsPerDay: number;
  maxRequestsPerMinute: number;

  // Branding
  hasWatermark: boolean;
  canUseLogo: boolean;
  canUseSignature: boolean;

  // Users & roles
  maxUsers: number; // 0 = unlimited
  canHaveMultipleUsers: boolean;
  canHaveRoles: boolean;

  // Data & operations
  canExportDocuments: boolean;
  canViewReports: boolean;
  canViewAuditLogs: boolean;
  canHaveMultiBusiness: boolean;

  // Cost-based features (credits - deprecated)
  ocrQuotaPerMonth: number;
  aiQuotaPerMonth: number;
  canPurchaseCredits: boolean;

  // Support
  hasEmailSupport: boolean;
  hasPrioritySupport: boolean;
}

// ============================================================================
// PLAN CONFIGURATION
// ============================================================================

const PLAN_CONFIG: Record<Plan, PlanFeatures> = {
  FREE: {
    // Document flow
    canCreateQuotation: true,
    canCreateInvoice: false,
    canCreateReceipt: false,
    canCreateInstallments: false,

    // Limits
    maxDocumentsPerMonth: 10, // 10 documents/month (matches STARTER_FREE_DOC_QUOTA)
    maxDocumentsPerDay: 5,
    maxRequestsPerMinute: 10,

    // Branding
    hasWatermark: true,
    canUseLogo: false,
    canUseSignature: false,

    // Users & roles
    maxUsers: 1,
    canHaveMultipleUsers: false,
    canHaveRoles: false,

    // Data & operations
    canExportDocuments: false,
    canViewReports: false,
    canViewAuditLogs: false,
    canHaveMultiBusiness: false,

    // Cost-based features (deprecated)
    ocrQuotaPerMonth: 5,
    aiQuotaPerMonth: 0,
    canPurchaseCredits: false,

    // Support
    hasEmailSupport: false,
    hasPrioritySupport: false,
  },

  PRO: {
    // Document flow - COMPLETE FLOW FOR SOLO USERS
    canCreateQuotation: true,
    canCreateInvoice: true,
    canCreateReceipt: true,
    canCreateInstallments: true,

    // Limits
    maxDocumentsPerMonth: 0, // 0 = unlimited
    maxDocumentsPerDay: 100,
    maxRequestsPerMinute: 60,

    // Branding
    hasWatermark: false,
    canUseLogo: true,
    canUseSignature: true,

    // Users & roles
    maxUsers: 1,
    canHaveMultipleUsers: false,
    canHaveRoles: false,

    // Data & operations
    canExportDocuments: true,
    canViewReports: false,
    canViewAuditLogs: false,
    canHaveMultiBusiness: false,

    // Cost-based features (deprecated)
    ocrQuotaPerMonth: 50,
    aiQuotaPerMonth: 10,
    canPurchaseCredits: false,

    // Support
    hasEmailSupport: true,
    hasPrioritySupport: false,
  },

  TEAM: {
    // Document flow - Everything in PRO
    canCreateQuotation: true,
    canCreateInvoice: true,
    canCreateReceipt: true,
    canCreateInstallments: true,

    // Limits
    maxDocumentsPerMonth: 0, // 0 = unlimited (null not allowed in number type)
    maxDocumentsPerDay: 100,
    maxRequestsPerMinute: 60,

    // Branding
    hasWatermark: false,
    canUseLogo: true,
    canUseSignature: true,

    // Users & roles - TEAM FEATURES
    maxUsers: 3,
    canHaveMultipleUsers: true,
    canHaveRoles: true,

    // Data & operations - TEAM FEATURES
    canExportDocuments: true,
    canViewReports: true,
    canViewAuditLogs: true,
    canHaveMultiBusiness: true, // Future-ready

    // Cost-based features (deprecated)
    ocrQuotaPerMonth: 200,
    aiQuotaPerMonth: 50,
    canPurchaseCredits: false,

    // Support
    hasEmailSupport: true,
    hasPrioritySupport: true,
  },
};

// ============================================================================
// PLAN DETECTION & MIGRATION
// ============================================================================

/**
 * Normalize plan from subscription data
 * Handles migration from old plan IDs (MONTHLY_99, MONTHLY_299) to new plans (PRO, TEAM)
 */
export function normalizePlan(plan: string | PlanId | Plan): Plan {
  // New plan format
  if (plan === "FREE" || plan === "PRO" || plan === "TEAM") {
    return plan;
  }

  // Legacy plan IDs
  if (plan === "MONTHLY_99") {
    return "PRO";
  }

  if (plan === "MONTHLY_299") {
    return "TEAM";
  }

  // Default to FREE
  return "FREE";
}

export function isSubscriptionCurrentlyActive(
  subscription: SubscriptionLike | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!subscription) {
    return false;
  }

  const plan = normalizePlan((subscription.plan as string | PlanId | Plan | undefined) || "FREE");
  if (plan === "FREE") {
    return false;
  }

  if (subscription.status !== "ACTIVE") {
    return false;
  }

  return Boolean(subscription.periodEnd && subscription.periodEnd.toMillis() > nowMs);
}

export function getEffectiveSubscriptionPlan(
  subscription: SubscriptionLike | null | undefined,
  nowMs: number = Date.now()
): Plan {
  if (!isSubscriptionCurrentlyActive(subscription, nowMs)) {
    return "FREE";
  }

  return normalizePlan((subscription?.plan as string | PlanId | Plan | undefined) || "FREE");
}

export function getEffectiveSubscriptionStatus(
  subscription: SubscriptionLike | null | undefined,
  nowMs: number = Date.now()
): "FREE" | "ACTIVE" | "PAST_DUE" | "CANCELED" {
  if (isSubscriptionCurrentlyActive(subscription, nowMs)) {
    return "ACTIVE";
  }

  if (subscription?.status === "PAST_DUE" || subscription?.status === "CANCELED") {
    return subscription.status;
  }

  return "FREE";
}

export function normalizePlanDocumentType(docType: string | null | undefined): CanonicalDocumentType | null {
  switch ((docType || "").toUpperCase()) {
    case "QUO":
    case "QUOTATION":
      return "QUO";
    case "INV":
    case "INVOICE":
    case "BILL":
      return "INV";
    case "REC":
    case "RECEIPT":
      return "REC";
    case "CN":
    case "CREDIT_NOTE":
      return "CN";
    case "DN":
    case "DEBIT_NOTE":
      return "DN";
    default:
      return null;
  }
}

/**
 * Get user's current plan
 * 
 * Error handling: If Firestore fails, defaults to FREE plan to avoid blocking user operations
 */
export async function getUserPlan(uid: string): Promise<Plan> {
  try {
    const cached = getCachedPlan(uid);
    if (cached) {
      return cached;
    }

    const subRef = db.collection("subscriptions").doc(uid);
    const subSnap = await subRef.get();

    if (!subSnap.exists) {
      const { getOrCreateSubscription } = await import("./subscriptionService");
      const created = await getOrCreateSubscription(uid);
      const plan = normalizePlan(created?.plan || "FREE");
      setCachedPlan(uid, plan);
      return plan;
    }

    const subscription = subSnap.data();
    const effectivePlan = getEffectiveSubscriptionPlan(subscription || null);
    setCachedPlan(uid, effectivePlan);
    return effectivePlan;
  } catch (error) {
    // Log error but don't block user operations - default to FREE plan
    console.error(`[getUserPlan] Failed to fetch plan for uid=${uid}, defaulting to FREE:`, error);
    return "FREE";
  }
}

/**
 * Get plan features for a user
 */
export async function getUserPlanFeatures(uid: string): Promise<PlanFeatures> {
  const plan = await getUserPlan(uid);
  return PLAN_CONFIG[plan];
}

/**
 * Get plan features directly from plan string
 */
export function getPlanFeatures(plan: Plan | string): PlanFeatures {
  const normalized = normalizePlan(plan);
  return PLAN_CONFIG[normalized];
}

// ============================================================================
// FEATURE CHECKS
// ============================================================================

/**
 * Check if user can create a specific document type
 */
export async function canCreateDocumentType(
  uid: string,
  docType: PlanAwareDocumentType
): Promise<boolean> {
  const normalizedDocType = normalizePlanDocumentType(docType);
  if (!normalizedDocType) {
    return false;
  }

  const features = await getUserPlanFeatures(uid);

  return canCreateDocumentTypeForFeatures(features, normalizedDocType);
}

export function canCreateDocumentTypeForFeatures(
  features: PlanFeatures,
  docType: CanonicalDocumentType
): boolean {
  switch (docType) {
    case "QUO":
      return features.canCreateQuotation;
    case "INV":
      return features.canCreateInvoice;
    case "REC":
      return features.canCreateReceipt;
    case "CN":
    case "DN":
      return features.canCreateInvoice; // Same as Invoice permissions
    default:
      return false;
  }
}

export function canCreateDocumentTypeForPlan(
  plan: Plan | string,
  docType: PlanAwareDocumentType
): boolean {
  const normalizedDocType = normalizePlanDocumentType(docType);
  if (!normalizedDocType) {
    return false;
  }
  return canCreateDocumentTypeForFeatures(getPlanFeatures(plan), normalizedDocType);
}

/**
 * Check if user can create installments
 */
export async function canCreateInstallments(uid: string): Promise<boolean> {
  const features = await getUserPlanFeatures(uid);
  return features.canCreateInstallments;
}

/**
 * Check if document should have watermark
 */
export async function shouldAddWatermark(uid: string): Promise<boolean> {
  const features = await getUserPlanFeatures(uid);
  return features.hasWatermark;
}

/**
 * Check if user can use branding features (logo, signature)
 */
export async function canUseBranding(uid: string): Promise<boolean> {
  const features = await getUserPlanFeatures(uid);
  return features.canUseLogo && features.canUseSignature;
}

/**
 * Check if user can export documents
 */
export async function canExportDocuments(uid: string): Promise<boolean> {
  const features = await getUserPlanFeatures(uid);
  return features.canExportDocuments;
}

/**
 * Check if user can view reports
 */
export async function canViewReports(uid: string): Promise<boolean> {
  const features = await getUserPlanFeatures(uid);
  return features.canViewReports;
}

/**
 * Check if user can have multiple users (TEAM feature)
 */
export async function canHaveMultipleUsers(uid: string): Promise<boolean> {
  const features = await getUserPlanFeatures(uid);
  return features.canHaveMultipleUsers;
}

/**
 * Check if user can have roles (TEAM feature)
 */
export async function canHaveRoles(uid: string): Promise<boolean> {
  const features = await getUserPlanFeatures(uid);
  return features.canHaveRoles;
}

// ============================================================================
// RATE LIMITS
// ============================================================================

/**
 * Get rate limit configuration for a plan
 */
export function getRateLimits(plan: Plan | string) {
  const features = getPlanFeatures(plan);

  return {
    maxRequestsPerMinute: features.maxRequestsPerMinute,
    maxDocsPerDay: features.maxDocumentsPerDay,
    maxDocsPerMonth: features.maxDocumentsPerMonth === 0 ? null : features.maxDocumentsPerMonth,
  };
}

// ============================================================================
// CREDITS (COST-BASED FEATURES)
// ============================================================================

/**
 * Get OCR quota for a plan
 */
export function getOcrQuota(plan: Plan | string): number {
  const features = getPlanFeatures(plan);
  return features.ocrQuotaPerMonth;
}

/**
 * Get AI quota for a plan
 */
export function getAiQuota(plan: Plan | string): number {
  const features = getPlanFeatures(plan);
  return features.aiQuotaPerMonth;
}

/**
 * Check if user can purchase credits
 */
export async function canPurchaseCredits(uid: string): Promise<boolean> {
  const features = await getUserPlanFeatures(uid);
  return features.canPurchaseCredits;
}
