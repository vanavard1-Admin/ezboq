/**
 * Jarvis Quota Service — ระบบจำกัดการใช้งาน AI + ติดตาม usage
 *
 * Firestore: jarvis_usage/{lineUserId} — monthly usage counter
 * รีเซ็ตทุกต้นเดือน (หรือตาม billing cycle)
 */
import * as admin from "firebase-admin";

// ============ Types ============

export interface JarvisQuota {
  questionsUsed: number;   // legacy — now tracks documents
  questionsLimit: number;  // legacy — now tracks documents
  documentsUsed: number;
  documentsLimit: number;
  plan: JarvisPlan;
  periodStart: number; // epoch ms
  periodEnd: number;   // epoch ms
  updatedAt: number;
}

export type JarvisPlan = "FREE" | "BASIC" | "PRO";
type StoredJarvisPlan = JarvisPlan | "UNLIMITED";
type StoredJarvisQuota = Partial<JarvisQuota> & { plan?: StoredJarvisPlan };

export interface JarvisPlanConfig {
  name: string;
  nameEn: string;
  price: number;           // THB/month
  questionsPerMonth: number; // legacy — kept for compat
  documentsPerMonth: number;
  description: string;
  emoji: string;
}

// ============ Plan Config ============

export const JARVIS_PLANS: Record<JarvisPlan, JarvisPlanConfig> = {
  FREE: {
    name: "ฟรี",
    nameEn: "Free",
    price: 0,
    questionsPerMonth: 99999, // AI chat ฟรีไม่จำกัด
    documentsPerMonth: 10,
    description: "ใช้ฟรี 10 ใบแรก และเอกสารฟรีจะมีลายน้ำ EzDOC",
    emoji: "🆓",
  },
  BASIC: {
    name: "EzDOC Pro",
    nameEn: "EzDOC Pro",
    price: 99,
    questionsPerMonth: 99999,
    documentsPerMonth: 99999,
    description: "1 ผู้ใช้ ออกเอกสารได้ไม่จำกัด",
    emoji: "⭐",
  },
  PRO: {
    name: "EzDOC Team",
    nameEn: "EzDOC Team",
    price: 279,
    questionsPerMonth: 99999,
    documentsPerMonth: 99999, // effectively unlimited
    description: "หลายผู้ใช้ ออกเอกสารได้ไม่จำกัด",
    emoji: "🚀",
  },
};

// Promo pricing (optional add-on)
export const PROMO_PACKS = [
  { id: "EZDOC_PRO_YEAR", name: "EzDOC Pro รายปี", price: 891, documents: 99999, months: 12, save: "25%" },
  { id: "EZDOC_TEAM_YEAR", name: "EzDOC Team รายปี", price: 2511, documents: 99999, months: 12, save: "25%" },
];

const USAGE_COLLECTION = "jarvis_usage";

async function getEntitledJarvisPlan(
  lineUserId: string,
): Promise<JarvisPlan | null> {
  try {
    const { getLineLink } = await import("../core/lineLinkService");
    const { getUserPlan } = await import("../core/planService");
    const link = await getLineLink(lineUserId);
    if (!link?.uid) {
      return null;
    }

    const plan = await getUserPlan(link.uid);
    if (plan === "TEAM") {
      return "PRO";
    }

    if (plan === "PRO") {
      return "BASIC";
    }

    return null;
  } catch (error) {
    console.warn("[JARVIS] Failed to resolve entitled Jarvis plan:", error);
    return null;
  }
}

