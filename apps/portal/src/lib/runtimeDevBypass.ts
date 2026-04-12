import type { User } from 'firebase/auth';

import type { UserProfile } from './api';

export const RUNTIME_DEV_BYPASS_KEY = 'ezdoc-e2e-dev-bypass';

const LOCAL_BYPASS_HOSTS = new Set(['localhost', '127.0.0.1']);

export function isRuntimeDevBypassEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    if (!LOCAL_BYPASS_HOSTS.has(window.location.hostname)) return false;
    return window.localStorage.getItem(RUNTIME_DEV_BYPASS_KEY) === '1';
}

export function buildRuntimeDevProfile(): UserProfile {
    return {
        userId: 'e2e-dev-user',
        email: 'e2e-dev@localhost',
        activeBusinessId: 'e2e-dev-business',
        business: {
            id: 'e2e-dev-business',
            name: 'E2E Demo Business',
            address: 'Bangkok',
            phone: '0000000000',
            email: 'e2e-dev@localhost',
            taxId: '0100000000000',
            language: 'th',
            defaultVatEnabled: false,
            defaultVatRate: 7,
            defaultWhtEnabled: false,
            defaultWhtRate: 0,
            isSetupComplete: true,
        },
        businesses: [
            {
                id: 'e2e-dev-business',
                name: 'E2E Demo Business',
            },
        ],
    };
}

export function buildRuntimeDevUser(): User {
    return {
        uid: 'e2e-dev-user',
        email: 'e2e-dev@localhost',
        displayName: 'E2E Dev User',
        phoneNumber: null,
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        metadata: {
            creationTime: null,
            lastSignInTime: null,
        },
        providerData: [],
        providerId: 'password',
        refreshToken: 'e2e-dev-refresh-token',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => 'e2e-dev-id-token',
        getIdTokenResult: async () => ({
            token: 'e2e-dev-id-token',
            signInProvider: 'password',
            signInSecondFactor: null,
            authTime: new Date().toISOString(),
            issuedAtTime: new Date().toISOString(),
            expirationTime: new Date(Date.now() + 60_000).toISOString(),
            claims: {},
        }),
        reload: async () => {},
        toJSON: () => ({ uid: 'e2e-dev-user', email: 'e2e-dev@localhost' }),
    } as unknown as User;
}
