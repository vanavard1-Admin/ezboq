/**
 * Subscription Repository
 * Handles subscription status, promo, and purchase API calls
 */

import { apiClient } from '../api-client';

export interface SubscriptionStatus {
    plan: string;
    status: string;
    seatTotal: number;
    seatUsed: number;
    autoRenew: boolean;
    periodStart: string | null;
    periodEnd: string | null;
    nextBillingAt: string | null;
}

export interface SubscriptionHistoryItem {
    id: string;
    amount: number;
    status: string;
    plan: string | null;
    packageType: number | null;
    referenceId: string | null;
    promoCode: string | null;
    createdAt: string | null;
    paidAt: string | null;
    periodStart: string | null;
    periodEnd: string | null;
}

export interface SubscriptionHistoryResponse {
    count: number;
    items: SubscriptionHistoryItem[];
}

export interface PromoPreviewResponse {
    valid: boolean;
    code?: string;
    baseAmount: number;
    finalAmount: number;
    discountAmount: number;
    discountPercent?: number;
    durationMonths?: number | null;
    appliesTo?: string | null;
    reason?: string;
}

export interface PurchaseResponse {
    purchaseId: string;
    message: string;
}

export const subscriptionRepo = {
    getStatus: async (): Promise<SubscriptionStatus> => {
        return apiClient<SubscriptionStatus>('GET', '/v1/subscription');
    },
    getHistory: async (limit = 10): Promise<SubscriptionHistoryResponse> => {
        return apiClient<SubscriptionHistoryResponse>('GET', `/v1/subscription/history?limit=${limit}`);
    },
    previewPromo: async (code: string, packageType = 99): Promise<PromoPreviewResponse> => {
        return apiClient<PromoPreviewResponse>('POST', '/v1/subscription/promo', {
            code,
            packageType,
        });
    },
    createPurchase: async (packageType = 99): Promise<PurchaseResponse> => {
        return apiClient<PurchaseResponse>('POST', '/v1/subscription/purchase', {
            packageType,
        });
    },
};
