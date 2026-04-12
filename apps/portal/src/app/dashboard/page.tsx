'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { reportsRepo, type ReportsSummaryResponse } from '@/lib/repos/reports.repo';
import { documentsRepo, type EzDocument } from '@/lib/repos/documents.repo';
import {
    Loader2,
    TrendingUp,
    FileText,
    AlertTriangle,
    Users,
    Plus,
    ArrowRight,
    Receipt,
    Clock,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

const formatMoney = (n: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const formatDocType = (t: string) => {
    switch (t) {
        case 'QUO': return 'ใบเสนอราคา';
        case 'BILL': return 'ใบวางบิล';
        case 'RECEIPT': return 'ใบเสร็จ';
        case 'CN': return 'ใบลดหนี้';
        case 'DN': return 'ใบเพิ่มหนี้';
        default: return t;
    }
};

const formatStatus = (s: string) => {
    switch (s) {
        case 'DRAFT': return 'ร่าง';
        case 'ISSUED': return 'ออกแล้ว';
        case 'PAID': return 'ชำระแล้ว';
        case 'CANCELLED': return 'ยกเลิก';
        default: return s;
    }
};

const statusColor = (s: string) => {
    switch (s) {
        case 'DRAFT': return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300';
        case 'ISSUED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
        case 'PAID': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
        case 'CANCELLED': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300';
    }
};

export default function DashboardHomePage() {
    useAuth(); // ensure session is ready
    const [summary, setSummary] = useState<ReportsSummaryResponse | null>(null);
    const [recentDocs, setRecentDocs] = useState<EzDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [summaryRes, docsRes] = await Promise.all([
                    reportsRepo.getSummary().catch(() => null),
                    documentsRepo.listDocuments({ limit: 5 }).catch(() => ({ documents: [] })),
                ]);
                setSummary(summaryRes);
                setRecentDocs(Array.isArray(docsRes.documents) ? docsRes.documents.slice(0, 5) : []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 p-6 text-center text-rose-600 dark:text-rose-400">
                {error}
            </div>
        );
    }

    const monthly = summary?.monthly;
    const overdue = summary?.overdue ?? [];
    const topCustomers = summary?.topCustomers ?? [];

    // Chart data — use monthly totals if available, otherwise show placeholder
    const chartData = monthly
        ? [
            { name: monthly.month, รายได้: monthly.totalRevenue },
        ]
        : [];

    const stats = [
        {
            label: 'รายได้เดือนนี้',
            value: monthly ? `฿${formatMoney(monthly.totalRevenue)}` : '฿0',
            icon: TrendingUp,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-100 dark:bg-emerald-900/50',
        },
        {
            label: 'เอกสารทั้งหมด',
            value: monthly ? String(monthly.issuedDocCount) : '0',
            icon: FileText,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-100 dark:bg-blue-900/50',
        },
        {
            label: 'บิลค้างชำระ',
            value: String(overdue.length),
            icon: AlertTriangle,
            color: overdue.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500',
            bg: overdue.length > 0 ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-slate-100 dark:bg-slate-700',
        },
        {
            label: 'ลูกค้าท็อป',
            value: topCustomers[0]?.customerName ?? '-',
            icon: Users,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-100 dark:bg-violet-900/50',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`rounded-xl p-2.5 ${stat.bg}`}>
                                    <Icon className={`h-5 w-5 ${stat.color}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                                    <p className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Revenue Chart */}
            {chartData.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        รายได้ — {monthly?.month ?? ''}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">ยอดรวมใบเสร็จ</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">฿{formatMoney(monthly?.totalRevenue ?? 0)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">รับจริง</p>
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">฿{formatMoney(monthly?.netReceived ?? 0)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">ใบเสร็จ</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{monthly?.receiptCount ?? 0} ใบ</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">เฉลี่ย/ใบ</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">฿{formatMoney(monthly?.averagePerReceipt ?? 0)}</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v: number) => `฿${formatMoney(v)}`} />
                            <Tooltip
                                formatter={(value) => [`฿${formatMoney(Number(value))}`, 'รายได้']}
                                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                            />
                            <Area type="monotone" dataKey="รายได้" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent Documents */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">เอกสารล่าสุด</h3>
                        <Link
                            href="/dashboard/documents"
                            className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                            ดูทั้งหมด <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                    {recentDocs.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">ยังไม่มีเอกสาร</p>
                    ) : (
                        <div className="space-y-3">
                            {recentDocs.map((doc) => (
                                <Link
                                    key={doc.id}
                                    href={`/dashboard/documents/editor?id=${doc.id}`}
                                    className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700 p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-2">
                                            <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {doc.docNo || formatDocType(doc.docType)}
                                            </p>
                                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                                {doc.customerSnapshot?.displayName ?? '-'} · {doc.issueDate}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(doc.status)}`}>
                                            {formatStatus(doc.status)}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            ฿{formatMoney(doc.money?.total_amount ?? 0)}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Overdue Invoices */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">บิลค้างชำระ</h3>
                        {overdue.length > 0 && (
                            <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                {overdue.length} รายการ
                            </span>
                        )}
                    </div>
                    {overdue.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-center">
                            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-3 mb-2">
                                <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">ไม่มีบิลค้างชำระ</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">ทุกอย่างเรียบร้อยดี!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {overdue.slice(0, 5).map((inv) => (
                                <div
                                    key={inv.docNo}
                                    className="flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 p-3"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{inv.docNo}</p>
                                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{inv.customerName}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                            <Clock className="h-3 w-3" />
                                            <span className="text-xs font-medium">เกิน {inv.overdueByDays} วัน</span>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            ฿{formatMoney(inv.amount)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">สร้างเอกสารใหม่</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        { type: 'QUO', label: 'ใบเสนอราคา', color: 'from-emerald-500 to-teal-500' },
                        { type: 'BILL', label: 'ใบวางบิล', color: 'from-blue-500 to-indigo-500' },
                        { type: 'RECEIPT', label: 'ใบเสร็จรับเงิน', color: 'from-violet-500 to-purple-500' },
                    ].map(({ type, label, color }) => (
                        <Link
                            key={type}
                            href={`/dashboard/documents/editor?type=${type}`}
                            className={`group flex items-center gap-3 rounded-xl bg-gradient-to-r ${color} p-4 text-white shadow-lg transition hover:shadow-xl hover:-translate-y-0.5`}
                        >
                            <Plus className="h-5 w-5 opacity-80" />
                            <span className="text-sm font-semibold">{label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