async function getPaidJarvisPlanForCurrentPeriod(
  lineUserId: string,
  firestore: admin.firestore.Firestore,
  now: number,
): Promise<JarvisPlan | null> {
  try {
    const periodStart = getMonthStart(now);
    const snapshot = await firestore
      .collection("jarvis_purchases")
      .where("lineUserId", "==", lineUserId)
      .limit(20)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const planRank: Record<JarvisPlan, number> = { FREE: 0, BASIC: 1, PRO: 2 };
    let bestPlan: JarvisPlan | null = null;

    for (const doc of snapshot.docs) {
      const data = doc.data() as {
        status?: string;
        plan?: JarvisPlan;
        paidAt?: admin.firestore.Timestamp;
        createdAt?: admin.firestore.Timestamp;
      };

      if (data.status !== "PAID" || !data.plan) {
        continue;
      }

      const paidAtMs = data.paidAt?.toMillis?.() || data.createdAt?.toMillis?.() || 0;
      if (paidAtMs < periodStart) {
        continue;
      }

      const normalizedPlan = data.plan === "BASIC" || data.plan === "PRO" ? data.plan : "FREE";
      if (!bestPlan || planRank[normalizedPlan] > planRank[bestPlan]) {
        bestPlan = normalizedPlan;
      }
    }

    return bestPlan;
  } catch (error) {
    console.warn("[JARVIS] Failed to resolve paid Jarvis plan:", error);
    return null;
  }
}

function pickEffectiveJarvisPlan(plans: Array<JarvisPlan | null | undefined>): JarvisPlan {
  const planRank: Record<JarvisPlan, number> = { FREE: 0, BASIC: 1, PRO: 2 };
  let bestPlan: JarvisPlan = "FREE";

  for (const plan of plans) {
    if (!plan) {
      continue;
    }
    if (planRank[plan] > planRank[bestPlan]) {
      bestPlan = plan;
    }
  }

  return bestPlan;
}

// ============ Core Functions ============

/**
 * Get current quota status for a user.
 * Creates a new document if not exists, resets if period expired.
 */
export async function getQuota(
  lineUserId: string,
  db?: admin.firestore.Firestore,
): Promise<JarvisQuota> {
  const firestore = db || admin.firestore();
  const docRef = firestore.collection(USAGE_COLLECTION).doc(lineUserId);
  const doc = await docRef.get();

  const now = Date.now();
  const entitledPlan = await getEntitledJarvisPlan(lineUserId);
  const paidJarvisPlan = await getPaidJarvisPlanForCurrentPeriod(lineUserId, firestore, now);
  const effectivePlan = pickEffectiveJarvisPlan([entitledPlan, paidJarvisPlan]);

  if (!doc.exists) {
    const quota = await hydrateQuotaFromSourceOfTruth(
      createNewPeriod(effectivePlan, now),
      lineUserId,
      now,
    );
    await docRef.set(quota);
    return quota;
  }

  const rawData = doc.data() as StoredJarvisQuota | undefined;
  let data = normalizeQuota(rawData, now);
  if (data.plan !== effectivePlan) {
    data = applyPlanToQuota(data, effectivePlan, now);
  }

  // Starter free does not reset monthly; only paid plans use a billing window.
  if (effectivePlan !== "FREE" && now >= data.periodEnd) {
    const quota = createNewPeriod(data.plan, now);
    const hydrated = await hydrateQuotaFromSourceOfTruth(quota, lineUserId, now);
    await docRef.set(hydrated);
    return hydrated;
  }

  data = await hydrateQuotaFromSourceOfTruth(data, lineUserId, now);

  if (shouldRewriteQuota(rawData, data)) {
    await docRef.set(data, { merge: true });
  }

  return data;
}

/**
 * Check if user can ask a question. Returns remaining count.
 * Returns -1 if over limit (blocked).
 */
export async function checkQuota(
  lineUserId: string,
  db?: admin.firestore.Firestore,
): Promise<{ allowed: boolean; remaining: number; quota: JarvisQuota }> {
  const quota = await getQuota(lineUserId, db);
  const remaining = quota.questionsLimit - quota.questionsUsed;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    quota,
  };
}

/**
 * Use one question credit. Call AFTER successful AI response.
 * Returns updated quota.
 */
export async function useQuestion(
  lineUserId: string,
  db?: admin.firestore.Firestore,
): Promise<JarvisQuota> {
  const firestore = db || admin.firestore();
  const docRef = firestore.collection(USAGE_COLLECTION).doc(lineUserId);

  // Atomic increment
  await docRef.update({
    questionsUsed: admin.firestore.FieldValue.increment(1),
    updatedAt: Date.now(),
  });

  // Return fresh data
  return await getQuota(lineUserId, db);
}

