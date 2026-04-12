import { getDb } from '../core/firebaseAdmin';
/**
 * Subscription API Endpoints
 * GET /v1/subscription - Current subscription status
 * GET /v1/subscription/history - Payment history
 * POST /v1/subscription/promo - Preview/apply promo code
 * POST /v1/subscription/purchase - Create purchase (QR sent to LINE)
 */

import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest, verifyAuth } from './auth';
import { getOrCreateSubscription } from '../core/subscriptionService';
import {
    getEffectiveSubscriptionPlan,
    getEffectiveSubscriptionStatus,
} from '../core/planService';
import { getLineLinkByUid } from '../core/lineLinkService';
import {
    createPurchase,
    getPackageDefinition,
    PACKAGE_TYPE_PRO,
    normalizePackageType,
    type AnyPackageType,
} from '../services/purchaseService';
import {
    previewPromoCode,
    resolvePromoCode,
    applyPromoToAmount,
    setPendingPromoCode,
    clearPendingPromoCode,
} from '../services/promoCodeService';

const router = Router();

const toIso = (value?: admin.firestore.Timestamp | null): string | null => {
    if (!value) return null;
    return value.toDate().toISOString();
};

const addMonths = (date: Date, months: number): Date => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
};

/**
 * GET /v1/subscription
 * Current subscription status
 */
router.get('/subscription', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const uid = req.userId!;
        const subscription = await getOrCreateSubscription(uid);
        const plan = getEffectiveSubscriptionPlan(subscription);
        const status = getEffectiveSubscriptionStatus(subscription);

        res.json({
            plan,
            status,
            seatTotal: plan === 'TEAM' ? Math.max(subscription.seatTotal || 3, 1) : 1,
            seatUsed: plan === 'TEAM' ? Math.max(subscription.seatUsed || 1, 1) : 1,
            autoRenew: status === 'ACTIVE' ? Boolean(subscription.autoRenew) : false,
            periodStart: toIso(subscription.periodStart),
            periodEnd: toIso(subscription.periodEnd),
            nextBillingAt: toIso(subscription.nextBillingAt),
        });
    } catch (error) {
        console.error('GET /v1/subscription error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /v1/subscription/history
 * List recent subscription payments
 */
router.get('/subscription/history', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const limitRaw = Number(req.query.limit ?? 10);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 10;

        const snap = await db
            .collection('credit_purchases')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const items = snap.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const paidAt =
                (data.paidAt as admin.firestore.Timestamp | undefined) ||
                (data.payment_verified_at as admin.firestore.Timestamp | undefined) ||
                (data.credit_applied_at as admin.firestore.Timestamp | undefined) ||
                null;
            const packageType = Number(data.packageType || PACKAGE_TYPE_PRO) as AnyPackageType;
            const pkg = getPackageDefinition(packageType);
            const promoDurationMonths = Number(data.promo_duration_months || 0);
            const durationMonths = promoDurationMonths > 0 ? promoDurationMonths : (pkg?.durationMonths || 1);
            const periodStart = paidAt ? paidAt.toDate() : null;
            const periodEnd = periodStart ? addMonths(periodStart, durationMonths) : null;

            return {
                id: doc.id,
                amount: Number(data.amount || 0),
                status: data.status || 'PENDING',
                plan: data.plan || null,
                packageType: data.packageType || null,
                referenceId: data.referenceId || null,
                promoCode: data.promo_code || null,
                createdAt: toIso(data.createdAt as admin.firestore.Timestamp | undefined),
                paidAt: toIso(paidAt),
                periodStart: periodStart ? periodStart.toISOString() : null,
                periodEnd: periodEnd ? periodEnd.toISOString() : null,
            };
        });

        res.json({ count: items.length, items });
    } catch (error) {
        console.error('GET /v1/subscription/history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/subscription/promo
 * Preview promo code and store pending promo if valid
 */
router.post('/subscription/promo', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const uid = req.userId!;
        const rawCode = String(req.body?.code || '').trim();
        if (!rawCode) {
            res.status(400).json({ error: 'Missing promo code' });
            return;
        }

        const preview = await previewPromoCode(rawCode);
        const rawPackageType = Number(req.body?.packageType ?? PACKAGE_TYPE_PRO) as AnyPackageType;
        const normalizedPackageType = normalizePackageType(rawPackageType);
        const pkg = getPackageDefinition(normalizedPackageType) || getPackageDefinition(PACKAGE_TYPE_PRO);
        const baseAmount = pkg?.amount ?? 99;
        const plan = (pkg?.plan || 'PRO') as 'PRO' | 'TEAM';

        if (!preview.valid) {
            res.json({
                valid: false,
                code: preview.code,
                baseAmount,
                finalAmount: baseAmount,
                discountAmount: 0,
                reason: preview.reason || 'โค้ดไม่ถูกต้อง',
            });
            return;
        }

        const promo = await resolvePromoCode(preview.code);
        if (!promo) {
            res.json({
                valid: false,
                code: preview.code,
                baseAmount,
                finalAmount: baseAmount,
                discountAmount: 0,
                reason: 'โค้ดไม่ถูกต้อง',
            });
            return;
        }

        const applied = applyPromoToAmount({
            baseAmount,
            promo,
            plan,
            packageType: normalizedPackageType,
        });
        if (!applied.ok) {
            await clearPendingPromoCode(uid);
            res.json({
                valid: false,
                code: preview.code,
                baseAmount,
                finalAmount: baseAmount,
                discountAmount: 0,
                reason: applied.reason === 'PACKAGE_MISMATCH' ? 'โค้ดใช้กับรอบชำระเงินนี้ไม่ได้' : 'โค้ดใช้กับแพ็กนี้ไม่ได้',
            });
            return;
        }

        await setPendingPromoCode(uid, preview.code, preview, normalizedPackageType);

        res.json({
            valid: true,
            code: preview.code,
            baseAmount,
            finalAmount: applied.finalAmount,
            discountAmount: applied.discountAmount,
            discountPercent: applied.discountPercent,
            durationMonths: applied.durationMonths || preview.durationMonths || null,
            appliesTo: preview.appliesTo || null,
        });
    } catch (error) {
        console.error('POST /v1/subscription/promo error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/subscription/purchase
 * Create purchase and push QR to LINE
 */
router.post('/subscription/purchase', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const rawPackageType = Number(req.body?.packageType ?? PACKAGE_TYPE_PRO) as AnyPackageType;
        const packageType = normalizePackageType(rawPackageType);

        let lineUserId: string | null = null;
        const userSnap = await db.doc(`users/${uid}`).get();
        if (userSnap.exists) {
            const userData = userSnap.data() || {};
            lineUserId =
                (userData.lineUserId as string | undefined) ||
                (userData.line_user_id as string | undefined) ||
                null;
        }

        if (!lineUserId) {
            const lineLink = await getLineLinkByUid(uid);
            lineUserId = lineLink?.lineUserId || null;
        }

        if (!lineUserId) {
            res.status(400).json({ error: 'กรุณาเชื่อมต่อ LINE ก่อนทำรายการ' });
            return;
        }

        const result = await createPurchase({
            userId: uid,
            lineUserId,
            packageType,
            allowRenewal: true,
        });

        res.json(result);
    } catch (error) {
        console.error('POST /v1/subscription/purchase error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
