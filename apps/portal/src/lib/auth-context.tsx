'use client';

/**
 * Auth Context
 * Provides authentication state and methods
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { bootstrapBusiness, getMe, UserProfile } from '@/lib/api';
import {
    buildRuntimeDevProfile,
    buildRuntimeDevUser,
    isRuntimeDevBypassEnabled,
} from '@/lib/runtimeDevBypass';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    sessionReady: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    // sessionReady becomes true once we've attempted to load the profile for
    // the current auth state (used by route guards / UI to know bootstrap done).
    const [sessionReady, setSessionReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load user profile
    const loadProfile = async () => {
        if (isRuntimeDevBypassEnabled()) {
            setProfile(buildRuntimeDevProfile());
            setSessionReady(true);
            return;
        }

        try {
            let data = await getMe();
            if (!data.activeBusinessId) {
                try {
                    await bootstrapBusiness();
                    data = await getMe();
                } catch (bootstrapErr) {
                    console.warn('Business bootstrap failed:', bootstrapErr);
                }
            }
            setProfile(data);
            setSessionReady(true);
        } catch (err) {
            console.error('Failed to load profile:', err);
            // If the API returned unauthorized for the token, force sign out so
            // client state is consistent. getMe throws various errors; handle
            // 401-ish cases by signing out locally.
            const msg = err instanceof Error ? err.message : String(err);
            const allowStaleSession = process.env.NODE_ENV !== 'production';
            if (!allowStaleSession && (msg.includes('401') || /unauthor/i.test(msg))) {
                try {
                    await firebaseSignOut(auth);
                } catch {
                    // ignore
                }
                setProfile(null);
            }
            setSessionReady(true);
        }
    };

    // Listen to auth state changes
    useEffect(() => {
        if (isRuntimeDevBypassEnabled()) {
            setLoading(false);
            setUser(buildRuntimeDevUser());
            setProfile(buildRuntimeDevProfile());
            setSessionReady(true);
            return () => undefined;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            // Mark that we've observed auth state and start bootstrap
            setLoading(false);
            setUser(firebaseUser);
            setSessionReady(false);

            try {
                if (!firebaseUser) {
                    setProfile(null);
                    return;
                }

                // Attempt to load the profile for the signed-in user
                await loadProfile();
            } catch (err) {
                console.error('bootstrap failed', err);
            } finally {
                // ALWAYS mark session bootstrap as attempted so guards don't hang
                setSessionReady(true);
            }
        });

        return () => unsubscribe();
    }, []);

    // Safety: if auth callback never fires (e.g., restricted webview),
    // stop blocking the UI after a short timeout.
    useEffect(() => {
        if (sessionReady) return;
        const timeout = window.setTimeout(() => {
            if (!sessionReady) {
                console.warn('[Auth] session bootstrap timeout, releasing UI');
                setSessionReady(true);
            }
        }, 4000);
        return () => window.clearTimeout(timeout);
    }, [sessionReady]);

    const signIn = async (email: string, password: string) => {
        try {
            setError(null);
            if (isRuntimeDevBypassEnabled()) {
                setUser(buildRuntimeDevUser());
                setProfile(buildRuntimeDevProfile());
                setSessionReady(true);
                return;
            }
            // Perform sign-in using Firebase SDK
            await signInWithEmailAndPassword(auth, email, password);

            // After the SDK updates auth state, load the profile to bootstrap
            try {
                await loadProfile();
            } catch {
                const allowStaleSession = process.env.NODE_ENV !== 'production';
                if (!allowStaleSession) {
                    throw new Error('Profile bootstrap failed');
                }
            }
        } catch (err: unknown) {
            const errorObj = err as { code?: string; message?: string };
            // Map common Firebase auth codes to friendly (Thai) messages.
            const code = errorObj.code || '';
            let message = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
            if (code === 'auth/wrong-password' || /INVALID_PASSWORD|wrong-password/i.test(errorObj.message || '')) {
                message = 'รหัสผ่านไม่ถูกต้อง';
            } else if (code === 'auth/user-not-found' || /user-not-found/i.test(errorObj.message || '')) {
                message = 'ไม่พบผู้ใช้ดังกล่าว';
            } else if (code === 'auth/invalid-email' || /invalid-email/i.test(errorObj.message || '')) {
                message = 'ที่อยู่อีเมลไม่ถูกต้อง';
            } else if (code === 'auth/user-disabled' || /user-disabled/i.test(errorObj.message || '')) {
                message = 'บัญชีนี้ถูกปิดใช้งาน';
            } else if (err instanceof Error && err.message) {
                // Fall back to the SDK/server message when available
                message = err.message;
            }

            setError(message);
            throw err;
        }
    };

    const signUp = async (email: string, password: string) => {
        try {
            setError(null);
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sign up failed';
            setError(message);
            throw err;
        }
    };

    const signOut = async () => {
        try {
            if (isRuntimeDevBypassEnabled()) {
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem('ezdoc-e2e-dev-bypass');
                }
                setUser(null);
                setProfile(null);
                setSessionReady(true);
                return;
            }
            if (typeof window !== 'undefined') {
                window.sessionStorage.removeItem('ezdoc-liff-redirect');
                window.sessionStorage.setItem('ezdoc-manual-logout-at', String(Date.now()));
            }
            await firebaseSignOut(auth);
            setUser(null);
            setProfile(null);
            setSessionReady(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sign out failed';
            setError(message);
            throw err;
        }
    };

    const refreshProfile = async () => {
        setSessionReady(false);
        if (isRuntimeDevBypassEnabled()) {
            setProfile(buildRuntimeDevProfile());
            setSessionReady(true);
            return;
        }
        if (user) {
            await loadProfile();
        } else {
            setProfile(null);
            setSessionReady(true);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                sessionReady,
                error,
                signIn,
                signUp,
                signOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
