import { getDb } from '../core/firebaseAdmin';
import { getLineChannelAccessToken, getUseCloudTasks, getPdfTemplateVersion } from '../shared/config';
/**
 * Document API Endpoints
 * GET /v1/documents - List documents
 * POST /v1/documents - Create document draft
 * GET /v1/documents/:id - Get document with items
 * PATCH /v1/documents/:id - Update document
 * POST /v1/documents/:id/generate-pdf - Enqueue PDF generation
 */

import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { buildLineDeliveryMessage, DocData, BusinessData } from '../line/messages';
import { getOrCreateShortLink, buildShortUrl } from '../shared/pdfFlexMessage';
import {
    AuthenticatedRequest,
    verifyAuth,
    getActiveBusinessId,
    verifyBusinessOwnership,
} from './auth';
import { allocateDocNo, getYearBEFromISO } from '../core/sequences';
import { calcMoney } from '../core/money';
import { enqueuePdfJobWithTasks /*, enqueuePdfJobDirect */ } from '../core/tasks';
import { processPdfJob } from '../workers/pdfWorker';
import { checkRequestRateLimit, checkDailyDocLimit } from '../core/ratelimit';
import { incrementDocStats } from '../core/statsMonthly';
import { assertTransition, logStatusTransition, getTransitionAction, DocumentState } from '../core/stateMachine';
import { PdfJobPayload } from '../shared/types';

const router = Router();

