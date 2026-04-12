'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithCustomToken, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import Image from 'next/image';
import Link from 'next/link';

const LINK_COMPLETE_URL =
  process.env.NEXT_PUBLIC_LINK_COMPLETE_URL ||
  'https://doc.ezboq.com/link/complete';

const mascotPrimary =
  'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FPreview%2Fmascot%20png%20notex%2Fmascot_%E0%B8%96%E0%B8%B7%E0%B8%AD%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3.png?alt=media&token=ac93f430-35cb-4216-9f73-34aafc4ec86d';
const oaLogo =
  'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FPreview%2Fmascot%20png%20notex%2FService%20Logo-02___4.png?alt=media&token=43d26c72-a711-46bf-bdf2-218526ff1eba';
const LINE_OA_URL = 'https://line.me/R/ti/p/@ezdoc';
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://doc.ezboq.com';
const DEFAULT_DASHBOARD_URL = `${APP_ORIGIN}/dashboard/documents`;

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function normalizeSafeRedirect(rawPath?: string | null): string | null {
  if (!rawPath) return null;

  try {
    const appUrl = new URL(APP_ORIGIN);
    const resolved = new URL(rawPath, APP_ORIGIN);
    if (resolved.origin !== appUrl.origin) return null;
    if (resolved.pathname === '/' || resolved.pathname.includes('/liff')) {
      return DEFAULT_DASHBOARD_URL;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

type LiffClient = {
  init: (args: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  isInClient: () => boolean;
  login: (args: { redirectUri: string }) => void;
  getIDToken: () => string | null;
  getAccessToken: () => string | null;
  openWindow: (args: { url: string; external: boolean }) => void;
  closeWindow: () => void;
};

// LIFF SDK (dynamic import to avoid SSR issues)
let liff: LiffClient | null = null;

type Status =
  | 'loading'
  | 'liff-init'
  | 'line-login'
  | 'checking'
  | 'not-linked'
  | 'linked'
  | 'linking'
  | 'provisioning'
  | 'unlinking'
  | 'success'
  | 'error';

interface LinkStatus {
  linked: boolean;
  uid?: string;
  email?: string;
  linkedAt?: string;
  lineUserId?: string;
  trial?: {
    used: number;
    quota: number;
  };
}

export default function LiffLinkPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string>('');
  const [linkStatus, setLinkStatus] = useState<LinkStatus | null>(null);
  const [lineLoginNote, setLineLoginNote] = useState<string>('');
  const [busyMessage, setBusyMessage] = useState<string>('');
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [autoLoginInProgress, setAutoLoginInProgress] = useState(false);
  const [autoLoginError, setAutoLoginError] = useState('');
  const [hasWebSession, setHasWebSession] = useState<boolean>(Boolean(auth.currentUser));
  const [webSessionEmail, setWebSessionEmail] = useState<string>(auth.currentUser?.email || '');
  const autoLoginOnce = useRef(false);
  const redirectAfterAuthRef = useRef(false);
  const [autoRefreshHint, setAutoRefreshHint] = useState<string>('');
  const tokenRetryRef = useRef(0);
  const unauthorizedRetryRef = useRef(0);
  const missingTokenRetryRef = useRef(0);

  const getStoredRedirectPath = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return normalizeSafeRedirect(window.sessionStorage.getItem('ezdoc-liff-redirect'));
  }, []);

  const resolveRedirectPath = useCallback((rawPath?: string | null) => {
    const resolved = normalizeSafeRedirect(rawPath) || getStoredRedirectPath() || DEFAULT_DASHBOARD_URL;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('ezdoc-liff-redirect', resolved);
    }
    return resolved;
  }, [getStoredRedirectPath]);

  const getIdTokenWithRetry = useCallback(async (): Promise<string | null> => {
    if (!liff) return null;
    const token = liff.getIDToken();
    if (token) return token;
    if (tokenRetryRef.current >= 2) return null;
    tokenRetryRef.current += 1;
    await new Promise((resolve) => setTimeout(resolve, 400));
    return liff.getIDToken();
  }, []);

  const getLineAuthPayload = useCallback(async () => {
    if (!liff) {
      return { idToken: null, accessToken: null };
    }
    const idToken = await getIdTokenWithRetry();
    const accessToken = liff.getAccessToken() || null;
    return { idToken, accessToken };
  }, [getIdTokenWithRetry]);

  const openInBrowser = () => {
    const url = window.location.href.split('#')[0];
    if (liff) {
      liff.openWindow({ url, external: true });
      return;
    }
    window.open(url, '_blank');
  };

  const handleLineLogin = () => {
    if (!liff) {
      setStatus('error');
      setError('LIFF ยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง');
      return;
    }

    const currentUrl = window.location.href.split('#')[0];
    setLineLoginNote('');
    setStatus('line-login');
    liff.login({ redirectUri: currentUrl });
  };

  const checkLinkStatus = useCallback(async () => {
    try {
      setStatus('checking');
      if (!liff) {
        throw new Error('LIFF not initialized');
      }

      const { idToken, accessToken } = await getLineAuthPayload();

      if (!idToken && !accessToken) {
        if (liff.isInClient() && missingTokenRetryRef.current < 1) {
          missingTokenRetryRef.current += 1;
          liff.login({ redirectUri: window.location.href.split('#')[0] });
          return;
        }
        if (!liff.isLoggedIn()) {
          setLineLoginNote('กรุณาเข้าสู่ระบบ LINE เพื่อยืนยันตัวตน');
        } else {
          setLineLoginNote('สิทธิ์หมดอายุ กรุณาเข้าสู่ระบบ LINE อีกครั้ง');
        }
        setStatus('line-login');
        return;
      }

      // ✅ FIX 3: Standardize client -> backend auth: Authorization: Bearer <ID_TOKEN>
      const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL || '';
      const checkUrl = `${functionsUrl}/checkLineLink`;

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      const res = await fetch(checkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
          ...(accessToken ? { 'X-Line-Access-Token': accessToken } : {}),
        },
        body: JSON.stringify({ idToken, accessToken }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      if (!res.ok) {
        const errorData = await res.json();
        const errorCode = errorData.code || errorData.error;

        // ✅ FIX 3: Handle missing auth error with actionable message
        if (errorCode === 'ERR_MISSING_AUTH_HEADER' || res.status === 401) {
          // Auto-trigger LINE login once in client to refresh token
          if (liff.isInClient() && unauthorizedRetryRef.current < 1) {
            unauthorizedRetryRef.current += 1;
            liff.login({ redirectUri: window.location.href.split('#')[0] });
            return;
          }
          setLineLoginNote('สิทธิ์หมดอายุ กรุณาเข้าสู่ระบบ LINE อีกครั้ง');
          setStatus('line-login');
          return;
        }

        throw new Error(errorData.error || 'Failed to check link status');
      }

      const data = await res.json() as LinkStatus;
      setLinkStatus(data);
      setStatus(data.linked ? 'linked' : 'not-linked');
    } catch (err: unknown) {
      console.error('[LIFF] Check error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('error');
        setError('ตรวจสอบไม่สำเร็จ (หมดเวลา) กรุณาลองใหม่อีกครั้ง');
        return;
      }
      setStatus('error');
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ');
    }
  }, [getLineAuthPayload]);

  const initLiff = useCallback(async () => {
    try {
      setStatus('liff-init');

      // Dynamic import LIFF
      if (!liff) {
        const liffModule = await import('@line/liff');
        liff = liffModule.default as unknown as LiffClient;
      }

      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        throw new Error('LIFF configuration error');
      }

      await liff.init({ liffId });

      // Check if logged in to LINE
      const isLoggedIn = liff.isLoggedIn();

      if (!isLoggedIn) {
        if (liff.isInClient() && !autoLoginAttempted) {
          setAutoLoginAttempted(true);
          const params = new URLSearchParams(window.location.search);
          const redirectParam = params.get('redirect');
          if (redirectParam) {
            resolveRedirectPath(redirectParam);
          }
          liff.login({ redirectUri: window.location.href.split('#')[0] });
          return;
        }
        setLineLoginNote('กรุณาเข้าสู่ระบบ LINE เพื่อเริ่มเชื่อมต่อ');
        setStatus('line-login');
        return;
      }

      await checkLinkStatus();
    } catch (err) {
      console.error('[LIFF] Init error:', err);
      setStatus('error');
      setError('เข้าสู่ระบบไม่สำเร็จ (อาจโดนบล็อกจากเบราว์เซอร์ในแอป)');
    }
  }, [autoLoginAttempted, checkLinkStatus, resolveRedirectPath]);

  useEffect(() => {
    initLiff();
  }, [initLiff]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setHasWebSession(Boolean(user));
      setWebSessionEmail(user?.email || '');
      if (!user || !redirectAfterAuthRef.current) return;
      redirectAfterAuthRef.current = false;

      const params = new URLSearchParams(window.location.search);
      let redirectPath = params.get('redirect');
      if (!redirectPath) {
        const liffState = params.get('liff.state');
        if (liffState) {
          try {
            redirectPath = decodeURIComponent(liffState);
          } catch {
            redirectPath = liffState;
          }
        }
      }

      if (redirectPath) {
        window.location.href = resolveRedirectPath(redirectPath);
        return;
      }

      window.location.href = DEFAULT_DASHBOARD_URL;
    });

    return () => unsub();
  }, [resolveRedirectPath]);

  const loginWebWithLine = useCallback(async (opts?: { redirect?: boolean; autoCreate?: boolean }) => {
    try {
      if (!liff) {
        throw new Error('LIFF not initialized');
      }

      setAutoLoginError('');
      setAutoLoginInProgress(true);

      const { idToken, accessToken } = await getLineAuthPayload();
      if (!idToken && !accessToken) {
        setLineLoginNote('กรุณาเข้าสู่ระบบ LINE อีกครั้ง');
        setStatus('line-login');
        setAutoLoginInProgress(false);
        return;
      }

      const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL || '';
      const verifyUrl = `${functionsUrl}/authLineVerify`;

      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'X-Line-Access-Token': accessToken } : {}),
        },
        body: JSON.stringify({ idToken, accessToken, autoCreate: opts?.autoCreate === true }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'ไม่สามารถยืนยันบัญชี LINE ได้');
      }

      const data = await res.json();
      if (!data.customToken) {
        throw new Error('ไม่พบ token สำหรับเข้าสู่ระบบเว็บ');
      }

      // Ensure persistence is set before sign-in (prevents redirect loops in LIFF)
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        try {
          await setPersistence(auth, browserSessionPersistence);
        } catch {
          // If persistence fails, still attempt sign-in but warn user
          setAutoLoginError('ไม่สามารถบันทึกการเข้าสู่ระบบได้ (WebView จำกัดสิทธิ์) ลองเปิดในเบราว์เซอร์');
        }
      }

      if (opts?.redirect) {
        redirectAfterAuthRef.current = true;
      }

      await signInWithCustomToken(auth, data.customToken);
      await auth.currentUser?.getIdToken(true);

      // Wait for Firebase to emit auth state before redirecting
      await new Promise<void>((resolve) => {
        const unsub = onAuthStateChanged(auth, (u) => {
          if (u) {
            unsub();
            resolve();
          }
        });
        setTimeout(() => {
          unsub();
          resolve();
        }, 3000);
      });

      if (opts?.redirect) {
        // Check for redirect query param
        const params = new URLSearchParams(window.location.search);
        let redirectPath = params.get('redirect');
        if (!redirectPath) {
          const liffState = params.get('liff.state');
          if (liffState) {
            try {
              redirectPath = decodeURIComponent(liffState);
            } catch {
              redirectPath = liffState;
            }
          }
        }

        if (auth.currentUser) {
          window.location.href = resolveRedirectPath(redirectPath);
        } else {
          redirectAfterAuthRef.current = true;
          setAutoLoginError('ยังไม่สามารถยืนยันการเข้าสู่ระบบได้ ลองอีกครั้งหรือล็อกอินใหม่');
          setAutoLoginInProgress(false);
        }
      } else {
        setAutoLoginInProgress(false);
      }
    } catch (err: unknown) {
      console.error('[LIFF] Auto-login error:', err);
      const message = err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบเว็บได้';
      let detailedMessage = message;
      const code = getErrorCode(err);
      if (code) {
        detailedMessage = `Error: ${code} - ${message}`;
      }
      if (opts?.autoCreate) {
        setStatus('error');
        setError(detailedMessage);
      } else {
        setAutoLoginError(detailedMessage);
      }
      setAutoLoginInProgress(false);
    }
  }, [getLineAuthPayload, resolveRedirectPath]);

  useEffect(() => {
    if (status === 'linked' && linkStatus && !hasWebSession && !autoLoginOnce.current) {
      autoLoginOnce.current = true;
      void loginWebWithLine({ redirect: true });
    }
  }, [status, linkStatus, hasWebSession, loginWebWithLine]);

  const linkCurrentWebSession = useCallback(async (opts?: { redirect?: boolean }) => {
    try {
      if (!auth.currentUser) {
        throw new Error('กรุณาเข้าสู่ระบบเว็บก่อน');
      }
      if (!liff) {
        throw new Error('LIFF not initialized');
      }

      setBusyMessage('กำลังเชื่อม LINE เข้ากับบัญชี EzDOC นี้...');
      setStatus('provisioning');
      setError('');

      const { idToken, accessToken } = await getLineAuthPayload();
      if (!idToken && !accessToken) {
        setLineLoginNote('กรุณาเข้าสู่ระบบ LINE อีกครั้ง');
        setStatus('line-login');
        return;
      }

      const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL || '';
      const startUrl = `${functionsUrl}/linkLineStart`;
      const consumeUrl = `${functionsUrl}/linkLineConsume`;

      const startRes = await fetch(startUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
          ...(accessToken ? { 'X-Line-Access-Token': accessToken } : {}),
        },
        body: JSON.stringify({ idToken, accessToken }),
      });

      if (!startRes.ok) {
        const errorData = await startRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'เริ่มเชื่อมบัญชีไม่สำเร็จ');
      }

      const { code } = await startRes.json() as { code?: string };
      if (!code) {
        throw new Error('ไม่พบรหัสเชื่อมบัญชี');
      }

      const firebaseToken = await auth.currentUser.getIdToken(true);
      const consumeRes = await fetch(consumeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ code }),
      });

      if (!consumeRes.ok) {
        const errorData = await consumeRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'เชื่อมบัญชีไม่สำเร็จ');
      }

      await checkLinkStatus();

      if (opts?.redirect) {
        const params = new URLSearchParams(window.location.search);
        let redirectPath = params.get('redirect');
        if (!redirectPath) {
          const liffState = params.get('liff.state');
          if (liffState) {
            try {
              redirectPath = decodeURIComponent(liffState);
            } catch {
              redirectPath = liffState;
            }
          }
        }
        window.location.href = resolveRedirectPath(redirectPath);
      }
    } catch (err: unknown) {
      console.error('[LIFF] Direct link error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมบัญชี');
    }
  }, [checkLinkStatus, getLineAuthPayload, resolveRedirectPath]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && liff?.isLoggedIn()) {
        setAutoRefreshHint('กำลังตรวจสอบสถานะล่าสุด...');
        checkLinkStatus().finally(() => setAutoRefreshHint(''));
      }
    };
    const handleFocus = () => {
      if (liff?.isLoggedIn()) {
        setAutoRefreshHint('กำลังตรวจสอบสถานะล่าสุด...');
        checkLinkStatus().finally(() => setAutoRefreshHint(''));
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkLinkStatus]);

  const handleStartLink = async () => {
    try {
      setBusyMessage('กำลังเปิดหน้าเชื่อมบัญชีเดิม...');
      setStatus('linking');
      if (!liff) {
        throw new Error('LIFF not initialized');
      }

      const { idToken, accessToken } = await getLineAuthPayload();

      if (!idToken && !accessToken) {
        setLineLoginNote('กรุณาเข้าสู่ระบบ LINE อีกครั้ง');
        setStatus('line-login');
        return;
      }

      const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL || '';
      const startUrl = `${functionsUrl}/linkLineStart`;

      const res = await fetch(startUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
          ...(accessToken ? { 'X-Line-Access-Token': accessToken } : {}),
        },
        body: JSON.stringify({ idToken, accessToken }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to start linking');
      }

      const { code } = await res.json();

      // Open external browser
      const completeUrl = `${LINK_COMPLETE_URL}?code=${encodeURIComponent(code)}`;

      if (liff) {
        liff.openWindow({
          url: completeUrl,
          external: true,
        });
      }
    } catch (err: unknown) {
      console.error('[LIFF] Link error:', err);
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
      let detailedErrorMessage = errorMessage;
      const code = getErrorCode(err);
      if (code) {
        detailedErrorMessage = `Error: ${code} - ${errorMessage}`;
      }
      setError(detailedErrorMessage);
    }
  };

  const handleQuickStart = async () => {
    if (hasWebSession) {
      await linkCurrentWebSession({ redirect: true });
      return;
    }

    setBusyMessage(linkStatus?.trial
      ? 'กำลังเปิดบัญชี EzDOC ของคุณจาก LINE และพาเข้าแดชบอร์ด...'
      : 'กำลังสร้างบัญชี EzDOC จาก LINE และพาเข้าแดชบอร์ด...');
    setStatus('provisioning');
    await loginWebWithLine({ redirect: true, autoCreate: true });
  };


  const handleUnlink = async () => {
    if (!confirm('ยืนยันการยกเลิกการเชื่อมต่อบัญชี?')) {
      return;
    }

    try {
      setStatus('unlinking');
      if (!liff) {
        throw new Error('LIFF not initialized');
      }

      const { idToken, accessToken } = await getLineAuthPayload();
      if (!idToken && !accessToken) {
        setLineLoginNote('กรุณาเข้าสู่ระบบ LINE อีกครั้ง');
        setStatus('line-login');
        return;
      }

      // Ensure web session (auto login via LINE)
      let user = auth.currentUser;
      if (!user) {
        await loginWebWithLine({ redirect: false });
        user = auth.currentUser;
      }
      if (!user) {
        throw new Error('กรุณาเข้าสู่ระบบเว็บก่อน');
      }

      const firebaseToken = await user.getIdToken();

      const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL || '';
      const unlinkUrl = `${functionsUrl}/unlinkLine`;

      const res = await fetch(unlinkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
          ...(accessToken ? { 'X-Line-Access-Token': accessToken } : {}),
        },
        body: JSON.stringify({ idToken, accessToken }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const rawMessage = errorData.error || 'Failed to unlink';
        if (rawMessage.includes('Forbidden')) {
          throw new Error('บัญชีที่เข้าสู่ระบบไม่ตรงกับบัญชีที่เคยเชื่อมต่อ LINE\nลองล็อกอินด้วยอีเมลเดิม หรือกดยืนยันยกเลิกใหม่อีกครั้ง');
        }
        throw new Error(rawMessage);
      }

      // Refresh status
      setLinkStatus(null);
      await checkLinkStatus();
    } catch (err: unknown) {
      console.error('[LIFF] Unlink error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการยกเลิกการเชื่อมต่อ');
    }
  };

  const handleCloseLiff = () => {
    if (liff && liff.isInClient()) {
      liff.closeWindow();
      return;
    }
    window.location.href = LINE_OA_URL;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-6 py-12">
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="mx-auto w-full max-w-md rounded-3xl border border-emerald-100 bg-white/90 p-8 text-center shadow-2xl shadow-emerald-100/60 backdrop-blur">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src={oaLogo} alt="LINE OA" width={180} height={60} className="drop-shadow-lg" />
          <div className="h-1 w-20 rounded-full bg-emerald-400/60" />
          <Image
            src={mascotPrimary}
            alt="EzDOC Mascot"
            width={240}
            height={240}
            className="drop-shadow-2xl"
            style={{ animation: 'floaty 4.5s ease-in-out infinite' }}
          />
          <h1 className="text-2xl font-bold text-slate-900">เชื่อมต่อบัญชี LINE</h1>
          <p className="text-sm text-slate-600">
            เชื่อมต่อครั้งเดียว แล้วใช้งานบอทได้ทันที
          </p>
        </div>

        {(status === 'loading' || status === 'liff-init' || status === 'checking') && (
          <div className="py-8">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
            <p className="text-sm text-slate-500">
              {status === 'loading' && 'กำลังโหลด...'}
              {status === 'liff-init' && 'กำลังเตรียมระบบ...'}
              {status === 'checking' && 'กำลังตรวจสอบสถานะ...'}
            </p>
            {autoRefreshHint && (
              <p className="mt-2 text-xs text-slate-400">{autoRefreshHint}</p>
            )}
          </div>
        )}

        {status === 'line-login' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              {lineLoginNote || 'กรุณาเข้าสู่ระบบ LINE แล้วค่อยเชื่อมต่อบัญชี'}
            </div>
            <button
              onClick={handleLineLogin}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/70 transition hover:bg-emerald-700"
            >
              เข้าสู่ระบบ LINE
            </button>
            <button
              onClick={openInBrowser}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-emerald-300"
            >
              เปิดใน Safari/Chrome เพื่อเข้าสู่ระบบ
            </button>
            <button
              onClick={handleCloseLiff}
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        )}

        {status === 'not-linked' && linkStatus && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              ยังไม่ได้เชื่อมต่อบัญชี
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-xs text-slate-600">
              {hasWebSession ? (
                <div>
                  พร้อมเชื่อมเข้ากับบัญชีนี้{webSessionEmail ? `: ${webSessionEmail}` : ''}
                </div>
              ) : linkStatus.trial ? (
                <div>มีสิทธิ์ทดลองใช้อยู่แล้ว กดครั้งเดียวเพื่อเปิดแดชบอร์ดต่อได้เลย</div>
              ) : (
                <div>กดครั้งเดียว ระบบจะสร้างบัญชีจาก LINE และพาเข้าแดชบอร์ดให้อัตโนมัติ</div>
              )}
            </div>
            <button
              onClick={() => void handleQuickStart()}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/70 transition hover:bg-emerald-700"
            >
              {hasWebSession ? 'เชื่อมเข้าบัญชีนี้เลย' : 'เริ่มใช้งานทันที'}
            </button>
            {!hasWebSession && (
              <button
                onClick={handleStartLink}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-300"
              >
                มีบัญชี EzDOC อยู่แล้ว
              </button>
            )}
            <button
              onClick={handleCloseLiff}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        )}

        {status === 'linked' && linkStatus && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              ✅ บัญชีเชื่อมต่อแล้ว
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-xs text-slate-600">
              หลังจากกด “กลับไป LINE” จะมีข้อความยืนยันในแชททันที
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-xs text-slate-600">
              {linkStatus.email && <div>อีเมล: {linkStatus.email}</div>}
              {linkStatus.linkedAt && (
                <div>
                  เชื่อมต่อเมื่อ: {new Date(linkStatus.linkedAt).toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>
            <button
              onClick={handleUnlink}
              className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600"
            >
              ยกเลิกการเชื่อมต่อ
            </button>
            {autoLoginInProgress && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                กำลังเข้าสู่ระบบเว็บและพาไปแดชบอร์ด...
              </div>
            )}
            {autoLoginError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
                {autoLoginError}
              </div>
            )}
            {!hasWebSession && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                ยังไม่พบการเข้าสู่ระบบเว็บ กด “ไปที่แดชบอร์ด” เพื่อยืนยันอีกครั้ง
              </div>
            )}
            <button
              onClick={() => void loginWebWithLine({ redirect: true })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-300"
            >
              ไปที่แดชบอร์ด
            </button>
            <Link
              href="/"
              className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center text-xs text-slate-500 transition hover:border-emerald-300"
            >
              กลับไปหน้าเว็บ
            </Link>
            <button
              onClick={handleCloseLiff}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/70 transition hover:bg-emerald-700"
            >
              กลับไป LINE
            </button>
          </div>
        )}

        {status === 'linking' && (
          <div className="py-8 text-sm text-slate-500">
            🔗 {busyMessage || 'กำลังเปิดเบราว์เซอร์สำหรับเชื่อมต่อ...'}
          </div>
        )}

        {status === 'provisioning' && (
          <div className="py-8 text-sm text-slate-500">
            ✨ {busyMessage || 'กำลังเตรียมบัญชีและพาเข้าแดชบอร์ด...'}
          </div>
        )}

        {status === 'unlinking' && (
          <div className="py-8 text-sm text-slate-500">
            🔓 กำลังยกเลิกการเชื่อมต่อ...
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              กำลังเปิดเบราว์เซอร์สำหรับล็อกอิน...
            </div>
            <button
              onClick={handleCloseLiff}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/70 transition hover:bg-emerald-700"
            >
              ปิดหน้าต่างนี้
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-600">
              {error}
              <div className="mt-2 text-xs text-rose-500">
                ลองเปิดใน Safari/Chrome แล้วทำใหม่อีกครั้ง
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/70 transition hover:bg-emerald-700"
            >
              ลองใหม่อีกครั้ง
            </button>
            <button
              onClick={openInBrowser}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500"
            >
              เปิดใน Safari/Chrome เพื่อเข้าสู่ระบบ
            </button>
            <button
              onClick={handleCloseLiff}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes floaty {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }
      `}</style>
    </div>
  );
}
