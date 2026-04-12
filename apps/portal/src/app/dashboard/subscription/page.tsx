'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    BadgePercent,
    CheckCircle2,
    History,
    Loader2,
    QrCode,
    ShieldCheck,
    Tag,
    Mail,
    HelpCircle,
} from 'lucide-react';
import { subscriptionRepo } from '@/lib/repos/subscription.repo';

const PACKAGE_CATALOG = {
    PRO: {
        key: 'PRO',
        name: 'EzDOC Pro',
        description: 'เริ่มต้นง่ายๆ ราคาเท่ากาแฟแก้วเดียว ☕️ สนับสนุนทีมงานให้มีแรงพัฒนาต่อไป',
        seats: 1,
        features: [
            'ออกใบเสนอราคา ใบวางบิล ใบเสร็จได้ครบ',
            'ส่ง PDF พร้อมโลโก้และลายเซ็น',
            'ออกรายงานและติดตามสถานะเอกสารแบบเรียลไทม์',
        ],
        options: {
            monthly: {
                key: 'monthly',
                label: 'รายเดือน',
                packageType: 99,
                basePrice: 99,
                originalPrice: 149,
                badge: 'ลด 50฿!',
            },
            yearly: {
                key: 'yearly',
                label: 'รายปี',
                packageType: 990,
                basePrice: 891,
                originalPrice: 1188,
                badge: 'ลด 25%',
            },
        },
    },
    TEAM: {
        key: 'TEAM',
        name: 'EzDOC Team',
        description: 'เหมาะสำหรับทีมเล็กที่ต้องใช้หลายคนพร้อมกัน',
        seats: 3,
        features: [
            'รองรับผู้ใช้ 3 คนในบัญชีเดียว',
            'ออกเอกสารได้ครบทุกประเภท + ไม่มีลายน้ำ',
            'รายงานภาพรวมและการติดตามสถานะเอกสารแบบเรียลไทม์',
        ],
        options: {
            monthly: {
                key: 'monthly',
                label: 'รายเดือน',
                packageType: 279,
                basePrice: 279,
                originalPrice: 279,
                badge: null,
            },
            yearly: {
                key: 'yearly',
                label: 'รายปี',
                packageType: 2790,
                basePrice: 2511,
                originalPrice: 3348,
                badge: 'ลด 25%',
            },
        },
    },
} as const;
type PlanKey = keyof typeof PACKAGE_CATALOG;
type BillingKey = keyof typeof PACKAGE_CATALOG[PlanKey]['options'];

const formatCurrency = (value: number) =>
    value.toLocaleString('th-TH', { maximumFractionDigits: 0 });