/**
 * Upgrade user's plan
 */
export async function upgradePlan(
  lineUserId: string,
  newPlan: JarvisPlan,
  db?: admin.firestore.Firestore,
): Promise<JarvisQuota> {
  const firestore = db || admin.firestore();
  const docRef = firestore.collection(USAGE_COLLECTION).doc(lineUserId);
  const doc = await docRef.get();

  const now = Date.now();
  const planConfig = JARVIS_PLANS[newPlan];

  if (doc.exists) {
    const current = normalizeQuota(doc.data() as StoredJarvisQuota | undefined, now);
    // Upgrade: keep existing usage, increase limit, extend period
    await docRef.update({
      plan: newPlan,
      questionsLimit: planConfig.questionsPerMonth,
      documentsLimit: planConfig.documentsPerMonth,
      periodEnd: getMonthEnd(now),
      updatedAt: now,
    });
    return {
      ...current,
      plan: newPlan,
      questionsLimit: planConfig.questionsPerMonth,
      documentsLimit: planConfig.documentsPerMonth,
      updatedAt: now,
    };
  } else {
    const quota = createNewPeriod(newPlan, now);
    await docRef.set(quota);
    return quota;
  }
}

/**
 * Check if user can issue a document. Returns remaining count.
 */
export async function checkDocumentQuota(
  lineUserId: string,
  db?: admin.firestore.Firestore,
): Promise<{ allowed: boolean; remaining: number; quota: JarvisQuota }> {
  const quota = await getQuota(lineUserId, db);
  const remaining = quota.documentsLimit - quota.documentsUsed;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    quota,
  };
}

/**
 * Use one document credit. Call AFTER successful document issuance.
 */
export async function useDocument(
  lineUserId: string,
  db?: admin.firestore.Firestore,
): Promise<JarvisQuota> {
  const firestore = db || admin.firestore();
  const { getLineLink, incrementGuestTrial } = await import("../core/lineLinkService");
  const { getUserPlan } = await import("../core/planService");
  const link = await getLineLink(lineUserId);

  if (link?.uid) {
    const plan = await getUserPlan(link.uid);
    if (plan === "FREE") {
      await incrementGuestTrial(lineUserId, link.uid);
      return await getQuota(lineUserId, db);
    }
  }

  await getQuota(lineUserId, db);
  const docRef = firestore.collection(USAGE_COLLECTION).doc(lineUserId);

  await docRef.update({
    documentsUsed: admin.firestore.FieldValue.increment(1),
    updatedAt: Date.now(),
  });

  return await getQuota(lineUserId, db);
}

/**
 * Add bonus questions (e.g., from promo code or referral)
 */
export async function addBonusQuestions(
  lineUserId: string,
  bonusCount: number,
  db?: admin.firestore.Firestore,
): Promise<void> {
  const firestore = db || admin.firestore();
  const docRef = firestore.collection(USAGE_COLLECTION).doc(lineUserId);

  await docRef.update({
    questionsLimit: admin.firestore.FieldValue.increment(bonusCount),
    updatedAt: Date.now(),
  });
}

// ============ Helpers ============

function createNewPeriod(plan: JarvisPlan, now: number): JarvisQuota {
  const planConfig = JARVIS_PLANS[plan];
  return {
    questionsUsed: 0,
    questionsLimit: planConfig.questionsPerMonth,
    documentsUsed: 0,
    documentsLimit: planConfig.documentsPerMonth,
    plan,
    periodStart: getMonthStart(now),
    periodEnd: getMonthEnd(now),
    updatedAt: now,
  };
}

function applyPlanToQuota(quota: JarvisQuota, plan: JarvisPlan, now: number): JarvisQuota {
  const planConfig = JARVIS_PLANS[plan];
  return {
    ...quota,
    plan,
    questionsLimit: planConfig.questionsPerMonth,
    documentsLimit: planConfig.documentsPerMonth,
    updatedAt: now,
  };
}

