'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { customersRepo, type Customer } from '@/lib/repos/customers.repo';
import { documentsRepo, type EzDocument } from '@/lib/repos/documents.repo';
import {
    ArrowLeft,
    Loader2,
    FileText,
    Plus,
    Mail,
    Phone,
    MapPin,
    Building2,
    User,
    Receipt,
    TrendingUp,
    Clock,
} from 'lucide-react';
import DocumentTimeline from '@/components/document-timeline';

const formatMoney = (n: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

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

export default function CustomerDetailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const customerId = searchParams.get('id') ?? '';

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [documents, setDocuments] = useState<EzDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!customerId) {
            setError('ไม่พบ ID ลูกค้า');
            setLoading(false);
            return;
        }
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [cust, docsRes] = await Promise.all([
                    customersRepo.getCustomer(customerId),
                    documentsRepo.listDocuments({ customerId }),
                ]);
                setCustomer(cust);
                setDocuments(Array.isArray(docsRes.documents) ? docsRes.documents : []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'ไม่พบข้อมูลลูกค้า');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [customerId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (error || !customer) {
        return (
            <div className="space-y-4">
                <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </button>
                <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 p-6 text-center text-rose-600 dark:text-rose-400">
                    {error || 'ไม่พบข้อมูลลูกค้า'}
                </div>
            </div>
        );
    }

    const totalRevenue = documents
        .filter((d) => d.status === 'PAID')
        .reduce((sum, d) => sum + (d.money?.total_amount ?? 0), 0);
    const pendingAmount = documents
        .filter((d) => d.docType === 'BILL' && d.status === 'ISSUED')
        .reduce((sum, d) => sum + (d.money?.total_amount ?? 0), 0);
    const paidCount = documents.filter((d) => d.status === 'PAID').length;

    const docCountByType: Record<string, number> = {};
    documents.forEach((d) => {
        docCountByType[d.docType] = (docCountByType[d.docType] || 0) + 1;
    });

    return (
        <div className="space-y-6">
            <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
                <ArrowLeft className="h-4 w-4" /> กลับ
            </button>

            {/* Customer Info Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/50">
                        {customer.type === 'COMPANY' ? (
                            <Building2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <User className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{customer.displayName}</h2>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                customer.type === 'COMPANY'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                                {customer.type === 'COMPANY' ? 'นิติบุคคล' : 'บุคคล'}
                            </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                            {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {customer.phone}</span>}
                            {customer.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {customer.email}</span>}
                            {customer.taxId && <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {customer.taxId}</span>}
                        </div>
                        {customer.address && (
                            <p className="mt-1 flex items-start gap-1 text-sm text-slate-500 dark:text-slate-400">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {customer.address}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Revenue Summary */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 dark:border-emerald-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/50 p-2.5">
                            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">รายได้รวม</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">฿{formatMoney(totalRevenue)}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-amber-100 dark:border-amber-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-amber-100 dark:bg-amber-900/50 p-2.5">
                            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">ค้างชำระ</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">฿{formatMoney(pendingAmount)}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-blue-100 dark:border-blue-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-100 dark:bg-blue-900/50 p-2.5">
                            <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">ใบเสร็จ/ชำระแล้ว</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{paidCount} รายการ</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Doc Type Breakdown */}
            {Object.keys(docCountByType).length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(docCountByType).map(([type, count]) => (
                        <span key={type} className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                            {formatDocType(type)} {count}
                        </span>
                    ))}
                </div>
            )}

            {/* Documents List */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">เอกสารทั้งหมด ({documents.length})</h3>
                    <Link
                        href={`/dashboard/documents/editor?customerId=${customerId}`}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-emerald-600"
                    >
                        <Plus className="h-3.5 w-3.5" /> สร้างเอกสารใหม่
                    </Link>
                </div>
                {documents.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">ยังไม่มีเอกสาร</p>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {documents.map((doc) => (
                            <Link key={doc.id} href={`/dashboard/documents/editor?id=${doc.id}`} className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-2">
                                        <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{doc.docNo || formatDocType(doc.docType)}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDocType(doc.docType)} · {doc.issueDate}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <DocumentTimeline status={doc.status} openedByClient={doc.openedByClient} compact />
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">฿{formatMoney(doc.money?.total_amount ?? 0)}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
