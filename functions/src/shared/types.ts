/**
 * EzDoc Shared Types
 * Used across Firebase Functions and PDF Service
 */

// Document Types
export type DocType = 'QUO' | 'BILL' | 'RECEIPT';
export type DocStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';

export type PriceType = 'ITEMIZED' | 'LUMP_SUM';

export interface PaymentMilestone {
    label?: string | null;
    percent?: number | null;
    amount?: number | null;
    note?: string | null;
}

// Draft Stages
export type DraftStage = 'AWAIT_CONFIRM' | 'AWAIT_FIELD' | 'EXPIRED';

// Customer Types
export type CustomerType = 'PERSON' | 'SHOP' | 'COMPANY';

// User Plans
export type UserPlan = 'FREE' | 'PRO';

// Parsed Item from text input
export interface ParsedItem {
    description_th: string;
    description_en?: string | null;
    qty: number;
    unit: string;
    unit_price: number;
    amount: number;
}

// Draft Payload (from parser)
export interface DraftPayload {
    doc_type?: DocType;
    business_hint?: string | null;
    customer_name?: string | null;
    customer_legal_name?: string | null;
    customer_tax_id?: string | null;
    customer_branch?: string | null;
    customer_address?: string | null;
    customer_contact_name?: string | null;
    issue_date_iso?: string | null; // YYYY-MM-DD (AD)
    issue_date_raw?: string | null;

    subject_th?: string | null;
    subject_en?: string | null;

    items: ParsedItem[];

    price_type?: PriceType | null;
    lump_sum_amount?: number | null;
    scope_of_work?: string[] | null;
    payment_milestones?: PaymentMilestone[] | null;
    notes?: string | null;

    discount_amount?: number;
    extra_fee_amount?: number;

    vat_enabled?: boolean | null;
    vat_rate?: number | null;

    wht_enabled?: boolean | null;
    wht_rate?: number | null;

    total_hint?: number | null;

    subtotal_candidate?: number;
    total_mismatch?: boolean;

    warnings: string[];
}

// Money Calculation Result
export interface MoneyResult {
    subtotal: number;
    discount: number;
    extra: number;
    before_vat: number;
    vat_amount: number;
    total_amount: number;
    wht_amount: number;
    net_receive_amount: number;
}

// Document Item (stored in Firestore)
export interface DocumentItem {
    description_th: string;
    description_en: string | null;
    qty: number;
    unit: string;
    unit_price: number;
    amount: number;
}

// Business Snapshot (frozen at document creation)
export interface BusinessSnapshot {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId: string;
    bankName: string;
    bankAccountNo: string;
    bankAccountName: string;
    promptpayAccount?: string;
    promptpayName?: string;
    promptpayQrUrl?: string | null;
}

// Customer Snapshot (frozen at document creation)
export interface CustomerSnapshot {
    displayName: string;
    legalName?: string;
    branch?: string;
    contactName?: string;
    address: string;
    phone: string;
    email: string;
    taxId: string;
}

// Tax Snapshot
export interface TaxSnapshot {
    vatEnabled: boolean;
    vatRate: number;
    whtEnabled: boolean;
    whtRate: number;
    whtBase: 'BEFORE_VAT' | 'AFTER_VAT';
}

// PDF Job Payload (Cloud Tasks -> Cloud Run)
export interface PdfJobPayload {
    userId: string;
    businessId: string;
    docId: string;
    revision: number;
    lineUserId: string;
}