const formatDate = (value: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export default function SubscriptionPage() {
    const [loading, setLoading] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof subscriptionRepo.getStatus>> | null>(null);
    const [history, setHistory] = useState<Awaited<ReturnType<typeof subscriptionRepo.getHistory>> | null>(null);

    const [selectedPlan, setSelectedPlan] = useState<PlanKey>('PRO');
    const [selectedBilling, setSelectedBilling] = useState<BillingKey>('monthly');
    const activePlan = PACKAGE_CATALOG[selectedPlan];
    const activePackage = activePlan.options[selectedBilling];

    const [promoCode, setPromoCode] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [finalAmount, setFinalAmount] = useState<number>(activePackage.basePrice);

    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setStatusError(null);
            setHistoryError(null);
            try {
                const [statusRes, historyRes] = await Promise.all([
                    subscriptionRepo.getStatus(),
                    subscriptionRepo.getHistory(10),
                ]);
                setSubscription(statusRes);
                setHistory(historyRes);
            } catch (error) {
                setStatusError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
                setHistoryError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        setFinalAmount(activePackage.basePrice);
        setPromoMessage(null);
    }, [activePackage.basePrice, selectedPlan, selectedBilling]);

    const isActive = subscription?.status === 'ACTIVE' && subscription?.plan !== 'FREE';

    const periodLabel = useMemo(() => {
        if (!subscription?.periodStart || !subscription?.periodEnd) return 'รายเดือน';
        return `${formatDate(subscription.periodStart)} - ${formatDate(subscription.periodEnd)}`;
    }, [subscription?.periodStart, subscription?.periodEnd]);

    const applyPromo = async () => {
        const code = promoCode.trim();
        if (!code) {
            setPromoMessage({ type: 'error', text: 'กรุณากรอกโค้ดส่วนลด' });
            return;
        }

        setPromoLoading(true);
        setPromoMessage(null);
        try {
            const res = await subscriptionRepo.previewPromo(code, activePackage.packageType);
            if (!res.valid) {
                setFinalAmount(activePackage.basePrice);
                setPromoMessage({ type: 'error', text: res.reason || 'โค้ดไม่ถูกต้อง' });
                return;
            }

            setFinalAmount(res.finalAmount);
            const durationText = res.durationMonths ? ` • ใช้ได้ ${res.durationMonths} เดือน` : '';
            setPromoMessage({
                type: 'success',
                text: `✅ สำเร็จ ลด ${formatCurrency(res.discountAmount)}฿${durationText}`,
            });
        } catch (error) {
            setFinalAmount(activePackage.basePrice);
            setPromoMessage({ type: 'error', text: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' });
        } finally {
            setPromoLoading(false);
        }
    };

    const createPurchase = async () => {
        setPurchaseLoading(true);
        setPurchaseMessage(null);
        try {
            const res = await subscriptionRepo.createPurchase(activePackage.packageType);
            setPurchaseMessage(res.message || 'ระบบส่ง QR ไปที่ LINE แล้ว');
        } catch (error) {
            setPurchaseMessage(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
        } finally {
            setPurchaseLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                            <BadgePercent className="h-4 w-4" />
                            แพ็กเกจสมาชิก EzDOC
                        </div>
                        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">เลือกแพ็กเกจและรอบชำระเงินได้เลย</h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">รองรับทั้งรายเดือนและรายปี พร้อมส่วนลดตามแคมเปญ</p>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {Object.values(PACKAGE_CATALOG).map((plan) => {
                        const isSelected = plan.key === selectedPlan;
                        return (
                            <button
                                key={plan.key}
                                type="button"
                                onClick={() => setSelectedPlan(plan.key)}
                                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${isSelected
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-emerald-200 dark:hover:border-emerald-600'
                                    }`}
                            >
                                {plan.name}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {Object.values(activePlan.options).map((option) => {
                        const isSelected = option.key === selectedBilling;
                        return (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => setSelectedBilling(option.key)}
                                className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 text-left transition ${isSelected
                                    ? 'border-emerald-300 bg-emerald-50/60 shadow-sm dark:border-emerald-600 dark:bg-emerald-900/30'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-200 dark:hover:border-emerald-600'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{option.label}</div>
                                    {option.badge ? (
                                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 motion-safe:animate-bounce">
                                            {option.badge}
                                        </span>
                                    ) : null}
                                </div>
                                <div className="flex items-end justify-between">
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{activePlan.name}</div>
                                    <div className="text-right">
                                        {option.originalPrice > option.basePrice ? (
                                            <div className="text-xs text-slate-400 dark:text-slate-500 line-through">{formatCurrency(option.originalPrice)}฿</div>
                                        ) : (
                                            <div className="text-xs text-transparent">0฿</div>
                                        )}
                                        <div className="text-2xl font-bold text-emerald-600">{formatCurrency(option.basePrice)}฿</div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/40">
                            <ShieldCheck className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{activePlan.name}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{activePlan.description}</div>
                        </div>
                    </div>

                    <ul className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                        {activePlan.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                {feature}
                            </li>
                        ))}
                    </ul>

                    <div className="mt-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/30 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                            <Tag className="h-4 w-4" />
                            โค้ดส่วนลด
                        </div>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                            <input
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value)}
                                placeholder="กรอกโค้ดส่วนลด"
                                className="w-full flex-1 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                            />
                            <button
                                onClick={applyPromo}
                                disabled={promoLoading}
                                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ใช้โค้ด'}
                            </button>
                        </div>
                        {promoMessage && (
                            <div
                                className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium ${promoMessage.type === 'success'
                                    ? 'border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400'
                                    : 'border border-rose-200 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400'
                                    }`}
                            >
                                {promoMessage.text}
                            </div>
                        )}
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">ราคาหลังส่วนลด</span>
                            <span className="text-lg font-semibold text-emerald-700">{formatCurrency(finalAmount)}฿</span>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                            onClick={createPurchase}
                            disabled={purchaseLoading}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 dark:shadow-emerald-900/40 transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {purchaseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                            ขอ QR ชำระเงินใน LINE
                        </button>
                        <div className="text-xs text-slate-400 dark:text-slate-500">ระบบจะส่ง QR ไปที่ LINE ที่เชื่อมต่อไว้</div>
                    </div>
                    {purchaseMessage && (
                        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                            {purchaseMessage}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">สถานะปัจจุบัน</div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">อัปเดตแบบเรียลไทม์</div>
                            </div>
                            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                        </div>
                        {statusError ? (
                            <div className="mt-3 rounded-xl border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
                                {statusError}
                            </div>
                        ) : (
                            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                <div className="flex items-center justify-between">
                                    <span>สถานะสมาชิก</span>
                                    <span className={`font-semibold ${isActive ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {isActive ? 'ใช้งานอยู่' : 'ยังไม่เป็นสมาชิก'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>แพ็กเกจ</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{subscription?.plan || 'FREE'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>ช่วงเวลา</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{periodLabel}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>สิทธิ์ผู้ใช้</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {subscription?.seatUsed || 1}/{subscription?.seatTotal || 1} คน
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">ช่องทางชำระเงิน</div>
                        <div className="mt-3 grid gap-3">
                            <div className="flex items-center gap-3 rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                                <QrCode className="h-4 w-4" />
                                PromptPay QR (ส่งผ่าน LINE)
                            </div>
                            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                <CheckCircle2 className="h-4 w-4" />
                                กดขอ QR จากหน้าเว็บหรือพิมพ์ซื้อแพ็คใน LINE ได้เลย
                            </div>
                            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                <Mail className="h-4 w-4" />
                                โอนแล้วส่งสลิปใน LINE เพื่อยืนยันการชำระเงิน
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <History className="h-4 w-4" />
                    ประวัติการชำระเงิน
                </div>
                {historyError ? (
                    <div className="mt-3 rounded-xl border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
                        {historyError}
                    </div>
                ) : history?.items?.length ? (
                    <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                        {history.items.map((item) => {
                            const dateLabel = formatDate(item.paidAt || item.createdAt);
                            const periodText =
                                item.periodStart && item.periodEnd
                                    ? `${formatDate(item.periodStart)} - ${formatDate(item.periodEnd)}`
                                    : 'รายเดือน';
                            return (
                                <div key={item.id} className="flex flex-col gap-2 py-3 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <div className="font-semibold text-slate-900 dark:text-slate-100">{dateLabel}</div>
                                        <div className="text-xs text-slate-400 dark:text-slate-500">ช่วงเวลา: {periodText}</div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs sm:text-sm">
                                        <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 text-slate-600 dark:text-slate-300">{item.status}</span>
                                        <span className="font-semibold text-emerald-600">{formatCurrency(item.amount)}฿</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                        ยังไม่มีประวัติการชำระเงิน
                    </div>
                )}
            </div>

            {/* Support / Cancel Section */}
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 text-center">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <HelpCircle className="h-4 w-4" />
                    ต้องการความช่วยเหลือ?
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    หากต้องการยกเลิกแพ็กเกจ หรือเปลี่ยนแปลงข้อมูล
                </p>
                <a
                    href="mailto:admin@ezboq.com"
                    className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:text-emerald-600 hover:ring-emerald-300"
                >
                    <Mail className="h-4 w-4" />
                    ติดต่อแอดมินผ่าน Email
                </a>
            </div>
        </div >
    );
}
