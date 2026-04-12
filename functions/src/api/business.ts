import { getDb } from '../core/firebaseAdmin';
/**
 * Business API Endpoints
 * GET /v1/me - Get current user with active business
 * GET /v1/business/:id - Get business details
 * PATCH /v1/business/:id - Update business
 */

import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { createBusiness } from '../core/businesses';
import { getBankByCode, resolveBankCode } from '../services/bankMasterService';
import {
    AuthenticatedRequest,
    verifyAuth,
    ensureUserExists,
    verifyBusinessOwnership,
} from './auth';
import { checkRequestRateLimit } from '../core/ratelimit';

const router = Router();

type BankFields = {
    bankName?: string;
    bankCode?: string;
    bankAccountNo?: string;
    bankAccountName?: string;
};

const readString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeBankFields = (source: Record<string, unknown> | null | undefined): BankFields => ({
    bankName: readString(source?.bankName) || readString(source?.bank_name),
    bankCode: readString(source?.bankCode) || readString(source?.bank_code),
    bankAccountNo: readString(source?.bankAccountNo) || readString(source?.bank_account),
    bankAccountName: readString(source?.bankAccountName) || readString(source?.bank_account_name),
});

const normalizeLanguage = (value: unknown): 'th' | 'en' => (value === 'en' ? 'en' : 'th');

const mergeBankFields = (
    business: Record<string, unknown>,
    paymentData: Record<string, unknown> | null | undefined
): Record<string, unknown> => {
    const businessBanks = normalizeBankFields(business);
    const paymentBanks = normalizeBankFields(paymentData || {});
    const paymentBankCode = readString(paymentData?.bank_code);
    const paymentBankName =
        paymentBanks.bankName ||
        (paymentBankCode ? getBankByCode(paymentBankCode)?.name_th || paymentBankCode : undefined);
    const resolvedBankCode =
        businessBanks.bankCode ||
        paymentBankCode ||
        resolveBankCode(businessBanks.bankName || paymentBankName || undefined) ||
        undefined;

    return {
        ...business,
        bankCode: resolvedBankCode,
        bankName: businessBanks.bankName || paymentBankName,
        bankAccountNo: businessBanks.bankAccountNo || paymentBanks.bankAccountNo,
        bankAccountName: businessBanks.bankAccountName || paymentBanks.bankAccountName,
    };
};

const hydrateBusinessBanks = async (
    uid: string,
    businessId: string,
    business: Record<string, unknown>,
    db: FirebaseFirestore.Firestore
): Promise<Record<string, unknown>> => {
    const paymentRef = db.doc(`users/${uid}/businesses/${businessId}/settings/payment`);
    const paymentSnap = await paymentRef.get();
    const paymentData = paymentSnap.exists ? (paymentSnap.data() || {}) : {};
    return mergeBankFields(business, paymentData);
};

/**
 * GET /v1/me
 * Get current user profile with active business
 */
