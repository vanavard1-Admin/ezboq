/**
 * Business Repository
 * Handles business-related API calls
 */

import { apiClient } from '../api-client';

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
    pdfTheme?: string;
    pdfThemeQuo?: string;
    pdfThemeBill?: string;
    pdfThemeReceipt?: string;
    logoUrl?: string | null;
    stampUrl?: string | null;
    signatureUrl?: string | null;
    emailNotifications?: boolean;
    lineNotifications?: boolean;
    language?: 'th' | 'en';
}

export interface UserProfile {
    userId: string;
    email: string | null;
    activeBusinessId: string | null;
    plan: string;
    business: Business | null;
    businesses: { id: string; name: string }[];
}

export const businessRepo = {
    /**
     * Get current user profile and active business
     */
    getMe: async (): Promise<UserProfile> => {
        return apiClient<UserProfile>('GET', '/v1/me');
    },

    /**
     * Get business details by ID
     */
    getBusiness: async (businessId: string): Promise<Business> => {
        return apiClient<Business>('GET', `/v1/business/${businessId}`);
    },

    /**
     * Update business details
     */
    updateBusiness: async (businessId: string, data: Partial<Business>): Promise<Business> => {
        return apiClient<Business>('PATCH', `/v1/business/${businessId}`, data);
    },

    deleteAccount: async (confirmText: string): Promise<{ success: boolean }> => {
        return apiClient<{ success: boolean }>('POST', '/v1/account/delete', { confirmText });
    },

    /**
     * Set active business
     */
    setActiveBusiness: async (businessId: string): Promise<{ success: boolean; activeBusinessId: string }> => {
        return apiClient('POST', `/v1/business/${businessId}/set-active`);
    }
};
