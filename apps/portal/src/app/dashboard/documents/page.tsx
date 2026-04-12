'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { documentsRepo } from '@/lib/repos/documents.repo';
import { EzDocument as Document } from '@/lib/repos/documents.repo';
import { useAuth } from '@/lib/auth-context';
import { Plus, Download, Loader2, Send, FileText, Eye } from 'lucide-react';
import PdfPreviewModal from '@/components/pdf-preview-modal';
import DocumentTimeline from '@/components/document-timeline';

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [deliveringId, setDeliveringId] = useState<string | null>(null);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
    const { profile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const searchQuery = (searchParams.get('q') ?? '').trim().toLowerCase();
    const notice = (searchParams.get('notice') ?? '').trim().toLowerCase();
    const businessId = profile?.business?.id || profile?.activeBusinessId || '';

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await documentsRepo.listDocuments({
                type: filterType || undefined,
                status: filterStatus || undefined,
            });
            setDocuments(Array.isArray(res.documents) ? res.documents : []);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
            setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    }, [filterType, filterStatus]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const formatDocType = (docType: string) => {
        switch (docType) {
            case 'QUO': return 'ใบเสนอราคา';
            case 'BILL': return 'ใบวางบิล';
            case 'RECEIPT': return 'ใบเสร็จ';
            default: return docType;
        }
    };

    const formatStatus = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'ร่าง';
            case 'ISSUED': return 'ออกแล้ว';
            case 'PAID': return 'ชำระแล้ว';
            case 'CANCELLED': return 'ยกเลิก';
            default: return status;
        }
    };

    const handleDeliver = async (doc: Document) => {
        if (!businessId) {
            alert('ยังไม่พบธุรกิจที่ใช้งานอยู่');
            return;
        }
        setDeliveringId(doc.id);
        try {
            await documentsRepo.deliverDocument(doc.id, businessId);
            alert('ส่งลิงก์เอกสารไปที่ LINE แล้ว');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'ส่งลิงก์ไม่สำเร็จ';
            alert(message);
        } finally {
            setDeliveringId(null);
        }
    };

    const handleGeneratePdf = async (docId: string) => {
        setGeneratingId(docId);
        try {
            await documentsRepo.generatePdf(docId);
            await fetchDocuments();
            // alert('สร้าง PDF เรียบร้อยแล้ว'); // UI updates automatically, no need to annoy user
        } catch (err) {
            const message = err instanceof Error ? err.message : 'สร้าง PDF ไม่สำเร็จ';
            alert(message);
        } finally {
            setGeneratingId(null);
        }
    };

    const filteredDocuments = useMemo(() => {
        let docs = documents;
        if (searchQuery) {
            docs = documents.filter((doc) => {
                const haystack = [
                    doc.docNo,
                    doc.issueDate,
                    formatDocType(doc.docType),
                    formatStatus(doc.status),
                    doc.customerSnapshot?.displayName,
                    doc.subjectTh,
                    doc.subjectEn,
                    doc.money?.net_receive_amount?.toString(),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(searchQuery);
            });
        }

        // Sort by Date Desc, then DocNo Desc
        return [...docs].sort((a, b) => {
            const dateA = new Date(a.issueDate || '1970-01-01').getTime();
            const dateB = new Date(b.issueDate || '1970-01-01').getTime();

            if (dateA !== dateB) return dateB - dateA;

            // If same date, use Doc No
            const noA = a.docNo || '';
            const noB = b.docNo || '';
            return noB.localeCompare(noA);
        });
    }, [documents, searchQuery]);

    return (
        <div className="max-w-6xl mx-auto pb-32">
            {notice === 'confirmed' && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            ✅ ออกเอกสารสำเร็จแล้ว กำลังสร้าง PDF ให้ (อาจใช้เวลาสักครู่)
                        </div>
                        <button
                            type="button"
                            onClick={() => router.replace(pathname)}
                            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:border-emerald-300 dark:border-emerald-700 dark:bg-slate-800 dark:text-emerald-400 dark:hover:border-emerald-500"
                        >
                            ปิดข้อความ
                        </button>
                    </div>
                </div>
            )}
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">เอกสาร</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                        ประวัติเอกสารทั้งหมดของธุรกิจคุณ
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <Link
                        href="/dashboard/documents/new"
                        className="relative z-10 block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <Plus className="inline-block w-4 h-4 mr-1" />
                        สร้างเอกสาร
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="mt-6 flex flex-wrap gap-4">
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="block rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                    <option value="">ทุกประเภท</option>
                    <option value="QUO">ใบเสนอราคา</option>
                    <option value="BILL">ใบวางบิล</option>
                    <option value="RECEIPT">ใบเสร็จ</option>
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="block rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                    <option value="">ทุกสถานะ</option>
                    <option value="DRAFT">ร่าง</option>
                    <option value="ISSUED">ออกแล้ว</option>
                    <option value="PAID">ชำระแล้ว</option>
                    <option value="CANCELLED">ยกเลิก</option>
                </select>
            </div>
            {searchQuery && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>กำลังค้นหา:</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-300">{searchQuery}</span>
                    <button
                        type="button"
                        onClick={() => router.replace(pathname)}
                        className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                    >
                        ล้างคำค้นหา
                    </button>
                </div>
            )}

            {error && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                    {error}
                </div>
            )}

            {/* List */}
            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg bg-white dark:bg-slate-900 dark:ring-slate-700 dark:shadow-black/20">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-700">
                                <thead className="bg-gray-50 dark:bg-slate-800">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100 sm:pl-6">เลขที่เอกสาร</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">วันที่</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">ประเภท</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">ลูกค้า</th>
                                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">ยอดรวม</th>
                                        <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-slate-100">สถานะ</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                                    {loading && documents.length === 0 ? (
                                        <tr><td colSpan={7} className="p-4 text-center dark:text-slate-300">กำลังโหลด...</td></tr>
                                    ) : filteredDocuments.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-4 text-center text-gray-500 dark:text-slate-400">
                                                {searchQuery ? 'ไม่พบเอกสารที่ค้นหา' : 'ยังไม่มีเอกสารในระบบ'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDocuments.map((doc) => (
                                            <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 sm:pl-6">
                                                    <Link href={`/dashboard/documents/editor?id=${doc.id}`}>
                                                        {doc.docNo || <span className="text-gray-400 dark:text-slate-500 italic">รอเลขที่</span>}
                                                    </Link>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                                    {doc.issueDate}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                                    {formatDocType(doc.docType)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                                    {doc.customerSnapshot?.displayName || '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-slate-100 text-right">
                                                    {doc.money?.net_receive_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                                    <DocumentTimeline status={doc.status} openedByClient={doc.openedByClient} compact />
                                                </td>
                                                <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 relative z-50">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {doc.pdfReady && doc.pdfUrl && (
                                                            <button
                                                                onClick={() => setPreviewDoc(doc)}
                                                                className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                                title="ดูตัวอย่าง PDF"
                                                            >
                                                                <Eye className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                        {doc.pdfReady && doc.pdfUrl ? (
                                                            <a
                                                                href={doc.pdfUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                                                                title="ดาวน์โหลด PDF"
                                                            >
                                                                <Download className="w-5 h-5" />
                                                            </a>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleGeneratePdf(doc.id)}
                                                                className="text-slate-500 hover:text-slate-700 disabled:text-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:disabled:text-slate-600"
                                                                title="สร้าง PDF"
                                                                disabled={
                                                                    generatingId === doc.id ||
                                                                    doc.pdfState === 'RENDERING' ||
                                                                    doc.pdfState === 'QUEUED'
                                                                }
                                                            >
                                                                {generatingId === doc.id ||
                                                                    doc.pdfState === 'RENDERING' ||
                                                                    doc.pdfState === 'QUEUED' ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                ) : (
                                                                    <FileText className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeliver(doc)}
                                                            className="text-emerald-600 hover:text-emerald-700 disabled:text-slate-300 dark:text-emerald-400 dark:hover:text-emerald-300 dark:disabled:text-slate-600"
                                                            title={doc.pdfReady ? 'ส่งลิงก์เข้า LINE' : 'PDF ยังไม่พร้อม'}
                                                            disabled={!doc.pdfReady || deliveringId === doc.id}
                                                        >
                                                            {deliveringId === doc.id ? (
                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                            ) : (
                                                                <Send className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            {/* PDF Preview Modal */}
            {previewDoc?.pdfUrl && (
                <PdfPreviewModal
                    pdfUrl={previewDoc.pdfUrl}
                    docNo={previewDoc.docNo || ''}
                    onClose={() => setPreviewDoc(null)}
                />
            )}
        </div>
    );
}
