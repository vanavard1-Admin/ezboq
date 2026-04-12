/**
 * Tax Reports Repository
 * Handles VAT/WHT/tax status API calls
 */

import { apiClient } from '../api-client';

export interface VatSummary {
    monthKey: string;
    month: string;
    output: {
        vat: number;
        base: number;
        docCount: number;
    };
    input: {
        vat: number;
        base: number;
        expenseCount: number;
    };
    payable: number;
}

export interface WhtSupplierSummary {
    supplierName: string;
    supplierTaxId?: string | null;
    baseAmount: number;
    whtAmount: number;
    ratePercent: number;
}

export interface WhtRateSummary {
    ratePercent: number;
    baseAmount: number;
    whtAmount: number;
    suppliers: WhtSupplierSummary[];
}

export interface WhtSummary {
    monthKey: string;
    month: string;
    totalBase: number;
    totalWht: number;
    rateGroups: WhtRateSummary[];
}

export type FilingStatus = 'FILED' | 'PENDING';

export interface TaxFilingRecord {
    type: 'VAT' | 'WHT';
    monthKey: string;
    status: FilingStatus;
    filedAt?: string | null;
    filedBy?: string | null;
}

export interface TaxStatusReport {
    monthKey: string;
    month: string;
    vat: TaxFilingRecord;
    wht: TaxFilingRecord;
}

export interface AnnualTaxSummaryRow {
    monthKey: string;
    month: string;
    vatOutput: number;
    vatInput: number;
    vatPayable: number;
    whtDeducted: number;
}

export interface AnnualTaxSummary {
    year: string;
    months: AnnualTaxSummaryRow[];
    totals: {
        vatOutput: number;
        vatInput: number;
        vatPayable: number;
        whtDeducted: number;
    };
}

export interface TaxPdfResponse {
    businessId: string;
    monthKey: string;
    url: string;
    lineSent?: boolean;
    supplierName?: string;
    lineReason?: string | null;
}

export const taxRepo = {
    getVatSummary: async (params?: { monthKey?: string; businessId?: string }) => {
        const query = new URLSearchParams();
        if (params?.monthKey) query.append('monthKey', params.monthKey);
        if (params?.businessId) query.append('businessId', params.businessId);
        const qs = query.toString();
        return apiClient<{ businessId: string; monthKey: string | null; summary: VatSummary | null }>(
            'GET',
            `/v1/reports/tax/vat${qs ? `?${qs}` : ''}`
        );
    },

    getWhtSummary: async (params?: { monthKey?: string; businessId?: string }) => {
        const query = new URLSearchParams();
        if (params?.monthKey) query.append('monthKey', params.monthKey);
        if (params?.businessId) query.append('businessId', params.businessId);
        const qs = query.toString();
        return apiClient<{ businessId: string; monthKey: string | null; summary: WhtSummary | null }>(
            'GET',
            `/v1/reports/tax/wht${qs ? `?${qs}` : ''}`
        );
    },

    getTaxStatus: async (params?: { monthKey?: string; businessId?: string }) => {
        const query = new URLSearchParams();
        if (params?.monthKey) query.append('monthKey', params.monthKey);
        if (params?.businessId) query.append('businessId', params.businessId);
        const qs = query.toString();
        return apiClient<TaxStatusReport & { businessId: string }>(
            'GET',
            `/v1/reports/tax/status${qs ? `?${qs}` : ''}`
        );
    },

    getAnnualTax: async (params: { year: number; businessId?: string }) => {
        const query = new URLSearchParams();
        query.append('year', String(params.year));
        if (params.businessId) query.append('businessId', params.businessId);
        const qs = query.toString();
        return apiClient<{ businessId: string; report: AnnualTaxSummary }>(
            'GET',
            `/v1/reports/tax/annual?${qs}`
        );
    },

    setFilingStatus: async (payload: { businessId?: string; type: 'VAT' | 'WHT'; monthKey: string; status: FilingStatus }) => {
        return apiClient<{ businessId: string; record: TaxFilingRecord }>(
            'POST',
            '/v1/reports/tax/filings',
            payload
        );
    },

    createTaxSummaryPdf: async (payload: { businessId?: string; monthKey?: string; sendToLine?: boolean }) => {
        return apiClient<TaxPdfResponse>(
            'POST',
            '/v1/reports/tax/pdf/summary',
            payload
        );
    },

    createWhtCertificatePdf: async (payload: {
        businessId?: string;
        monthKey?: string;
        supplierName: string;
        sendToLine?: boolean;
    }) => {
        return apiClient<TaxPdfResponse>(
            'POST',
            '/v1/reports/tax/pdf/wht-certificate',
            payload
        );
    },
};
