import { getDb } from './firebaseAdmin';
/**
 * Rate Limiting Module
 * Prevent abuse by limiting requests per user/business
 * 
 * Uses planService for plan-aware limits
 */

import * as admin from 'firebase-admin';
import { getRateLimits, normalizePlan } from './planService';

const RATE_LIMITS_COLLECTION = 'rate_limits';

interface RateLimitResult {
    allowed: boolean;
    reason?: string;
    retryAfterSeconds?: number;
}

/**
 * Check and update request rate limit for a user
 */
export async function checkRequestRateLimit(
    userId: string,
    userPlan: string = 'FREE'
): Promise<RateLimitResult> {
    const db = getDb();
    // ✅ Use planService for plan-aware limits
    const normalizedPlan = normalizePlan(userPlan);
    const limits = getRateLimits(normalizedPlan);
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000); // Current minute

    const ref = db.doc(`${RATE_LIMITS_COLLECTION}/requests/${userId}/${minuteWindow}`);

    try {
        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const data = snap.exists ? (snap.data() as { count: number }) : { count: 0 };

            if (data.count >= limits.maxRequestsPerMinute) {
                return {
                    allowed: false,
                    reason: 'RATE_LIMIT_EXCEEDED',
                    retryAfterSeconds: 60 - (Math.floor(now / 1000) % 60),
                };
            }

            tx.set(ref, {
                count: data.count + 1,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                expireAt: admin.firestore.Timestamp.fromDate(
                    new Date(now + 2 * 60 * 1000) // Expire after 2 minutes
                ),
            });

            return { allowed: true };
        });

        return result;
    } catch (error) {
        console.error('Rate limit check failed:', error);
        return { allowed: false, reason: 'RATE_LIMIT_CHECK_ERROR' };
    }
}

/**
 * Check daily document creation limit for a business
 */
export async function checkDailyDocLimit(
    userId: string,
    businessId: string,
    userPlan: string = 'FREE'
): Promise<RateLimitResult> {
    const db = getDb();
    // ✅ Use planService for plan-aware limits
    const normalizedPlan = normalizePlan(userPlan);
    const limits = getRateLimits(normalizedPlan);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const ref = db.doc(
        `${RATE_LIMITS_COLLECTION}/docs/${userId}/${businessId}/daily/${today}`
    );

    try {
        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const data = snap.exists ? (snap.data() as { count: number }) : { count: 0 };

            if (limits.maxDocsPerDay !== null && data.count >= limits.maxDocsPerDay) {
                return {
                    allowed: false,
                    reason: 'DAILY_DOC_LIMIT_EXCEEDED',
                    retryAfterSeconds: getSecondsUntilMidnight(),
                };
            }

            tx.set(ref, {
                count: data.count + 1,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                expireAt: admin.firestore.Timestamp.fromDate(
                    new Date(Date.now() + 25 * 60 * 60 * 1000) // Expire after 25 hours
                ),
            });

            return { allowed: true };
        });

        return result;
    } catch (error) {
        console.error('Daily doc limit check failed:', error);
        return { allowed: true };
    }
}

/**
 * Get seconds until midnight (next day reset)
 */
function getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

/**
 * Check payload size limit
 */
export function checkPayloadSize(
    text: string,
    maxBytes: number = 10000 // 10KB default
): RateLimitResult {
    const size = Buffer.byteLength(text, 'utf8');

    if (size > maxBytes) {
        return {
            allowed: false,
            reason: 'PAYLOAD_TOO_LARGE',
        };
    }

    return { allowed: true };
}
