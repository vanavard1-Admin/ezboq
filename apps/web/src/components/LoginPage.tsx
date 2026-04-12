import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  FileSpreadsheet,
  LockKeyhole,
  Mail,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { EzBOQLogo } from './EzBOQLogo';

interface LoginPageProps {
  errorMessage?: string;
  isSubmitting?: boolean;
  onSubmit?: (credentials: {
    email: string;
    password: string;
    rememberSession: boolean;
  }) => void | Promise<void>;
  onRegister?: (credentials: {
    email: string;
    password: string;
    rememberSession: boolean;
  }) => void | Promise<void>;
  onGoogleSignIn?: () => void | Promise<void>;
  onFacebookSignIn?: () => void | Promise<void>;
  onLineSignIn?: () => void;
  onOpenGuide?: () => void;
  onOpenFaq?: () => void;
  onOpenPrivacy?: () => void;
}

export function LoginPage({
  errorMessage,
  isSubmitting = false,
  onSubmit,
  onRegister,
  onGoogleSignIn,
  onFacebookSignIn,
  onLineSignIn,
  onOpenGuide,
  onOpenFaq,
  onOpenPrivacy,
}: LoginPageProps) {
  const allowPasswordLogin = typeof onSubmit === 'function';
  const allowRegister = typeof onRegister === 'function';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberSession, setRememberSession] = useState(false);
  const [mode, setMode] = useState<'signin' | 'register'>(allowRegister ? 'signin' : 'signin');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');

    if (mode === 'register') {
      if (!onRegister) return;
      if (password !== confirmPassword) {
        setLocalError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }

      await onRegister({
        email,
        password,
        rememberSession,
      });
      return;
    }

    if (!onSubmit) return;
    await onSubmit({
      email,
      password,
      rememberSession,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(214,211,209,0.32),_transparent_36%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_430px] lg:items-center">
        <div className="hidden rounded-[32px] border border-stone-200/80 bg-white/80 p-8 shadow-[0_25px_80px_rgba(28,25,23,0.08)] backdrop-blur md:block lg:p-10">
          <p className="text-[11px] uppercase tracking-[0.28em] text-stone-400">EzBOQ Workspace</p>
          <h1 className="mt-4 max-w-xl text-4xl font-light leading-tight text-stone-900">
            ระบบเอกสารเสนอราคาและคุม flow งานแบบ owner-first
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
            สร้างโครงการจาก template แล้วให้ระบบเตรียม BOQ, ใบเสนอราคา, แผนงาน, ใบวางบิล, ใบสั่งซื้อ, สัญญา และเอกสารภาษีให้ตั้งต้น จากนั้นค่อยไล่แก้รายหน้าได้ทั้งบน PC และ mobile
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
              <FileSpreadsheet className="h-5 w-5 text-stone-700" />
              <p className="mt-3 text-sm font-medium text-stone-800">BOQ to Documents</p>
              <p className="mt-1 text-xs leading-6 text-stone-500">สร้างเอกสารหลักจาก BOQ เดียวกันเพื่อลดงานซ้ำและเลขไม่ตรงกัน</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
              <ShieldCheck className="h-5 w-5 text-stone-700" />
              <p className="mt-3 text-sm font-medium text-stone-800">Owner-grade Control</p>
              <p className="mt-1 text-xs leading-6 text-stone-500">จัดการโครงการ, ตัวเลข, สิทธิ์, และข้อมูลบริษัทจาก workspace เดียว</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
              <Smartphone className="h-5 w-5 text-stone-700" />
              <p className="mt-3 text-sm font-medium text-stone-800">Responsive Flow</p>
              <p className="mt-1 text-xs leading-6 text-stone-500">เปิดงานต่อจากมือถือได้โดยไม่ต้องซูมเอกสารหรือไล่หาเมนูเอง</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-stone-500">
            {onOpenGuide && (
              <button className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 transition hover:bg-stone-50" onClick={onOpenGuide}>
                คู่มือการใช้งาน
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
            {onOpenFaq && (
              <button className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 transition hover:bg-stone-50" onClick={onOpenFaq}>
                คำถามที่พบบ่อย
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
            {onOpenPrivacy && (
              <button className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 transition hover:bg-stone-50" onClick={onOpenPrivacy}>
                นโยบายความเป็นส่วนตัว
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="w-full">
          <div className="rounded-[28px] border border-stone-200 bg-white/96 p-6 shadow-[0_22px_60px_rgba(28,25,23,0.08)] backdrop-blur md:p-8">
            <div className="mb-8 flex flex-col items-center text-center">
              <EzBOQLogo size="lg" className="text-stone-800 mb-4" />
              <p className="text-[11px] uppercase tracking-[0.28em] text-stone-400">Document System</p>
              <h1 className="mt-2 text-2xl text-stone-800">{mode === 'register' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</h1>
              <p className="mt-2 text-sm text-stone-500">
                {mode === 'register'
                  ? 'สร้างบัญชีใหม่เพื่อเริ่มต้น workspace ของคุณ'
                  : 'กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งาน workspace ของคุณ'}
              </p>
            </div>

            {allowPasswordLogin && (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {allowRegister && (
                  <div className="grid grid-cols-2 rounded-xl border border-stone-200 bg-stone-50 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setLocalError('');
                      }}
                      className={`rounded-lg px-3 py-2 text-sm transition ${
                        mode === 'signin' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                      }`}
                    >
                      เข้าสู่ระบบ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setLocalError('');
                      }}
                      className={`rounded-lg px-3 py-2 text-sm transition ${
                        mode === 'register' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                      }`}
                    >
                      สมัครสมาชิก
                    </button>
                  </div>
                )}

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm text-stone-500">
                    <Mail className="h-4 w-4 text-stone-400" />
                    อีเมล
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-300 focus:border-stone-400 focus:ring-0 focus:outline-none transition-colors"
                    placeholder="email@company.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm text-stone-500">
                    <LockKeyhole className="h-4 w-4 text-stone-400" />
                    รหัสผ่าน
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-300 focus:border-stone-400 focus:ring-0 focus:outline-none transition-colors"
                    placeholder="กรอกรหัสผ่าน"
                    autoComplete="current-password"
                    required
                  />
                </label>

                {mode === 'register' && (
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm text-stone-500">
                      <LockKeyhole className="h-4 w-4 text-stone-400" />
                      ยืนยันรหัสผ่าน
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-300 focus:border-stone-400 focus:ring-0 focus:outline-none transition-colors"
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      autoComplete="new-password"
                      required
                    />
                  </label>
                )}

                <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(event) => setRememberSession(event.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-400"
                  />
                  <span className="text-sm text-stone-800">จำการเข้าสู่ระบบไว้บนเครื่องนี้</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-medium transition-colors ${
                    isSubmitting
                      ? 'cursor-not-allowed bg-stone-100 text-stone-500'
                      : 'bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {isSubmitting ? 'กำลังตรวจสอบ...' : mode === 'register' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                </button>

                {allowRegister && (
                  <p className="text-center text-xs text-stone-500">
                    {mode === 'register' ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชี?'}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'register' ? 'signin' : 'register');
                        setLocalError('');
                      }}
                      className="font-medium text-stone-800 underline underline-offset-2"
                    >
                      {mode === 'register' ? 'กลับไปเข้าสู่ระบบ' : 'สมัครสมาชิก'}
                    </button>
                  </p>
                )}
              </form>
            )}

            {(localError || errorMessage) && (
              <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {localError || errorMessage}
              </div>
            )}

            {(onGoogleSignIn || onFacebookSignIn || onLineSignIn) && (
              <>
                {allowPasswordLogin && (
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-stone-200" />
                    <span className="text-xs text-stone-400">หรือเข้าสู่ระบบด้วย</span>
                    <div className="h-px flex-1 bg-stone-200" />
                  </div>
                )}

                {!allowPasswordLogin && (
                  <p className="mt-6 mb-3 text-center text-xs uppercase tracking-[0.22em] text-stone-400">
                    Sign In Provider
                  </p>
                )}

                <div className="space-y-3">
                  {onGoogleSignIn && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onGoogleSignIn()}
                      className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      เข้าสู่ระบบด้วย Google
                    </button>
                  )}

                  {onFacebookSignIn && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onFacebookSignIn()}
                      className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#166FE5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      เข้าสู่ระบบด้วย Facebook
                    </button>
                  )}

                  {onLineSignIn && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={onLineSignIn}
                      className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#06C755] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#05B64C] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.076 14.428 24 12.49 24 10.304z"/>
                      </svg>
                      เข้าสู่ระบบด้วย LINE
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-6 space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-stone-400 md:hidden">
              {onOpenGuide && (
                <button className="transition hover:text-stone-600" onClick={onOpenGuide}>
                  คู่มือใช้งาน
                </button>
              )}
              {onOpenGuide && (onOpenFaq || onOpenPrivacy) && <span>•</span>}
              {onOpenFaq && (
                <button className="transition hover:text-stone-600" onClick={onOpenFaq}>
                  QA
                </button>
              )}
              {onOpenFaq && onOpenPrivacy && <span>•</span>}
              {onOpenPrivacy && (
                <button className="transition hover:text-stone-600" onClick={onOpenPrivacy}>
                  Privacy Policy
                </button>
              )}
            </div>
            <p className="text-xs text-stone-400">
              &copy; {new Date().getFullYear()} EzBOQ. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