router.get('/me', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;

        // Ensure user exists in Firestore
        const { activeBusinessId, plan } = await ensureUserExists(uid, req.user?.email);

        // Get all businesses for this user
        const bizQuery = await db.collection(`users/${uid}/businesses`).get();
        const businesses = bizQuery.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
        }));

        // Load active business if exists
        let business: Record<string, unknown> | null = null;
        if (activeBusinessId) {
            const bizSnap = await db.doc(`users/${uid}/businesses/${activeBusinessId}`).get();
            if (bizSnap.exists) {
                const rawBusiness = { id: bizSnap.id, ...bizSnap.data() };
                business = await hydrateBusinessBanks(uid, activeBusinessId, rawBusiness, db);
            }
        }

        // Ensure profile responses are not cached by browsers or intermediaries
        res.set('Cache-Control', 'no-store');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        res.json({
            userId: uid,
            email: req.user?.email || null,
            activeBusinessId,
            plan,
            roles: ['OWNER'], // Default role for now
            business,
            businesses,
        });
    } catch (error) {
        console.error('GET /v1/me error:', error);
        // Ensure error responses also do not get cached
        res.set('Cache-Control', 'no-store');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/business/bootstrap
 * Explicit onboarding endpoint (no side effects in GET /me)
 * - If user has no business: create default business + set activeBusinessId
 * - If user has businesses but no activeBusinessId: set active to the first
 */
router.post('/business/bootstrap', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;

        const { activeBusinessId } = await ensureUserExists(uid, req.user?.email);

        const bizQuery = await db.collection(`users/${uid}/businesses`).get();
        const businesses = bizQuery.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
        }));

        // Case 1: create first business
        if (businesses.length === 0) {
            const defaultName = req.user?.email
                ? `Business (${String(req.user.email).split('@')[0]})`
                : 'My Business';

            const businessId = await createBusiness(uid, {
                name: defaultName,
                email: req.user?.email,
            });

            res.set('Cache-Control', 'no-store');
            res.json({
                success: true,
                created: true,
                businessId,
                activeBusinessId: businessId,
            });
            return;
        }

        // Case 2: businesses exist; ensure activeBusinessId is set
        if (!activeBusinessId) {
            const firstBusinessId = businesses[0].id;
            await db.doc(`users/${uid}`).update({
                activeBusinessId: firstBusinessId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            res.set('Cache-Control', 'no-store');
            res.json({
                success: true,
                created: false,
                businessId: firstBusinessId,
                activeBusinessId: firstBusinessId,
            });
            return;
        }

        // Case 3: already bootstrapped
        res.set('Cache-Control', 'no-store');
        res.json({
            success: true,
            created: false,
            businessId: activeBusinessId,
            activeBusinessId,
        });
    } catch (error) {
        console.error('POST /v1/business/bootstrap error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /v1/business/:id
 * Get business details
 */
router.get('/business/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const businessId = req.params.id as string;

        // Verify ownership
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const bizSnap = await db.doc(`users/${uid}/businesses/${businessId}`).get();
        const data = bizSnap.data() || {};
        const hydrated = await hydrateBusinessBanks(uid, businessId, { id: bizSnap.id, ...data }, db);

        res.json({
            ...hydrated,
            // Compute setup completeness
            isSetupComplete: Boolean(
                data?.name &&
                data?.address &&
                data?.taxId
            ),
        });
    } catch (error) {
        console.error('GET /v1/business/:id error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /v1/business/:id
 * Update business details
 */
router.patch('/business/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const businessId = req.params.id as string;

        // Verify ownership
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        // Rate Limit Check
        const { plan = 'FREE' } = await db.doc(`users/${uid}`).get().then(s => s.data() || {});
        const rateLimit = await checkRequestRateLimit(uid, plan);
        if (!rateLimit.allowed) {
            res.status(429).json({ error: 'Too many requests' });
            return;
        }

        // Allowed fields to update
        const allowedFields = [
            'name',
            'address',
            'phone',
            'email',
            'taxId',
            'defaultVatEnabled',
            'defaultVatRate',
            'defaultWhtEnabled',
            'defaultWhtRate',
            'bankName',
            'bankCode',
            'bankAccountNo',
            'bankAccountName',
            'promptpayAccount',
            'promptpayName',
            'promptpayQrUrl',
            'paymentMethods',
            'emailNotifications',
            'lineNotifications',
            'language',
            'pdfTheme',
            'pdfThemeQuo',
            'pdfThemeBill',
            'pdfThemeReceipt',
            'logoUrl',
            'stampUrl',
            'signatureUrl',
        ];

        const updates: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (updates.bankName || updates.bankCode) {
            const resolvedBankCode = resolveBankCode(
                readString(updates.bankCode) || readString(updates.bankName)
            );
            updates.bankCode = resolvedBankCode || '';
        }

        if (updates.language !== undefined) {
            updates.language = normalizeLanguage(updates.language);
        }

        if (updates.emailNotifications !== undefined) {
            updates.emailNotifications = Boolean(updates.emailNotifications);
        }

        if (updates.lineNotifications !== undefined) {
            updates.lineNotifications = Boolean(updates.lineNotifications);
        }

        if (Object.keys(updates).length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await db.doc(`users/${uid}/businesses/${businessId}`).update(updates);

        // Return updated business
        const updatedSnap = await db.doc(`users/${uid}/businesses/${businessId}`).get();

        res.json({
            id: updatedSnap.id,
            ...updatedSnap.data(),
        });
    } catch (error) {
        console.error('PATCH /v1/business/:id error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/account/delete
 * Soft-delete Firestore profile, unlink LINE, then remove Firebase Auth user.
 */
router.post('/account/delete', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const confirmText = String(req.body?.confirmText || '').trim().toUpperCase();

        if (confirmText !== 'DELETE') {
            res.status(400).json({ error: 'Please type DELETE to confirm account deletion' });
            return;
        }

        const userRef = db.doc(`users/${uid}`);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? (userSnap.data() || {}) : {};
        const lineUserId = readString(userData.lineUserId) || readString(userData.line_user_id);

        const businessesSnap = await db.collection(`users/${uid}/businesses`).get();
        const batch = db.batch();
        const deletedAt = admin.firestore.FieldValue.serverTimestamp();

        batch.set(userRef, {
            accountStatus: 'DELETED',
            deletionRequestedAt: deletedAt,
            activeBusinessId: null,
            retentionFlowActive: false,
            lineUserId: admin.firestore.FieldValue.delete(),
            line_user_id: admin.firestore.FieldValue.delete(),
            updatedAt: deletedAt,
        }, { merge: true });

        for (const businessSnap of businessesSnap.docs) {
            batch.set(businessSnap.ref, {
                accountStatus: 'DELETED',
                deletedAt,
                updatedAt: deletedAt,
            }, { merge: true });
        }

        if (lineUserId) {
            batch.delete(db.collection('line_links').doc(lineUserId));
            batch.delete(db.collection('lineUsers').doc(lineUserId));
        }

        await batch.commit();

        try {
            await admin.auth().deleteUser(uid);
        } catch (authError) {
            console.error('[account/delete] Failed to delete auth user:', authError);
            res.status(500).json({ error: 'Account data was flagged for deletion but auth removal failed' });
            return;
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('POST /v1/account/delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/business/:id/set-active
 * Set business as active
 */
router.post('/business/:id/set-active', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const businessId = req.params.id as string;

        // Verify ownership
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        await db.doc(`users/${uid}`).update({
            activeBusinessId: businessId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ success: true, activeBusinessId: businessId });
    } catch (error) {
        console.error('POST /v1/business/:id/set-active error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
