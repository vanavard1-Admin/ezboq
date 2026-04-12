/**
 * API Client
 * Handles all API calls with Firebase Auth token
 */

import { auth } from './firebase';

// Keep base URL consistent with api-client (prod uses same-origin /v1 via hosting rewrites)
const DEFAULT_EMULATOR_URL = 'http://localhost:5001/ezdoc-v1-th/asia-southeast1/api';
const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_BASE_URL =
    envApiUrl && envApiUrl.length > 0
        ? envApiUrl
        : (process.env.NODE_ENV === 'production' ? '' : DEFAULT_EMULATOR_URL);

/**
 * Get authorization headers with Firebase ID token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }

    const token = await user.getIdToken();
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
}

/**
 * Generic API fetch with auth
 */
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

/**
 * Generic API Client
 */
export const api = {
    get: <T>(url: string) => apiFetch<T>(url),
    post: <T>(url: string, body?: unknown) => apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(url: string, body?: unknown) => apiFetch<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(url: string, body?: unknown) => apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(url: string) => apiFetch<T>(url, { method: 'DELETE' }),
};

// ============ User / Business ============

export interface UserProfile {
    userId: string;
    email: string | null;
    activeBusinessId: string | null;
    business: Business | null;
    businesses: { id: string; name: string }[];
}

export interface Business {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    bankCode?: string;
    defaultVatEnabled?: boolean;
    defaultVatRate?: number;
    defaultVatType?: 'inclusive' | 'exclusive';
    defaultWhtEnabled?: boolean;
    defaultWhtRate?: number;
    bankName?: string;
    bankAccountNo?: string;
    bankAccountName?: string;
    promptpayAccount?: string;
    promptpayName?: string;
    promptpayQrUrl?: string | null;
    isSetupComplete?: boolean;
    logoUrl?: string | null;
    stampUrl?: string | null;
    signatureUrl?: string | null;
    pdfTheme?: string;
    pdfThemeQuo?: string;
    pdfThemeBill?: string;
    pdfThemeReceipt?: string;
    emailNotifications?: boolean;
    lineNotifications?: boolean;
    language?: 'th' | 'en';
}

export async function getMe(): Promise<UserProfile> {
    return apiFetch('/v1/me');
}

export async function bootstrapBusiness(): Promise<{ success: boolean; created: boolean; businessId: string; activeBusinessId: string }> {
    return apiFetch('/v1/business/bootstrap', {
        method: 'POST',
    });
}

export async function getBusiness(id: string): Promise<Business> {
    return apiFetch(`/v1/business/${id}`);
}

export async function updateBusiness(id: string, data: Partial<Business>): Promise<Business> {
    return apiFetch(`/v1/business/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function deleteAccount(confirmText: string): Promise<{ success: boolean }> {
    return apiFetch('/v1/account/delete', {
        method: 'POST',
        body: JSON.stringify({ confirmText }),
    });
}

// ============ Customers ============

export interface Customer {
    id: string;
    businessId?: string;
    type: 'PERSON' | 'COMPANY';
    displayName: string;
    address?: string;
    phone?: string;
    email?: string;
    taxId?: string;
}

export interface CustomerListResponse {
    businessId: string;
    customers: Customer[];
    count: number;
}

export async function getCustomers(params?: { businessId?: string; q?: string }): Promise<CustomerListResponse> {
    const query = new URLSearchParams();
    if (params?.businessId) query.set('businessId', params.businessId);
    if (params?.q) query.set('q', params.q);
    return apiFetch(`/v1/customers?${query}`);
}

export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
    return apiFetch('/v1/customers', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    return apiFetch(`/v1/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function deleteCustomer(id: string, businessId?: string): Promise<void> {
    const query = businessId ? `?businessId=${businessId}` : '';
    await apiFetch(`/v1/customers/${id}${query}`, {
        method: 'DELETE',
    });
}

// ============ Documents ============

export interface DocumentItem {
    line_no: number;
    description_th: string;
    description_en?: string | null;
    qty: number;
    unit: string;
    unit_price: number;
    amount: number;
}

export interface DocumentMoney {
    subtotal: number;
    discount_amount: number;
    extra_fee_amount: number;
    before_vat: number;
    vat_amount: number;
    total_amount: number;
    wht_amount: number;
    net_receive: number;
}

export interface Document {
    id: string;
    businessId?: string;
    docType: 'QUO' | 'BILL' | 'RECEIPT';
    docNo: string;
    issueDate: string;
    status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
    customerId?: string | null;
    customerSnapshot?: {
        displayName: string;
        address?: string;
        phone?: string;
        email?: string;
        taxId?: string;
    };
    businessSnapshot?: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
        taxId?: string;
        bankName?: string;
        bankAccountNo?: string;
        bankAccountName?: string;
    };
    taxSnapshot?: {
        vatEnabled: boolean;
        vatRate: number;
        whtEnabled: boolean;
        whtRate: number;
        whtBase: string;
    };
    subjectTh?: string | null;
    subjectEn?: string | null;
    items: DocumentItem[];
    money: DocumentMoney;
    pdfReady: boolean;
    pdfUrl?: string | null;
    pdfState?: 'QUEUED' | 'RENDERING' | 'READY' | 'FAILED';
}

export interface DocumentListResponse {
    businessId: string;
    documents: Document[];
    count: number;
}

export async function getDocuments(params?: { businessId?: string; docType?: string; status?: string }): Promise<DocumentListResponse> {
    const query = new URLSearchParams();
    if (params?.businessId) query.set('businessId', params.businessId);
    if (params?.docType) query.set('docType', params.docType);
    if (params?.status) query.set('status', params.status);
    return apiFetch(`/v1/documents?${query}`);
}

export async function getDocument(id: string, businessId?: string): Promise<Document> {
    const query = businessId ? `?businessId=${businessId}` : '';
    return apiFetch(`/v1/documents/${id}${query}`);
}

export async function createDocument(data: {
    docType: 'QUO' | 'BILL' | 'RECEIPT';
    businessId?: string;
    customerId?: string;
    issueDate?: string;
    items?: Partial<DocumentItem>[];
}): Promise<Document> {
    return apiFetch('/v1/documents', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    return apiFetch(`/v1/documents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function generatePdf(id: string, businessId?: string): Promise<{ message: string; pdfState: string }> {
    return apiFetch(`/v1/documents/${id}/generate-pdf`, {
        method: 'POST',
        body: JSON.stringify({ businessId }),
    });
}
