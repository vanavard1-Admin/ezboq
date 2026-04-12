import { api } from '@/lib/api';
import { Expense, ExpenseCategory, ExpenseStatus } from '@/types/expense.types';

export const expensesRepo = {
    async list(filters?: { startDate?: string; endDate?: string; category?: string; status?: string }) {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.category) params.append('category', filters.category);
        if (filters?.status) params.append('status', filters.status);

        return api.get<Expense[]>(`/v1/expenses?${params.toString()}`);
    },

    async create(data: Partial<Expense>) {
        return api.post<Expense>('/v1/expenses', data);
    },

    async update(id: string, data: Partial<Expense>) {
        return api.put<Expense>(`/v1/expenses/${id}`, data);
    },

    async delete(id: string) {
        return api.delete<{ success: true }>(`/v1/expenses/${id}`);
    }
};

export { ExpenseCategory, ExpenseStatus };
export type { Expense };
