import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { PublicInfoPage, type PublicInfoView } from './components/PublicInfoPage';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { Toaster } from './components/ui/sonner';
import type { AuthSession } from './utils/authSession';
import { clearProjectUiState } from './utils/storageUtils';
import { setCurrentUserId } from './utils/userScope';

type AuthServiceModule = typeof import('./utils/authService');
type DevAuthModule = typeof import('./utils/devAuth');
type SubscriptionModule = typeof import('./utils/subscription');

let authServicePromise: Promise<AuthServiceModule> | null = null;
let devAuthPromise: Promise<DevAuthModule> | null = null;
let subscriptionServicePromise: Promise<SubscriptionModule> | null = null;

function loadAuthService() {
  if (!authServicePromise) {
    authServicePromise = import('./utils/authService');
  }

  return authServicePromise;
}

function loadDevAuthService() {
  if (!devAuthPromise) {
    devAuthPromise = import('./utils/devAuth');
  }

  return devAuthPromise;
}

function loadSubscriptionService() {
  if (!subscriptionServicePromise) {
    subscriptionServicePromise = import('./utils/subscription');
  }

  return subscriptionServicePromise;
}

type AuthProvider = 'mock' | 'firebase' | 'line' | null;
type DocsRoute = `/docs${'' | `/${string}`}`;
type AppSurface = 'app' | PublicInfoView | DocsRoute;

const AppShell = lazy(() => import('./components/AppShell').then((module) => ({ default: module.AppShell })));
const PricingPage = lazy(() => import('./components/PricingPage').then((module) => ({ default: module.PricingPage })));
const AdminSubscriptionPanel = lazy(() => import('./components/AdminSubscriptionPanel').then((module) => ({ default: module.AdminSubscriptionPanel })));
const AdminMemoryPanel = lazy(() => import('./components/AdminMemoryPanel').then((module) => ({ default: module.AdminMemoryPanel })));
const DocumentsModulePage = lazy(() => import('./features/documents/DocumentsModulePage').then((module) => ({ default: module.DocumentsModulePage })));

