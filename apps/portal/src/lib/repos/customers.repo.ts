/**
 * Customers Repository
 * Handles customer-related API calls
 */

import { apiClient } from '../api-client';
import { isRuntimeDevBypassEnabled } from '../runtimeDevBypass';

export interface Customer {
    id: string;
    businessId: string;
    type: 'PERSON' | 'COMPANY';
    displayName: string; // The primary name to show
    address?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    createdAt?: string; // ISO string
    updatedAt?: string; // ISO string
}

export interface CustomerListResponse {
    businessId: string;
    customers: Customer[];
    count: number;
}

export const customersRepo = {
    /**
     * List customers for active business
     */
    listCustomers: async (params?: { limit?: number; q?: string }): Promise<CustomerListResponse> => {
        if (isRuntimeDevBypassEnabled()) {
            return {
                businessId: 'e2e-dev-business',
                customers: [
                    {
                        id: 'dev-customer-1',
                        businessId: 'e2e-dev-business',
                        type: 'PERSON',
                        displayName: 'Demo Customer',
                        address: 'Demo Address',
                        phone: '0000000000',
                        email: 'demo@example.com',
                        taxId: '',
                    },
                ],
                count: 1,
            };
        }

        const query = new URLSearchParams();
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.q) query.append('q', params.q);

        try {
            return await apiClient<CustomerListResponse>('GET', `/v1/customers?${query.toString()}`);
        } catch (error) {
            if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_LOGIN === '1') {
                return {
                    businessId: 'dev',
                    customers: [
                        {
                            id: 'dev-customer-1',
                            businessId: 'dev',
                            type: 'PERSON',
                            displayName: 'Demo Customer',
                            address: 'Demo Address',
                            phone: '0000000000',
                            email: 'demo@example.com',
                            taxId: '',
                        },
                    ],
                    count: 1,
                };
            }
            throw error;
        }
    },

    /**
     * Get single customer
     */
    getCustomer: async (customerId: string): Promise<Customer> => {
        return apiClient<Customer>('GET', `/v1/customers/${customerId}`);
    },

    /**
     * Create new customer
     */
    createCustomer: async (data: Partial<Customer>): Promise<Customer> => {
        return apiClient<Customer>('POST', '/v1/customers', data);
    },

    /**
     * Update customer
     */
    updateCustomer: async (customerId: string, data: Partial<Customer>): Promise<Customer> => {
        return apiClient<Customer>('PATCH', `/v1/customers/${customerId}`, data);
    },

    /**
     * Delete customer
     */
    deleteCustomer: async (customerId: string): Promise<{ success: boolean; deleted: string }> => {
        return apiClient('DELETE', `/v1/customers/${customerId}`);
    }
};
