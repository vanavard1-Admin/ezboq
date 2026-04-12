import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCustomToken,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser,
  type Unsubscribe,
} from 'firebase/auth';
import { auth } from './firebase';
import type { AuthUser, AuthSession } from './authSession';
import { ENABLE_LINE_APP_AUTH } from './runtimeFlags';
import type { AppTab } from './workspaceTabs';

/* ── Providers ─────────────────────────────────────── */

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

const offlineFallbackTabs: AppTab[] = [
  'dashboard',
  'home',
  'quotation',
  'purchase-order',
  'customer-quotation',
  'presentation-board',
  'invoice',
  'summary-invoice',
  'vat-invoice',
  'withholding-tax',
  'receipt',
  'workplan',
  'contract',
];

/* ── LIFF ──────────────────────────────────────────── */

const LIFF_ID = (import.meta.env.VITE_LIFF_ID as string | undefined)?.trim()
  || '2008406529-Y6Bh2fT5';
const LIFF_ENDPOINT_URL = (import.meta.env.VITE_LIFF_ENDPOINT_URL as string | undefined)?.trim()
  || 'https://ezboq.com';
let liffReady = false;
let liffModulePromise: Promise<typeof import('@line/liff')['default']> | null = null;

async function loadLiffClient() {
  if (!liffModulePromise) {
    liffModulePromise = import('@line/liff').then((module) => module.default);
  }

  return liffModulePromise;
}

async function resolveCloudSession(firebaseUser: FirebaseUser): Promise<AuthSession> {
  const { resolveFirebaseAuthSession } = await import('./cloudWorkspace');
  return resolveFirebaseAuthSession(firebaseUser);
}

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function canUseLiffOnCurrentUrl(): boolean {
  if (!ENABLE_LINE_APP_AUTH) return false;
  if (typeof window === 'undefined') return false;

  try {
    const endpointUrl = new URL(LIFF_ENDPOINT_URL);
    const currentUrl = new URL(window.location.href);
    const endpointPath = normalizePathname(endpointUrl.pathname);
    const currentPath = normalizePathname(currentUrl.pathname);

    return currentUrl.origin === endpointUrl.origin
      && (currentPath === endpointPath || currentPath.startsWith(`${endpointPath}/`));
  } catch {
    return false;
  }
}

export async function initLiff(): Promise<boolean> {
  if (liffReady) return true;
  if (!canUseLiffOnCurrentUrl()) return false;

  try {
    const liff = await loadLiffClient();
    await liff.init({ liffId: LIFF_ID });
    liffReady = true;
    return true;
  } catch (err) {
    console.error('LIFF init failed:', err);
    return false;
  }
}

export function liffLogin(): void {
  void (async () => {
    if (!liffReady) return;
    const liff = await loadLiffClient();
    liff.login({ redirectUri: window.location.origin });
  })();
}

export async function checkLiffSession(): Promise<AuthSession | null> {
  if (!liffReady) return null;

  try {
    const liff = await loadLiffClient();
    if (!liff.isLoggedIn()) return null;
    const profile = await liff.getProfile();
    const user = mapLineProfileToAuthUser(profile);
    return {
      user,
      rememberSession: true,
      signedInAt: new Date().toISOString(),
      workspaceMode: 'line',
    };
  } catch {
    return null;
  }
}

/* ── Google / Facebook ────────────────────────────── */

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export async function signInWithFacebook(): Promise<void> {
  await signInWithPopup(auth, facebookProvider);
}

/* ── LINE Login (OAuth popup) ─────────────────────── */

const LINE_CHANNEL_ID = '2008406529';
const LINE_CALLBACK_URL = 'https://asia-southeast1-ezdoc-v1-th.cloudfunctions.net/ezboqLineCallback';

function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export async function signInWithLine(): Promise<void> {
  const state = Math.random().toString(36).substring(2, 15);
  const authorizeUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', LINE_CHANNEL_ID);
  authorizeUrl.searchParams.set('redirect_uri', LINE_CALLBACK_URL);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('scope', 'profile openid email');

  // Mobile: redirect flow (popups don't work)
  if (isMobile()) {
    sessionStorage.setItem('ezboq-line-pending', 'true');
    window.location.href = authorizeUrl.toString();
    return new Promise(() => {}); // never resolves, page navigates away
  }

  // Desktop: popup flow
  return new Promise<void>((resolve, reject) => {
    const width = 480;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authorizeUrl.toString(),
      'line-login',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );

    if (!popup) {
      // Popup blocked — fallback to redirect
      sessionStorage.setItem('ezboq-line-pending', 'true');
      window.location.href = authorizeUrl.toString();
      return;
    }

    const handleMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== 'ezboq-line-login') return;
      
      window.removeEventListener('message', handleMessage);
      clearInterval(pollTimer);

      if (data.error) {
        reject(new Error(data.error));
        return;
      }

      if (data.customToken) {
        try {
          await signInWithCustomToken(auth, data.customToken);
          resolve();
        } catch (err) {
          reject(err);
        }
        return;
      }

      reject(new Error('No token received from LINE login'));
    };

    window.addEventListener('message', handleMessage);

    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer);
        window.removeEventListener('message', handleMessage);
        
        try {
          const stored = sessionStorage.getItem('ezboq-line-result');
          if (stored) {
            sessionStorage.removeItem('ezboq-line-result');
            let data: Record<string, unknown> | null = null;
            try {
              data = JSON.parse(stored);
            } catch { /* malformed JSON */ }
            if (data?.customToken) {
              signInWithCustomToken(auth, data.customToken as string)
                .then(() => resolve())
                .catch(reject);
              return;
            }
          }
        } catch { /* ignore */ }
        
        reject(new Error('LINE login cancelled'));
      }
    }, 500);
  });
}