const toIsoDate = (value: unknown): string => {
    if (!value) return '';
    if (value instanceof admin.firestore.Timestamp) {
        return value.toDate().toISOString().slice(0, 10);
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    if (typeof value === 'string') {
        return value.slice(0, 10);
    }
    return '';
};

const normalizeDocType = (data: Record<string, unknown>, id?: string): 'QUO' | 'BILL' | 'RECEIPT' | 'CN' | 'DN' | 'UNKNOWN' => {
    const raw = String(data.docType || data.doc_type || '').toUpperCase();
    if (raw === 'QUO' || raw === 'QUOTATION') return 'QUO';
    if (raw === 'BILL' || raw === 'INVOICE' || raw === 'INV') return 'BILL';
    if (raw === 'RECEIPT' || raw === 'RCP' || raw === 'RCPT' || raw === 'REC') return 'RECEIPT';
    if (raw === 'CN' || raw === 'CREDIT_NOTE') return 'CN';
    if (raw === 'DN' || raw === 'DEBIT_NOTE') return 'DN';

    const docNo = String(data.docNo || data.doc_no || id || '').toUpperCase();
    const prefix = docNo.split('-')[0];
    if (prefix === 'QUO' || prefix === 'QT' || prefix === 'QU') return 'QUO';
    if (prefix === 'BILL' || prefix === 'INV') return 'BILL';
    if (prefix === 'RCP' || prefix === 'RCPT' || prefix === 'REC') return 'RECEIPT';
    if (prefix === 'CN') return 'CN';
    if (prefix === 'DN') return 'DN';

    return raw ? (raw as 'UNKNOWN') : 'UNKNOWN';
};

const normalizeStatus = (data: Record<string, unknown>): string => {
    const raw = String(data.status || data.doc_status || data.state || '').toUpperCase();
    return raw || 'ISSUED';
};

const mapLegacyItems = (items: unknown[] = []) => {
    if (items.length > 500) {
        throw new Error('Too many items (max 500)');
    }
    return items.map((item, idx) => {
        const row = (item || {}) as Record<string, unknown>;
        const qty = Math.max(0, Number(row.qty ?? row.quantity ?? 0));
        const unitPrice = Math.max(0, Number(row.unit_price ?? row.unitPrice ?? 0));
        const desc = (row.description_th as string) || (row.description as string) || '';
        return {
            line_no: (row.line_no as number) || idx + 1,
            description_th: desc.slice(0, 1000),
            description_en: (row.description_en as string) || null,
            qty,
            unit: (row.unit as string) || (row.unit_name as string) || '',
            unit_price: unitPrice,
            amount: Number(row.amount ?? qty * unitPrice),
        };
    });
};

const mapLegacyMoney = (data: Record<string, unknown>) => {
    const money = (data.money || {}) as Record<string, unknown>;
    const subtotal = Number(data.sub_total_amount ?? money.subtotal ?? money.sub_total_amount ?? 0);
    const vatAmount = Number(data.vat_amount ?? money.vat_amount ?? 0);
    const whtAmount = Number(data.wht_amount ?? money.wht_amount ?? 0);
    const totalAmount = Number(
        data.total_amount ?? money.total_amount ?? money.grand_total ?? money.total ?? 0
    );
    const netReceive = Number(
        data.net_receive_amount ?? money.net_receive_amount ?? money.net_received ?? money.netReceived ?? totalAmount
    );
    const vatRate = Number(data.vat_percent ?? money.vat_rate_pct ?? (data.tax_snapshot as any)?.vat_percent ?? 0);
    const whtRate = Number(data.wht_percent ?? money.wht_rate_pct ?? (data.tax_snapshot as any)?.withholding_percent ?? 0);

    return {
        subtotal,
        discount_amount: Number(money.discount_amount ?? 0),
        extra_fee_amount: Number(money.extra_fee_amount ?? 0),
        vat_amount: vatAmount,
        wht_amount: whtAmount,
        total_amount: totalAmount,
        net_receive_amount: netReceive,
        discount_enabled: Boolean(money.discount_enabled ?? false),
        vat_enabled: Boolean(money.vat_enabled ?? vatRate),
        wht_enabled: Boolean(money.wht_enabled ?? whtRate),
        extra_fee_enabled: Boolean(money.extra_fee_enabled ?? false),
        vat_rate_pct: vatRate || 0,
        wht_rate_pct: whtRate || 0,
    };
};

const mapLegacyCustomerSnapshot = (data: Record<string, unknown>) => {
    const snap = (data.customerSnapshot || data.customer_snapshot || {}) as Record<string, unknown>;
    const displayName =
        (snap.displayName as string) ||
        (snap.name as string) ||
        (snap.legal_name as string) ||
        (data.customer_name as string) ||
        '-';
    return {
        displayName,
        address: (snap.address as string) || (data.customer_address as string) || undefined,
        taxId: (snap.taxId as string) || (snap.tax_id as string) || (data.customer_tax_id as string) || undefined,
    };
};

const mapLegacyDocumentList = async (
    doc: admin.firestore.DocumentSnapshot | admin.firestore.QueryDocumentSnapshot
) => {
    const data = doc.data() as Record<string, unknown>;
    const docNo = String(data.docNo || data.doc_no || doc.id || '');
    const docType = normalizeDocType(data, doc.id);
    const status = normalizeStatus(data);
    const issueDate = toIsoDate(data.issueDate || data.issue_date || data.issue_date_raw || data.issued_at || data.created_at);

    let pdfUrl: string | null | undefined = undefined;
    // Prefer storage paths (pdf_path/pdfPath) to avoid stale signed URLs
    const rawPdf = data.pdf_path || data.pdfPath || data.pdfUrl || data.pdf_url;
    if (typeof rawPdf === 'string') {
        pdfUrl = rawPdf;
    }

    // Generate signed URL if it's a storage path
    if (pdfUrl && !pdfUrl.startsWith('http')) {
        try {
            // If it looks like a file path (not gs://), assumption: relative to bucket root
            const bucket = admin.storage().bucket();
            // Clean path
            const path = pdfUrl.replace(/^gs:\/\/[^/]+\//, '');
            const [signedUrl] = await bucket.file(path).getSignedUrl({
                action: 'read',
                expires: Date.now() + 1000 * 60 * 60, // 1 hour
            });
            pdfUrl = signedUrl;
        } catch (e) {
            console.warn(`[mapLegacyDocumentList] Failed to sign URL for ${doc.id}:`, e);
            // Fallback to original (might be broken but better than null if client can handle)
            // Or set to null to hide button?
        }
    }

    const expectedVersion = getPdfTemplateVersion();
    const currentVersion = (data.pdf_template_version as string | undefined) || (data.pdf_render_version as string | undefined) || null;
    const versionMismatch = Boolean(expectedVersion && currentVersion !== expectedVersion);
    if (versionMismatch) {
        pdfUrl = null;
    }

    return {
        id: doc.id,
        docNo,
        docType,
        status,
        issueDate,
        pdfReady: !versionMismatch && Boolean(data.pdfReady || data.pdf_ready || pdfUrl),
        pdfUrl: versionMismatch ? null : (pdfUrl || null),
        customerSnapshot: mapLegacyCustomerSnapshot(data),
        money: mapLegacyMoney(data),
        createdAt: data.createdAt || data.created_at || null,
    };
};

const mapLegacyDocumentFull = async (
    doc: admin.firestore.DocumentSnapshot | admin.firestore.QueryDocumentSnapshot
) => {
    const data = doc.data() as Record<string, unknown>;
    const base = await mapLegacyDocumentList(doc) as Record<string, unknown>;
    const items = mapLegacyItems((data.items as unknown[]) || []);
    const taxSnap = (data.tax_snapshot || data.taxSnapshot || {}) as Record<string, unknown>;
    return {
        ...base,
        items,
        taxSnapshot: {
            vatEnabled: Boolean(taxSnap.vatEnabled ?? taxSnap.vat_percent ?? (data.vat_percent as number | undefined)),
            vatRate: Number(taxSnap.vatRate ?? taxSnap.vat_percent ?? data.vat_percent ?? 0),
            whtEnabled: Boolean(taxSnap.whtEnabled ?? taxSnap.withholding_percent ?? (data.wht_percent as number | undefined)),
            whtRate: Number(taxSnap.whtRate ?? taxSnap.withholding_percent ?? data.wht_percent ?? 0),
            whtBase: 'BEFORE_VAT',
        },
        revision: Number(data.revision ?? 0),
        pdfState: (data.pdfState as string) || (data.pdf_state as string) || undefined,
        version: Number(data.version ?? 1),
        origin_document_id: (data.origin_document_id as string) || null,
        supersedes_document_id: (data.supersedes_document_id as string) || null,
        is_void: Boolean(data.is_void ?? false),
    };
};

/**
 * GET /v1/documents
 * List documents for a business
 */
router.get('/documents', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;

        let businessId = req.query.businessId as string;
        if (!businessId) {
            businessId = (await getActiveBusinessId(uid)) || '';
        }

        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }

        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const docType = req.query.docType as string;
        const status = req.query.status as string;
        const recoverDocNo = (req.query.recoverDocNo as string | undefined)?.trim();

        const userSnap = await db.doc(`users/${uid}`).get();
        const userData = userSnap.data() || {};
        let lineUserId =
            (userData.lineUserId as string | undefined) ||
            (userData.line_user_id as string | undefined) ||
            null;
        if (!lineUserId) {
            const linkSnap = await db
                .collection('line_links')
                .where('uid', '==', uid)
                .limit(1)
                .get();
            if (!linkSnap.empty) {
                const linkData = linkSnap.docs[0].data() || {};
                lineUserId =
                    (linkData.lineUserId as string | undefined) ||
                    (linkData.line_user_id as string | undefined) ||
                    linkSnap.docs[0].id;
            }
        }

        const loadDocumentsFromRef = async (ref: admin.firestore.CollectionReference) => {
            // Try orderBy queries first for sorted results
            let snapshot = await ref.orderBy('createdAt', 'desc').limit(limit).get();

            if (snapshot.empty) {
                snapshot = await ref.orderBy('created_at', 'desc').limit(limit).get();
            }

            if (snapshot.empty) {
                snapshot = await ref.orderBy('issued_at', 'desc').limit(limit).get();
            }

            // CRITICAL: If orderBy queries return few results, also try without orderBy
            // This ensures we don't miss documents that lack the timestamp field
            // (This matches how reportService.fetchBusinessDocuments works)
            if (snapshot.size < limit) {
                try {
                    const noOrderSnap = await ref.limit(limit * 2).get();
                    if (noOrderSnap.size > snapshot.size) {
                        console.log(`[loadDocumentsFromRef] orderBy returned ${snapshot.size}, no-order returned ${noOrderSnap.size} - using no-order`);
                        snapshot = noOrderSnap;
                    }
                } catch { /* ignore */ }
            }

            return Promise.all(snapshot.docs.map(mapLegacyDocumentList));
        };

        const baseRef = db.collection(`users/${uid}/businesses/${businessId}/documents`);
        let documents = await loadDocumentsFromRef(baseRef);
        console.log(`[GET /v1/documents] user=${uid} biz=${businessId} base_docs=${documents.length}`);

        const ownerUid =
            (userData.team_owner_id as string | undefined) ||
            (userData.teamOwnerId as string | undefined) ||
            null;

        const seen = new Set<string>();
        const makeKey = (doc: { id?: string; docNo?: string }) => {
            const docNo = String(doc.docNo || '').trim();
            if (docNo && docNo.toUpperCase() !== 'DRAFT' && docNo !== 'รอเลขที่') {
                return `no:${docNo}`;
            }
            return `id:${doc.id || docNo}`;
        };
        documents.forEach((doc) => seen.add(makeKey(doc)));
        const mergeDocs = (incoming: Awaited<ReturnType<typeof mapLegacyDocumentList>>[], inferredBusinessId?: string) => {
            incoming.forEach((doc) => {
                const key = makeKey(doc);
                if (!seen.has(key)) {
                    seen.add(key);
                    documents.push(
                        inferredBusinessId ? ({ ...doc, businessId: inferredBusinessId } as typeof doc) : doc
                    );
                }
            });
        };

        // Only fall back to legacy root collections when the canonical nested path is empty.
        // This keeps the normal dashboard path fast while preserving recovery for older data.
        if (documents.length === 0) {
            try {
                const rootSnap1 = await db.collection('documents')
                    .where('business_id', '==', businessId)
                    .limit(200)
                    .get();
                if (!rootSnap1.empty) {
                    console.log(`[GET /v1/documents] found ${rootSnap1.size} in root (business_id)`);
                    mergeDocs(await Promise.all(rootSnap1.docs.map(mapLegacyDocumentList)));
                }
            } catch { /* ignore missing index */ }

            try {
                const rootSnap2 = await db.collection('documents')
                    .where('businessId', '==', businessId)
                    .limit(200)
                    .get();
                if (!rootSnap2.empty) {
                    console.log(`[GET /v1/documents] found ${rootSnap2.size} in root (businessId)`);
                    mergeDocs(await Promise.all(rootSnap2.docs.map(mapLegacyDocumentList)));
                }
            } catch { /* ignore missing index */ }
        }

        let recoveryInfo: Record<string, unknown> | null = null;

        const parsePathIds = (path: string) => {
            const parts = path.split('/');
            for (let i = 0; i < parts.length - 4; i += 1) {
                if (parts[i] === 'users' && parts[i + 2] === 'businesses' && parts[i + 4] === 'documents') {
                    return { userId: parts[i + 1], businessId: parts[i + 3] };
                }
            }
            for (let i = 0; i < parts.length - 2; i += 1) {
                if (parts[i] === 'businesses' && parts[i + 2] === 'documents') {
                    return { userId: undefined, businessId: parts[i + 1] };
                }
            }
            return { userId: undefined, businessId: undefined };
        };

        const extractBusinessId = (data: Record<string, unknown>, pathInfo: { businessId?: string }) => {
            return (
                (data.business_id as string | undefined) ||
                (data.businessId as string | undefined) ||
                (data.owner_business_id as string | undefined) ||
                (data.ownerBusinessId as string | undefined) ||
                ((data.business_snapshot as Record<string, unknown> | undefined)?.id as string | undefined) ||
                ((data.businessSnapshot as Record<string, unknown> | undefined)?.id as string | undefined) ||
                pathInfo.businessId ||
                undefined
            );
        };

        const extractOwnerUid = (data: Record<string, unknown>, pathInfo: { userId?: string }) => {
            return (
                (data.user_id as string | undefined) ||
                (data.userId as string | undefined) ||
                (data.owner_id as string | undefined) ||
                (data.created_by as string | undefined) ||
                (data.createdBy as string | undefined) ||
                pathInfo.userId ||
                undefined
            );
        };

        const tryRecoverByDocNo = async (docNoRaw: string) => {
            const normalized = docNoRaw.toUpperCase();
            const variants = new Set<string>([normalized]);
            if (normalized.startsWith('QUO-')) variants.add(`QU-${normalized.slice(4)}`);
            if (normalized.startsWith('QU-')) variants.add(`QUO-${normalized.slice(3)}`);
            if (normalized.startsWith('INV-')) variants.add(`BILL-${normalized.slice(4)}`);
            if (normalized.startsWith('BILL-')) variants.add(`INV-${normalized.slice(5)}`);

            const foundDocs: admin.firestore.QueryDocumentSnapshot[] = [];
            const seenPaths = new Set<string>();
            const addDocs = (snap: admin.firestore.QuerySnapshot) => {
                snap.docs.forEach((doc) => {
                    if (seenPaths.has(doc.ref.path)) return;
                    seenPaths.add(doc.ref.path);
                    foundDocs.push(doc);
                });
            };

            for (const candidate of variants) {
                const queries = [
                    db.collectionGroup('documents').where('doc_no', '==', candidate).limit(50),
                    db.collectionGroup('documents').where('docNo', '==', candidate).limit(50),
                    db.collection('documents').where('doc_no', '==', candidate).limit(50),
                    db.collection('documents').where('docNo', '==', candidate).limit(50),
                ];
                for (const query of queries) {
                    try {
                        const snap = await query.get();
                        if (!snap.empty) addDocs(snap);
                    } catch (err) {
                        const error = err as { code?: number | string; message?: string };
                        if (error.code === 9 || String(error.message || '').includes('index')) {
                            continue;
                        }
                        throw err;
                    }
                }
            }

            const recovered: string[] = [];
            const skippedOtherBusiness: string[] = [];
            const notAuthorized: string[] = [];

            for (const doc of foundDocs) {
                const data = doc.data() as Record<string, unknown>;
                const pathInfo = parsePathIds(doc.ref.path);
                const docBusinessId = extractBusinessId(data, pathInfo);
                const ownerUid = extractOwnerUid(data, pathInfo);
                const lineUserIdMatch =
                    lineUserId &&
                    ((data.line_user_id as string | undefined) === lineUserId ||
                        (data.lineUserId as string | undefined) === lineUserId ||
                        (data.creatorLineId as string | undefined) === lineUserId ||
                        (data.creator_line_id as string | undefined) === lineUserId);

                let authorized = false;
                if (ownerUid && ownerUid === uid) {
                    authorized = true;
                } else if (lineUserIdMatch) {
                    authorized = true;
                } else if (docBusinessId) {
                    const ownsBiz = await verifyBusinessOwnership(uid, docBusinessId);
                    authorized = ownsBiz;
                }

                if (!authorized) {
                    notAuthorized.push(doc.ref.path);
                    continue;
                }

                if (docBusinessId && docBusinessId !== businessId) {
                    skippedOtherBusiness.push(docBusinessId);
                    continue;
                }

                const targetRef = db.doc(`users/${uid}/businesses/${businessId}/documents/${doc.id}`);
                const existing = await targetRef.get();
                if (!existing.exists) {
                    await targetRef.set(data, { merge: true });
                    recovered.push(doc.id);
                }
            }

            return {
                candidates: Array.from(variants),
                found: foundDocs.length,
                recovered,
                skippedOtherBusiness,
                notAuthorized,
            };
        };

        if (recoverDocNo) {
            recoveryInfo = await tryRecoverByDocNo(recoverDocNo);
            documents = await loadDocumentsFromRef(baseRef);
        }

        // Always attempt to merge legacy documents if there may be older records.
        if (documents.length < limit) {
            const legacyDocs: Awaited<ReturnType<typeof mapLegacyDocumentList>>[] = [];
            const legacyLimit = Math.min(limit * 4, 200);
            const legacyQueries = [
                db.collection('documents').where('business_id', '==', businessId).limit(legacyLimit),
                db.collection('documents').where('businessId', '==', businessId).limit(legacyLimit),
                db.collection('documents').where('owner_business_id', '==', businessId).limit(legacyLimit),
                db.collection('documents').where('ownerBusinessId', '==', businessId).limit(legacyLimit),
                db.collection('documents').where('business_snapshot.id', '==', businessId).limit(legacyLimit),
                db.collection('documents').where('businessSnapshot.id', '==', businessId).limit(legacyLimit),
                db.collection('documents').where('user_id', '==', uid).limit(legacyLimit),
                db.collection('documents').where('userId', '==', uid).limit(legacyLimit),
                db.collection('documents').where('owner_id', '==', uid).limit(legacyLimit),
                db.collection('documents').where('created_by', '==', uid).limit(legacyLimit),
                db.collection('documents').where('createdBy', '==', uid).limit(legacyLimit),
                // Collection group fallback for documents stored outside users/{uid}/businesses/{businessId}.
                db.collectionGroup('documents').where('business_id', '==', businessId).limit(legacyLimit),
                db.collectionGroup('documents').where('businessId', '==', businessId).limit(legacyLimit),
                db.collectionGroup('documents').where('owner_business_id', '==', businessId).limit(legacyLimit),
                db.collectionGroup('documents').where('ownerBusinessId', '==', businessId).limit(legacyLimit),
                db.collectionGroup('documents').where('business_snapshot.id', '==', businessId).limit(legacyLimit),
                db.collectionGroup('documents').where('businessSnapshot.id', '==', businessId).limit(legacyLimit),
            ];
            if (lineUserId) {
                legacyQueries.push(
                    db.collection('documents').where('line_user_id', '==', lineUserId).limit(legacyLimit),
                    db.collection('documents').where('lineUserId', '==', lineUserId).limit(legacyLimit),
                    db.collection('documents').where('creatorLineId', '==', lineUserId).limit(legacyLimit),
                    db.collection('documents').where('creator_line_id', '==', lineUserId).limit(legacyLimit),
                    db.collectionGroup('documents').where('line_user_id', '==', lineUserId).limit(legacyLimit),
                    db.collectionGroup('documents').where('lineUserId', '==', lineUserId).limit(legacyLimit),
                    db.collectionGroup('documents').where('creatorLineId', '==', lineUserId).limit(legacyLimit),
                    db.collectionGroup('documents').where('creator_line_id', '==', lineUserId).limit(legacyLimit),
                );
            }

            for (const query of legacyQueries) {
                try {
                    const snap = await query.get();
                    if (!snap.empty) {
                        const mapped = await Promise.all(snap.docs.map(mapLegacyDocumentList));
                        legacyDocs.push(...mapped);
                    }
                } catch (err) {
                    const error = err as { code?: number | string; message?: string };
                    // Ignore missing index errors for collectionGroup fallbacks.
                    if (error.code === 9 || String(error.message || '').includes('index')) {
                        continue;
                    }
                    throw err;
                }
            }

            if (legacyDocs.length > 0) {
                mergeDocs(legacyDocs);
            }
        }

        // Fallback: scan other business subcollections under the same user (in case business list is stale)
        if (documents.length < limit) {
            const bizSnaps = await db.collection(`users/${uid}/businesses`).get();
            for (const bizDoc of bizSnaps.docs) {
                const otherBizId = bizDoc.id;
                if (otherBizId === businessId) continue;
                const otherRef = db.collection(`users/${uid}/businesses/${otherBizId}/documents`);
                const otherDocs = await loadDocumentsFromRef(otherRef);
                if (otherDocs.length > 0) {
                    mergeDocs(otherDocs, otherBizId);
                }
            }
        }

        // Team fallback: if user belongs to a team owner, check owner's business documents
        if (documents.length < limit && ownerUid && ownerUid !== uid) {
            const ownerRef = db.collection(`users/${ownerUid}/businesses/${businessId}/documents`);
            const ownerDocs = await loadDocumentsFromRef(ownerRef);
            if (ownerDocs.length > 0) {
                mergeDocs(ownerDocs, businessId);
            }
        }

        // Filter by docType if specified
        if (docType) {
            documents = documents.filter((d) => String((d as any).docType).toUpperCase() === String(docType).toUpperCase());
        }

        // Filter by status if specified
        if (status) {
            documents = documents.filter((d) => String((d as any).status).toUpperCase() === String(status).toUpperCase());
        }

        res.json({
            businessId,
            documents,
            count: documents.length,
            recovery: recoveryInfo || undefined,
        });
    } catch (error) {
        console.error('GET /v1/documents error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/documents
 * Create a new document draft
 */
router.post('/documents', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;

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

        // Rate Limit Check (Request)
        const { plan = 'FREE' } = await db.doc(`users/${uid}`).get().then(s => s.data() || {});
        const rateLimit = await checkRequestRateLimit(uid, plan);
        if (!rateLimit.allowed) {
            res.status(429).json({ error: 'Too many requests' });
            return;
        }

        const { docType, customerId, issueDate, items, supersedesId } = req.body;

        let version = 1;
        let originId: string | null = null;
        let supersedesIdValue: string | null = null;

        // Handle Version Chaining (Supersedes)
        if (supersedesId) {
            const prevSnap = await db.doc(`users/${uid}/businesses/${businessId}/documents/${supersedesId}`).get();
            if (prevSnap.exists) {
                const prev = prevSnap.data() || {};
                // Inherit origin or start chain
                originId = prev.origin_document_id || supersedesId;
                version = (prev.version || 1) + 1;
                supersedesIdValue = supersedesId;
            }
        }

        if (!docType || !['QUO', 'BILL', 'RECEIPT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'CN', 'DN'].includes(docType)) {
            res.status(400).json({ error: 'Invalid docType (QUO, BILL, RECEIPT, CN, DN)' });
            return;
        }

        // Note: Daily Doc Limit check moved to CONFIRM step

        // Get issue date or use today
        const iso = issueDate || new Date().toISOString().slice(0, 10);
        // Note: YearBE/DocNo allocation moved to CONFIRM step

        // Load business for snapshot
        const bizSnap = await db.doc(`users/${uid}/businesses/${businessId}`).get();
        const biz = bizSnap.data() || {};

        const sanitizePaymentMethods = (value: unknown) => {
            if (!value || typeof value !== 'object') return undefined;
            const v = value as Record<string, unknown>;
            const toStringArray = (x: unknown): string[] | undefined => {
                if (!Array.isArray(x)) return undefined;
                const out = x.filter((it) => typeof it === 'string') as string[];
                return out.length ? out : undefined;
            };
            const banks = toStringArray(v.banks);
            const cards = toStringArray(v.cards);
            const wallets = toStringArray(v.wallets);
            if (!banks && !cards && !wallets) return undefined;
            return { ...(banks ? { banks } : {}), ...(cards ? { cards } : {}), ...(wallets ? { wallets } : {}) };
        };

        // Load customer for snapshot (if provided)
        let customerSnapshot = {
            displayName: '-',
            address: '',
            phone: '',
            email: '',
            taxId: '',
        };

        if (customerId) {
            const custSnap = await db
                .doc(`users/${uid}/businesses/${businessId}/customers/${customerId}`)
                .get();
            if (custSnap.exists) {
                const cust = custSnap.data() || {};
                customerSnapshot = {
                    displayName: (cust.displayName as string) || '-',
                    address: (cust.address as string) || '',
                    phone: (cust.phone as string) || '',
                    email: (cust.email as string) || '',
                    taxId: (cust.taxId as string) || '',
                };
            }
        }

        const paymentMethods = sanitizePaymentMethods((biz as Record<string, unknown>).paymentMethods);

        // Business snapshot
        const businessSnapshot = {
            name: (biz.name as string) || '',
            address: (biz.address as string) || '',
            phone: (biz.phone as string) || '',
            email: (biz.email as string) || '',
            taxId: (biz.taxId as string) || '',
            bankName: (biz.bankName as string) || '',
            bankAccountNo: (biz.bankAccountNo as string) || '',
            bankAccountName: (biz.bankAccountName as string) || '',
            promptpayAccount: (biz.promptpayAccount as string) || '',
            promptpayName: (biz.promptpayName as string) || '',
            promptpayQrUrl: (biz.promptpayQrUrl as string) || null,
            logoUrl: (biz.logoUrl as string) || null,
            signatureUrl: (biz.signatureUrl as string) || null,
            stampUrl: (biz.stampUrl as string) || null,
            ...(paymentMethods ? { paymentMethods } : {}),
        };

        // Tax snapshot with defaults
        const taxSnapshot = {
            vatEnabled: (biz.defaultVatEnabled as boolean) || false,
            vatRate: (biz.defaultVatRate as number) || 7,
            whtEnabled: (biz.defaultWhtEnabled as boolean) || false,
            whtRate: (biz.defaultWhtRate as number) || 3,
            whtBase: 'BEFORE_VAT',
        };

        // Process items
        const processedItems = (items || []).map((item: Record<string, unknown>, idx: number) => ({
            line_no: idx + 1,
            description_th: (item.description_th as string) || '',
            description_en: (item.description_en as string) || null,
            qty: Number(item.qty) || 1,
            unit: (item.unit as string) || 'รายการ',
            unit_price: Number(item.unit_price) || 0,
            amount: (Number(item.qty) || 1) * (Number(item.unit_price) || 0),
        }));

        // Calculate money
        const money = calcMoney({
            items: processedItems.map((it: { qty: number; unit_price: number }) => ({ qty: it.qty, unit_price: it.unit_price })),
            discount_amount: Number(req.body.discount_amount) || 0,
            extra_fee_amount: Number(req.body.extra_fee_amount) || 0,
            vat_enabled: taxSnapshot.vatEnabled,
            vat_rate: taxSnapshot.vatRate,
            wht_enabled: taxSnapshot.whtEnabled,
            wht_rate: taxSnapshot.whtRate,
        });

        const documentData = {
            docType: normalizeDocType({ docType }),
            docNo: 'DRAFT', // Placeholder until CONFIRM
            issueDate: iso,
            status: DocumentState.DRAFT,
            customerId: customerId || null,
            customerSnapshot,
            businessSnapshot,
            taxSnapshot,
            subjectTh: (req.body.subjectTh as string) || null,
            subjectEn: (req.body.subjectEn as string) || null,
            items: processedItems,
            money,
            discount_amount: Number(req.body.discount_amount) || 0,
            extra_fee_amount: Number(req.body.extra_fee_amount) || 0,
            pdfReady: false,
            pdfUrl: null,
            revision: 0,

            // Versioning
            version,
            origin_document_id: originId,
            supersedes_document_id: supersedesIdValue,
            is_void: false,

            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const ref = await db
            .collection(`users/${uid}/businesses/${businessId}/documents`)
            .add(documentData);

        res.status(201).json({
            id: ref.id,
            businessId,
            ...documentData,
        });
    } catch (error) {
        console.error('POST /v1/documents error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /v1/documents/:id
 * Get a single document with all details
 */
router.get('/documents/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const documentId = req.params.id as string;

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
            .doc(`users/${uid}/businesses/${businessId}/documents/${documentId}`)
            .get();

        if (!snap.exists) {
            let legacySnap: admin.firestore.DocumentSnapshot | admin.firestore.QueryDocumentSnapshot | undefined =
                await db.collection('documents').doc(documentId).get();

            if (!legacySnap.exists) {
                let legacyQuery = await db
                    .collection('documents')
                    .where('doc_no', '==', documentId)
                    .where('business_id', '==', businessId)
                    .limit(1)
                    .get();

                if (legacyQuery.empty) {
                    legacyQuery = await db
                        .collection('documents')
                        .where('doc_no', '==', documentId)
                        .where('businessId', '==', businessId)
                        .limit(1)
                        .get();
                }

                legacySnap = legacyQuery.docs[0];
            }

            if (!legacySnap || !legacySnap.exists) {
                res.status(404).json({ error: 'Document not found' });
                return;
            }

            const legacyData = legacySnap.data() as Record<string, unknown>;
            const legacyBusinessId = (legacyData.business_id as string) || (legacyData.businessId as string);
            if (legacyBusinessId && legacyBusinessId !== businessId) {
                res.status(404).json({ error: 'Document not found' });
                return;
            }

            res.json({
                id: legacySnap.id,
                businessId,
                ...await mapLegacyDocumentFull(legacySnap),
            });
            return;
        }

        res.json({
            id: snap.id,
            businessId,
            ...snap.data(),
        });
    } catch (error) {
        console.error('GET /v1/documents/:id error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /v1/documents/:id
 * Update a document
 * Note: Limited fields editable based on status
 */
router.patch('/documents/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const documentId = req.params.id as string;

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

        const docRef = db.doc(`users/${uid}/businesses/${businessId}/documents/${documentId}`);
        const snap = await docRef.get();

        if (!snap.exists) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }

        const currentData = snap.data() || {};
        const currentStatus = currentData.status;

        // Fields editable in DRAFT/READY status (User editable)
        // Spec Section 6: Editable Fields = ALL for DRAFT/READY. NONE for others.

        // Block editing if not in editable state
        if (currentStatus !== DocumentState.DRAFT && currentStatus !== DocumentState.READY) {
            // Exception: allow status change if it's a valid transition (e.g. marking PAID? NO, PAID is done via action)
            // Spec says "User voids" -> ANY -> VOID.
            // If this PATCH is receiving "status": "VOID", we should allow it IF it matches transition.
            // But usually VOID is an action endpoint.
            // For safety, we block regular field edits.
            // If ONLY status is being updated, we check transition in next block.

            const tryingToEditFields = Object.keys(req.body).filter(k => k !== 'status' && k !== 'businessId' && k !== 'revision');
            if (tryingToEditFields.length > 0) {
                res.status(400).json({ error: `Cannot edit document in ${currentStatus} state` });
                return;
            }
        }

        const draftEditableFields = [
            'customerId',
            'issueDate',
            'subjectTh',
            'subjectEn',
            'items',
            'discount_amount',
            'extra_fee_amount',
            'taxSnapshot',
            'price_type',
            'lump_sum_amount',
            'scope_of_work',
            'payment_milestones',
            'status', // Allow status change via PATCH (e.g. READY -> DRAFT)
        ];

        const updates: Record<string, unknown> = {};

        // Determine which fields can be updated
        const editableFields = (currentStatus === DocumentState.DRAFT || currentStatus === DocumentState.READY)
            ? draftEditableFields
            : ['status']; // Only allow status updates (e.g. VOID) for other states

        for (const field of editableFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        // Optimistic Locking: Check revision if provided
        if (req.body.revision !== undefined) {
            const currentRev = (currentData.revision as number) || 0;
            const requestRev = Number(req.body.revision);
            if (currentRev !== requestRev) {
                res.status(409).json({
                    error: 'Document has been updated by another process',
                    currentRevision: currentRev,
                });
                return;
            }
        }

        // Handle status change - use strict state machine
        if (updates.status && updates.status !== currentStatus) {
            try {
                // Allows throwing InvalidStateTransitionError
                assertTransition(currentStatus as DocumentState, updates.status as DocumentState);
            } catch (error: any) {
                res.status(400).json({
                    error: error.message,
                    currentStatus,
                    requestedStatus: updates.status,
                });
                return;
            }

            // Log the transition for audit
            const action = getTransitionAction(currentStatus, updates.status as string);
            await logStatusTransition({
                docId: documentId,
                docPath: `users/${uid}/businesses/${businessId}/documents/${documentId}`,
                userId: uid,
                businessId,
                fromStatus: currentStatus,
                toStatus: updates.status as string,
                action,
                metadata: { source: 'PATCH_API', revision: req.body.revision },
            });
        }

        // Recalculate money if items changed
        if (updates.items || updates.discount_amount !== undefined || updates.extra_fee_amount !== undefined) {
            const items = (updates.items as unknown[]) || currentData.items || [];
            const taxSnapshot = (updates.taxSnapshot as Record<string, unknown>) || currentData.taxSnapshot || {};

            if (!Array.isArray(items)) {
                res.status(400).json({ error: 'items must be an array' });
                return;
            }

            const processedItems = items.map((item: unknown, idx: number) => {
                const it = item as Record<string, unknown>;
                return {
                    line_no: idx + 1,
                    description_th: (it.description_th as string) || '',
                    description_en: (it.description_en as string) || null,
                    qty: Number(it.qty) || 1,
                    unit: (it.unit as string) || 'รายการ',
                    unit_price: Number(it.unit_price) || 0,
                    amount: (Number(it.qty) || 1) * (Number(it.unit_price) || 0),
                };
            });

            const money = calcMoney({
                items: processedItems.map((it) => ({ qty: it.qty, unit_price: it.unit_price })),
                discount_amount: Number(updates.discount_amount ?? currentData.discount_amount ?? 0),
                extra_fee_amount: Number(updates.extra_fee_amount ?? currentData.extra_fee_amount ?? 0),
                vat_enabled: Boolean(taxSnapshot.vatEnabled ?? currentData.taxSnapshot?.vatEnabled),
                vat_rate: Number(taxSnapshot.vatRate ?? currentData.taxSnapshot?.vatRate ?? 7),
                wht_enabled: Boolean(taxSnapshot.whtEnabled ?? currentData.taxSnapshot?.whtEnabled),
                wht_rate: Number(taxSnapshot.whtRate ?? currentData.taxSnapshot?.whtRate ?? 3),
            });

            updates.items = processedItems;
            updates.money = money;
        }

        // Update customer snapshot if customerId changed
        if (updates.customerId && updates.customerId !== currentData.customerId) {
            const custSnap = await db
                .doc(`users/${uid}/businesses/${businessId}/customers/${updates.customerId}`)
                .get();
            if (custSnap.exists) {
                const cust = custSnap.data() || {};
                updates.customerSnapshot = {
                    displayName: (cust.displayName as string) || '-',
                    address: (cust.address as string) || '',
                    phone: (cust.phone as string) || '',
                    email: (cust.email as string) || '',
                    taxId: (cust.taxId as string) || '',
                };
            }
        }

        if (Object.keys(updates).length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        updates.revision = admin.firestore.FieldValue.increment(1);

        await docRef.update(updates);

        const updatedSnap = await docRef.get();

        res.json({
            id: updatedSnap.id,
            businessId,
            ...updatedSnap.data(),
        });
    } catch (error) {
        console.error('PATCH /v1/documents/:id error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/documents/:id/ready
 * Mark status DRAFT -> READY (Trigger: required fields complete)
 */
router.post('/documents/:id/ready', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const documentId = req.params.id as string;
        const businessId = req.body.businessId || (await getActiveBusinessId(uid));

        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }

        const docRef = db.doc(`users/${uid}/businesses/${businessId}/documents/${documentId}`);
        const snap = await docRef.get();

        if (!snap.exists) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }

        const data = snap.data() || {};

        // Guard Status
        if (data.status !== DocumentState.DRAFT) {
            res.status(400).json({ error: `Document must be DRAFT to become READY (Current: ${data.status})` });
            return;
        }

        // Validate Required Fields (Minimally)
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
            res.status(400).json({ error: 'Document must have at least one item' });
            return;
        }

        // Apply Transition
        const updates = {
            status: DocumentState.READY,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await docRef.update(updates);

        // Audit Log
        logStatusTransition({
            docId: documentId,
            docPath: docRef.path,
            userId: uid,
            businessId,
            fromStatus: DocumentState.DRAFT,
            toStatus: DocumentState.READY,
            action: 'ready',
            metadata: { source: 'API' },
        }).catch(e => console.error(e));

        res.json({ id: documentId, status: DocumentState.READY });

    } catch (error) {
        console.error('POST /ready error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/documents/:id/void
 * Mark status ANY -> VOID
 */
router.post('/documents/:id/void', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const documentId = req.params.id as string;
        const businessId = req.body.businessId || (await getActiveBusinessId(uid));

        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }

        const docRef = db.doc(`users/${uid}/businesses/${businessId}/documents/${documentId}`);
        const snap = await docRef.get();

        if (!snap.exists) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }

        const data = snap.data() || {};
        const currentStatus = data.status;

        if (currentStatus === DocumentState.VOID) {
            res.status(200).json({ message: 'Already VOID' });
            return;
        }

        // Use strict transition validator
        try {
            assertTransition(currentStatus as DocumentState, DocumentState.VOID);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
            return;
        }

        // Apply Transition
        await docRef.update({
            status: DocumentState.VOID,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Audit Log
        logStatusTransition({
            docId: documentId,
            docPath: docRef.path,
            userId: uid,
            businessId,
            fromStatus: currentStatus,
            toStatus: DocumentState.VOID,
            action: 'void',
            metadata: { source: 'API' },
        }).catch(e => console.error(e));

        res.json({ id: documentId, status: DocumentState.VOID });

    } catch (error) {
        console.error('POST /void error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/documents/:id/confirm', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    // ✅ D1: Generate traceId for doc confirm flow
    const { generateTraceId } = await import('../utils/asyncSafety');
    const traceId = generateTraceId();

    try {
        const db = getDb();
        const uid = req.userId!;
        const documentId = req.params.id as string;

        const businessId = req.body.businessId || (await getActiveBusinessId(uid));

        console.log(`[DOC_CONFIRM_STARTED] traceId=${traceId}, docId=${documentId}, userId=${uid}, businessId=${businessId}`);

        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }

        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        // ✅ Plan-aware feature check: FREE users cannot create Invoice/Receipt
        // Check BEFORE transaction to avoid async import inside transaction
        const docRef = db.doc(`users/${uid}/businesses/${businessId}/documents/${documentId}`);
        const preCheckSnap = await docRef.get();

        if (preCheckSnap.exists) {
            const preCheckData = preCheckSnap.data() || {};
            const { canCreateDocumentType } = await import('../core/planService');
            const docType = (preCheckData.docType as string) || 'QUO';
            const canCreate = await canCreateDocumentType(uid, docType as 'QUO' | 'INV' | 'REC' | 'CN' | 'DN');

            if (!canCreate) {
                const docTypeNames: Record<string, string> = {
                    INV: 'ใบวางบิล',
                    BILL: 'ใบวางบิล',
                    REC: 'ใบเสร็จรับเงิน',
                    RECEIPT: 'ใบเสร็จรับเงิน',
                    CN: 'ใบลดหนี้',
                    CREDIT_NOTE: 'ใบลดหนี้',
                    DN: 'ใบเพิ่มหนี้',
                    DEBIT_NOTE: 'ใบเพิ่มหนี้',
                };
                const docTypeName = docTypeNames[docType] || 'เอกสาร';
                res.status(403).json({
                    error: `${docTypeName} สงวนสิทธิ์สำหรับสมาชิก PRO ขึ้นไป กรุณาอัปเกรดเพื่อใช้งาน`,
                    requiresUpgrade: true,
                    docType
                });
                return;
            }
        }

        await db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);

            if (!snap.exists) {
                throw new Error('Document not found');
            }

            const data = snap.data() || {};
            // STRICT: confirm requires READY state (Spec v1.0 Section 2)
            if (data.status !== DocumentState.READY) {
                // If DRAFT, hint user to move to READY first
                if (data.status === DocumentState.DRAFT) {
                    throw new Error('Document must be READY before confirming');
                }
                throw new Error(`Cannot confirm document in ${data.status} status`);
            }

            // Daily Doc Limit Check (at confirmation) - This check is outside the transaction in the original,
            // but if it's critical to prevent docNo allocation, it should be here.
            // For now, keeping it outside as per the original structure, but noting this potential refactor.
            // If `checkDailyDocLimit` involves reading/writing to Firestore, it should be `tx.get` etc.
            // Assuming it's a simple read for now.
            const { plan = 'FREE' } = await db.doc(`users/${uid}`).get().then(s => s.data() || {});
            const docLimit = await checkDailyDocLimit(uid, businessId, plan);
            if (!docLimit.allowed) {
                throw new Error('Daily document limit exceeded');
            }

            // Allocate Doc No (Atomic within this transaction)
            const iso = data.issueDate || new Date().toISOString().slice(0, 10);
            const yearBE = getYearBEFromISO(iso);

            const { docNo } = await allocateDocNo({
                userId: uid,
                businessId,
                docType: data.docType,
                yearBE,
            }, tx); // Pass transaction object to allocateDocNo

            const updates = {
                docNo,
                status: DocumentState.ISSUED,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            tx.update(docRef, updates);
        });

        // Return updated document (Read after write)
        const updatedSnap = await docRef.get();
        const confirmedData = updatedSnap.data() || {};

        // ✅ D1: Log document event (non-blocking)
        const { appendDocumentEvent } = await import('../services/documentEvents');
        appendDocumentEvent(documentId, {
            event: 'DOC_CONFIRMED',
            traceId,
            handler: 'api',
            result_code: 'OK',
            from_status: 'READY',
            to_status: 'ISSUED',
            meta: {
                docType: confirmedData.docType,
                docNo: confirmedData.docNo,
                businessId,
                userId: uid,
            },
        }).catch(err => {
            console.warn(`[confirm] Failed to log document event (non-blocking):`, err);
        });

        // ✅ Write-through stats update (non-blocking)
        const grandTotal = (confirmedData.money as { grand_total?: number })?.grand_total || 0;
        const issueDate = confirmedData.issueDate ? new Date(confirmedData.issueDate) : new Date();
        incrementDocStats(businessId, confirmedData.docType, grandTotal, issueDate).catch(err => {
            console.error('[confirm] Stats update failed (non-blocking):', err);
        });

        // ✅ Log status transition (non-blocking)
        logStatusTransition({
            docId: documentId,
            docPath: `users/${uid}/businesses/${businessId}/documents/${documentId}`,
            userId: uid,
            businessId,
            fromStatus: 'READY',
            toStatus: 'ISSUED',
            action: 'confirm',
            metadata: { source: 'CONFIRM_API', traceId },
        }).catch(err => console.error('[confirm] Audit log failed:', err));

        console.log(`[DOC_CONFIRM_SUCCESS] traceId=${traceId}, docId=${documentId}, docNo=${confirmedData.docNo}`);

        // ✅ AUTO-GENERATE PDF on Confirm (Fix for Web)
        try {
            // 1. Create Job in Firestore (Required for processPdfJob)
            const pdfJobRef = db.collection('pdf_generation_jobs').doc();
            await pdfJobRef.set({
                id: pdfJobRef.id,
                user_id: uid,
                business_id: businessId,
                document_id: documentId,
                document_no: confirmedData.docNo,
                doc_type: confirmedData.docType,
                status: 'PENDING',
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                attempts: 0,
                max_attempts: 3,
                source: 'AUTO_CONFIRM',
            });

            // 2. Trigger Processing (Fallback to local process)
            // Fire and forget (don't await to keep confirm fast)
            processPdfJob(pdfJobRef.id).catch(err => console.error('[confirm] Auto-gen PDF failed:', err));

            console.log(`[confirm] Auto-enqueued PDF job for ${documentId}, jobId=${pdfJobRef.id}`);
        } catch (pdfErr) {
            console.error('[confirm] Failed to auto-enqueue PDF:', pdfErr);
            // Non-blocking, user can click "Generate PDF" later if needed
        }

        // ✅ Notify LINE user that document is confirmed and PDF is being generated (non-blocking)
        (async () => {
            try {
                const { getLineUserIdFromFirebaseUid } = await import('../core/lineUserMapping');
                const { pushLineMessage } = await import('../services/lineService');
                const lineUserId = await getLineUserIdFromFirebaseUid(uid);
                if (!lineUserId) {
                    console.warn('[confirm] No lineUserId found for user, skip LINE notify');
                    return;
                }

                const docNo = confirmedData.docNo ? String(confirmedData.docNo) : '';
                const docType = confirmedData.docType ? String(confirmedData.docType) : '';
                const docTypeName: Record<string, string> = {
                    QUO: 'ใบเสนอราคา',
                    BILL: 'ใบวางบิล',
                    RECEIPT: 'ใบเสร็จ',
                    INV: 'ใบวางบิล',
                    REC: 'ใบเสร็จรับเงิน',
                };
                const typeLabel = docTypeName[docType] || 'เอกสาร';
                const header = docNo
                    ? `ตึ๊ง! ออก${typeLabel}สำเร็จแล้ว ✅\nเลขที่: ${docNo}`
                    : `ตึ๊ง! ออกเอกสารสำเร็จแล้ว ✅`;
                const message = `${header}\n\nกำลังสร้าง PDF ให้ (อาจใช้เวลาสักครู่)\nดูต่อได้ในเว็บ หรือพิมพ์ “เอกสารล่าสุด”`;
                await pushLineMessage(lineUserId, message);
            } catch (notifyErr) {
                console.warn('[confirm] Failed to push LINE notification:', notifyErr);
            }
        })();

        res.json({
            id: updatedSnap.id,
            businessId,
            ...confirmedData
        });

    } catch (error: unknown) {
        console.error('POST /v1/documents/:id/confirm error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const status = errorMessage === 'Document not found' ? 404 :
            errorMessage.includes('Cannot confirm') ? 400 :
                errorMessage.includes('Daily document limit exceeded') ? 429 : 500;

        res.status(status).json({ error: errorMessage || 'Internal server error' });
    }
});

/**
 * POST /v1/documents/:id/generate-pdf
 * Enqueue PDF generation
 */
router.post('/documents/:id/generate-pdf', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const documentId = req.params.id as string;
        const PDF_RENDER_STALE_MS = 10 * 60 * 1000; // 10 minutes

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

        const docRef = db.doc(`users/${uid}/businesses/${businessId}/documents/${documentId}`);
        const snap = await docRef.get();

        if (!snap.exists) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }

        const data = snap.data() || {};

        const getUpdatedAtMs = (value: any): number | null => {
            if (!value) return null;
            if (typeof value.toDate === 'function') return value.toDate().getTime();
            if (typeof value._seconds === 'number') return value._seconds * 1000;
            return null;
        };

        // Idempotency: don't regenerate if already valid state
        if (data.status === DocumentState.PDF_RENDERING) {
            const updatedAtMs = getUpdatedAtMs(data.updatedAt);
            const isStale = updatedAtMs ? Date.now() - updatedAtMs > PDF_RENDER_STALE_MS : false;
            if (!isStale) {
                console.log('PDF generation already in progress');
                res.json({ message: 'PDF generation in progress', state: DocumentState.PDF_RENDERING });
                return;
            }

            console.warn('[generate-pdf] Stale PDF_RENDERING detected, rolling back for retry');
            await docRef.update({
                status: DocumentState.ISSUED,
                pdfState: 'FAILED',
                pdfReady: false,
                pdfUrl: null,
                pdf_url: admin.firestore.FieldValue.delete(),
                pdf_path: admin.firestore.FieldValue.delete(),
                pdfPath: admin.firestore.FieldValue.delete(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await logStatusTransition({
                docId: documentId,
                docPath: docRef.path,
                userId: uid,
                businessId,
                fromStatus: DocumentState.PDF_RENDERING,
                toStatus: DocumentState.ISSUED,
                action: 'render_timeout_reset',
                metadata: { reason: 'stale_pdf_render' },
            });
            data.status = DocumentState.ISSUED;
        }

        // Strict Transition Guard: ISSUED -> PDF_RENDERING
        try {
            assertTransition(data.status as DocumentState, DocumentState.PDF_RENDERING);
        } catch (e: any) {
            res.status(400).json({ error: e.message, status: data.status });
            return;
        }

        // Update PDF state and Document Status
        await docRef.update({
            status: DocumentState.PDF_RENDERING, // V1.0 Spec
            pdfState: 'QUEUED', // Legacy support
            pdfReady: false,
            pdfUrl: null,
            pdf_url: admin.firestore.FieldValue.delete(),
            pdf_path: admin.firestore.FieldValue.delete(),
            pdfPath: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Audit Log
        await logStatusTransition({
            docId: documentId,
            docPath: docRef.path,
            userId: uid,
            businessId,
            fromStatus: data.status,
            toStatus: DocumentState.PDF_RENDERING,
            action: 'generate_pdf',
            metadata: { source: 'API' },
        });

        // 2. Create Job in Firestore
        const pdfJobRef = db.collection('pdf_generation_jobs').doc();
        await pdfJobRef.set({
            id: pdfJobRef.id,
            user_id: uid,
            business_id: businessId,
            document_id: documentId,
            document_no: data.docNo,
            doc_type: data.docType,
            status: 'PENDING',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            attempts: 0,
            max_attempts: 3,
            source: 'API_MANUAL',
        });

        // Enqueue PDF job
        const payload: PdfJobPayload = {
            userId: uid,
            businessId,
            docId: documentId,
            revision: (data.revision as number) || 0,
            // pdf-service currently requires a non-empty lineUserId field for validation,
            // even though delivery resolution is done server-side by userId.
            lineUserId: 'WEB',
        };

        try {
            if (getUseCloudTasks()) {
                const taskId = `pdf-doc-${documentId}`;
                try {
                    await enqueuePdfJobWithTasks(payload, taskId);
                } catch (taskErr) {
                    console.error('[generate-pdf] Cloud Tasks enqueue failed, falling back to direct:', taskErr);
                    // ✅ Await processPdfJob to ensure it completes before function termination (runtime kills async tasks after res.send)
                    await processPdfJob(pdfJobRef.id).catch(err => console.error('[generate-pdf] Force process failed:', err));
                }
            } else {
                // ✅ Await processPdfJob to ensure it completes before function termination
                await processPdfJob(pdfJobRef.id).catch(err => console.error('[generate-pdf] Force process failed:', err));
            }

            res.json({
                message: 'PDF generation queued',
                pdfState: 'QUEUED',
                documentId,
            });
        } catch (queueError) {
            // Revert state on queue failure
            await docRef.update({
                status: DocumentState.ISSUED,
                pdfState: 'FAILED',
                pdfReady: false,
                pdfUrl: null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            throw queueError;
        }
    } catch (error) {
        console.error('POST /v1/documents/:id/generate-pdf error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/documents/:id/deliver
 * Create or upsert a delivery job and enqueue a delivery task
 * SECURITY: lineUserId is resolved from DB profile, NOT from client request
 */
const DOCUMENTS_API_DEPLOY_TAG = '2026-01-29-01';

router.post('/documents/:id/deliver', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = getDb();
        const uid = req.userId!;
        const documentId = req.params.id as string;
        const { businessId } = req.body || {};
        console.log('[postDocumentDeliver] deployTag:', DOCUMENTS_API_DEPLOY_TAG);

        if (!businessId) {
            res.status(400).json({ error: 'Missing businessId' });
            return;
        }

        // Rate limit: Prevent spam/abuse on deliver endpoint (10 req/min for deliver specifically)
        const deliveryRateLimit = await checkRequestRateLimit(uid, 'FREE');
        if (!deliveryRateLimit.allowed) {
            res.status(429).json({
                error: 'Too many delivery requests',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfterSeconds: deliveryRateLimit.retryAfterSeconds || 60
            });
            return;
        }

        // AuthZ: Verify user owns business
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        // AuthZ: Verify user owns document
        // Try nested business path first, then fallback to root collection
        let docRef = db.doc(`users/${uid}/businesses/${businessId}/documents/${documentId}`);
        let docSnap = await docRef.get();

        // Fallback: check root collection if not found in nested path
        if (!docSnap.exists) {
            console.log('[postDocumentDeliver] Not found in nested path, checking root collection');
            const rootRef = db.collection('documents').doc(documentId);
            docSnap = await rootRef.get();
            if (docSnap.exists) {
                docRef = rootRef;
                console.log('[postDocumentDeliver] Found in root collection');
            }
        }

        if (!docSnap.exists) {
            console.log('[postDocumentDeliver] Document not found for id:', documentId);
            res.status(404).json({ error: 'Document not found' });
            return;
        }

        const doc = docSnap.data() || {};
        const pdfState = String(doc.pdfState || doc.pdf_state || '');
        const pdfReady =
            Boolean(doc.pdfReady || doc.pdf_ready) ||
            Boolean(doc.pdfUrl || doc.pdf_url || doc.pdfPath || doc.pdf_path || doc.pdf_short_token);
        const docStatus = String(doc.status || '');
        const isReadyByState =
            pdfState.toUpperCase() === 'READY' ||
            docStatus === DocumentState.PDF_READY ||
            docStatus === DocumentState.DELIVERED;

        if (!isReadyByState && !pdfReady) {
            console.log('[postDocumentDeliver] PDF not ready:', { pdfState, pdfReady, docStatus });
            res.status(400).json({
                error: 'PDF not ready for delivery',
                code: 'PDF_NOT_READY',
                state: pdfState || docStatus || 'UNKNOWN',
                action: 'Wait for PDF generation to complete'
            });
            return;
        }

        // Security: Resolve lineUserId from user profile, NOT from client
        const userDoc = await db.collection('users').doc(uid).get();
        const profile = userDoc.data();
        const lineUserId = profile?.lineUserId;

        if (!lineUserId) {
            console.log('[postDocumentDeliver] LINE not connected for user:', uid);
            res.status(400).json({
                error: 'กรุณาเชื่อมต่อ LINE กับระบบก่อน (ไปที่เมนู > ตั้งค่าการเชื่อมต่อ)',
                code: 'LINE_NOT_CONNECTED',
                action: 'User must send message to bot first'
            });
            return;
        }

        console.log('[postDocumentDeliver] Resolved lineUserId:', lineUserId);

        // Create delivery job (idempotent)
        const jobId = `line:${documentId}:${lineUserId}`;
        const jobRef = db.doc(`deliveryJobs/${jobId}`);
        const now = admin.firestore.FieldValue.serverTimestamp();

        await jobRef.set({
            docId: documentId,
            docPath: docRef.path,
            userId: uid,
            businessId,
            to: { lineUserId },
            status: 'PENDING',
            attempt: 0,
            createdAt: now,
            updatedAt: now,
            // TTL: PENDING jobs expire in 30 days, FAILED in 90 days (will be updated when status changes)
            expiresAt: admin.firestore.Timestamp.fromDate(
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for PENDING
            ),
        }, { merge: true });

        console.log('[postDocumentDeliver] Job upserted:', jobId);

        // Send LINE message directly (synchronous) instead of Cloud Tasks
        // This is simpler and works without needing to set up Cloud Tasks queue
        try {
            // Normalize document data - handle both camelCase and snake_case field names
            const docData: DocData = {
                docNo: doc.docNo || doc.doc_no || '',
                docType: doc.docType || doc.doc_type || '',
                customerSnapshot: doc.customerSnapshot || doc.customer_snapshot || null,
                money: doc.money || {
                    total_amount: doc.total_amount || doc.totalAmount || 0,
                    net_receive_amount: doc.net_receive_amount || doc.netReceiveAmount || 0,
                    total: doc.total || 0,
                },
                pdfUrl: doc.pdfUrl || doc.pdf_url || '',
                pdf_path: doc.pdf_path || doc.pdfPath || '',
                pdfPath: doc.pdfPath || doc.pdf_path || '',
                pdf_short_token: doc.pdf_short_token || '',
            };

            // Get business data
            const businessRef = db.doc(`users/${uid}/businesses/${businessId}`);
            const businessSnap = await businessRef.get();
            const business = businessSnap.exists ? (businessSnap.data() as BusinessData) : ({} as BusinessData);

            // Try to create short link for PDF
            try {
                const pdfPath = docData.pdf_path || docData.pdfPath;
                const docNo = docData.docNo || '';
                const docType = docData.docType || '';
                if (pdfPath && docNo && docType) {
                    const token = await getOrCreateShortLink({
                        docId: documentId,
                        docNo: String(docNo),
                        docType: String(docType),
                        pdfPath: String(pdfPath),
                        userId: uid,
                        businessId,
                    });
                    docData.pdfUrl = buildShortUrl(token);
                    docData.pdf_short_token = token;
                }
            } catch (err) {
                console.warn('[postDocumentDeliver] Short link failed:', err);
            }

            // Build and send LINE message
            console.log('[postDocumentDeliver] docData for message:', {
                docNo: docData.docNo,
                docType: docData.docType,
                pdfUrl: docData.pdfUrl,
                pdf_path: docData.pdf_path,
                pdfPath: docData.pdfPath,
                pdf_short_token: docData.pdf_short_token,
                customerName: docData.customerSnapshot?.displayName,
            });
            const messages = buildLineDeliveryMessage(docData, business);
            console.log('[postDocumentDeliver] LINE messages:', JSON.stringify(messages).slice(0, 500));

            const lineResp = await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getLineChannelAccessToken()}`,
                },
                body: JSON.stringify({ to: lineUserId, messages }),
            });

            if (!lineResp.ok) {
                const text = await lineResp.text();
                console.error('[postDocumentDeliver] LINE push failed:', lineResp.status, text);

                // Update job status to FAILED
                await jobRef.update({
                    status: 'FAILED',
                    lastError: { status: lineResp.status, message: text.slice(0, 200) },
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                res.status(400).json({
                    error: 'LINE_PUSH_FAILED',
                    message: `LINE push failed: ${text.slice(0, 100)}`,
                    code: 'LINE_ERROR'
                });
                return;
            }

            // Success! Update job status
            await jobRef.update({
                status: 'SENT',
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update document status to DELIVERED
            await docRef.update({
                status: DocumentState.DELIVERED,
                deliveryState: 'SENT',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log('[postDocumentDeliver] LINE push successful!');

            res.status(200).json({
                jobId,
                status: 'SENT',
                message: 'Document delivered to LINE successfully'
            });
        } catch (err) {
            console.error('[postDocumentDeliver] Delivery error:', err);
            res.status(500).json({ error: 'Delivery failed', message: String(err) });
        }
    } catch (error) {
        console.error('POST /v1/documents/:id/deliver error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
