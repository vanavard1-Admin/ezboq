import { useEffect, useState, useRef } from 'react';
import {
  Building2,
  Check,
  ChevronLeft,
  Clock,
  Crown,
  Loader2,
  QrCode,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import type { AuthUser } from '../utils/authSession';
import {
  COMPANY_BANK_ACCOUNT,
  FREE_TIER,
  PLANS,
  checkSubscription,
  generatePromptPayQRPayload,
  getSubscriptionPlanLabel,
  loadPendingSubscriptionCache,
  submitPaymentWithSlip,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '../utils/subscription';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface PricingPageProps {
  user: AuthUser;
  onBack?: () => void;
}

const VALUE_POINTS = [
  {
    icon: TrendingUp,
    title: 'คืนทุนง่าย',
    description: 'ถ้าปิดงานเพิ่มได้เพียง 1 งานต่อเดือน ค่าสมาชิกก็คืนทุนแล้ว',
  },
  {
    icon: ShieldCheck,
    title: 'ดูน่าเชื่อถือขึ้น',
    description: 'ไม่มีลายน้ำ พร้อมโลโก้ ลายเซ็น และเอกสารที่ส่งลูกค้าได้ทันที',
  },
  {
    icon: Building2,
    title: 'ขยายทีมได้',
    description: 'แพ็ก Business เหมาะกับทีมขาย ทีมประสานงาน และเจ้าของกิจการที่ทำงานร่วมกัน',
  },
];

export function PricingPage({ user, onBack }: PricingPageProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingSub, setExistingSub] = useState<SubscriptionStatus | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkSubscription(user)
      .then((sub) => {
        if (sub) setExistingSub(sub);
      })
      .catch(() => {
        const cachedPendingSubscription = loadPendingSubscriptionCache();
        if (cachedPendingSubscription) setExistingSub(cachedPendingSubscription);
      });
  }, [user]);

  useEffect(() => {
    if (!selectedPlan) return;
    const payload = generatePromptPayQRPayload(selectedPlan.price);
    QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setQrDataUrl);
  }, [selectedPlan]);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
    setSubmitted(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('ไฟล์ใหญ่เกิน 5MB กรุณาลดขนาดก่อนอัปโหลด');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = () => setSlipPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan || !slipFile) return;
    setIsSubmitting(true);
    try {
      await submitPaymentWithSlip(user, selectedPlan.id, slipFile);
      setSubmitted(true);
      toast.success('ส่งสลิปเรียบร้อย รอแอดมินตรวจสอบ');
    } catch (err) {
      console.error('Payment submission failed:', err);
      toast.error('ไม่สามารถส่งสลิปได้ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const AppHeader = () => (
    <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">กลับ</span>
        </button>
      )}
      <div className="flex-1 text-center">
        <h1 className="text-sm font-semibold text-slate-900">แพ็กเกจ EzBOQ</h1>
      </div>
      {onBack && <div className="w-14" />}
    </div>
  );

  if (existingSub?.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <Card className="mx-auto w-full max-w-md p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold">กำลังรอตรวจสอบการชำระเงิน</h3>
              <p className="text-sm text-muted-foreground">
                คุณได้สมัครแพ็กเกจ <strong>{getSubscriptionPlanLabel(existingSub.plan)}</strong> แล้ว
                <br />
                ระบบจะเปิดใช้งานภายใน 24 ชั่วโมงหลังตรวจสอบยอดโอน
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="mb-3 gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Pricing tuned for Thai SMEs
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            เริ่มจาก Free แล้วค่อยขยับเป็น Pro หรือ Business เมื่อพร้อมปิดงานจริง
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            EzBOQ วางราคาให้ถูกกว่าระบบบัญชีเต็มรูปแบบ แต่ครอบคลุม workflow สำคัญของธุรกิจรับเหมา ช่าง และทีมขายเอกสาร:
            ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ การเก็บไฟล์ และการทำงานร่วมกันในทีม
          </p>
        </div>

        <div className="mb-8 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Free</p>
            <p className="mt-1 text-sm font-medium text-slate-900">ทดลอง workflow ก่อนเริ่มจ่าย</p>
            <p className="mt-1 text-xs text-slate-500">เหมาะกับการลองระบบและออกใบเสนอราคาเบื้องต้น</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Pro 99 บาท/เดือน</p>
            <p className="mt-1 text-sm font-medium text-slate-900">แพ็กหลักสำหรับเจ้าของกิจการ 1 คน</p>
            <p className="mt-1 text-xs text-slate-600">เน้นความคุ้มราคาและทำเอกสารขายได้ครบ</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Business 279 บาท/เดือน</p>
            <p className="mt-1 text-sm font-medium text-slate-900">สำหรับทีมที่ต้องแชร์งานและควบคุมสิทธิ์</p>
            <p className="mt-1 text-xs text-slate-600">เพิ่มมูลค่าจาก multi-user โดยยังอยู่ในระดับราคาต่ำ</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="border-dashed border-slate-300 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-slate-500" />
                <CardTitle className="text-lg">{FREE_TIER.name}</CardTitle>
              </div>
              <CardDescription className="text-xs">{FREE_TIER.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">฿0</span>
                  <span className="text-sm text-slate-500">/เดือน</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{FREE_TIER.headline}</p>
              </div>

              <ul className="space-y-2">
                {FREE_TIER.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button className="w-full" variant="outline" disabled>
                {FREE_TIER.ctaLabel}
              </Button>
            </CardContent>
          </Card>

          {PLANS.map((plan) => {
            const isBusiness = plan.id === 'team';
            const AccentIcon = isBusiness ? Users : Crown;

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-shadow hover:shadow-lg ${
                  isBusiness ? 'border-blue-500 ring-1 ring-blue-200' : 'border-emerald-300 ring-1 ring-emerald-100'
                }`}
              >
                <div className="absolute right-4 top-4">
                  <Badge className={`gap-1 ${isBusiness ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                    <AccentIcon className="h-3 w-3" />
                    {isBusiness ? 'สำหรับทีม' : 'คุ้มสุด'}
                  </Badge>
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AccentIcon className={`h-5 w-5 ${isBusiness ? 'text-blue-600' : 'text-emerald-600'}`} />
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">฿{plan.price}</span>
                      <span className="text-sm text-slate-500">/เดือน</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{plan.headline}</p>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isBusiness ? 'text-blue-500' : 'text-emerald-500'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className={`rounded-xl px-3 py-2 text-xs ${
                    isBusiness ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {isBusiness
                      ? 'แชร์งานในทีมได้สูงสุด 3 คน โดยราคายังต่ำกว่าระบบบัญชีหลายเจ้า'
                      : 'เหมาะกับเจ้าของกิจการที่ต้องการทำเอกสารขายให้จบตั้งแต่ต้นจนเก็บเงิน'}
                  </div>

                  <Button
                    className="w-full"
                    variant={isBusiness ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {plan.ctaLabel}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {VALUE_POINTS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="bg-white">
                <CardContent className="flex gap-3 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {submitted ? 'บันทึกเรียบร้อย!' : `ชำระเงิน — ${selectedPlan?.name}`}
            </DialogTitle>
            <DialogDescription>
              {submitted
                ? 'ระบบจะเปิดใช้งานภายใน 24 ชั่วโมงหลังตรวจสอบยอดโอน'
                : `สแกน QR PromptPay เพื่อโอนเงิน ฿${selectedPlan?.price}`}
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-center text-sm text-slate-600">
                ส่งสลิปเรียบร้อยแล้ว
                <br />
                แอดมินจะตรวจสอบและเปิดใช้งานภายใน 24 ชั่วโมง
              </p>
              <Button
                onClick={() => {
                  setShowPayment(false);
                  if (onBack) onBack();
                }}
                className="w-full"
              >
                กลับหน้าหลัก
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              {qrDataUrl && (
                <div className="rounded-xl border bg-white p-3">
                  <img src={qrDataUrl} alt="PromptPay QR" className="h-56 w-56 sm:h-64 sm:w-64" />
                </div>
              )}
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-900">฿{selectedPlan?.price}</p>
                <p className="text-xs text-slate-500">
                  {COMPANY_BANK_ACCOUNT.accountName} ({COMPANY_BANK_ACCOUNT.bankName})
                </p>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

              {!slipPreview ? (
                <div className="w-full space-y-2">
                  <div className="w-full rounded-lg bg-amber-50 p-3 text-center text-xs text-amber-700">
                    โอนเงินแล้ว อัพโหลดสลิปเพื่อยืนยันการชำระเงิน
                  </div>
                  <Button className="w-full" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    อัพโหลดสลิปโอนเงิน
                  </Button>
                </div>
              ) : (
                <div className="w-full space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-slate-50 border">
                    <img src={slipPreview} alt="สลิป" className="w-full max-h-48 object-contain" />
                    <button
                      onClick={() => { setSlipFile(null); setSlipPreview(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur rounded-full text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Button className="w-full" onClick={handleConfirmPayment} disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังส่ง...</> : 'ยืนยัน — ส่งสลิปแล้ว'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
