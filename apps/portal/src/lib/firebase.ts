/**
 * Firebase Client Configuration
 */

import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import {
    type Auth,
    getAuth,
    initializeAuth,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

type FirebaseConfigShape = {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
};

const fallbackFirebaseConfig: FirebaseConfigShape = {
    apiKey: 'AIzaSyAFaOY5ennTgoiRXSwIA3ipfKbhGrG85gs',
    authDomain: 'ezdoc-v1-th.firebaseapp.com',
    projectId: 'ezdoc-v1-th',
    storageBucket: 'ezdoc-v1-th.firebasestorage.app',
    messagingSenderId: '498553770750',
    appId: '1:498553770750:web:20a4f8186df5cb05cf4baf',
};

function resolveFirebaseConfig(): FirebaseConfigShape {
    const envConfig: FirebaseConfigShape = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || '',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || '',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || '',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || '',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || '',
    };

    const isConfigured = Object.values(envConfig).every((value) => value.length > 0 && !value.startsWith('your_'));
    return isConfigured ? envConfig : fallbackFirebaseConfig;
}

const firebaseConfig = resolveFirebaseConfig();
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function createAuth(appInstance: FirebaseApp): Auth {
    if (typeof window === 'undefined') {
        return getAuth(appInstance);
    }

    try {
        return initializeAuth(appInstance, { persistence: browserLocalPersistence });
    } catch {
        return getAuth(appInstance);
    }
}

const authInstance = createAuth(app);

if (typeof window !== 'undefined') {
    (async () => {
        const candidates = [browserLocalPersistence, browserSessionPersistence];
        for (const persistence of candidates) {
            try {
                await setPersistence(authInstance, persistence);
                break;
            } catch {
                // Try next persistence option
            }
        }
    })();
}

export const auth = authInstance;
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export default app;
