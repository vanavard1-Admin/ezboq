import { apiClient } from '../api-client';
import { UserProfile } from '../api';

export const meRepo = {
    get: () => apiClient<UserProfile>('GET', '/v1/me'),
};
