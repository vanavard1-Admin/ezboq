import { getDb } from '../core/firebaseAdmin';
/**
 * Customer API Endpoints
 * GET /v1/customers - List customers
 * POST /v1/customers - Create customer
 * GET /v1/customers/:id - Get customer
 * PATCH /v1/customers/:id - Update customer
 * DELETE /v1/customers/:id - Delete customer
 */

import { Router, Response } from 'express';
import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import {
    AuthenticatedRequest,
    verifyAuth,
    getActiveBusinessId,
    verifyBusinessOwnership,
} from './auth';
import { checkRequestRateLimit } from '../core/ratelimit';

const router = Router();

/**
 * GET /v1/customers
 * List customers for a business
 * Query: businessId (optional, defaults to active), q (search), limit, offset
 */
router.get('/customers', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;

        // Get business ID from query or use active
        let businessId = req.query.businessId as string;
        if (!businessId) {
            businessId = (await getActiveBusinessId(uid)) || '';
        }

        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }

        // Verify ownership
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const searchQuery = (req.query.q as string)?.toLowerCase() || '';

        const query = db
            .collection(`users/${uid}/businesses/${businessId}/customers`)
            .orderBy('displayName')
            .limit(limit);

        const snapshot = await query.get();

        let customers = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        if (customers.length === 0) {
            const normalizeType = (data: Record<string, unknown>) => {
                const raw = String(data.type || '').toUpperCase();
                if (raw === 'COMPANY' || raw === 'PERSON') return raw;
                if (data.legal_name || data.branch || data.tax_id || data.taxId) return 'COMPANY';
                return 'PERSON';
            };
            const mapLegacy = (doc: admin.firestore.QueryDocumentSnapshot) => {
                const data = doc.data() as Record<string, unknown>;
                return {
                    id: doc.id,
                    type: normalizeType(data),
                    displayName:
                        (data.displayName as string) ||
                        (data.name as string) ||
                        (data.legal_name as string) ||
                        (data.contact_name as string) ||
                        'ลูกค้า',
                    address: data.address as string | undefined,
                    phone: (data.phone as string) || (data.phone_no as string) || undefined,
                    email: data.email as string | undefined,
                    taxId: (data.taxId as string) || (data.tax_id as string) || undefined,
                    businessId: (data.businessId as string) || (data.business_id as string) || undefined,
                };
            };

            let legacySnap = await db
                .collection('customers')
                .where('businessId', '==', businessId)
                .limit(limit)
                .get();

            if (legacySnap.empty) {
                legacySnap = await db
                    .collection('customers')
                    .where('business_id', '==', businessId)
                    .limit(limit)
                    .get();
            }

            if (legacySnap.empty) {
                legacySnap = await db
                    .collection('customers')
                    .where('owner_business_id', '==', businessId)
                    .limit(limit)
                    .get();
            }

            if (legacySnap.empty) {
                legacySnap = await db
                    .collection('customers')
                    .where('ownerBusinessId', '==', businessId)
                    .limit(limit)
                    .get();
            }

            if (legacySnap.empty) {
                legacySnap = await db
                    .collection('customers')
                    .where('user_id', '==', uid)
                    .limit(limit)
                    .get();
            }

            if (legacySnap.empty) {
                legacySnap = await db
                    .collection('customers')
                    .where('userId', '==', uid)
                    .limit(limit)
                    .get();
            }

            customers = legacySnap.docs.map(mapLegacy);
        }

        if (customers.length === 0) {
            type LegacyCustomer = {
                id: string;
                businessId: string;
                type: string;
                displayName: string;
                address?: string;
                phone?: string;
                email?: string;
                taxId?: string;
            };

            const normalizeTypeFromDoc = (data: Record<string, unknown>, snap: Record<string, unknown>) => {
                const taxId = String(
                    data.customer_tax_id || data.customerTaxId || snap.tax_id || snap.taxId || ''
                );
                if (taxId || snap.legal_name || snap.branch) return 'COMPANY';
                return 'PERSON';
            };

            const makeLegacyId = (value: string) =>
                `legacy_${createHash('sha1').update(value).digest('hex').slice(0, 12)}`;

            let legacyDocSnap = await db
                .collection(`users/${uid}/businesses/${businessId}/documents`)
                .limit(200)
                .get();

            if (legacyDocSnap.empty) {
                legacyDocSnap = await db
                    .collection('documents')
                    .where('business_id', '==', businessId)
                    .limit(200)
                    .get();
            }

            if (legacyDocSnap.empty) {
                legacyDocSnap = await db
                    .collection('documents')
                    .where('businessId', '==', businessId)
                    .limit(200)
                    .get();
            }

            if (legacyDocSnap.empty) {
                legacyDocSnap = await db
                    .collection('documents')
                    .where('owner_business_id', '==', businessId)
                    .limit(200)
                    .get();
            }

            if (legacyDocSnap.empty) {
                legacyDocSnap = await db
                    .collection('documents')
                    .where('ownerBusinessId', '==', businessId)
                    .limit(200)
                    .get();
            }

            if (legacyDocSnap.empty) {
                legacyDocSnap = await db
                    .collection('documents')
                    .where('business_snapshot.id', '==', businessId)
                    .limit(200)
                    .get();
            }

            if (legacyDocSnap.empty) {
                legacyDocSnap = await db
                    .collection('documents')
                    .where('businessSnapshot.id', '==', businessId)
                    .limit(200)
                    .get();
            }

            if (legacyDocSnap.empty) {
                legacyDocSnap = await db
                    .collection('documents')
                    .where('user_id', '==', uid)
                    .limit(200)
                    .get();
            }

            if (legacyDocSnap.empty) {
                legacyDocSnap = await db
                    .collection('documents')
                    .where('userId', '==', uid)
                    .limit(200)
                    .get();
            }

            const derived = new Map<string, LegacyCustomer>();

            legacyDocSnap.docs.forEach((doc) => {
                const data = doc.data() as Record<string, unknown>;
                const snap = (data.customer_snapshot || data.customerSnapshot || {}) as Record<string, unknown>;

                const displayName =
                    (data.customer_name as string) ||
                    (data.customerName as string) ||
                    (snap.displayName as string) ||
                    (snap.name as string) ||
                    (snap.legal_name as string) ||
                    (snap.contact_name as string) ||
                    '';

                if (!displayName) return;

                const taxId =
                    (data.customer_tax_id as string) ||
                    (data.customerTaxId as string) ||
                    (snap.tax_id as string) ||
                    (snap.taxId as string) ||
                    '';

                const email =
                    (snap.email as string) ||
                    (data.customer_email as string) ||
                    '';

                const phone =
                    (snap.phone as string) ||
                    (data.customer_phone as string) ||
                    (data.phone as string) ||
                    '';

                const address =
                    (snap.address as string) ||
                    (data.customer_address as string) ||
                    '';

                const explicitId = (data.customer_id as string) || (data.customerId as string) || '';
                const idSource = explicitId || `${displayName}|${taxId}|${email}|${phone}`;
                const id = explicitId || makeLegacyId(idSource);

                if (!derived.has(id)) {
                    derived.set(id, {
                        id,
                        businessId,
                        type: normalizeTypeFromDoc(data, snap),
                        displayName,
                        address,
                        phone,
                        email,
                        taxId,
                    });
                }
            });

            const derivedCustomers = Array.from(derived.values());
            customers = derivedCustomers;

            if (derivedCustomers.length > 0) {
                const batch = db.batch();
                derivedCustomers.forEach((cust) => {
                    const docRef = db.doc(`users/${uid}/businesses/${businessId}/customers/${cust.id}`);
                    batch.set(
                        docRef,
                        {
                            type: cust.type || 'PERSON',
                            displayName: cust.displayName || 'ลูกค้า',
                            address: cust.address || '',
                            phone: cust.phone || '',
                            email: cust.email || '',
                            taxId: cust.taxId || '',
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        },
                        { merge: true }
                    );
                });
                await batch.commit();
            }
        }

        // Client-side filter for search (Firestore doesn't support LIKE)
        if (searchQuery) {
            customers = customers.filter((c) => {
                const name = ((c as Record<string, unknown>).displayName as string || '').toLowerCase();
                const email = ((c as Record<string, unknown>).email as string || '').toLowerCase();
                return name.includes(searchQuery) || email.includes(searchQuery);
            });
        }

        res.json({
            businessId,
            customers,
            count: customers.length,
        });
    } catch (error) {
        console.error('GET /v1/customers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/customers
 * Create a new customer
 */
router.post('/customers', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;

        const businessId = req.body.businessId || (await getActiveBusinessId(uid));

        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }

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

        const { displayName, type, address, phone, email, taxId } = req.body;

        if (!displayName) {
            res.status(400).json({ error: 'displayName is required' });
            return;
        }

        const customerData = {
            type: type || 'PERSON',
            displayName,
            address: address || '',
            phone: phone || '',
            email: email || '',
            taxId: taxId || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const ref = await db
            .collection(`users/${uid}/businesses/${businessId}/customers`)
            .add(customerData);

        res.status(201).json({
            id: ref.id,
            businessId,
            ...customerData,
        });
    } catch (error) {
        console.error('POST /v1/customers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /v1/customers/:id
 * Get a single customer
 */
router.get('/customers/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const customerId = req.params.id;

        const businessId = (req.query.businessId as string) || (await getActiveBusinessId(uid));

        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }

        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const snap = await db
            .doc(`users/${uid}/businesses/${businessId}/customers/${customerId}`)
            .get();

        if (!snap.exists) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        res.json({
            id: snap.id,
            businessId,
            ...snap.data(),
        });
    } catch (error) {
        console.error('GET /v1/customers/:id error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /v1/customers/:id
 * Update a customer
 */
router.patch('/customers/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const customerId = req.params.id;

        const businessId = req.body.businessId || (await getActiveBusinessId(uid));

        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }

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

        const docRef = db.doc(`users/${uid}/businesses/${businessId}/customers/${customerId}`);
        const snap = await docRef.get();

        if (!snap.exists) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        const allowedFields = ['type', 'displayName', 'address', 'phone', 'email', 'taxId'];
        const updates: Record<string, unknown> = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await docRef.update(updates);

        const updatedSnap = await docRef.get();

        res.json({
            id: updatedSnap.id,
            businessId,
            ...updatedSnap.data(),
        });
    } catch (error) {
        console.error('PATCH /v1/customers/:id error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /v1/customers/:id
 * Delete a customer
 */
router.delete('/customers/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const customerId = req.params.id;

        const businessId = (req.query.businessId as string) || (await getActiveBusinessId(uid));

        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }

        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const docRef = db.doc(`users/${uid}/businesses/${businessId}/customers/${customerId}`);
        const snap = await docRef.get();

        if (!snap.exists) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        await docRef.delete();

        res.json({ success: true, deleted: customerId });
    } catch (error) {
        console.error('DELETE /v1/customers/:id error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