/** Check for LINE login redirect result on page load */
export async function checkLineRedirectResult(token?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  const pending = sessionStorage.getItem('ezboq-line-pending');
  const stored = sessionStorage.getItem('ezboq-line-result');
  
  // Direct token from URL param (mobile redirect)
  if (token) {
    try {
      await signInWithCustomToken(auth, token);
      return true;
    } catch (err) {
      console.error('[LINE] Token signin error:', err);
      throw err;
    }
  }

  if (stored) {
    sessionStorage.removeItem('ezboq-line-result');
    sessionStorage.removeItem('ezboq-line-pending');
    try {
      const data = JSON.parse(stored);
      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
        return true;
      }
    } catch (err) {
      console.error('[LINE] Redirect result error:', err);
    }
  }
  
  if (pending) {
    sessionStorage.removeItem('ezboq-line-pending');
  }
  
  return false;
}


export async function signInWithEmailPassword(
  email: string,
  password: string,
  rememberSession: boolean,
): Promise<void> {
  await setPersistence(
    auth,
    rememberSession ? browserLocalPersistence : browserSessionPersistence,
  );
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function registerWithEmailPassword(
  email: string,
  password: string,
  rememberSession: boolean,
): Promise<void> {
  await setPersistence(
    auth,
    rememberSession ? browserLocalPersistence : browserSessionPersistence,
  );
  await createUserWithEmailAndPassword(auth, email.trim(), password);
}

/* ── Firebase Auth Observer ────────────────────────── */

export function onFirebaseAuthChanged(
  callback: (session: AuthSession | null) => void,
): Unsubscribe {
  let sequence = 0;

  return firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
    sequence += 1;
    const currentSequence = sequence;

    if (firebaseUser) {
      try {
        const session = await resolveCloudSession(firebaseUser);
        if (currentSequence === sequence) {
          callback(session);
        }
      } catch (error) {
        console.error('Failed to resolve workspace session:', error);
        const fallbackSession = createLocalFallbackSession(firebaseUser);
        if (currentSequence === sequence) {
          callback(fallbackSession);
        }
      }
      return;
    }

    if (currentSequence === sequence) {
      callback(null);
    }
  });
}

export async function retryResolveActiveFirebaseSession(): Promise<AuthSession | null> {
  if (!auth.currentUser) return null;

  try {
    return await resolveCloudSession(auth.currentUser);
  } catch (error) {
    console.error('Failed to retry cloud workspace session:', error);
    return null;
  }
}

function createLocalFallbackSession(firebaseUser: FirebaseUser): AuthSession {
  const workspaceName = firebaseUser.displayName?.trim() || firebaseUser.email?.trim() || 'My Workspace';
  const user: AuthUser = {
    id: firebaseUser.uid,
    workspaceId: firebaseUser.uid,
    workspaceName,
    name: firebaseUser.displayName?.trim() || firebaseUser.email?.trim() || 'Workspace Owner',
    email: firebaseUser.email?.trim() || '',
    role: 'member',
    title: 'Offline Cache Session',
    company: '',
    description: 'เชื่อมต่อระบบกลางไม่สำเร็จชั่วคราว ระบบจึงเปิดข้อมูลแคชล่าสุดแบบจำกัดสิทธิ์เพื่อให้ตรวจงานต่อได้ก่อน',
    hasFullProjectAccess: true,
    assignedProjectIds: [],
    allowedTabs: [...offlineFallbackTabs],
    canExportAll: false,
    canResetDemoData: false,
    canManageProjects: false,
    canOpenSpecialProjects: false,
  };

  return {
    user,
    rememberSession: true,
    signedInAt: new Date().toISOString(),
    workspaceMode: 'local-cache',
  };
}

/* ── Sign Out ──────────────────────────────────────── */

export async function signOutAll(): Promise<void> {
  try { await firebaseSignOut(auth); } catch { /* ignore */ }
  try {
    if (liffReady) {
      const liff = await loadLiffClient();
      if (liff.isLoggedIn()) liff.logout();
    }
  } catch { /* ignore */ }
}

function mapLineProfileToAuthUser(profile: { userId: string; displayName: string; pictureUrl?: string }): AuthUser {
  return {
    id: `line-${profile.userId}`,
    workspaceId: `line-${profile.userId}`,
    workspaceName: profile.displayName,
    name: profile.displayName,
    email: '',
    role: 'owner',
    title: 'Owner / LINE',
    company: '',
    description: 'เข้าสู่ระบบผ่าน LINE',
    hasFullProjectAccess: true,
    assignedProjectIds: [],
    allowedTabs: [],
    canExportAll: false,
    canResetDemoData: false,
    canManageProjects: false,
    canOpenSpecialProjects: false,
  };
}
