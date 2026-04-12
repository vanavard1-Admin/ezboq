'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Image from 'next/image';

type Status = 'loading' | 'need-signin' | 'linking' | 'success' | 'error' | 'need-start';

const log = (message: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message);
  }
};

const mapAuthError = (err: { code?: string; message?: string }): string => {
  const code = err.code || 'auth/unknown';
  if (code === 'auth/unauthorized-domain') {
    return [
      'ไม่สามารถเข้าสู่ระบบได้ เพราะโดเมนนี้ยังไม่ได้รับอนุญาต',
      'แอดมินต้องเพิ่มโดเมนใน Firebase Auth → Authorized domains',
      '',
      'โดเมนที่ควรมี: doc.ezboq.com / ezdoc-v1-th.web.app / ezdoc-v1-th.firebaseapp.com',
      'ติดต่อ: admin@ezboq.com',
    ].join('\n');
  }
  if (code === 'auth/operation-not-allowed') {
    return [
      'ยังไม่ได้เปิดใช้งาน Google Sign-in ใน Firebase',
      'แอดมินต้องเปิด Provider: Authentication → Sign-in method',
      '',
      'ติดต่อ: admin@ezboq.com',
    ].join('\n');
  }
  if (code === 'auth/network-request-failed') {
    return [
      'เครือข่ายมีปัญหา ลองใหม่อีกครั้ง',
      'ถ้าอยู่ใน LINE ให้ลองเปิดลิงก์นี้ใน Safari/Chrome',
    ].join('\n');
  }
  return `เกิดข้อผิดพลาดในการเข้าสู่ระบบ (${code})\nติดต่อ: admin@ezboq.com`;
};

function LinkCompleteContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const isE2E = process.env.NODE_ENV !== 'production' && searchParams.get('e2e') === '1';
  
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string>('');
  const redirectFlag = 'link_redirect_in_flight';
  const loadingTimeoutMs = 12000;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [redirectWarning, setRedirectWarning] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const liffUrl = liffId ? `https://liff.line.me/${liffId}` : 'https://line.me/R/ti/p/@ezdoc';

  const mascotPrimary =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FPreview%2Fmascot%20png%20notex%2Fmascot_%E0%B8%96%E0%B8%B7%E0%B8%AD%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3.png?alt=media&token=ac93f430-35cb-4216-9f73-34aafc4ec86d';
  const lineLogo =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FPreview%2Fmascot%20png%20notex%2Fline%20ico.png?alt=media&token=5feb348d-801e-42b3-8db6-8026d0017567';
  const googleLogo =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FPreview%2Fmascot%20png%20notex%2Fgoogle-icon-logo-svgrepo-com.svg?alt=media&token=2b3839ee-5c62-438b-80d7-71dec66d209d';
  const oaLogo =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FPreview%2Fmascot%20png%20notex%2FService%20Logo-02___4.png?alt=media&token=43d26c72-a711-46bf-bdf2-218526ff1eba';
  const fbIcon =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/payment-qr%2Ficon%20fb%20ig%2Ffacebook-svgrepo-com%20(1).svg?alt=media&token=4b1720f9-85fe-4a74-9195-ebbc79bd33c7';
  const igIcon =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/payment-qr%2Ficon%20fb%20ig%2Finstagram-1-svgrepo-com.svg?alt=media&token=5a5a780f-ba72-4c7d-9c5f-6c698cf19218';

  const openInBrowser = () => {
    window.open(window.location.href, '_blank');
  };

  const startFromLine = () => {
    window.location.href = liffUrl;
  };

  const backToLine = async () => {
    try {
      const liffModule = await import('@line/liff');
      const liff = liffModule.default as { isInClient?: () => boolean; closeWindow?: () => void };
      if (liff?.isInClient?.() && liff?.closeWindow) {
        liff.closeWindow();
        return;
      }
    } catch {
      // fall back to open LINE OA
    }

    window.location.href = 'https://line.me/R/ti/p/@ezdoc';
  };

  const resetToSignIn = () => {
    setError('');
    setEmailError('');
    setEmailLoading(false);
    setGoogleLoading(false);
    setStatus('need-signin');
  };

  const consumeCode = useCallback(async () => {
    try {
      setStatus('linking');
      log('[COMPLETE_CONSUME_START] Consuming link code...');

      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not signed in');
      }

      const firebaseToken = await user.getIdToken();
      const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL || '';
      const consumeUrl = `${functionsUrl}/linkLineConsume`;

      log('[COMPLETE_CONSUME_CALL] Calling linkLineConsume');

      const res = await fetch(consumeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        log(`[COMPLETE_CONSUME_FAIL] ${res.status}`);
        throw new Error(errorData.error || 'Failed to link account');
      }

      await res.json();
      log('[COMPLETE_CONSUME_OK] Successfully linked');

      setStatus('success');
      setEmailLoading(false);
      setGoogleLoading(false);
    } catch (err: unknown) {
      const error = err as { message?: string };
      log(`[COMPLETE_CONSUME_FAIL] ${error.message || 'Unknown error'}`);
      setStatus('error');
      setError(error.message || 'Failed to complete linking');
      setEmailLoading(false);
      setGoogleLoading(false);
    }
  }, [code]);

  const checkAuth = useCallback(async () => {
    log('[COMPLETE_START] Checking authentication...');

    if (!code) {
      if (isE2E) {
        setStatus('need-signin');
        setError('');
        return;
      }
      setStatus('need-start');
      setError('');
      return;
    }

    log('[COMPLETE_CODE] Code received');

    // Ensure session persistence (more reliable on mobile/in-app browsers)
    try {
      const { setPersistence, browserSessionPersistence } = await import('firebase/auth');
      await setPersistence(auth, browserSessionPersistence);
    } catch {
      // Non-blocking; continue
    }

    // Handle redirect result first (if returning from Google)
    try {
      const redirectResult = await Promise.race([
        getRedirectResult(auth),
        new Promise<null>((_resolve, reject) =>
          setTimeout(() => reject(new Error('REDIRECT_TIMEOUT')), 6000)
        ),
      ]);
      if (redirectResult?.user) {
        log('[COMPLETE_AUTH] Redirect sign-in OK');
        sessionStorage.removeItem(redirectFlag);
        await consumeCode();
        return;
      }
    } catch (err) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj.message === 'REDIRECT_TIMEOUT') {
        log('[COMPLETE_REDIRECT_TIMEOUT]');
      } else {
        setStatus('error');
        setError(mapAuthError(errorObj));
        return;
      }
    }

    // If redirect was attempted but no result/user, show actionable error
    const redirectInFlight = sessionStorage.getItem(redirectFlag) === '1';
    if (redirectInFlight && !auth.currentUser) {
      sessionStorage.removeItem(redirectFlag);
      setRedirectWarning([
        'เข้าสู่ระบบไม่สำเร็จ (อาจโดนบล็อกจากเบราว์เซอร์ในแอป)',
        'ลองเปิดใน Safari/Chrome แล้วทำใหม่อีกครั้ง',
      ].join('\n'));
      setStatus('need-signin');
      return;
    }

    // Check if already signed in
    const user = auth.currentUser;
    if (user) {
      log('[COMPLETE_AUTH] Already signed in');
      await consumeCode();
    } else {
      log('[COMPLETE_NEED_SIGNIN] Not signed in - showing Google sign-in');
      setStatus('need-signin');
    }
  }, [code, consumeCode, isE2E]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (status !== 'loading' && status !== 'linking') {
      return;
    }
    const timer = setTimeout(() => {
      setStatus('error');
      setError([
        'การเชื่อมต่อใช้เวลานานเกินไป',
        'ลองเปิดลิงก์นี้ใน Safari/Chrome แล้วทำใหม่อีกครั้ง',
        '',
        'ติดต่อ: admin@ezboq.com',
      ].join('\n'));
    }, loadingTimeoutMs);

    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (status !== 'success') return;

    const timer = window.setTimeout(() => {
      window.location.href = '/dashboard/documents';
    }, 700);

    return () => window.clearTimeout(timer);
  }, [status]);

  const handleGoogleSignIn = async () => {
    try {
      log('[COMPLETE_SIGNIN_START] Starting Google sign-in...');
      setStatus('loading');
      setRedirectWarning('');
      setGoogleLoading(true);

      const provider = new GoogleAuthProvider();
      sessionStorage.setItem(redirectFlag, '1');
      await signInWithRedirect(auth, provider);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      log(`[COMPLETE_SIGNIN_FAIL] ${error.code || 'Unknown error'}`);

      // Enhanced error handling for operation-not-allowed
      let errorMessage = `Google sign-in failed: ${error.message || 'Unknown error'}`;

      if (error.code === 'auth/operation-not-allowed') {
        errorMessage = `🔧 Firebase Configuration Required\n\n` +
          `Google Sign-in Provider is not enabled.\n\n` +
          `Please enable it:\n` +
          `1. Go to Firebase Console\n` +
          `2. Authentication → Sign-in method\n` +
          `3. Enable Google provider\n` +
          `4. Add support email\n` +
          `5. Save changes\n\n` +
          `Firebase Console:\n` +
          `https://console.firebase.google.com/project/ezdoc-v1-th/authentication/providers\n\n` +
          `Error: ${error.code}`;
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = `Popup blocked by browser. Please allow popups and try again.`;
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = `Sign-in cancelled. Please try again.`;
        // Don't set error state for user cancellation
        setStatus('need-signin');
        return;
      }
      
      sessionStorage.removeItem(redirectFlag);
      setStatus('error');
      setError(errorMessage);
      setGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      setEmailError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    try {
      setEmailError('');
      setRedirectWarning('');
      setEmailLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      if (isE2E && !code) {
        window.location.href = '/dashboard/documents';
        return;
      }
      await consumeCode();
    } catch (err) {
      const errorObj = err as { code?: string; message?: string };
      let message = 'เข้าสู่ระบบไม่สำเร็จ';
      if (errorObj.code === 'auth/user-not-found') {
        message = 'ไม่พบบัญชีนี้ในระบบ';
      } else if (errorObj.code === 'auth/wrong-password') {
        message = 'รหัสผ่านไม่ถูกต้อง';
      } else if (errorObj.code === 'auth/invalid-email') {
        message = 'รูปแบบอีเมลไม่ถูกต้อง';
      }
      setEmailError(message);
      setEmailLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #e2fbe8 0%, #f4fcff 45%, #ffffff 100%)',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '44px 38px',
        borderRadius: '24px',
        boxShadow: '0 30px 80px rgba(15, 23, 42, 0.15)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        border: '1px solid #e2e8f0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: '0',
          background: 'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.08), transparent 55%), radial-gradient(circle at 80% 0%, rgba(14,116,144,0.08), transparent 55%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '12px', position: 'relative' }}>
          <Image
            src={lineLogo}
            alt="LINE"
            width={90}
            height={34}
            style={{ height: '34px', width: 'auto', objectFit: 'contain' }}
          />
          <span style={{ color: '#16a34a', fontWeight: 800, letterSpacing: '0.04em', fontSize: '18px' }}>EzDOC</span>
        </div>
        <h1 style={{ marginBottom: '10px', color: '#0f172a', fontSize: '26px', position: 'relative' }}>
          เชื่อมต่อบัญชี LINE
        </h1>
        <p style={{ margin: '0 0 18px 0', color: '#64748b', fontSize: '14px', position: 'relative' }}>
          เชื่อมต่อครั้งเดียว แล้วใช้งานบอทได้ทันที
        </p>
        <div style={{ marginBottom: '18px', position: 'relative' }}>
          <div style={{ marginBottom: '10px' }}>
            <Image
              src={oaLogo}
              alt="LINE OA"
              width={180}
              height={56}
              style={{ height: '56px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <Image
            src={mascotPrimary}
            alt="EzDOC Mascot"
            width={260}
            height={260}
            style={{
              width: '260px',
              height: '260px',
              objectFit: 'contain',
              animation: 'floaty 4.5s ease-in-out infinite',
              filter: 'drop-shadow(0 18px 28px rgba(16, 185, 129, 0.28))',
            }}
          />
        </div>

        {status === 'loading' && (
          <div style={{ padding: '20px' }}>
            <p style={{ color: '#666', margin: 0 }}>⏳ กำลังโหลด...</p>
            <p style={{ color: '#999', fontSize: '13px', marginTop: '8px' }}>
              ถ้าเพิ่งล็อกอิน ระบบกำลังพากลับมาหน้านี้อัตโนมัติ
            </p>
          </div>
        )}

        {status === 'need-signin' && (
          <div>
            <p style={{ marginBottom: '18px', color: '#475569', fontWeight: 500 }}>
              กรุณาเข้าสู่ระบบเพื่อเชื่อมต่อบัญชี LINE
            </p>
            {redirectWarning && (
              <div style={{
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#9a3412',
                marginBottom: '12px',
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
              }}>
                {redirectWarning}
              </div>
            )}
            <p style={{ marginBottom: '16px', color: '#999', fontSize: '13px' }}>
              หลังล็อกอิน ระบบจะพากลับมาหน้านี้อัตโนมัติ
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading || emailLoading}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#ffffff',
                color: '#111',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
              }}
            >
              <Image src={googleLogo} alt="Google" width={18} height={18} />
              {googleLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
            </button>

            <div style={{ marginTop: '18px', textAlign: 'left' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666' }}>
                หรือเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="อีเมล"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  backgroundColor: '#f8fafc',
                }}
                disabled={emailLoading || googleLoading}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่าน"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  backgroundColor: '#f8fafc',
                }}
                disabled={emailLoading || googleLoading}
              />
              {emailError && (
                <p style={{ color: '#C62828', fontSize: '12px', margin: '0 0 8px 0' }}>
                  {emailError}
                </p>
              )}
              <button
                onClick={handleEmailSignIn}
                disabled={emailLoading || googleLoading}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: '14px',
                  backgroundColor: '#1DB446',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 18px rgba(16, 185, 129, 0.25)',
                }}
              >
                {emailLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วยอีเมล'}
              </button>
            </div>

            <button
              onClick={() => window.open(window.location.href, '_blank')}
              style={{
                marginTop: '10px',
                padding: '10px 16px',
                fontSize: '13px',
                backgroundColor: '#f3f4f6',
                color: '#333',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              ถ้าเปิดไม่ได้ ให้ลองเปิดใน Safari/Chrome
            </button>
            <div style={{ marginTop: '14px', fontSize: '12px', color: '#666' }}>
              เชื่อมต่อบัญชี LINE เพื่อใช้งานบอทในแชท
            </div>
          </div>
        )}

        {status === 'need-start' && (
          <div>
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              padding: '14px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              color: '#0f172a',
              marginBottom: '16px',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
            }}>
              ต้องเริ่มจาก LINE ก่อนนะครับ
              <br />
              กดปุ่มด้านล่างเพื่อเข้าสู่ระบบ LINE แล้วระบบจะพากลับมาหน้านี้อัตโนมัติ
            </div>
            <button
              onClick={startFromLine}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#00B900',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 10px 22px rgba(16, 185, 129, 0.25)',
                marginBottom: '10px',
              }}
            >
              เริ่มเชื่อมต่อบัญชี LINE
            </button>
            <button
              onClick={openInBrowser}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#111',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              เปิดใน Safari/Chrome
            </button>
          </div>
        )}

        {status === 'linking' && (
          <div style={{ padding: '20px' }}>
            <p style={{ color: '#666' }}>🔗 กำลังเชื่อมต่อบัญชี...</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{
              backgroundColor: '#d4edda',
              color: '#155724',
              padding: '20px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}>
              <p style={{ margin: 0, fontSize: '48px' }}>✅</p>
              <p style={{ margin: '10px 0', fontWeight: 'bold', fontSize: '18px' }}>
                เชื่อมต่อสำเร็จ!
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                ตอนนี้คุณสามารถใช้งานบอทใน LINE ได้แล้ว
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                กำลังพาไปแดชบอร์ด...
              </p>
            </div>
            <button
              onClick={() => (window.location.href = '/dashboard/documents')}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#1DB446',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
                marginBottom: '10px',
              }}
            >
              ไปที่แดชบอร์ดตอนนี้
            </button>
            <button
              onClick={backToLine}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#00B900',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              กลับไป LINE
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{
              backgroundColor: '#fff5f5',
              color: '#7f1d1d',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'left',
              border: '1px solid #fecaca',
            }}>
              <p style={{ margin: 0, fontSize: '48px', textAlign: 'center' }}>❌</p>
              <p style={{ margin: '10px 0', fontWeight: 'bold', textAlign: 'center' }}>เกิดข้อผิดพลาด</p>
              <pre style={{
                margin: '10px 0 0 0',
                fontSize: '11px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                backgroundColor: '#fff',
                padding: '10px',
                borderRadius: '8px',
              }}>
                {error}
              </pre>
            </div>
            <button
              onClick={resetToSignIn}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#1DB446',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 8px 18px rgba(16, 185, 129, 0.25)',
              }}
            >
              ลองเข้าสู่ระบบอีกครั้ง
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '10px',
                padding: '10px 16px',
                fontSize: '13px',
                backgroundColor: '#f3f4f6',
                color: '#333',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              ลองใหม่อีกครั้ง
            </button>
            <button
              onClick={openInBrowser}
              style={{
                marginTop: '10px',
                padding: '10px 16px',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#111',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              เปิดใน Safari/Chrome
            </button>
          </div>
        )}

        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #eee',
          fontSize: '12px',
          color: '#666',
        }}>
          <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <a href="https://www.facebook.com/profile.php?id=61586267506404" target="_blank" rel="noreferrer">
              <Image src={fbIcon} alt="Facebook" width={20} height={20} />
            </a>
            <a href="https://www.instagram.com/ezdoc_thailand/" target="_blank" rel="noreferrer">
              <Image src={igIcon} alt="Instagram" width={20} height={20} />
            </a>
          </div>
          <div>อีเมลติดต่อ: <a href="mailto:admin@ezboq.com">admin@ezboq.com</a></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes floaty {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

export default function LinkCompletePage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}>
        <p>Loading...</p>
      </div>
    }>
      <LinkCompleteContent />
    </Suspense>
  );
}
