/**
 * Documents Repository
 * Handles document-related API calls
 */

import { apiClient } from '../api-client';
import { isRuntimeDevBypassEnabled } from '../runtimeDevBypass';

const isDevMode = () =>
    isRuntimeDevBypassEnabled() ||
    (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_LOGIN === '1');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let devDocCounter = 1;
const devDocs: Record<string, EzDocument> = {};

const normalizeItems = (items: DocumentItem[] = []) =>
    items.map((item, idx) => {
        const qty = Number(item.qty) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        return {
            ...item,
            line_no: item.line_no || idx + 1,
            amount: qty * unitPrice,
        };
    });

const buildMoney = (
    items: DocumentItem[] = [],
    discount = 0,
    extraFee = 0,
    taxSnapshot?: TaxSnapshot
): MoneySummary => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unit_price)), 0);
    const afterDiscount = subtotal - (discount || 0) + (extraFee || 0);
    const vatEnabled = taxSnapshot?.vatEnabled ?? false;
    const vatRate = taxSnapshot?.vatRate ?? 0;
    const whtEnabled = taxSnapshot?.whtEnabled ?? false;
    const whtRate = taxSnapshot?.whtRate ?? 0;
    const vatAmount = vatEnabled ? afterDiscount * (vatRate / 100) : 0;
    const totalAmount = afterDiscount + vatAmount;
    const whtAmount = whtEnabled ? afterDiscount * (whtRate / 100) : 0;
    const netReceive = totalAmount - whtAmount;

    return {
        subtotal,
        discount_amount: discount || 0,
        extra_fee_amount: extraFee || 0,
        vat_amount: vatAmount,
        wht_amount: whtAmount,
        total_amount: totalAmount,
        net_receive_amount: netReceive,
        discount_enabled: Boolean(discount),
        vat_enabled: vatEnabled,
        wht_enabled: whtEnabled,
        extra_fee_enabled: Boolean(extraFee),
        vat_rate_pct: vatRate || 0,
        wht_rate_pct: whtRate || 0,
    };
};

const ensureDevDoc = () => {
    if (Object.keys(devDocs).length > 0) return;
    const id = `dev-${devDocCounter++}`;
    const docType: EzDocument['docType'] = 'QUO';
    const issueDate = new Date().toISOString().slice(0, 10);
    const items = normalizeItems([]);
    const money = buildMoney(items);

    devDocs[id] = {
        id,
        docNo: '',
        docType,
        status: 'DRAFT',
        customerId: 'dev-customer-1',
        customerSnapshot: { displayName: 'Demo Customer' },
        issueDate,
        subjectTh: 'Demo',
        items,
        money,
        revision: 1,
        pdfReady: false,
        pdfUrl: null,
        version: 1,
        origin_document_id: null,
        supersedes_document_id: null,
        is_void: false,
    };
};

// Shared types (should match backend shared/types.ts ideally, but defined here for frontend)
export interface DocumentItem {
    line_no: number;
    description_th: string;
    description_en?: string | null;
    qty: number;
    unit: string;
    unit_price: number;
    amount: number;
}

export interface MoneySummary {
    subtotal: number;
    discount_amount: number;
    extra_fee_amount: number;
    vat_amount: number;
    wht_amount: number;
    total_amount: number;
    net_receive_amount: number;

    // Flags
    discount_enabled: boolean;
    vat_enabled: boolean;
    wht_enabled: boolean;
    extra_fee_enabled: boolean;
    vat_rate_pct: number;
    wht_rate_pct: number;
}

export interface TaxSnapshot {
    vatEnabled: boolean;
    vatRate: number;
    whtEnabled: boolean;
    whtRate: number;
    whtBase: 'BEFORE_VAT' | 'AFTER_VAT';
}

export interface PaymentMilestone {
    label?: string | null;
    percent?: number | null;
    amount?: number | null;
    note?: string | null;
}

export interface EzDocument {
    id: string;
    docNo: string;
    docType: 'QUO' | 'BILL' | 'RECEIPT' | 'CN' | 'DN';
    status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
    customerId: string;
    customerSnapshot?: {
        displayName: string;
        address?: string;
        taxId?: string;
    };
    issueDate: string; // YYYY-MM-DD
    dueDate?: string;
    subjectTh?: string;
    subjectEn?: string;
    items: DocumentItem[];
    payment_milestones?: PaymentMilestone[] | null;
    money: MoneySummary;
    taxSnapshot?: TaxSnapshot;
    revision: number;
    pdfReady: boolean;
    pdfUrl: string | null;
    pdfState?: 'QUEUED' | 'RENDERING' | 'READY' | 'FAILED';
    openedByClient?: boolean;
    documentOpenedAt?: string;
    createdAt?: string;
    updatedAt?: string;

