'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Info, Sparkles, TrendingUp, TrendingDown, Receipt, FileText, Clock, AlertTriangle, Crown, Star, Wallet } from 'lucide-react';
import { reportsRepo } from '@/lib/repos/reports.repo';

type FilterType = 'MONTH' | '3M' | '6M' | '9M' | 'YEAR' | 'CUSTOM';

const getRangeFromFilter = (type: FilterType, monthKey: string, customRange: { start: string; end: string }) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (type === 'MONTH') {
        const [y, m] = monthKey.split('-');
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        return { startDate: `${y}-${m}-01`, endDate: `${y}-${m}-${lastDay}` };
    }
    if (type === '3M') {
        // Last 3 months inclusive
        const past = new Date();
        past.setMonth(past.getMonth() - 2); // Current + 2 prev = 3 months
        past.setDate(1);
        return { startDate: past.toISOString().split('T')[0], endDate: today };
    }
    if (type === '6M') {
        const past = new Date();
        past.setMonth(past.getMonth() - 5);
        past.setDate(1);
        return { startDate: past.toISOString().split('T')[0], endDate: today };
    }
    if (type === '9M') {
        const past = new Date();
        past.setMonth(past.getMonth() - 8);
        past.setDate(1);
        return { startDate: past.toISOString().split('T')[0], endDate: today };
    }
    if (type === 'YEAR') {
        // This Year (Jan 1 - Now)
        return { startDate: `${now.getFullYear()}-01-01`, endDate: today };
    }
    if (type === 'CUSTOM') {
        return { startDate: customRange.start, endDate: customRange.end };
    }
    return { startDate: '', endDate: '' };
};

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<Awaited<ReturnType<typeof reportsRepo.getSummary>> | null>(null);
    const [financial, setFinancial] = useState<Awaited<ReturnType<typeof reportsRepo.getFinancial>> | null>(null);

    // Filter State
    const [filterType, setFilterType] = useState<FilterType>('MONTH');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [customRange, setCustomRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                // Calculate dates
                const range = getRangeFromFilter(filterType, selectedMonth, customRange);

                // Fetch data
                // For summary, we might still respect the 'monthKey' if type is MONTH,
                // but for Financial, we send startDate/endDate.
                // Note: Summary stats (sales, overdue) are currently hardcoded to Month/Global in backend.
                // We will reuse range for Financial Report mostly.

                // HACK: for Summary (Sales/Customers), we only really support "Month" or "All Time" strictly in backend unless refactored.
                // But user mainly wants Financial Report (Revenue/Expense) to filter by range.

                // If filter is MONTH, pass monthKey to summary. Else pass nothing (defaults to current OR we can't filter summary yet).
                // Actually ReportService's MonthlySales uses monthKey.
                // Let's pass monthKey only if type is MONTH.

                const toThaiMonthKey = (isoMonth: string) => {
                    const [year, month] = isoMonth.split('-');
                    const beYear = parseInt(year) + 543;
                    return `${beYear}_${month}`;
                };

                const monthKeyParam = filterType === 'MONTH' ? toThaiMonthKey(selectedMonth) : undefined;

                const [summaryRes, financialRes] = await Promise.all([
                    reportsRepo.getSummary(undefined, monthKeyParam),
                    reportsRepo.getFinancial(undefined, {
                        ...range,
                        monthKey: filterType === 'MONTH' ? undefined : undefined // Prefer ranges
                    })
                ]);
                setData(summaryRes);
                setFinancial(financialRes);
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [filterType, selectedMonth, customRange]);

    const monthly = data?.monthly;
    const overdue = data?.overdue ?? [];
    const topCustomers = data?.topCustomers ?? [];
    const popularServices = data?.popularServices ?? [];
    const hasAnyData = Boolean(monthly || overdue.length || topCustomers.length || popularServices.length);

    // Calculate max values for progress bars
    const maxCustomerSpent = topCustomers.length > 0 ? Math.max(...topCustomers.map(c => c.totalSpent)) : 1;
    const maxServiceRevenue = popularServices.length > 0 ? Math.max(...popularServices.map(s => s.totalRevenue)) : 1;

    return (
        <>
            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes countUp {
                    from { opacity: 0; transform: scale(0.5); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes progressFill {
                    from { width: 0%; }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.5); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .fade-in-up {
                    animation: fadeInUp 0.5s ease-out forwards;
                }
                .fade-in-up-delay-1 { animation-delay: 0.1s; opacity: 0; }
                .fade-in-up-delay-2 { animation-delay: 0.2s; opacity: 0; }
                .fade-in-up-delay-3 { animation-delay: 0.3s; opacity: 0; }
                .fade-in-up-delay-4 { animation-delay: 0.4s; opacity: 0; }
                .count-up {
                    animation: countUp 0.6s ease-out forwards;
                }
                .progress-animate {
                    animation: progressFill 1s ease-out forwards;
                }
                .kpi-card {
                    transition: all 0.3s ease;
                }
                .kpi-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                }
                .shimmer-bg {
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                    background-size: 200% 100%;
                    animation: shimmer 2s infinite;
                }
            `}</style>

            <div className="mx-auto max-w-6xl space-y-6 pb-8">
                {/* Header */}
                <div className="fade-in-up rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-8 text-white shadow-xl shadow-emerald-500/20">
                    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-md">
                                    <BarChart3 className="h-8 w-8 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                                    ภาพรวมธุรกิจ
                                </h1>
                            </div>
                            <p className="mt-2 text-emerald-100 opacity-90">
                                {filterType === 'MONTH' && `ข้อมูลประจำเดือน ${selectedMonth} (ปี-เดือน)`}
                                {filterType === '3M' && 'ข้อมูล 3 เดือนย้อนหลัง'}
                                {filterType === '6M' && 'ข้อมูล 6 เดือนย้อนหลัง'}
                                {filterType === '9M' && 'ข้อมูล 9 เดือนย้อนหลัง'}
                                {filterType === 'YEAR' && `ข้อมูลปี ${new Date().getFullYear()}`}
                                {filterType === 'CUSTOM' && `ข้อมูล ${customRange.start} ถึง ${customRange.end}`}
                            </p>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-col gap-2 rounded-2xl bg-white/10 p-2 backdrop-blur-sm sm:flex-row">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as FilterType)}
                                className="rounded-xl border-none bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                <option value="MONTH" className="text-slate-900">🗓️ ประจำเดือน</option>
                                <option value="3M" className="text-slate-900">📅 3 เดือนย้อนหลัง</option>
                                <option value="6M" className="text-slate-900">📅 6 เดือนย้อนหลัง</option>
                                <option value="9M" className="text-slate-900">📅 9 เดือนย้อนหลัง</option>
                                <option value="YEAR" className="text-slate-900">📅 ปีนี้ (Year to Date)</option>
                                <option value="CUSTOM" className="text-slate-900">🔧 กำหนดเอง</option>
                            </select>

                            {filterType === 'MONTH' && (
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="rounded-xl border-none bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                            )}

                            {filterType === 'CUSTOM' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={customRange.start}
                                        onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="rounded-xl border-none bg-white/20 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                                    />
                                    <span className="text-white/50">-</span>
                                    <input
                                        type="date"
                                        value={customRange.end}
                                        onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="rounded-xl border-none bg-white/20 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="fade-in-up rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-6 py-4 text-rose-600 dark:text-rose-400">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            {error}
                        </div>
                    </div>
                )}

                {!loading && !hasAnyData && !error && (
                    <div className="fade-in-up rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-6 py-4 text-slate-600 dark:text-slate-300">
                        ยังไม่มีข้อมูลเอกสาร เริ่มสร้างเอกสารเพื่อดูรายงาน
                    </div>
                )}

                {/* Financial KPI */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {/* Revenue */}
                    <div className="fade-in-up kpi-card rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-lg border border-emerald-100 dark:border-emerald-900">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/50 p-3">
                                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">รายรับจริง</span>
                        </div>
                        <p className="mt-4 text-3xl font-bold text-emerald-600">
                            {financial ? financial.revenue.toLocaleString('th-TH') : '0'} <span className="text-lg">฿</span>
                        </p>
                    </div>

                    {/* Expenses */}
                    <div className="fade-in-up fade-in-up-delay-1 kpi-card rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-lg border border-rose-100 dark:border-rose-900">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-rose-100 dark:bg-rose-900/50 p-3">
                                <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                            </div>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">รายจ่าย</span>
                        </div>
                        <p className="mt-4 text-3xl font-bold text-rose-600">
                            {financial ? financial.expenses.toLocaleString('th-TH') : '0'} <span className="text-lg">฿</span>
                        </p>
                    </div>

                    {/* Net Profit */}
                    <div className="fade-in-up fade-in-up-delay-2 kpi-card rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-white shadow-lg shadow-indigo-500/30">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-white/20 p-3">
                                <Wallet className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-sm font-medium text-indigo-100">กำไรสุทธิ</span>
                        </div>
                        <p className="mt-4 count-up text-4xl font-bold">
                            {financial ? financial.netProfit.toLocaleString('th-TH') : '0'} <span className="text-lg">฿</span>
                        </p>
                    </div>
                </div>

                {/* Doc Stats Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Net Received */}
                    <div className="fade-in-up fade-in-up-delay-1 kpi-card rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-500/30">
                        <div className="flex items-center justify-between">
                            <div className="rounded-xl bg-white/20 p-3">
                                <Wallet className="h-6 w-6" />
                            </div>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                                {monthly?.receiptCount ?? 0} ใบ
                            </span>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-emerald-100">ยอดรับจริง (ใบเสร็จ)</p>
                            <p className="count-up mt-1 text-3xl font-bold">
                                {monthly ? monthly.netReceived.toLocaleString('th-TH') : '0'} <span className="text-lg">฿</span>
                            </p>
                        </div>
                    </div>

                    {/* Issued Doc Total */}
                    <div className="fade-in-up fade-in-up-delay-2 kpi-card rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg shadow-blue-500/30">
                        <div className="flex items-center justify-between">
                            <div className="rounded-xl bg-white/20 p-3">
                                <FileText className="h-6 w-6" />
                            </div>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                                {monthly?.issuedDocCount ?? 0} ฉบับ
                            </span>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-blue-100">มูลค่าเอกสารออก</p>
                            <p className="count-up mt-1 text-3xl font-bold">
                                {monthly ? monthly.issuedDocTotal.toLocaleString('th-TH') : '0'} <span className="text-lg">฿</span>
                            </p>
                        </div>
                    </div>

                    {/* Quotation Count */}
                    <div className="fade-in-up fade-in-up-delay-3 kpi-card rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg shadow-violet-500/30">
                        <div className="flex items-center justify-between">
                            <div className="rounded-xl bg-white/20 p-3">
                                <Receipt className="h-6 w-6" />
                            </div>
                            <TrendingUp className="h-5 w-5 text-violet-200" />
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-violet-100">ใบเสนอราคา</p>
                            <p className="count-up mt-1 text-3xl font-bold">
                                {monthly?.issuedQuoCount ?? 0}
                            </p>
                        </div>
                    </div>

                    {/* Bill Count */}
                    <div className="fade-in-up fade-in-up-delay-4 kpi-card rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-lg shadow-amber-500/30">
                        <div className="flex items-center justify-between">
                            <div className="rounded-xl bg-white/20 p-3">
                                <FileText className="h-6 w-6" />
                            </div>
                            <TrendingUp className="h-5 w-5 text-amber-200" />
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-amber-100">ใบวางบิล</p>
                            <p className="count-up mt-1 text-3xl font-bold">
                                {monthly?.issuedBillCount ?? 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Top Customers */}
                    <div className="fade-in-up fade-in-up-delay-2 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-lg">
                        <div className="flex items-center gap-2">
                            <Crown className="h-5 w-5 text-amber-500" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">ลูกค้ายอดสูง</h2>
                        </div>
                        <div className="mt-4 space-y-4">
                            {topCustomers.length === 0 ? (
                                <p className="text-sm text-slate-400 dark:text-slate-500">ยังไม่มีข้อมูลลูกค้า</p>
                            ) : (
                                topCustomers.slice(0, 5).map((customer, index) => {
                                    const percentage = (customer.totalSpent / maxCustomerSpent) * 100;
                                    return (
                                        <div key={customer.customerName} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                                                        index === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                                                            index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' :
                                                                'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}>
                                                        {index + 1}
                                                    </span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{customer.customerName}</span>
                                                </div>
                                                <span className="text-sm font-semibold text-emerald-600">
                                                    {customer.totalSpent.toLocaleString('th-TH')} ฿
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                                <div
                                                    className="progress-animate h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Popular Services */}
                    <div className="fade-in-up fade-in-up-delay-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-lg">
                        <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">บริการขายดี</h2>
                        </div>
                        <div className="mt-4 space-y-4">
                            {popularServices.length === 0 ? (
                                <p className="text-sm text-slate-400 dark:text-slate-500">ยังไม่มีข้อมูลบริการ</p>
                            ) : (
                                popularServices.slice(0, 5).map((service, index) => {
                                    const percentage = (service.totalRevenue / maxServiceRevenue) * 100;
                                    return (
                                        <div key={service.description} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' :
                                                        index === 1 ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300' :
                                                            index === 2 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                                                                'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}>
                                                        {index + 1}
                                                    </span>
                                                    <span className="line-clamp-1 font-medium text-slate-900 dark:text-slate-100">{service.description}</span>
                                                </div>
                                                <span className="whitespace-nowrap text-sm font-semibold text-indigo-600">
                                                    {service.totalRevenue.toLocaleString('th-TH')} ฿
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                                <div
                                                    className="progress-animate h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Overdue Bills */}
                    <div className="fade-in-up fade-in-up-delay-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-lg">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-rose-500" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">บิลค้างชำระ</h2>
                        </div>
                        <div className="mt-4 space-y-3">
                            {overdue.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-4">
                                        <span className="text-3xl">✅</span>
                                    </div>
                                    <p className="mt-3 font-medium text-emerald-600 dark:text-emerald-400">ยอดเยี่ยม!</p>
                                    <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">ไม่มีบิลค้างชำระ</p>
                                </div>
                            ) : (
                                overdue.slice(0, 5).map((item) => (
                                    <div key={`${item.docNo}-${item.customerName}`} className="flex items-center justify-between rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-slate-100">{item.customerName}</p>
                                            <p className="text-xs text-rose-500 dark:text-rose-400">ค้าง {item.overdueByDays} วัน</p>
                                        </div>
                                        <span className="font-semibold text-rose-600">
                                            {item.amount.toLocaleString('th-TH')} ฿
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="fade-in-up rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/50 dark:to-slate-900 p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-indigo-100 dark:bg-indigo-900/50 p-3">
                                <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-indigo-700 dark:text-indigo-300">รายงานบนเว็บพร้อมใช้งานแล้ว</h3>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">ระบบดึงข้อมูลแบบเรียลไทม์จากเอกสารของธุรกิจคุณ</p>
                            </div>
                        </div>
                    </div>

                    <div className="fade-in-up rounded-2xl border border-emerald-100 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/50 dark:to-slate-900 p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/50 p-3">
                                <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-emerald-700 dark:text-emerald-300">ทางลัดรายงานใน LINE</h3>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <span className="rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm">รายงาน เดือนนี้</span>
                                    <span className="rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm">บิลค้าง</span>
                                    <span className="rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm">ลูกค้ายอดสูง</span>
                                    <span className="rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm">บริการขายดี</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