function getSurfaceFromHash(hash: string): AppSurface {
  const normalized = hash.replace(/^#\/?/, '').trim();
  const lowered = normalized.toLowerCase();

  if (lowered === 'guide') return 'guide';
  if (lowered === 'faq') return 'faq';
  if (lowered === 'privacy') return 'privacy';
  if (lowered === 'docs' || lowered.startsWith('docs/')) {
    return `/${normalized}` as DocsRoute;
  }

  return 'app';
}

function updateSurfaceHash(surface: AppSurface): void {
  if (typeof window === 'undefined') return;

  if (surface === 'app') {
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', cleanUrl);
    return;
  }

  window.location.hash = surface.startsWith('/') ? surface.slice(1) : surface;
}

function isPublicInfoSurface(surface: AppSurface): surface is PublicInfoView {
  return surface === 'guide' || surface === 'faq' || surface === 'privacy';
}

function isDocsSurface(surface: AppSurface): surface is DocsRoute {
  return surface.startsWith('/docs');
}

function mapAppPathToSurface(path: string): AppSurface {
  const normalized = path.trim();

  if (!normalized || normalized === '/' || normalized === '/workspace') {
    return 'app';
  }

  if (normalized.startsWith('#')) {
    return getSurfaceFromHash(normalized);
  }

  if (normalized === '/guide') return 'guide';
  if (normalized === '/faq') return 'faq';
  if (normalized === '/privacy') return 'privacy';
  if (normalized === '/docs' || normalized.startsWith('/docs/')) {
    return normalized as DocsRoute;
  }

  return 'app';
}

function DeferredViewFallback({ title }: { title: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/80 px-6 py-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">กำลังโหลดโมดูล</p>
        <h2 className="mt-3 text-2xl text-slate-950">{title}</h2>
      </div>
    </div>
  );
}

function mapFirebaseAuthError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: string }).code || '')
    : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    case 'auth/invalid-email':
      return 'รูปแบบอีเมลไม่ถูกต้อง';
    case 'auth/too-many-requests':
      return 'มีการพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง';
    case 'auth/network-request-failed':
      return 'เชื่อมต่อเครือข่ายไม่สำเร็จ กรุณาลองใหม่';
    case 'auth/operation-not-allowed':
      return 'ยังไม่ได้เปิดใช้งาน Email/Password ใน Firebase Authentication';
    case 'auth/email-already-in-use':
      return 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น';
    case 'auth/weak-password':
      return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
    default:
      if (error instanceof Error && error.message.trim()) {
        return error.message;
      }
      return 'ไม่สามารถเข้าสู่ระบบได้';
  }
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authProvider, setAuthProvider] = useState<AuthProvider>(null);
  const [surface, setSurface] = useState<AppSurface>(() =>
    typeof window === 'undefined' ? 'app' : getSurfaceFromHash(window.location.hash),
  );
  const [isReady, setIsReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const firebaseListening = useRef(false);
  const authProviderRef = useRef<AuthProvider>(null);
  const cloudRetryInFlightRef = useRef(false);
  const [hasPaidSubscription, setHasPaidSubscription] = useState<boolean | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ plan: string | null; status: string; endDate: string | null } | null>(null);
  const [showAdminSub, setShowAdminSub] = useState(false);
  const [showAdminMemory, setShowAdminMemory] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const canUseLineAuth = true; // LINE OAuth popup works on any URL

  useEffect(() => {
    authProviderRef.current = authProvider;
  }, [authProvider]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleHashChange = () => {
      setSurface(getSurfaceFromHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // --- Check subscription status ---
  useEffect(() => {
    if (!session?.user) {
      setHasPaidSubscription(null);
      setSubscriptionInfo(null);
      return;
    }
    if (session.workspaceMode === 'local-cache' || session.workspaceMode === 'mock') {
      setHasPaidSubscription(true);
      setSubscriptionInfo({ plan: 'demo', status: 'active', endDate: null });
      return;
    }

    let cancelled = false;
    void loadSubscriptionService()
      .then(({ checkSubscription, isSubscriptionActive }) =>
        Promise.all([checkSubscription(session.user), isSubscriptionActive(session.user)])
      )
      .then(([sub, active]) => {
        if (!cancelled) {
          setHasPaidSubscription(active);
          setSubscriptionInfo(sub ? { plan: sub.plan, status: sub.status, endDate: sub.endDate } : null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const errObj = err as Record<string, unknown>;
          const isNetworkError = err instanceof Error && (
            err.message.includes('network') ||
            err.message.includes('Failed to fetch') ||
            err.message.includes('offline') ||
            (typeof errObj.code === 'string' && errObj.code === 'unavailable')
          );
          if (isNetworkError) {
            // Temporary network error: don't downgrade, keep previous state
            console.warn('[Subscription] Network error, retaining current state:', err);
          } else {
            setHasPaidSubscription(false);
            setSubscriptionInfo(null);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  // --- Set user scope for localStorage isolation ---
  useEffect(() => {
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
    }
  }, [session]);

  
  // --- Check LINE login redirect (mobile flow) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lineToken = params.get('line_token');
    const lineError = params.get('line_error');
    
    if (lineToken) {
      window.history.replaceState({}, '', window.location.pathname);
      setIsSigningIn(true);
      loadAuthService()
        .then(({ checkLineRedirectResult }) => checkLineRedirectResult(lineToken))
        .then((ok) => { if (!ok) setIsSigningIn(false); })
        .catch((err) => {
          setAuthError(err instanceof Error ? err.message : 'LINE login failed');
          setIsSigningIn(false);
        });
    } else if (lineError) {
      window.history.replaceState({}, '', window.location.pathname);
      setAuthError(lineError);
    }
  }, []);

// --- Init: load mock session + LIFF + Firebase listener ---
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { loadStoredDevAuthSession } = await loadDevAuthService();
      const mockSession = await loadStoredDevAuthSession();
      if (mockSession && !cancelled) {
        setCurrentUserId(mockSession.user.id);
        setSession(mockSession);
        setAuthProvider('mock');
        setIsReady(true);
        return;
      }

      if (!cancelled) {
        setIsReady(true);
      }

      try {
        const { initLiff, checkLiffSession } = await loadAuthService();
        const liffInitialized = await initLiff();
        if (!liffInitialized || cancelled) return;

        const liffSession = await checkLiffSession();
        if (liffSession && !cancelled) {
          setCurrentUserId(liffSession.user.id);
          setSession(liffSession);
          setAuthProvider('line');
          setIsReady(true);
        }
      } catch {
        // ignore LIFF bootstrap failures and keep login screen interactive
      }
    }

    void init().catch(err => console.error('Init failed:', err));

    return () => { cancelled = true; };
  }, []);

  // --- Firebase onAuthStateChanged listener ---
  useEffect(() => {
    if (firebaseListening.current) return;
    firebaseListening.current = true;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void loadAuthService()
      .then(({ onFirebaseAuthChanged }) => {
        if (cancelled) return;

        unsubscribe = onFirebaseAuthChanged(
          (firebaseSession) => {
            if (firebaseSession) {
              setCurrentUserId(firebaseSession.user.id);
              setSession(firebaseSession);
              setAuthProvider('firebase');
              setAuthError('');
              setIsSigningIn(false);
              setIsReady(true);
            } else if (authProviderRef.current === 'firebase') {
              setSession(null);
              setAuthProvider(null);
              setAuthError('');
              setIsSigningIn(false);
            }
          },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setIsReady(true);
        }
      });

    return () => {
      cancelled = true;
      firebaseListening.current = false;
      unsubscribe?.();
    };
  }, []);

  // --- Mock email/password sign-in ---
  const handleSignIn = async ({
    email,
    password,
    rememberSession,
  }: {
    email: string;
    password: string;
    rememberSession: boolean;
  }) => {
    setIsSigningIn(true);
    setAuthError('');

    const { signInWithDevAuth, clearDevAuthSession } = await loadDevAuthService();
    const { signInWithEmailPassword } = await loadAuthService();

    const devAuthResult = await signInWithDevAuth(email, password, rememberSession);
    if (devAuthResult?.session) {
      setCurrentUserId(devAuthResult.session.user.id);
      setSession(devAuthResult.session);
      setAuthProvider('mock');
      setIsSigningIn(false);
      return;
    }

    try {
      await clearDevAuthSession();
      await signInWithEmailPassword(email, password, rememberSession);
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      setIsSigningIn(false);
    }
  };

  const handleRegister = async ({
    email,
    password,
    rememberSession,
  }: {
    email: string;
    password: string;
    rememberSession: boolean;
  }) => {
    setIsSigningIn(true);
    setAuthError('');

    try {
      const { registerWithEmailPassword } = await loadAuthService();
      await registerWithEmailPassword(email, password, rememberSession);
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      setIsSigningIn(false);
    }
  };

  // --- Social sign-in handlers ---
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError('');
    try {
      const { signInWithGoogle } = await loadAuthService();
      await signInWithGoogle();
      // onAuthStateChanged will set session
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google login failed';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
      setIsSigningIn(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsSigningIn(true);
    setAuthError('');
    try {
      const { signInWithFacebook } = await loadAuthService();
      await signInWithFacebook();
      // onAuthStateChanged will set session
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Facebook login failed';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
      setIsSigningIn(false);
    }
  };

  const handleLineSignIn = async () => {
    setIsSigningIn(true);
    setAuthError('');
    try {
      const { signInWithLine } = await loadAuthService();
      await signInWithLine();
      // onAuthStateChanged will set session
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'LINE login failed';
      if (!msg.includes('cancelled')) {
        setAuthError(msg);
      }
      setIsSigningIn(false);
    }
  };

  // --- Unified sign-out ---
  const handleSignOut = async () => {
    const [{ signOutAll }, { clearDevAuthSession }] = await Promise.all([
      loadAuthService(),
      loadDevAuthService(),
    ]);
    await signOutAll();
    await clearDevAuthSession();
    clearProjectUiState();
    setSession(null);
    setAuthProvider(null);
    setAuthError('');
  };

  const handleRetryCloudSession = useCallback(async (): Promise<boolean> => {
    if (cloudRetryInFlightRef.current) return false;
    cloudRetryInFlightRef.current = true;

    try {
      const { retryResolveActiveFirebaseSession } = await loadAuthService();
      const nextSession = await retryResolveActiveFirebaseSession();
      if (!nextSession) return false;

      setCurrentUserId(nextSession.user.id);
      setSession(nextSession);
      setAuthProvider('firebase');
      setAuthError('');
      setIsSigningIn(false);
      setIsReady(true);
      return true;
    } finally {
      cloudRetryInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (session?.workspaceMode !== 'local-cache' || authProvider !== 'firebase') return undefined;

    let active = true;
    const retryOnce = async () => {
      if (!active || !window.navigator.onLine) return;
      await handleRetryCloudSession();
    };

    const timeoutId = window.setTimeout(() => {
      void retryOnce();
    }, 1500);

    const handleOnline = () => {
      void retryOnce();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void retryOnce();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authProvider, handleRetryCloudSession, session?.workspaceMode]);

  const openSurface = (nextSurface: AppSurface) => {
    setSurface(nextSurface);
    updateSurfaceHash(nextSurface);
  };

  const handleOpenGuide = () => openSurface('guide');
  const handleOpenFaq = () => openSurface('faq');
  const handleOpenPrivacy = () => openSurface('privacy');
  const handleBackToApp = () => openSurface('app');

  if (isPublicInfoSurface(surface)) {
    return (
      <>
        <AppErrorBoundary>
          <PublicInfoPage
            view={surface}
            isAuthenticated={Boolean(session)}
            onNavigate={(view) => openSurface(view)}
            onBack={handleBackToApp}
          />
        </AppErrorBoundary>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (!isReady) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/80 px-6 py-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">เตรียมระบบ</p>
            <h2 className="mt-3 text-2xl text-slate-950">กำลังเตรียมระบบเข้าสู่ระบบ</h2>
          </div>
        </div>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <AppErrorBoundary>
          <LoginPage
            errorMessage={authError}
            isSubmitting={isSigningIn}
            onSubmit={handleSignIn}
            onRegister={handleRegister}
            onGoogleSignIn={handleGoogleSignIn}
            onFacebookSignIn={handleFacebookSignIn}
            onLineSignIn={canUseLineAuth ? handleLineSignIn : undefined}
            onOpenGuide={handleOpenGuide}
            onOpenFaq={handleOpenFaq}
            onOpenPrivacy={handleOpenPrivacy}
          />
        </AppErrorBoundary>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  // --- Pricing page ---
  if (showPricing) {
    return (
      <>
        <AppErrorBoundary>
          <Suspense fallback={<DeferredViewFallback title="กำลังเปิดหน้าแพ็กเกจ" />}>
            <PricingPage user={session.user} onBack={() => setShowPricing(false)} />
          </Suspense>
        </AppErrorBoundary>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  // --- Admin Subscription Panel (owner only) ---
  if (showAdminSub && session.user.role === 'owner') {
    return (
      <>
        <AppErrorBoundary>
          <Suspense fallback={<DeferredViewFallback title="กำลังเปิดหน้าจัดการสมาชิก" />}>
            <AdminSubscriptionPanel onBack={() => setShowAdminSub(false)} />
          </Suspense>
        </AppErrorBoundary>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  // --- Admin Memory Panel (owner only) ---
  if (showAdminMemory && session.user.role === 'owner') {
    return (
      <>
        <AppErrorBoundary>
          <Suspense fallback={<DeferredViewFallback title="กำลังเปิด Memory Admin" />}>
            <AdminMemoryPanel onBack={() => setShowAdminMemory(false)} />
          </Suspense>
        </AppErrorBoundary>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (isDocsSurface(surface)) {
    return (
      <>
        <AppErrorBoundary>
          <Suspense fallback={<DeferredViewFallback title="กำลังเปิดโมดูลเอกสาร" />}>
            <DocumentsModulePage
              route={surface}
              session={session}
              onNavigate={(path) => openSurface(mapAppPathToSurface(path))}
            />
          </Suspense>
        </AppErrorBoundary>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  // --- Main App: AppShell (replaces all old routing) ---
  return (
    <>
      <AppErrorBoundary>
        <Suspense fallback={<DeferredViewFallback title="กำลังเปิด EzBOQ Workspace" />}>
          <AppShell
            session={session}
            onSignOut={handleSignOut}
            planTier={hasPaidSubscription === false ? 'free' : 'paid'}
            subscriptionInfo={subscriptionInfo}
            onOpenPricing={() => setShowPricing(true)}
            onOpenAdminSub={session.user.role === 'owner' ? () => setShowAdminSub(true) : undefined}
            onOpenAdminMemory={session.user.role === 'owner' ? () => setShowAdminMemory(true) : undefined}
          />
        </Suspense>
      </AppErrorBoundary>
      <Toaster richColors position="top-right" />
    </>
  );
}
