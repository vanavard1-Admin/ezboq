/**
 * Team Repository
 * Handles team collaboration API calls.
 * Note: Backend team API may not exist yet — callers should handle errors gracefully.
 */

import { api } from '@/lib/api';

export type TeamRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface TeamMember {
    id: string;
    email: string;
    displayName: string;
    role: TeamRole;
    status: 'ACTIVE' | 'PENDING';
    lastActiveAt?: string;
    createdAt?: string;
}

export interface TeamActivity {
    id: string;
    actor: string;
    action: string;
    target?: string;
    createdAt: string;
}

export const teamRepo = {
    async listMembers(): Promise<TeamMember[]> {
        return api.get<TeamMember[]>('/v1/team/members');
    },

    async inviteMember(email: string, role: TeamRole): Promise<{ success: boolean }> {
        return api.post('/v1/team/invite', { email, role });
    },

    async updateRole(memberId: string, role: TeamRole): Promise<{ success: boolean }> {
        return api.patch(`/v1/team/members/${memberId}/role`, { role });
    },

    async removeMember(memberId: string): Promise<{ success: boolean }> {
        return api.delete(`/v1/team/members/${memberId}`);
    },

    async getActivityLog(): Promise<TeamActivity[]> {
        return api.get<TeamActivity[]>('/v1/team/activity');
    },
};