async function hydrateQuotaFromSourceOfTruth(
  quota: JarvisQuota,
  lineUserId: string,
  now: number,
): Promise<JarvisQuota> {
  if (quota.plan === "FREE") {
    const { getLineLink, getStarterQuotaStatus } = await import("../core/lineLinkService");
    const link = await getLineLink(lineUserId);
    const userId = link?.uid || lineUserId;
    const starter = await getStarterQuotaStatus(userId, lineUserId);

    return {
      ...quota,
      documentsUsed: starter.used,
      documentsLimit: starter.quota,
      periodStart: 0,
      periodEnd: 0,
      updatedAt: now,
    };
  }

  return {
    ...quota,
    documentsLimit: JARVIS_PLANS[quota.plan].documentsPerMonth,
    updatedAt: now,
  };
}

function normalizePlan(plan?: StoredJarvisPlan): JarvisPlan {
  if (plan === "FREE" || plan === "BASIC" || plan === "PRO") return plan;
  if (plan === "UNLIMITED") return "PRO";
  return "FREE";
}

function normalizeCounter(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeQuota(data: StoredJarvisQuota | undefined, now: number): JarvisQuota {
  const plan = normalizePlan(data?.plan);
  const defaults = createNewPeriod(plan, now);

  return {
    questionsUsed: normalizeCounter(data?.questionsUsed, 0),
    questionsLimit: normalizeCounter(data?.questionsLimit, defaults.questionsLimit),
    documentsUsed: normalizeCounter(data?.documentsUsed, 0),
    documentsLimit: normalizeCounter(data?.documentsLimit, defaults.documentsLimit),
    plan,
    periodStart: normalizeTimestamp(data?.periodStart, defaults.periodStart),
    periodEnd: normalizeTimestamp(data?.periodEnd, defaults.periodEnd),
    updatedAt: normalizeTimestamp(data?.updatedAt, now),
  };
}

function shouldRewriteQuota(
  data: StoredJarvisQuota | undefined,
  normalized: JarvisQuota,
): boolean {
  if (!data) return false;

  return data.plan !== normalized.plan ||
    typeof data.questionsUsed !== "number" ||
    typeof data.questionsLimit !== "number" ||
    typeof data.documentsUsed !== "number" ||
    typeof data.documentsLimit !== "number" ||
    typeof data.periodStart !== "number" ||
    typeof data.periodEnd !== "number" ||
    typeof data.updatedAt !== "number" ||
    data.documentsUsed !== normalized.documentsUsed ||
    data.documentsLimit !== normalized.documentsLimit;
}

function getMonthStart(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function getMonthEnd(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

// ============ Usage Stats ============

/**
 * Get usage percentage (0-100)
 */
export function getUsagePercent(quota: JarvisQuota): number {
  if (quota.questionsLimit >= 99999) return 0; // unlimited
  if (quota.questionsLimit === 0) return 100;
  return Math.min(100, Math.round((quota.questionsUsed / quota.questionsLimit) * 100));
}

export function getDocUsagePercent(quota: JarvisQuota): number {
  if (quota.documentsLimit >= 99999) return 0; // unlimited
  if (quota.documentsLimit === 0) return 100;
  return Math.min(100, Math.round((quota.documentsUsed / quota.documentsLimit) * 100));
}

/**
 * Get days remaining in period
 */
export function getDaysRemaining(quota: JarvisQuota): number {
  if (quota.plan === "FREE") return 0;
  const remaining = quota.periodEnd - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

/**
 * Should show upgrade prompt? (based on document usage)
 */
export function shouldShowUpgradePrompt(quota: JarvisQuota): "none" | "soft" | "hard" {
  if (quota.documentsLimit >= 99999) return "none"; // Pro unlimited
  const percent = getDocUsagePercent(quota);
  if (percent >= 100) return "hard";   // blocked
  if (percent >= 80) return "soft";    // warning
  return "none";
}