    // Versioning (Immutability)
    version: number;
    origin_document_id: string | null;
    supersedes_document_id: string | null;
    is_void: boolean;
}

export interface DocumentListResponse {
    documents: EzDocument[];
    count: number;
}

export interface DocumentDeliveryResponse {
    jobId: string;
    status: string;
    message?: string;
}

export interface DocumentInput {
    docType?: EzDocument['docType'];
    customerId?: string;
    issueDate?: string;
    subjectTh?: string;
    items?: DocumentItem[];
    taxSnapshot?: TaxSnapshot;
    discount_amount?: number;
    extra_fee_amount?: number;
    payment_milestones?: PaymentMilestone[] | null;
    [key: string]: unknown; // Allow other optional fields but enforce known ones
}

export const documentsRepo = {
    /**
     * List documents
     */
    listDocuments: async (params?: { limit?: number; type?: string; status?: string; customerId?: string }): Promise<DocumentListResponse> => {
        if (isDevMode()) {
            ensureDevDoc();
            const docs = Object.values(devDocs);
            return { documents: docs, count: docs.length };
        }

        const query = new URLSearchParams();
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.type) query.append('docType', params.type);
        if (params?.status) query.append('status', params.status);
        if (params?.customerId) query.append('customerId', params.customerId);

        try {
            return await apiClient<DocumentListResponse>('GET', `/v1/documents?${query.toString()}`);
        } catch (error) {
            if (!isDevMode()) throw error;
            ensureDevDoc();
            const docs = Object.values(devDocs);
            return { documents: docs, count: docs.length };
        }
    },

    /**
     * Get single document
     */
    getDocument: async (docId: string): Promise<EzDocument> => {
        if (isDevMode()) {
            ensureDevDoc();
            return devDocs[docId] || Object.values(devDocs)[0];
        }

        try {
            return await apiClient<EzDocument>('GET', `/v1/documents/${docId}`);
        } catch (error) {
            if (!isDevMode()) throw error;
            ensureDevDoc();
            return devDocs[docId] || Object.values(devDocs)[0];
        }
    },

    /**
     * Deliver document PDF link to LINE
     */
    deliverDocument: async (docId: string, businessId: string): Promise<DocumentDeliveryResponse> => {
        if (isDevMode()) {
            return { jobId: `dev-${docId}`, status: 'PENDING', message: 'Document delivery queued' };
        }

        try {
            return await apiClient<DocumentDeliveryResponse>('POST', `/v1/documents/${docId}/deliver`, {
                businessId,
            });
        } catch (error) {
            if (!isDevMode()) throw error;
            return { jobId: `dev-${docId}`, status: 'PENDING', message: 'Document delivery queued' };
        }
    },

    /**
     * Create new document (Draft)
     */
    createDocument: async (data: DocumentInput): Promise<EzDocument> => {
        if (isDevMode()) {
            const id = `dev-${devDocCounter++}`;
            const items = normalizeItems(data.items);
            const money = buildMoney(
                items,
                data.discount_amount,
                data.extra_fee_amount,
                data.taxSnapshot
            );
            const issueDate = data.issueDate || new Date().toISOString().slice(0, 10);

            const doc: EzDocument = {
                id,
                docNo: '',
                docType: data.docType || 'QUO',
                status: 'DRAFT',
                customerId: data.customerId || 'dev-customer-1',
                customerSnapshot: { displayName: 'Demo Customer' },
                issueDate,
                subjectTh: data.subjectTh || 'Demo',
                items,
                money,
                taxSnapshot: data.taxSnapshot,
                revision: 1,
                pdfReady: false,
                pdfUrl: null,
                version: 1,
                origin_document_id: null,
                supersedes_document_id: null,
                is_void: false,
            };
            devDocs[id] = doc;
            return doc;
        }

        try {
            return await apiClient<EzDocument>('POST', '/v1/documents', data);
        } catch (error) {
            if (!isDevMode()) throw error;
            const id = `dev-${devDocCounter++}`;
            const items = normalizeItems(data.items);
            const money = buildMoney(
                items,
                data.discount_amount,
                data.extra_fee_amount,
                data.taxSnapshot
            );
            const issueDate = data.issueDate || new Date().toISOString().slice(0, 10);

            const doc: EzDocument = {
                id,
                docNo: '',
                docType: data.docType || 'QUO',
                status: 'DRAFT',
                customerId: data.customerId || 'dev-customer-1',
                customerSnapshot: { displayName: 'Demo Customer' },
                issueDate,
                subjectTh: data.subjectTh || 'Demo',
                items,
                money,
                taxSnapshot: data.taxSnapshot,
                revision: 1,
                pdfReady: false,
                pdfUrl: null,
                version: 1,
                origin_document_id: null,
                supersedes_document_id: null,
                is_void: false,
            };
            devDocs[id] = doc;
            return doc;
        }
    },

    /**
     * Update document (Draft)
     */
    updateDocument: async (docId: string, data: Partial<DocumentInput>): Promise<EzDocument> => {
        if (isDevMode()) {
            ensureDevDoc();
            const existing = devDocs[docId] || Object.values(devDocs)[0];
            const items = normalizeItems(data.items || existing.items);
            const money = buildMoney(
                items,
                data.discount_amount ?? existing.money.discount_amount,
                data.extra_fee_amount ?? existing.money.extra_fee_amount,
                data.taxSnapshot || existing.taxSnapshot
            );

            const updated: EzDocument = {
                ...existing,
                ...(data as Record<string, unknown>),
                items,
                money,
                revision: (existing.revision || 0) + 1,
            };
            devDocs[docId] = updated;
            return updated;
        }

        try {
            return await apiClient<EzDocument>('PATCH', `/v1/documents/${docId}`, data);
        } catch (error) {
            if (!isDevMode()) throw error;
            ensureDevDoc();
            const existing = devDocs[docId] || Object.values(devDocs)[0];
            const items = normalizeItems(data.items || existing.items);
            const money = buildMoney(
                items,
                data.discount_amount ?? existing.money.discount_amount,
                data.extra_fee_amount ?? existing.money.extra_fee_amount,
                data.taxSnapshot || existing.taxSnapshot
            );

            const updated: EzDocument = {
                ...existing,
                ...(data as Record<string, unknown>),
                items,
                money,
                revision: (existing.revision || 0) + 1,
            };
            devDocs[docId] = updated;
            return updated;
        }
    },

    /**
     * Trigger PDF generation
     */
    generatePdf: async (docId: string): Promise<{ success: boolean; jobId: string }> => {
        if (isDevMode()) {
            ensureDevDoc();
            const doc = devDocs[docId];
            if (doc) {
                devDocs[docId] = {
                    ...doc,
                    pdfState: 'RENDERING',
                };
                await sleep(350);
                devDocs[docId] = {
                    ...devDocs[docId],
                    pdfReady: true,
                    pdfState: 'READY',
                    pdfUrl: 'https://example.com/dev.pdf',
                };
            }
            return { success: true, jobId: `dev-job-${docId}` };
        }

        try {
            return await apiClient('POST', `/v1/documents/${docId}/generate-pdf`);
        } catch (error) {
            if (!isDevMode()) throw error;
            ensureDevDoc();
            const doc = devDocs[docId];
            if (doc) {
                devDocs[docId] = {
                    ...doc,
                    pdfState: 'RENDERING',
                };
                await sleep(350);
                devDocs[docId] = {
                    ...devDocs[docId],
                    pdfReady: true,
                    pdfState: 'READY',
                    pdfUrl: 'https://example.com/dev.pdf',
                };
            }
            return { success: true, jobId: `dev-job-${docId}` };
        }
    },

    /**
     * Mark document as READY (DRAFT -> READY)
     * Required before confirmation
     */
    markReady: async (docId: string): Promise<{ id: string; status: string }> => {
        if (isDevMode()) {
            ensureDevDoc();
            const doc = devDocs[docId];
            if (doc) {
                devDocs[docId] = { ...doc, status: 'READY' as EzDocument['status'] };
            }
            return { id: docId, status: 'READY' };
        }

        try {
            return await apiClient<{ id: string; status: string }>('POST', `/v1/documents/${docId}/ready`);
        } catch (error) {
            if (!isDevMode()) throw error;
            ensureDevDoc();
            const doc = devDocs[docId];
            if (doc) {
                devDocs[docId] = { ...doc, status: 'READY' as EzDocument['status'] };
            }
            return { id: docId, status: 'READY' };
        }
    },

    /**
     * Confirm document (READY -> ISSUED)
     * Allocates atomic DocNo
     */
    confirmDocument: async (docId: string): Promise<EzDocument> => {
        if (isDevMode()) {
            ensureDevDoc();
            const doc = devDocs[docId];
            if (!doc) return Object.values(devDocs)[0];
            const issued = {
                ...doc,
                status: 'ISSUED' as const,
                docNo: doc.docNo || `${doc.docType}-DEV-${String(devDocCounter).padStart(3, '0')}`,
            };
            devDocs[docId] = issued;
            return issued;
        }

        try {
            return await apiClient<EzDocument>('POST', `/v1/documents/${docId}/confirm`);
        } catch (error) {
            if (!isDevMode()) throw error;
            ensureDevDoc();
            const doc = devDocs[docId];
            if (!doc) return Object.values(devDocs)[0];
            const issued = {
                ...doc,
                status: 'ISSUED' as const,
                docNo: doc.docNo || `${doc.docType}-DEV-${String(devDocCounter).padStart(3, '0')}`,
            };
            devDocs[docId] = issued;
            return issued;
        }
    }
};
