'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, Loader2, AlertTriangle, CheckCircle2, XCircle, Percent, FileText, Send, Download } from 'lucide-react';
import { taxRepo, VatSummary, WhtSummary, TaxStatusReport, AnnualTaxSummary } from '@/lib/repos/tax.repo';

const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function getCurrentMonthKey() {
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${thaiYear}_${month}`;
}

function monthKeyToLabel(key: string) {
    const [yearStr, monthStr] = key.split('_');
    const monthIdx = Math.max(1, Math.min(12, Number(monthStr))) - 1;
    return `${thaiMonths[monthIdx]} ${yearStr}`;
}

function formatMoney(value: number) {
    const v = Number.isFinite(value) ? value : 0;
    return `${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`;
}

function buildMonthOptions() {
    const now = new Date();
    const options: { key: string; label: string }[] = [];
    for (let i = 0; i < 12; i += 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const thaiYear = d.getFullYear() + 543;
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${thaiYear}_${month}`;
        options.push({ key, label: monthKeyToLabel(key) });
    }
    return options;
}

export default function TaxPage() {
    const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
    const [year, setYear] = useState(new Date().getFullYear() + 543);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [vatSummary, setVatSummary] = useState<VatSummary | null>(null);
    const [whtSummary, setWhtSummary] = useState<WhtSummary | null>(null);
    const [statusReport, setStatusReport] = useState<TaxStatusReport | null>(null);
    const [annualReport, setAnnualReport] = useState<AnnualTaxSummary | null>(null);
    const [savingType, setSavingType] = useState<'VAT' | 'WHT' | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [summaryPdfUrl, setSummaryPdfUrl] = useState<string | null>(null);
    const [summaryPdfLoading, setSummaryPdfLoading] = useState(false);
    const [summaryPdfSending, setSummaryPdfSending] = useState(false);
    const [summaryPdfMonthKey, setSummaryPdfMonthKey] = useState(getCurrentMonthKey());
    const [whtSupplierName, setWhtSupplierName] = useState('');
    const [whtPdfUrl, setWhtPdfUrl] = useState<string | null>(null);
    const [whtPdfLoading, setWhtPdfLoading] = useState(false);
    const [whtPdfSending, setWhtPdfSending] = useState(false);

    const monthOptions = useMemo(buildMonthOptions, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [vatRes, whtRes, statusRes] = await Promise.all([
                    taxRepo.getVatSummary({ monthKey }),
                    taxRepo.getWhtSummary({ monthKey }),
                    taxRepo.getTaxStatus({ monthKey }),
                ]);
                setVatSummary(vatRes.summary);
                setWhtSummary(whtRes.summary);
                setStatusReport(statusRes);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [monthKey]);

    useEffect(() => {
        setSummaryPdfMonthKey(monthKey);
    }, [monthKey]);

    useEffect(() => {
        const loadAnnual = async () => {
            try {
                const res = await taxRepo.getAnnualTax({ year });
                setAnnualReport(res.report);
            } catch (err) {
                // keep silent for annual
                console.error('Annual tax report error:', err);
            }
        };
        loadAnnual();
    }, [year]);

    const handleToggleFiled = async (type: 'VAT' | 'WHT') => {
        if (!statusReport) return;
        const target = type === 'VAT' ? statusReport.vat : statusReport.wht;
        const nextStatus = target.status === 'FILED' ? 'PENDING' : 'FILED';
        setSavingType(type);
        try {
            await taxRepo.setFilingStatus({
                type,
                monthKey: statusReport.monthKey,
                status: nextStatus,
            });
            const refreshed = await taxRepo.getTaxStatus({ monthKey: statusReport.monthKey });
            setStatusReport(refreshed);
        } catch (err) {
            console.error('Failed to update filing status', err);
            setError(err instanceof Error ? err.message : 'อัปเดตสถานะไม่สำเร็จ');
        } finally {
            setSavingType(null);
        }
    };

    const handleSummaryPdf = async (sendToLine: boolean) => {
        setActionMessage(null);
        setError(null);
        if (sendToLine) {
            setSummaryPdfSending(true);
        } else {
            setSummaryPdfLoading(true);
        }
        try {
            const res = await taxRepo.createTaxSummaryPdf({ monthKey: summaryPdfMonthKey, sendToLine });
            setSummaryPdfUrl(res.url);
            if (sendToLine) {
                if (res.lineSent) {
                    setActionMessage(`ส่ง PDF ภาษี ${monthKeyToLabel(summaryPdfMonthKey)} เข้า LINE แล้ว ✅`);
                } else if (res.lineReason === 'LINE_PUSH_FAILED') {
                    setActionMessage('ส่งเข้า LINE ไม่สำเร็จ (ระบบตอบกลับผิดพลาด)');
                } else {
                    setActionMessage('ยังไม่พบ LINE ที่เชื่อมต่อ');
                }
            } else {
                setActionMessage(`สร้าง PDF ภาษี ${monthKeyToLabel(summaryPdfMonthKey)} แล้ว ✅`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'สร้าง PDF สรุปภาษีไม่สำเร็จ');
        } finally {
            setSummaryPdfLoading(false);
            setSummaryPdfSending(false);
        }
    };

    const handleWhtPdf = async (sendToLine: boolean) => {
        setActionMessage(null);
        setError(null);
        if (!whtSupplierName.trim()) {
            setError('กรุณาระบุชื่อผู้รับเงินสำหรับ 50 ทวิ');
            return;
        }
        if (sendToLine) {
            setWhtPdfSending(true);
        } else {
            setWhtPdfLoading(true);
        }
        try {
            const res = await taxRepo.createWhtCertificatePdf({
                monthKey,
                supplierName: whtSupplierName.trim(),
                sendToLine,
            });
            setWhtPdfUrl(res.url);
            if (sendToLine) {
                if (res.lineSent) {
                    setActionMessage('ส่ง 50 ทวิ เข้า LINE แล้ว ✅');
                } else if (res.lineReason === 'LINE_PUSH_FAILED') {
                    setActionMessage('ส่งเข้า LINE ไม่สำเร็จ (ระบบตอบกลับผิดพลาด)');
                } else {
                    setActionMessage('ยังไม่พบ LINE ที่เชื่อมต่อ');
                }
            } else {
                setActionMessage('สร้าง PDF 50 ทวิแล้ว ✅');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'สร้าง PDF 50 ทวิไม่สำเร็จ');
        } finally {
            setWhtPdfLoading(false);
            setWhtPdfSending(false);
        }
    };

    const whtSuppliers = useMemo(() => {
        const map = new Map<string, { name: string; taxId?: string | null; totalWht: number }>();
        if (!whtSummary?.rateGroups) return [];
        whtSummary.rateGroups.forEach((group) => {
            group.suppliers.forEach((supplier) => {
                const key = `${supplier.supplierName}::${supplier.supplierTaxId || ''}`;
                const existing = map.get(key);
                const nextTotal = (existing?.totalWht || 0) + supplier.whtAmount;
                map.set(key, {
                    name: supplier.supplierName,
                    taxId: supplier.supplierTaxId || null,
                    totalWht: nextTotal,
                });
            });
        });
        return Array.from(map.values()).sort((a, b) => b.totalWht - a.totalWht);
    }, [whtSummary]);

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-12">
            <div className="rounded-3xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-500 p-8 text-white shadow-xl shadow-cyan-500/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                            <Percent className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">ระบบภาษี</h1>
                            <p className="text-sky-100">สรุปภาษีขาย/ซื้อ และหัก ณ ที่จ่าย แบบเรียลไทม์</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/20 px-4 py-3 backdrop-blur-sm">
                        <span className="text-sm">งวด:</span>
                        <select
                            value={monthKey}
                            onChange={(e) => setMonthKey(e.target.value)}
                            className="rounded-lg border border-white/40 bg-white/10 px-3 py-1 text-sm text-white focus:outline-none"
                        >
                            {monthOptions.map((opt) => (
                                <option key={opt.key} value={opt.key} className="text-slate-900">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {loading && (
                            <span className="flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                กำลังโหลด
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-600 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-400">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        {error}
                    </div>
                </div>
            )}

            {actionMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                    {actionMessage}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Calculator className="h-5 w-5 text-emerald-500" />
                        <h2 className="text-lg font-semibold">สรุปภาษีมูลค่าเพิ่ม (VAT)</h2>
                    </div>
                    <div className="mt-4 grid gap-4">
                        <div className="rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950">
                            <div className="text-xs text-emerald-600 dark:text-emerald-400">ภาษีขาย (Output VAT)</div>
                            <div className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">
                                {formatMoney(vatSummary?.output.vat ?? 0)}
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                ฐานก่อน VAT {formatMoney(vatSummary?.output.base ?? 0)} • {vatSummary?.output.docCount ?? 0} ฉบับ
                            </div>
                        </div>
                        <div className="rounded-xl bg-sky-50 px-4 py-3 dark:bg-sky-950">
                            <div className="text-xs text-sky-600 dark:text-sky-400">ภาษีซื้อ (Input VAT)</div>
                            <div className="mt-1 text-xl font-bold text-sky-700 dark:text-sky-300">
                                {formatMoney(vatSummary?.input.vat ?? 0)}
                            </div>
                            <div className="text-xs text-sky-600 dark:text-sky-400">
                                ฐานก่อน VAT {formatMoney(vatSummary?.input.base ?? 0)} • {vatSummary?.input.expenseCount ?? 0} รายการ
                            </div>
                        </div>
                        <div className="rounded-xl bg-indigo-50 px-4 py-3 dark:bg-indigo-950">
                            <div className="text-xs text-indigo-600 dark:text-indigo-400">VAT ต้องจ่าย (Output - Input)</div>
                            <div className="mt-1 text-xl font-bold text-indigo-700 dark:text-indigo-300">
                                {formatMoney(vatSummary?.payable ?? 0)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Calculator className="h-5 w-5 text-rose-500" />
                        <h2 className="text-lg font-semibold">สรุปหัก ณ ที่จ่าย (WHT)</h2>
                    </div>
                    <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 dark:bg-rose-950">
                        <div className="text-xs text-rose-600 dark:text-rose-400">ยอดหัก ณ ที่จ่ายรวม</div>
                        <div className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300">
                            {formatMoney(whtSummary?.totalWht ?? 0)}
                        </div>
                        <div className="text-xs text-rose-600 dark:text-rose-400">ฐานหักรวม {formatMoney(whtSummary?.totalBase ?? 0)}</div>
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                        {(whtSummary?.rateGroups ?? []).length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                ยังไม่มีรายการหัก ณ ที่จ่ายในงวดนี้
                            </div>
                        )}
                        {(whtSummary?.rateGroups ?? []).map((group) => (
                            <div key={group.ratePercent} className="rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-700">
                                <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    <span>อัตรา {group.ratePercent}%</span>
                                    <span>{formatMoney(group.whtAmount)}</span>
                                </div>
                                <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                    {group.suppliers.slice(0, 3).map((supplier) => (
                                        <div key={`${supplier.supplierName}-${supplier.ratePercent}`}>
                                            • {supplier.supplierName} ({formatMoney(supplier.whtAmount)})
                                        </div>
                                    ))}
                                    {group.suppliers.length > 3 && (
                                        <div>• และอีก {group.suppliers.length - 3} ราย</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Calculator className="h-5 w-5 text-amber-500" />
                        <h2 className="text-lg font-semibold">ภาษีค้าง / สถานะการยื่น</h2>
                    </div>
                    <div className="mt-4 space-y-3">
                        {statusReport && (
                            <>
                                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-700">
                                    <div>
                                        <div className="text-sm font-semibold">VAT {statusReport.month}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">ยอดคาดการณ์ {formatMoney(vatSummary?.payable ?? 0)}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {statusReport.vat.status === 'FILED' ? (
                                            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                                <CheckCircle2 className="h-4 w-4" /> ยื่นแล้ว
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900 dark:text-rose-300">
                                                <XCircle className="h-4 w-4" /> ยังไม่ยื่น
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleToggleFiled('VAT')}
                                            disabled={savingType === 'VAT'}
                                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                                        >
                                            {savingType === 'VAT' ? 'กำลังอัปเดต...' : 'สลับสถานะ'}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-700">
                                    <div>
                                        <div className="text-sm font-semibold">WHT {statusReport.month}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">ยอดหัก {formatMoney(whtSummary?.totalWht ?? 0)}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {statusReport.wht.status === 'FILED' ? (
                                            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                                <CheckCircle2 className="h-4 w-4" /> ยื่นแล้ว
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900 dark:text-rose-300">
                                                <XCircle className="h-4 w-4" /> ยังไม่ยื่น
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleToggleFiled('WHT')}
                                            disabled={savingType === 'WHT'}
                                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                                        >
                                            {savingType === 'WHT' ? 'กำลังอัปเดต...' : 'สลับสถานะ'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                        {!statusReport && (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                ยังไม่มีสถานะยื่นภาษี
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                            <Calculator className="h-5 w-5 text-purple-500" />
                            <h2 className="text-lg font-semibold">สรุปภาษีทั้งปี</h2>
                        </div>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                            {[year, year - 1, year - 2].map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        {annualReport?.months.slice(0, 6).map((row) => (
                            <div key={row.monthKey} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700">
                                <span>{row.month}</span>
                                <span>{formatMoney(row.vatPayable)} / {formatMoney(row.whtDeducted)}</span>
                            </div>
                        ))}
                        {annualReport && (
                            <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                รวม VAT ทั้งปี: {formatMoney(annualReport.totals.vatPayable)} • รวม WHT ทั้งปี: {formatMoney(annualReport.totals.whtDeducted)}
                            </div>
                        )}
                        {!annualReport && (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                ยังไม่มีสรุปภาษีทั้งปี
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <FileText className="h-5 w-5 text-emerald-500" />
                        <h2 className="text-lg font-semibold">PDF สรุปภาษีประจำเดือน</h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        สร้าง PDF สำหรับยื่น ภ.พ.30 และสรุปภาพรวมภาษีเดือนนี้
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span>งวดสำหรับ PDF:</span>
                        <select
                            value={summaryPdfMonthKey}
                            onChange={(e) => setSummaryPdfMonthKey(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            {monthOptions.map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            onClick={() => handleSummaryPdf(false)}
                            disabled={summaryPdfLoading || summaryPdfSending}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                        >
                            {summaryPdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            ดาวน์โหลด PDF
                        </button>
                        <button
                            onClick={() => handleSummaryPdf(true)}
                            disabled={summaryPdfLoading || summaryPdfSending}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {summaryPdfSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            ส่งเข้า LINE
                        </button>
                    </div>
                    {summaryPdfUrl && (
                        <a
                            href={summaryPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 block text-sm text-emerald-600 hover:underline"
                        >
                            ดูไฟล์ล่าสุด
                        </a>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <FileText className="h-5 w-5 text-rose-500" />
                        <h2 className="text-lg font-semibold">ออกหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ)</h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        ระบุชื่อผู้รับเงิน แล้วระบบจะสร้างเอกสารให้พร้อมส่งต่อ
                    </p>
                    <div className="mt-4 space-y-3">
                        <input
                            list="wht-supplier-options"
                            value={whtSupplierName}
                            onChange={(e) => setWhtSupplierName(e.target.value)}
                            placeholder="พิมพ์เพื่อค้นหา เช่น บจก.เอ"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                        <datalist id="wht-supplier-options">
                            {whtSuppliers.map((supplier) => (
                                <option
                                    key={`${supplier.name}-${supplier.taxId || ''}`}
                                    value={supplier.name}
                                    label={supplier.taxId ? `${supplier.name} • ${supplier.taxId}` : supplier.name}
                                />
                            ))}
                        </datalist>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            เลือกจากผู้รับเงินที่มีหัก ณ ที่จ่ายในงวดนี้:
                        </div>
                        {whtSuppliers.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                                ยังไม่มีรายการหัก ณ ที่จ่ายในงวดนี้
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {whtSuppliers.map((supplier) => (
                                    <button
                                        key={`${supplier.name}-${supplier.taxId || ''}`}
                                        type="button"
                                        onClick={() => setWhtSupplierName(supplier.name)}
                                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                                    >
                                        {supplier.name}
                                        {supplier.taxId ? ` • ${supplier.taxId}` : ''}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            onClick={() => handleWhtPdf(false)}
                            disabled={whtPdfLoading || whtPdfSending}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                        >
                            {whtPdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            ดาวน์โหลด PDF
                        </button>
                        <button
                            onClick={() => handleWhtPdf(true)}
                            disabled={whtPdfLoading || whtPdfSending}
                            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                            {whtPdfSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            ส่งเข้า LINE
                        </button>
                    </div>
                    {whtPdfUrl && (
                        <a
                            href={whtPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 block text-sm text-rose-600 hover:underline"
                        >
                            ดูไฟล์ล่าสุด
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
