import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Loader2, Upload, AlertTriangle, CheckCircle2, X, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';
import type { AuthUser } from '../utils/authSession';
import { PLANS, COMPANY_BANK_ACCOUNT, checkSubscription, generatePromptPayQRPayload, submitPaymentWithSlip, type SubscriptionStatus, type SubmitPaymentResult } from '../utils/subscription';
import { verifySlip, type SlipVerifyResult } from '../utils/slipVerifier';

interface SubscriptionPanelProps {
  user: AuthUser;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

type ViewState = 'plans' | 'payment';

export function SubscriptionPanel({ user }: SubscriptionPanelProps) {
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'solo' | 'team' | null>(null);
  const [view, setView] = useState<ViewState>('plans');

  // QR
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Slip
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<SlipVerifyResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitPaymentResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const planData = selectedPlan ? PLANS.find((p) => p.id === selectedPlan) : null;
  const amount = planData?.price || 0;

  useEffect(() => {
    checkSubscription(user).then(setSub).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!amount) { setQrDataUrl(null); return; }
    const payload = generatePromptPayQRPayload(amount);
    QRCode.toDataURL(payload, { width: 300, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [amount]);

  const handleSelectPlan = useCallback((id: 'solo' | 'team') => {
    setSelectedPlan(id);
    setView('payment');
    setSlipFile(null); setSlipPreview(null); setVerifyResult(null); setSubmitted(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file); setVerifyResult(null); setSubmitted(false);
    const reader = new FileReader();
    reader.onload = () => setSlipPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleVerify = useCallback(async () => {
    if (!slipFile || !amount) return;
    setVerifying(true);
    try { setVerifyResult(await verifySlip(slipFile, amount)); }
    catch { /* ignore */ }
    finally { setVerifying(false); }
  }, [slipFile, amount]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>;
  }

  const currentPlan = sub?.plan ? PLANS.find((p) => p.id === sub.plan) : null;
  const isActive = sub?.status === 'active';

  // ── Payment View ────────────────────────────────
  if (view === 'payment' && planData && !submitted) {
    return (
      <div className="max-w-sm mx-auto px-4 py-6">
        {/* Back */}
        <button onClick={() => setView('plans')} className="text-xs text-blue-600 font-medium mb-4">
          ← เปลี่ยนแผน
        </button>

        {/* Card */}
        <div className="rounded-3xl overflow-hidden shadow-2xl">
          {/* Dark hero */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pt-8 pb-6 text-center relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />

            <p className="text-slate-500 text-[10px] tracking-[0.2em] uppercase mb-5">ชำระเงิน</p>

            {/* QR */}
            <div className="inline-block bg-white rounded-2xl p-2.5 shadow-2xl ring-1 ring-white/20 mb-5">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="PromptPay QR" className="w-48 h-48 rounded-lg" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
              )}
            </div>

            {/* Amount */}
            <div className="mb-4">
              <span className="text-4xl font-extrabold text-white tracking-tight">฿{amount}</span>
              <span className="text-slate-500 text-sm ml-1">/เดือน</span>
            </div>

            {/* Bank pill */}
            <div className="inline-flex items-center gap-2.5 bg-white/[0.07] backdrop-blur-sm rounded-full px-4 py-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                <span className="text-white text-[10px] font-extrabold">K+</span>
              </div>
              <div className="text-left">
                <p className="text-white text-xs font-medium leading-tight">{COMPANY_BANK_ACCOUNT.accountName}</p>
                <p className="text-slate-400 text-[10px] font-mono">{COMPANY_BANK_ACCOUNT.accountNumber}</p>
              </div>
            </div>

            <p className="text-slate-600 text-[10px] mt-4">สแกนจากทุกธนาคาร · PromptPay</p>
          </div>

          {/* Slip section */}
          <div className="bg-white px-6 py-5">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

            {!slipPreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
              >
                <Upload className="w-4 h-4" />
                โอนแล้ว — อัพโหลดสลิป
              </button>
            ) : (
              <div className="space-y-3">
                {/* Preview */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-50">
                  <img src={slipPreview} alt="สลิป" className="w-full max-h-52 object-contain" />
                  <button
                    onClick={() => { setSlipFile(null); setSlipPreview(null); setVerifyResult(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur rounded-full text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Verify */}
                {!verifyResult && (
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="w-full py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {verifying ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสลิป'}
                  </button>
                )}

                {/* Results */}
                {verifyResult && (
                  <div className="space-y-2.5">
                    <div className="rounded-2xl bg-slate-50 p-3.5 space-y-2">
                      {verifyResult.checks.map((c) => (
                        <div key={c.name} className="flex items-center gap-2">
                          {c.passed
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          }
                          <span className="text-xs text-slate-600 flex-1">{c.label}</span>
                          <span className={`text-[10px] font-medium ${c.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {c.passed ? 'ผ่าน' : 'ตรวจสอบ'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {verifyResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{e}</p>
                    ))}

                    <button
                      onClick={async () => {
                        if (!slipFile || !selectedPlan) return;
                        setVerifying(true);
                        try {
                          const result = await submitPaymentWithSlip(user, selectedPlan, slipFile);
                          setSubmitResult(result);
                          setSubmitted(true);
                        } catch (err) {
                          console.error('[Subscription] Submit failed:', err);
                        } finally {
                          setVerifying(false);
                        }
                      }}
                      disabled={verifying}
                      className={`w-full py-3 rounded-2xl text-sm font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg ${
                        verifyResult.valid
                          ? 'bg-emerald-600 text-white shadow-emerald-600/25 hover:bg-emerald-700'
                          : 'bg-amber-500 text-white shadow-amber-500/25 hover:bg-amber-600'
                      }`}
                    >
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {verifying ? 'กำลังส่ง...' : verifyResult.valid ? 'ยืนยัน — ส่งสลิปแล้ว' : 'ส่งสลิปให้แอดมินตรวจ'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-slate-300 text-center mt-4">ตรวจสอบอัตโนมัติ · ยืนยันภายใน 1 นาที</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success View ────────────────────────────────
  if (submitted) {
    const isAutoApproved = submitResult?.autoApproved === true;
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isAutoApproved ? 'bg-emerald-100' : 'bg-amber-100'
        }`}>
          {isAutoApproved
            ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            : <Sparkles className="w-8 h-8 text-amber-600" />
          }
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {isAutoApproved ? 'เปิดใช้งานแล้ว!' : 'ส่งสลิปแล้ว'}
        </h2>
        <p className="text-sm text-slate-500 mb-2">
          {isAutoApproved
            ? 'ระบบตรวจสอบสลิปผ่าน เปิดใช้งานทันที'
            : 'แอดมินจะตรวจสอบให้เร็วที่สุด'}
        </p>
        {submitResult?.reason && (
          <p className="text-xs text-slate-400 mb-6">{submitResult.reason}</p>
        )}
        <button
          onClick={() => {
            setView('plans');
            setSubmitted(false);
            setSubmitResult(null);
            if (isAutoApproved) {
              // Refresh subscription status
              checkSubscription(user).then(setSub).catch(() => {});
            }
          }}
          className={`text-sm font-medium ${isAutoApproved ? 'text-emerald-600' : 'text-blue-600'}`}
        >
          {isAutoApproved ? 'เริ่มใช้งาน' : 'กลับหน้าแผนสมาชิก'}
        </button>
      </div>
    );
  }

  // ── Plans View ──────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Current status */}
      {isActive && currentPlan && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">แผน {currentPlan.name} — ใช้งานอยู่</p>
            <p className="text-[10px] text-emerald-600">หมดอายุ {formatDate(sub?.endDate ?? null)}</p>
          </div>
        </div>
      )}

      {/* Plan cards */}
      {PLANS.map((plan) => {
        const isCurrent = isActive && sub?.plan === plan.id;
        const isTeam = plan.id === 'team';

        return (
          <div
            key={plan.id}
            className={`rounded-2xl overflow-hidden transition-all ${
              isTeam ? 'ring-2 ring-blue-500 shadow-xl shadow-blue-500/10' : 'border border-slate-200'
            }`}
          >
            {/* Popular badge */}
            {isTeam && (
              <div className="bg-blue-600 text-white text-center py-1.5 text-[10px] font-semibold tracking-wider uppercase">
                แนะนำ
              </div>
            )}

            <div className="bg-white p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-xs text-slate-500">{plan.description}</p>
                </div>
                {isCurrent && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                    ใช้อยู่
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1.5 mb-4">
                <span className="text-3xl font-extrabold text-slate-900">฿{plan.price}</span>
                <span className="text-sm text-slate-400 line-through">฿{plan.originalPrice}</span>
                <span className="text-sm text-slate-400">/เดือน</span>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-semibold">
                  -{Math.round((1 - plan.price / plan.originalPrice) * 100)}%
                </span>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isTeam ? 'bg-blue-100' : 'bg-slate-100'}`}>
                      <Check className={`w-2.5 h-2.5 ${isTeam ? 'text-blue-600' : 'text-slate-500'}`} />
                    </div>
                    <span className="text-sm text-slate-600">{f}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isTeam ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <Check className={`w-2.5 h-2.5 ${isTeam ? 'text-blue-600' : 'text-slate-500'}`} />
                  </div>
                  <span className="text-sm text-slate-600">สูงสุด {plan.maxUsers} ผู้ใช้</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isCurrent}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : isTeam
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isCurrent ? 'แผนปัจจุบัน' : 'เลือกแผนนี้'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
