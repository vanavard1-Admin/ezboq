/**
 * API Client
 * Wraps fetch with Firebase ID Token and handles errors
 */

import { auth } from './firebase';

const DEFAULT_EMULATOR_URL = 'http://localhost:5001/ezdoc-v1-th/asia-southeast1/api';
const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_BASE_URL =
    envApiUrl && envApiUrl.length > 0
        ? envApiUrl
        : (process.env.NODE_ENV === 'production' ? '' : DEFAULT_EMULATOR_URL);
const CLIENT_VERSION = '1.0.0';

function hasRecentManualLogout(): boolean {
    if (typeof window === 'undefined') return false;
    const raw = window.sessionStorage.getItem('ezdoc-manual-logout-at');
    const loggedOutAt = raw ? Number(raw) : 0;
    if (!loggedOutAt || Number.isNaN(loggedOutAt)) return false;
    const isRecent = Date.now() - loggedOutAt < 15_000;
    if (!isRecent) {
        window.sessionStorage.removeItem('ezdoc-manual-logout-at');
    }
    return isRecent;
}

export class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function getAuthHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Client-Version': CLIENT_VERSION,
    };

    if (user) {
        // Firebase automatically handles token refresh if close to expiry
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

export async function apiClient<T>(
    method: string,
    path: string,
    body?: unknown
): Promise<T> {
    const headers = await getAuthHeaders();

    if (!path.startsWith('/')) path = `/${path}`;
    const url = `${API_BASE_URL}${path}`;

    try {
        const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            cache: 'no-store', // Ensure we always get fresh data
        });

        if (res.status === 401) {
            console.warn('Unauthorized API call - invalid token');
            window.location.href = hasRecentManualLogout()
                ? '/'
                : 'https://doc.ezboq.com/liff/link';
            throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please login again.');
        }

        if (res.status === 429) {
            const retryAfter = res.headers.get('Retry-After');
            console.warn(`Rate limit exceeded. Retry after: ${retryAfter}s`);
            throw new ApiError(429, 'RATE_LIMIT', 'Too many requests. Please try again later.');
        }

        if (res.status === 409) {
            console.warn('Conflict detected (Optimistic Locking)');
            throw new ApiError(409, 'CONFLICT', 'Data has been modified by another process. Please refresh.');
        }

        if (!res.ok) {
            let errorData;
            try {
                errorData = await res.json();
            } catch {
                errorData = { error: res.statusText };
            }
            throw new ApiError(res.status, errorData.code || 'UNKNOWN', errorData.error || 'API Error');
        }

        // Handle 204 No Content
        if (res.status === 204) return {} as T;

        return res.json();
    } catch (error) {
        if (error instanceof ApiError) throw error;
        // console.error(`Network Error [${method} ${path}]:`, error);
        throw new Error(error instanceof Error ? error.message : 'Network Error');
    }
}
