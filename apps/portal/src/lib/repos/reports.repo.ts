/**
 * Reports Repository
 * Handles report-related API calls
 */

import { api } from '@/lib/api';

export interface MonthlySalesReport {
    month: string;
    monthKey: string;
    receiptCount: number;
    totalRevenue: number;
    netReceived: number;
    averagePerReceipt: number;
    issuedDocCount: number;
    issuedDocTotal: number;
    issuedQuoCount: number;
    issuedBillCount: number;
}

export interface OverdueInvoice {
    docNo: string;
    customerName: string;
    amount: number;
    overdueByDays: number;
    issuedDate: string;
    dueDate: string;
}

export interface TopCustomer {
    customerName: string;
    customerId?: string;
    receiptCount: number;
    totalSpent: number;
    percentOfTotal: number;
}

export interface PopularService {
    description: string;
    itemCount: number;
    totalRevenue: number;
    percentOfTotal: number;
}

export interface FinancialReport {
    period: string; // e.g., "Jan 2026"
    revenue: number;
    expenses: number;
    netProfit: number;
    vatOutput: number; // Sale VAT
    vatInput: number; // Expense VAT
    whtDeducted: number; // WHT we deducted from expenses
    expenseBreakdown: { category: string; amount: number }[];
}

export interface ReportsSummaryResponse {
    businessId: string;
    monthKey: string | null;
    monthly: MonthlySalesReport | null;
    overdue: OverdueInvoice[];
    topCustomers: TopCustomer[];
    popularServices: PopularService[];
}

export const reportsRepo = {
    async getSummary(businessId?: string, monthKey?: string) {
        const query = new URLSearchParams();
        if (businessId) query.append('businessId', businessId);
        if (monthKey) query.append('monthKey', monthKey);
        const qs = query.toString();
        // Use generic api.get
        return api.get<ReportsSummaryResponse>(`/v1/reports/summary${qs ? `?${qs}` : ''}`);
    },

    async getFinancial(businessId?: string, filters?: { monthKey?: string; startDate?: string; endDate?: string }) {
        const params = new URLSearchParams();
        if (businessId) params.append('businessId', businessId);
        if (filters?.monthKey) params.append('monthKey', filters.monthKey);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);

        return api.get<FinancialReport>(`/v1/reports/financial?${params.toString()}`);
    },
};
